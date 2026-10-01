"""
¿Instala Render las mismas versiones que el lockfile del repo?

Render hace `npm install` con el npm de su Node, que reescribe
`package-lock.json` aunque no cambie ninguna versión: npm 10 quita las marcas
`libc` que pone npm 11 y añade `"dev": true`. Comparar el fichero entero daría
rojo siempre; lo que importa es si algún paquete acaba en otra versión.

Uso: python lock_versions_match.py <lock del repo> <lock tras npm install>
Salidas: 0 mismas versiones · 1 alguna distinta (la dice) · 2 no se pudo leer
Para la tarjeta del resumen escribe en $GITHUB_OUTPUT, si existe,
lock_packages=N (los paquetes comparados) y lock_differences=N.
"""

import json
import os
import sys
from pathlib import Path


def versiones(lock: dict) -> dict[str, str]:
    """{ruta en node_modules: versión}, sin el paquete raíz ("")."""
    return {
        ruta: datos.get("version", "")
        for ruta, datos in (lock.get("packages") or {}).items()
        if ruta
    }


def diferencias(antes: dict, despues: dict) -> list[str]:
    a, d = versiones(antes), versiones(despues)
    cambios = []
    for ruta in sorted(a.keys() | d.keys()):
        if a.get(ruta) != d.get(ruta):
            cambios.append(f"{ruta}: {a.get(ruta, '(no estaba)')} -> {d.get(ruta, '(ya no está)')}")
    return cambios


def _para_la_tarjeta(**valores: int) -> None:
    """Los recuentos para la tarjeta; si no se pueden escribir, no cambia nada."""
    destino = os.environ.get("GITHUB_OUTPUT")
    if not destino:
        return
    try:
        with open(destino, "a", encoding="utf-8") as fichero:
            fichero.writelines(f"{clave}={valor}\n" for clave, valor in valores.items())
    except OSError:
        pass


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("Uso: lock_versions_match.py <lock del repo> <lock tras npm install>")
        return 2
    try:
        antes, despues = (json.loads(Path(p).read_text()) for p in argv)
    except (OSError, ValueError) as error:
        print(f"::error::No se pudo leer un lockfile: {error}")
        return 2
    if not versiones(antes):
        print("::error::El lockfile del repo no tiene paquetes: no hay nada que comparar")
        return 2
    cambios = diferencias(antes, despues)
    _para_la_tarjeta(lock_packages=len(versiones(antes)), lock_differences=len(cambios))
    for cambio in cambios[:50]:
        print(f"::error::npm install (el de Render) instala otra versión: {cambio}")
    if cambios:
        print(f"{len(cambios)} paquete(s) distintos: Render no construiría lo que se ha probado.")
        return 1
    print(f"✅ npm install deja las mismas {len(versiones(antes))} versiones que el lockfile")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
