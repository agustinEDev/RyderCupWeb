"""
Presupuesto del paquete JS (#374).

Mide lo que descarga quien abre la aplicación: los JS que pide `index.html`
(`<script src>` y `<link rel="modulepreload">`), comprimidos con gzip. Antes se
sumaban todos los `dist/assets/*.js` sin comprimir, y ese número no describía
nada: el 80 % eran pantallas diferidas que solo llegan si se navega a ellas
(MapLibre, 1 MB, solo al abrir el mapa), y dividir una pantalla en trozos movía
bytes sin bajar la suma. El tope se subió once veces, de 1400 a 3500 KB.

Lo que NO cuenta como arranque, a sabiendas: la primera pantalla y lo que
ella pida (son `lazy`: el panel son ~15 KB gzip y sus textos), y el precache
de la PWA, que tras la primera visita baja en segundo plano todo lo demás.
Mover código de la entrada a un `lazy` de la primera ruta baja la cifra sin
acelerar nada: si algún día importa, se mide el cierre de imports de la ruta
con el manifiesto de Vite (`build.manifest`).

Tres comprobaciones:
- Arranque (gzip): por encima de MAX_STARTUP_KB falla; de STARTUP_WARNING_KB,
  avisa.
- Cada trozo (gzip), diferido o no, `.js` o `.mjs` (el worker de MapLibre): por
  encima de MAX_CHUNK_KB falla. Un trozo diferido no pesa en el arranque, pero
  sigue siendo una espera al abrir su pantalla.
- Total del disco sin comprimir, la cifra de antes: solo sale en el log y avisa
  por encima de TOTAL_WARNING_KB; nunca falla.

Uso: bundle_budget.py <dist>. Escribe en $GITHUB_OUTPUT, si existe,
size_kb (el arranque), budget_kb, warning_kb y problems (qué falló, vacío si
nada) para la tarjeta.
"""

import gzip
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit

# 25 oct 2026 (#374, decidido con el product owner): el arranque pesaba
# 240 KB gzip; 30 KB de margen. MapLibre, el trozo más grande, 276 KB gzip.
MAX_STARTUP_KB = 270
STARTUP_WARNING_KB = 255
MAX_CHUNK_KB = 320
# El último tope del total antes de #374, ahora solo como aviso
TOTAL_WARNING_KB = 3500

# Los JS de la página: el script de entrada y los modulepreload. Los atributos
# pueden venir en cualquier orden y con comillas dobles, simples o sin ellas
ETIQUETA = re.compile(r"<(script|link)\b[^>]*>", re.IGNORECASE)
ATRIBUTO = re.compile(r"""\b(src|href|rel)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))""", re.IGNORECASE)
JS = (".js", ".mjs")


def kb(octetos: int) -> int:
    return round(octetos / 1024)


def gzip_de(fichero: Path) -> int:
    return len(gzip.compress(fichero.read_bytes(), compresslevel=9))


def js_del_arranque(index_html: str) -> list[str]:
    """Los JS que pide index.html, en orden de aparición. Uno que salga como
    script y como preload sale dos veces: quien suma los cuenta una."""
    rutas: list[str] = []
    for etiqueta in ETIQUETA.finditer(index_html):
        atributos = {k.lower(): a or b or c for k, a, b, c in ATRIBUTO.findall(etiqueta.group(0))}
        if etiqueta.group(1).lower() == "script":
            ruta = atributos.get("src")
        elif atributos.get("rel", "").lower() == "modulepreload":
            ruta = atributos.get("href")
        else:
            ruta = None
        # Sin la query (`?v=1`): el fichero en dist/ es el mismo
        ruta = urlsplit(ruta).path if ruta else ruta
        if ruta and ruta.endswith(JS):
            rutas.append(ruta)
    return rutas


def escribir_salidas(valores: dict) -> None:
    destino = os.environ.get("GITHUB_OUTPUT")
    if not destino:
        return
    try:
        with open(destino, "a", encoding="utf-8") as fichero:
            fichero.writelines(f"{clave}={valor}\n" for clave, valor in valores.items())
    except OSError:
        # Sin salidas la tarjeta dice que no se midió; la comprobación sigue
        pass


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print("Uso: bundle_budget.py <dist>")
        return 2
    dist = Path(argv[0])
    trozos = sorted(t for t in (dist / "assets").iterdir() if t.suffix in JS) if (dist / "assets").is_dir() else []
    if not trozos:
        print("::error::No JS bundles found in dist/assets: nothing was measured")
        return 1

    fallos: list[str] = []
    comprimido = {t.name: gzip_de(t) for t in trozos}

    # --- Total del disco: solo informa. Sin los .mjs, como la cifra de antes ---
    total = sum(t.stat().st_size for t in trozos if t.suffix == ".js")
    solo_js = [t for t in trozos if t.suffix == ".js"]
    print(f"📦 All .js on disk: {kb(total)} KB uncompressed, {kb(sum(comprimido[t.name] for t in solo_js))} KB gzip, {len(solo_js)} files (.mjs listed, not summed)")
    for t in sorted(trozos, key=lambda t: comprimido[t.name], reverse=True):
        print(f"  {kb(comprimido[t.name]):>5} KB gzip  {kb(t.stat().st_size):>6} KB  {t.name}")
    if kb(total) > TOTAL_WARNING_KB:
        print(f"::warning::All JS on disk is {kb(total)} KB, above {TOTAL_WARNING_KB} KB. It does not block: only the startup and each chunk do")

    # --- Arranque ---
    try:
        rutas = js_del_arranque((dist / "index.html").read_text(encoding="utf-8"))
    except OSError as error:
        print(f"::error::Could not read dist/index.html: {error}")
        return 1
    if not rutas:
        print("::error::dist/index.html loads no JS: nothing was measured")
        return 1
    del_arranque: dict[str, int] = {}
    for ruta in rutas:
        fichero = dist / ruta.lstrip("/")
        if not fichero.is_file():
            fallos.append(f"dist/index.html loads {ruta}, which is not in dist/")
            continue
        del_arranque[ruta] = comprimido[fichero.name] if fichero.parent == dist / "assets" else gzip_de(fichero)

    arranque = kb(sum(del_arranque.values()))
    print("")
    print(f"🚀 Startup JS (what index.html loads): {arranque} KB gzip of {MAX_STARTUP_KB} KB, {len(del_arranque)} files")
    for ruta, tam in sorted(del_arranque.items(), key=lambda par: par[1], reverse=True):
        print(f"  {kb(tam):>5} KB gzip  {ruta}")
    if arranque > MAX_STARTUP_KB:
        fallos.append(
            f"Startup JS is {arranque} KB gzip, over the {MAX_STARTUP_KB} KB budget by {arranque - MAX_STARTUP_KB} KB. "
            "Lazy-load what the first screen does not need, or raise MAX_STARTUP_KB with its reason"
        )
    elif arranque > STARTUP_WARNING_KB:
        print(f"::warning::Startup JS is {arranque} KB gzip, close to the {MAX_STARTUP_KB} KB budget")

    # --- Cada trozo ---
    for nombre, tam in comprimido.items():
        if kb(tam) > MAX_CHUNK_KB:
            fallos.append(f"{nombre} is {kb(tam)} KB gzip, over the {MAX_CHUNK_KB} KB limit for one chunk")

    escribir_salidas({
        "size_kb": arranque,
        "budget_kb": MAX_STARTUP_KB,
        "warning_kb": STARTUP_WARNING_KB,
        # Una línea: GITHUB_OUTPUT es clave=valor por línea
        "problems": "; ".join(f.split(". ")[0] for f in fallos),
    })

    for fallo in fallos:
        print(f"::error::{fallo}")
    if not fallos:
        print("")
        print("✅ Bundle within budget")
    return 1 if fallos else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
