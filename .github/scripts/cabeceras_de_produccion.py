"""
Comprueba las cabeceras de seguridad que sirve producción (FE-05, fase 4 del plan a 9).

Render sirve las cabeceras de www.rydercupfriends.com desde su dashboard, que no lee el
repo: entre diciembre de 2025 y agosto de 2026 faltó una sin que nadie lo notara. Este
guion pide cada ruta de `cabeceras_de_produccion.json` y compara lo que llega con lo
esperado. La CSP se compara directiva a directiva (el orden y los espacios dan igual).

Uso: python cabeceras_de_produccion.py <origen>   (p. ej. https://www.rydercupfriends.com)
Salidas: 0 todo como se espera · 1 falta o sobra algo (lo dice) · 2 uso incorrecto
"""

import json
import sys
import time
import urllib.request
from pathlib import Path

FICHERO = Path(__file__).parent / "cabeceras_de_produccion.json"
_CSP = {"content-security-policy", "content-security-policy-report-only"}
# Un fallo de red pasajero no abre una issue: tres intentos, con 10 s y 20 s entre ellos
INTENTOS = 3


def valor(esperado, texto):
    """El valor esperado con el marcador {sentry_csp} sustituido."""
    return texto.replace("{sentry_csp}", esperado.get("sentry_csp", ""))


def _directivas(csp):
    """Una CSP como conjunto de directivas normalizadas (orden y espacios aparte)."""
    return {" ".join(d.split()) for d in csp.split(";") if d.strip()}


def pide(url):
    """Las cabeceras de un GET a esa dirección: cada nombre, con todos sus valores."""
    peticion = urllib.request.Request(url, headers={"User-Agent": "rydercup-cabeceras/1.0"})
    with urllib.request.urlopen(peticion, timeout=30) as respuesta:  # noqa: S310 - origen fijo del workflow
        nombres = {k.lower() for k in respuesta.headers.keys()}
        return {n: respuesta.headers.get_all(n) for n in nombres}


def _pide_con_reintentos(pide_cabeceras, url, espera):
    """Las cabeceras, reintentando un fallo de red; el último error si no llega nunca."""
    for intento in range(1, INTENTOS + 1):
        try:
            return pide_cabeceras(url)
        except Exception:  # noqa: BLE001 - cualquier fallo de red se reintenta
            if intento == INTENTOS:
                raise
            espera(10 * intento)
    raise AssertionError("inalcanzable")


def compara(esperado, origen, pide_cabeceras=pide, espera=time.sleep):
    """Los fallos de cada ruta: lo que falta o no coincide. Vacío si todo cuadra."""
    fallos = []
    for ruta, cabeceras in esperado["rutas"].items():
        try:
            # Cada nombre con la lista de sus valores: una cabecera repetida se ve
            llegan = {
                k.lower(): (v if isinstance(v, list) else [v])
                for k, v in _pide_con_reintentos(pide_cabeceras, origen.rstrip("/") + ruta, espera).items()
            }
        except Exception as error:  # noqa: BLE001 - cualquier fallo de red es un fallo de la comprobación
            fallos.append(f"{ruta}: no se pudo pedir tras {INTENTOS} intentos ({error})")
            continue
        for nombre, texto in cabeceras.items():
            if nombre.startswith("_"):
                continue
            quiere = valor(esperado, texto)
            valores = llegan.get(nombre)
            if not valores:
                fallos.append(f"{ruta}: falta {nombre} (se espera «{quiere}»)")
                continue
            if len(valores) > 1:
                # El navegador aplica las dos (dos CSP) o ninguna (dos CORP): fallo siempre
                fallos.append(f"{ruta}: {nombre} llega {len(valores)} veces: {valores}")
                continue
            hay = valores[0]
            if nombre in _CSP:
                sobran = sorted(_directivas(hay) - _directivas(quiere))
                faltan = sorted(_directivas(quiere) - _directivas(hay))
                if sobran or faltan:
                    fallos.append(f"{ruta}: {nombre} distinta; faltan {faltan or '—'}; sobran {sobran or '—'}")
            elif " ".join(hay.split()) != " ".join(quiere.split()):
                fallos.append(f"{ruta}: {nombre} es «{hay}», se espera «{quiere}»")
    return fallos


def main(argv):
    """Compara y dice qué falla; 1 si algo falla."""
    if len(argv) != 1:
        print(__doc__)
        return 2
    esperado = json.loads(FICHERO.read_text())
    fallos = compara(esperado, argv[0])
    for fallo in fallos:
        print(f"✗ {fallo}")
    if not fallos:
        print(f"✓ Las cabeceras de {argv[0]} son las de cabeceras_de_produccion.json")
    return 1 if fallos else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
