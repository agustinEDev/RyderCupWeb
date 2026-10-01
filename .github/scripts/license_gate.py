"""
¿Tienen todos los paquetes instalados una licencia de la lista de permitidas? (#777)

La lista vive en .github/dependency-review-config.yml, la misma que usa
Dependency Review en las PRs. Se lee a mano (sin PyYAML): solo las entradas
`- X` bajo `allow-licenses:` y `allow-dependencies-licenses:`.

Cómo se decide cada paquete del informe de license-checker:
- `A OR B`: basta una permitida; `A AND B`: hacen falta todas. Los paréntesis
  cuentan: «(MIT OR GPL-3.0) AND GPL-3.0» se rechaza.
- Una lista de licencias se trata como AND (lo prudente).
- `MIT*` (license-checker la dedujo del fichero LICENSE) cuenta como MIT.
- UNKNOWN, `Custom: ...` o cualquier nombre que no esté en la lista: rechazada.
- Un paquete con excepción (`pkg:npm/<nombre>`) pasa sin mirar su licencia.

Uso: python license_gate.py <licenses.json> <dependency-review-config.yml>
Salidas: 0 todas permitidas · 1 alguna fuera de la lista (la dice) · 2 no se pudo leer
Para la tarjeta escribe en $GITHUB_OUTPUT, si existe, checked=N y
rejected=<paquete (licencia), ...> (vacío si no hay ninguno).
"""

import json
import os
import re
import sys
from pathlib import Path

_OPERADOR = re.compile(r"\s+(OR|AND)\s+", re.IGNORECASE)


def leer_config(texto: str) -> dict[str, list[str]]:
    """{clave: [entradas]} de las listas `- X` de primer nivel del YAML."""
    listas: dict[str, list[str]] = {}
    actual = None
    for linea in texto.splitlines():
        limpia = linea.split("#", 1)[0].rstrip()
        if not limpia.strip():
            continue
        if not linea.startswith((" ", "-")):
            actual = limpia.split(":", 1)[0].strip()
            listas[actual] = []
        elif actual and limpia.strip().startswith("- "):
            listas[actual].append(limpia.strip()[2:].strip())
    return listas


def _envuelve(expresion: str) -> bool:
    """¿El primer paréntesis se cierra justo al final? «(A) AND (B)» no."""
    if not (expresion.startswith("(") and expresion.endswith(")")):
        return False
    nivel = 0
    for i, c in enumerate(expresion):
        nivel += {"(": 1, ")": -1}.get(c, 0)
        if nivel == 0 and i < len(expresion) - 1:
            return False
    return True


def _partir(expresion: str, operador: str) -> list[str]:
    """Trozos separados por OR o AND fuera de cualquier paréntesis."""
    trozos, nivel, inicio = [], 0, 0
    for m in _OPERADOR.finditer(expresion):
        nivel = expresion.count("(", 0, m.start()) - expresion.count(")", 0, m.start())
        if nivel == 0 and m.group(1).upper() == operador:
            trozos.append(expresion[inicio:m.start()])
            inicio = m.end()
    return trozos + [expresion[inicio:]]


def _permitida(expresion: str, permitidas: set[str]) -> bool:
    expresion = expresion.strip()
    while _envuelve(expresion):
        expresion = expresion[1:-1].strip()
    # AND liga más que OR: se parte primero por los OR de fuera
    if len(alternativas := _partir(expresion, "OR")) > 1:
        return any(_permitida(parte, permitidas) for parte in alternativas)
    if len(requisitos := _partir(expresion, "AND")) > 1:
        return all(_permitida(parte, permitidas) for parte in requisitos)
    return expresion.rstrip("*").lower() in permitidas


def _nombre(paquete: str) -> str:
    """'@scope/pkg@1.2.3' -> '@scope/pkg'."""
    return paquete.rsplit("@", 1)[0] if paquete.rfind("@") > 0 else paquete


def rechazados(informe: dict, permitidas: set[str], excepciones: set[str]) -> list[str]:
    fuera = []
    for paquete, datos in sorted(informe.items()):
        if f"pkg:npm/{_nombre(paquete)}" in excepciones:
            continue
        valor = datos.get("licenses", "") if isinstance(datos, dict) else ""
        nombres = [str(n) for n in valor] if isinstance(valor, list) else [str(valor)]
        if not all(_permitida(n, permitidas) for n in nombres):
            fuera.append(f"{paquete} ({' / '.join(nombres) or 'none'})")
    return fuera


def _para_la_tarjeta(**valores) -> None:
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
        print("Uso: license_gate.py <licenses.json> <dependency-review-config.yml>")
        return 2
    try:
        informe = json.loads(Path(argv[0]).read_text())
        config = leer_config(Path(argv[1]).read_text())
    except (OSError, ValueError) as error:
        print(f"::error::No se pudo leer el informe o la configuración: {error}")
        return 2
    permitidas = {l.lower() for l in config.get("allow-licenses", [])}
    if not permitidas:
        print("::error::La configuración no tiene allow-licenses: no hay contra qué comparar")
        return 2
    if not isinstance(informe, dict) or not informe:
        print("::error::license-checker no ha listado ningún paquete")
        return 2
    fuera = rechazados(informe, permitidas, set(config.get("allow-dependencies-licenses", [])))
    _para_la_tarjeta(checked=len(informe), rejected=", ".join(fuera))
    for paquete in fuera:
        print(f"::error::Licencia fuera de la lista de permitidas: {paquete}")
    if fuera:
        print(f"{len(fuera)} de {len(informe)} paquete(s) con una licencia no permitida.")
        return 1
    print(f"✅ Los {len(informe)} paquetes tienen una licencia permitida")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
