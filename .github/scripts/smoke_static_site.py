"""
Comprueba un `dist/` como lo sirve Render: un sitio estático, sin Vite delante.

Render construye con su propio Node y su npm de serie (`npm install; npm run
build`), no con el entorno del resto del CI. Lo que se comprueba aquí es lo que
rompe la web entera sin que ningún test lo vea:

- la portada responde y trae el contenedor de la app;
- cada recurso que referencia `index.html` (scripts, estilos, iconos, precargas)
  existe, y si lleva `integrity`, su hash cuadra: con un hash que no cuadra el
  navegador no ejecuta el JS y la app sale en blanco;
- cada `assets/…` que el JS o el CSS piden después (los chunks de las páginas
  que se cargan en diferido) existe: si falta, esa página sale en blanco;
- `version.json` dice la versión esperada;
- el service worker y el manifiesto están.

Uso: python smoke_static_site.py <dist> <versión esperada>
Salidas: 0 bien · 1 algo falla (lo dice) · 2 uso incorrecto
"""

import base64
import hashlib
import http.server
import json
import re
import sys
import threading
import urllib.error
import urllib.request
from functools import partial
from pathlib import Path

_RECURSO = re.compile(r"<(?:script|link)\b[^>]*>", re.IGNORECASE)
# Con comillas dobles, simples o sin comillas: uno que no se leyera se saltaría
_ATRIBUTO = re.compile(r"""(\w[\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))""")
# Lo que el JS y el CSS piden más tarde: assets/<nombre>.js|css
_ASSET_DIFERIDO = re.compile(r"assets/[\w.-]+\.(?:js|css)")
# El navegador se queda con el algoritmo más fuerte y acepta si cuadra uno de él
_FUERZA = {"sha256": 1, "sha384": 2, "sha512": 3}


class _Silencioso(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):  # noqa: D102 - sin ruido en el log del CI
        pass


def _servir(dist: Path) -> tuple[http.server.ThreadingHTTPServer, str]:
    manejador = partial(_Silencioso, directory=str(dist))
    servidor = http.server.ThreadingHTTPServer(("127.0.0.1", 0), manejador)
    threading.Thread(target=servidor.serve_forever, daemon=True).start()
    return servidor, f"http://127.0.0.1:{servidor.server_address[1]}"


def _pedir(base: str, ruta: str) -> tuple[int, bytes]:
    try:
        with urllib.request.urlopen(base + ruta, timeout=10) as respuesta:  # noqa: S310
            return respuesta.status, respuesta.read()
    except urllib.error.HTTPError as error:
        return error.code, b""


def _hash_sri(algoritmo: str, contenido: bytes) -> str:
    return f"{algoritmo}-" + base64.b64encode(hashlib.new(algoritmo, contenido).digest()).decode()


def _atributos(etiqueta: str) -> dict[str, str]:
    return {m[0].lower(): m[1] or m[2] or m[3] for m in _ATRIBUTO.findall(etiqueta)}


def _fallo_de_integridad(ruta: str, integrity: str, contenido: bytes) -> str | None:
    """Como el navegador: vale con que cuadre un hash del algoritmo más fuerte."""
    hashes = [h.split("?", 1)[0] for h in integrity.split()]
    conocidos = [h for h in hashes if h.split("-", 1)[0] in _FUERZA]
    if not conocidos:
        return f"{ruta}: integrity sin un algoritmo que el navegador acepte ({integrity})"
    fuerte = max(_FUERZA[h.split("-", 1)[0]] for h in conocidos)
    candidatos = [h for h in conocidos if _FUERZA[h.split("-", 1)[0]] == fuerte]
    algoritmo = candidatos[0].split("-", 1)[0]
    if _hash_sri(algoritmo, contenido) not in candidatos:
        return f"{ruta}: el hash no cuadra con su integrity ({algoritmo})"
    return None


def _diferidos_que_faltan(dist: Path) -> list[str]:
    """Los chunks que el JS o el CSS piden y no están en el build."""
    faltan = set()
    for fichero in [*dist.glob("assets/*.js"), *dist.glob("assets/*.css")]:
        texto = fichero.read_text("utf-8", "replace")
        for pedido in set(_ASSET_DIFERIDO.findall(texto)):
            if not (dist / pedido).is_file():
                faltan.add(f"{fichero.name} pide {pedido}, que no está en el build")
    return sorted(faltan)


def comprobar(dist: Path, esperada: str) -> list[str]:
    """Los fallos encontrados; vacío si todo está bien."""
    fallos: list[str] = []
    servidor, base = _servir(dist)
    try:
        estado, portada = _pedir(base, "/")
        if estado != 200:
            return [f"/ responde {estado}"]
        html = portada.decode("utf-8", "replace")
        if 'id="root"' not in html:
            fallos.append('index.html no trae el contenedor de la app (id="root")')

        recursos = 0
        for etiqueta in _RECURSO.findall(html):
            atributos = _atributos(etiqueta)
            ruta = atributos.get("src") or atributos.get("href")
            if not ruta or not ruta.startswith("/") or ruta.startswith("//"):
                continue  # externos (fuentes, CDN) y anclas no son del build
            recursos += 1
            estado, contenido = _pedir(base, ruta)
            if estado != 200:
                fallos.append(f"{ruta} responde {estado}")
                continue
            integrity = atributos.get("integrity", "").strip()
            if integrity and (fallo := _fallo_de_integridad(ruta, integrity, contenido)):
                fallos.append(fallo)
        if recursos == 0:
            fallos.append("index.html no referencia ningún recurso del build")

        fallos.extend(_diferidos_que_faltan(dist))

        estado, cuerpo = _pedir(base, "/version.json")
        if estado != 200:
            fallos.append(f"/version.json responde {estado}")
        else:
            try:
                version = json.loads(cuerpo)["version"]
            except (ValueError, KeyError, TypeError):
                version = None
            if version != esperada:
                fallos.append(f"/version.json dice {version!r} y se esperaba {esperada!r}")

        for ruta in ("/sw.js", "/manifest.webmanifest"):
            estado, _ = _pedir(base, ruta)
            if estado != 200:
                fallos.append(f"{ruta} responde {estado}")
    finally:
        servidor.shutdown()
    return fallos


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("Uso: smoke_static_site.py <dist> <versión esperada>")
        return 2
    dist, esperada = Path(argv[0]), argv[1]
    if not (dist / "index.html").is_file():
        print(f"::error::{dist} no tiene index.html: no hay build que comprobar")
        return 1
    fallos = comprobar(dist, esperada)
    for fallo in fallos:
        print(f"::error::{fallo}")
    if fallos:
        return 1
    print(f"✅ {dist} se sirve como en Render: recursos, integridad, version.json {esperada}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
