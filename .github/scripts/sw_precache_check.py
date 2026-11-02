"""
Comprueba que el service worker precachea la aplicación entera (2 nov 2026).

minimatch 11 con el glob 11 de workbox-build dejaba el precache en 4 ficheros
de 251, y el build salía en verde: la app instalada se quedaba sin sus pantallas
al abrirse sin conexión. Aquí se exige que estén en el precache de `sw.js`:

- todo `.js`, `.mjs` y `.css` de `dist/assets` (también en subcarpetas);
- los `.js` de la raíz (`offline.js`, que carga la página sin conexión), salvo
  el propio `sw.js` y el `workbox-*.js` que lo acompaña;
- `index.html` y `offline.html`.

Solo cuenta lo que hay en la lista que recibe `precacheAndRoute`: un `url:` de
otra parte del fichero (una ruta, un fallback) no es precache.

Las fuentes de otros alfabetos se dejan fuera a propósito (`globIgnores` de
`vite.config.js`), por eso no se mira nada más que código, estilos y páginas.

  npm run build && python3 .github/scripts/sw_precache_check.py dist
"""

import re
import sys
from pathlib import Path

CODIGO = {".js", ".mjs", ".css"}
PAGINAS = ["index.html", "offline.html"]
# La lista que recibe precacheAndRoute; dentro, `url:"…"` minificado o
# `"url": "…"` sin minificar
LISTA = re.compile(r"precacheAndRoute\(\s*(\[[^\]]*\])")
URL = re.compile(r"""["']?url["']?\s*:\s*["']([^"']+)["']""")


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print("Uso: sw_precache_check.py <dist>")
        return 1
    dist = Path(argv[0])
    sw = dist / "sw.js"
    try:
        texto = sw.read_text()
    except OSError as error:
        print(f"::error::Could not read {sw}: {error}")
        return 1
    precache = {url.lstrip("/") for lista in LISTA.findall(texto) for url in URL.findall(lista)}
    if not precache:
        print(f"::error::No precache list found in {sw}: nothing was checked")
        return 1

    assets = dist / "assets"
    exigidos = [p.relative_to(dist).as_posix() for p in sorted(assets.rglob("*")) if p.is_file() and p.suffix in CODIGO]
    # Sin código que exigir, quedarían solo las dos páginas y pasaría sin mirar (revisor)
    if not exigidos:
        print(f"::error::No JS/MJS/CSS found in {assets}: nothing was checked")
        return 1
    exigidos += [p.name for p in sorted(dist.glob("*.js")) if p.name != "sw.js" and not p.name.startswith("workbox-")]
    exigidos += PAGINAS
    faltan = [f for f in exigidos if f not in precache]

    print(f"Service worker precache: {len(precache)} entries; {len(exigidos)} required (JS/MJS/CSS in assets, root JS, pages)")
    if faltan:
        print(f"::error::{len(faltan)} of {len(exigidos)} required files are not precached by sw.js: the installed app would miss them offline")
        for fichero in faltan:
            print(f"  missing: {fichero}")
        return 1
    print("All required files are precached")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
