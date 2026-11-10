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

Con `--con-sentry=<DSN>` exige además que el arranque lleve compilado ESE DSN
(9 nov 2026). Sin VITE_SENTRY_DSN en el build, Vite quita de main.jsx el
arranque de Sentry y lo que se mide pesa menos que lo que se sirve: la 2c pasaba
aquí con 381 bytes de margen y en producción se pasaba del tope por 257. El CI
mide el build de la entrada «Deploy like Render», que compila con un DSN de
prueba como Render.

Siempre, además: el seguimiento de navegaciones de Sentry (BrowserTracing y los
envoltorios de React Router) no puede ir en el arranque. Lo pide src/sentry.ts
~2 s después; en el arranque eran unos 17 KB gzip (9 nov 2026).

Uso: bundle_budget.py <dist> [--con-sentry=<DSN>]. Escribe en $GITHUB_OUTPUT, si existe,
size_kb (el arranque), budget_kb, warning_kb y problems (qué falló, vacío si
nada) para la tarjeta.
"""

import gzip
import math
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
# pueden venir en cualquier orden y con comillas dobles, simples o sin ellas. El
# nombre va tras un espacio para no leer `data-src` como `src`, y un valor sin
# comillas no se come la `/` de `/>`
ETIQUETA = re.compile(r"<(script|link)\b[^>]*>", re.IGNORECASE)
ATRIBUTO = re.compile(r"""\s(src|href|rel)\s*=\s*(?:"([^"]*)"|'([^']*)'|((?:[^\s>/]|/(?!>))+))""", re.IGNORECASE)
JS = (".js", ".mjs")


def kb(octetos: int) -> int:
    """Para mostrar. Los topes se comparan en bytes: redondeando, 270,4 KB
    pasaría por 270."""
    return round(octetos / 1024)


def kb_de_exceso(octetos: int) -> int:
    return math.ceil(octetos / 1024)


def gzip_de(fichero: Path) -> int:
    return len(gzip.compress(fichero.read_bytes(), compresslevel=9))


def js_del_arranque(index_html: str) -> list[str]:
    """Los JS propios que pide index.html, en orden de aparición y sin la query
    (`?v=1`: el fichero en dist/ es el mismo). Uno que salga dos veces, quien
    suma lo cuenta una."""
    rutas: list[str] = []
    for etiqueta in ETIQUETA.finditer(index_html):
        atributos = {k.lower(): a or b or c for k, a, b, c in ATRIBUTO.findall(etiqueta.group(0))}
        if etiqueta.group(1).lower() == "script":
            ruta = atributos.get("src")
        elif "modulepreload" in atributos.get("rel", "").lower().split():
            ruta = atributos.get("href")
        else:
            ruta = None
        partes = urlsplit(ruta) if ruta else None
        # Un JS de otro origen (`https://…`, `//…`) no está en dist/: no es del
        # paquete, y sin el dominio se confundiría con uno local (CodeRabbit)
        if partes and not partes.scheme and not partes.netloc and partes.path.endswith(JS):
            rutas.append(partes.path)
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


# Marcas del seguimiento de navegaciones de Sentry en el código compilado: el
# nombre de su integración y el origen de los spans de React Router
SEGUIMIENTO_DE_NAVEGACIONES = (b"BrowserTracing", b"auto.navigation.react.reactrouter", b"auto.pageload.react.reactrouter")


def main(argv: list[str]) -> int:
    """Mide el JS de arranque de un dist y devuelve 0 si cabe en el presupuesto.

    Con `--con-sentry=<DSN>` exige además que ese DSN exacto esté en el arranque
    (así se mide lo que se sirve en producción) y falla si el arranque lleva el
    seguimiento de navegaciones de Sentry. Sale con 2 si los argumentos no valen.
    """
    dsn = None
    posicionales = []
    for arg in argv:
        if arg.startswith("--con-sentry="):
            dsn = arg.split("=", 1)[1]
        else:
            posicionales.append(arg)
    if len(posicionales) != 1 or dsn == "":
        print("Uso: bundle_budget.py <dist> [--con-sentry=<DSN>]")
        return 2
    dist = Path(posicionales[0]).resolve()
    assets = dist / "assets"
    trozos = sorted(t for t in assets.rglob("*") if t.is_file() and t.suffix in JS) if assets.is_dir() else []
    if not trozos:
        print("::error::No JS bundles found in dist/assets: nothing was measured")
        return 1

    fallos: list[str] = []
    comprimido = {t: gzip_de(t) for t in trozos}
    nombre = lambda t: str(t.relative_to(assets)) if t.is_relative_to(assets) else str(t.relative_to(dist))  # noqa: E731

    # --- Total del disco: solo informa. Sin los .mjs, como la cifra de antes ---
    solo_js = [t for t in trozos if t.suffix == ".js"]
    total = sum(t.stat().st_size for t in solo_js)
    print(f"📦 All .js on disk: {kb(total)} KB uncompressed, {kb(sum(comprimido[t] for t in solo_js))} KB gzip, {len(solo_js)} files (.mjs listed, not summed)")
    for t in sorted(trozos, key=comprimido.get, reverse=True):
        print(f"  {kb(comprimido[t]):>5} KB gzip  {kb(t.stat().st_size):>6} KB  {nombre(t)}")
    if total > TOTAL_WARNING_KB * 1024:
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
    # Por el fichero de verdad: «/assets/x.js» y «./assets/x.js» son el mismo
    del_arranque: dict[Path, int] = {}
    for ruta in rutas:
        fichero = (dist / ruta.lstrip("/")).resolve()
        if not fichero.is_file():
            fallos.append(f"dist/index.html loads {ruta}, which is not in dist/")
            continue
        if fichero not in comprimido:
            # Fuera de assets (un registerSW.js): también tiene su tope por trozo
            comprimido[fichero] = gzip_de(fichero)
        del_arranque[fichero] = comprimido[fichero]

    arranque = sum(del_arranque.values())
    contenido = {f: f.read_bytes() for f in del_arranque}
    if dsn is not None and not any(dsn.encode() in datos for datos in contenido.values()):
        fallos.append(
            f"The startup JS does not carry the Sentry DSN {dsn}: the build ran without that VITE_SENTRY_DSN, so main.jsx "
            "drops its Sentry init and this is not what production serves. Build with the same VITE_SENTRY_DSN"
        )
    con_seguimiento = sorted(
        {str(f.relative_to(dist)) for f, datos in contenido.items() if any(m in datos for m in SEGUIMIENTO_DE_NAVEGACIONES)}
    )
    if con_seguimiento:
        fallos.append(
            f"Sentry navigation tracing is in the startup JS ({', '.join(con_seguimiento)}): src/sentry.ts adds it later, "
            "so it must not be imported from startup code nor be forced into a startup chunk (see vite.config.js)"
        )
    print("")
    print(f"🚀 Startup JS (what index.html loads): {kb(arranque)} KB gzip of {MAX_STARTUP_KB} KB, {len(del_arranque)} files")
    for fichero, tam in sorted(del_arranque.items(), key=lambda par: par[1], reverse=True):
        print(f"  {kb(tam):>5} KB gzip  /{fichero.relative_to(dist)}")
    if arranque > MAX_STARTUP_KB * 1024:
        fallos.append(
            f"Startup JS is {kb(arranque)} KB gzip, over the {MAX_STARTUP_KB} KB budget by {kb_de_exceso(arranque - MAX_STARTUP_KB * 1024)} KB. "
            "Lazy-load what the first screen does not need, or raise MAX_STARTUP_KB with its reason"
        )
    elif arranque > STARTUP_WARNING_KB * 1024:
        print(f"::warning::Startup JS is {kb(arranque)} KB gzip, close to the {MAX_STARTUP_KB} KB budget")

    # --- Cada trozo ---
    for t, tam in comprimido.items():
        if tam > MAX_CHUNK_KB * 1024:
            fallos.append(f"{nombre(t)} is {kb(tam)} KB gzip, over the {MAX_CHUNK_KB} KB limit for one chunk")

    escribir_salidas({
        "size_kb": kb(arranque),
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
