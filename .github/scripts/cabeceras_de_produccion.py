"""
Comprueba las cabeceras de seguridad que sirve producción (FE-05, fase 4 del plan a 9).

Render sirve las cabeceras de www.rydercupfriends.com desde su dashboard, que no lee el
repo: entre diciembre de 2025 y agosto de 2026 faltó una sin que nadie lo notara. Este
guion pide cada ruta de `cabeceras_de_produccion.json` y compara lo que llega con lo
esperado. La CSP se compara directiva a directiva (el orden y los espacios dan igual).

Cada ruta lleva las cabeceras de «/» más las suyas, que mandan (en Render, la regla /*
cubre todo). Sobra cualquier cabecera de seguridad que llegue sin esperarse (una
Content-Security-Policy-Report-Only vieja, por ejemplo). `/assets/*.js` es un JS del build
de verdad, sacado del index.html que sirve «/». Una redirección es un fallo: no se sigue.

Uso: python cabeceras_de_produccion.py <origen>   (p. ej. https://www.rydercupfriends.com)
Salidas: 0 todo como se espera · 1 falta o sobra algo (lo dice) · 2 uso incorrecto
"""

import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

FICHERO = Path(__file__).parent / "cabeceras_de_produccion.json"
_CSP = {"content-security-policy", "content-security-policy-report-only"}
# Un fallo de red pasajero no abre una issue: tres intentos, con 10 s y 20 s entre ellos
INTENTOS = 3
# Las de seguridad: si llega una que el fichero no espera para esa ruta, sobra. report-to y
# nel no están: las añade el Cloudflare de Render (NEL), fuera de nuestro dashboard
GESTIONADAS = {
    "content-security-policy",
    "content-security-policy-report-only",
    "cross-origin-embedder-policy",
    "cross-origin-embedder-policy-report-only",
    "cross-origin-opener-policy",
    "cross-origin-opener-policy-report-only",
    "cross-origin-resource-policy",
    "document-policy",
    "feature-policy",
    "permissions-policy",
    "referrer-policy",
    "reporting-endpoints",
    "strict-transport-security",
    "x-content-type-options",
    "x-frame-options",
    "x-permitted-cross-domain-policies",
    "x-xss-protection",
}
# La ruta del fichero que no se pide tal cual: un JS del build sacado del index.html de «/»
ASSET_JS = "/assets/*.js"
_JS_DEL_INDEX = re.compile(r"""<script\b[^>]*\bsrc=["']?(/assets/[\w.-]+\.js)["'\s>]""", re.IGNORECASE)


class SinScriptEnElIndex(Exception):
    """El index.html no enlaza ningún JS del build: no hay ruta de assets que comprobar."""


class Redirige(Exception):
    """La ruta contesta con una redirección: es un fallo, y no se reintenta."""


class _SinRedirecciones(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):  # noqa: D102 - no seguir ninguna
        return None


_ABRIDOR = urllib.request.build_opener(_SinRedirecciones)


def valor(esperado, texto):
    """El valor esperado con el marcador {sentry_csp} sustituido."""
    return texto.replace("{sentry_csp}", esperado.get("sentry_csp", ""))


def _directivas(csp):
    """Una CSP como conjunto de directivas normalizadas (orden y espacios aparte)."""
    return {" ".join(d.split()) for d in csp.split(";") if d.strip()}


def _abre(url, lee):
    """Un GET sin seguir redirecciones; `lee` saca lo que interesa de la respuesta."""
    peticion = urllib.request.Request(url, headers={"User-Agent": "rydercup-cabeceras/1.0"})
    try:
        with _ABRIDOR.open(peticion, timeout=30) as respuesta:  # noqa: S310 - origen fijo del workflow
            return lee(respuesta)
    except urllib.error.HTTPError as error:
        if 300 <= error.code < 400:
            raise Redirige(f"redirige ({error.code}) a {error.headers.get('Location')}") from None
        raise


def pide(url):
    """Las cabeceras de un GET a esa dirección: cada nombre, con todos sus valores."""
    def cabeceras(respuesta):
        nombres = {k.lower() for k in respuesta.headers.keys()}
        return {n: respuesta.headers.get_all(n) for n in nombres}
    return _abre(url, cabeceras)


def pide_pagina(url):
    """El HTML de esa dirección (para sacar el JS del build del index.html)."""
    return _abre(url, lambda respuesta: respuesta.read().decode("utf-8", "replace"))


def _pide_con_reintentos(pide_cabeceras, url, espera):
    """Las cabeceras, reintentando un fallo de red; el último error si no llega nunca."""
    for intento in range(1, INTENTOS + 1):
        try:
            return pide_cabeceras(url)
        except Redirige:
            raise  # una redirección no es pasajera
        except Exception:  # noqa: BLE001 - cualquier fallo de red se reintenta
            if intento == INTENTOS:
                raise
            espera(10 * intento)
    raise AssertionError("inalcanzable")


def _esperadas(esperado, ruta):
    """Las cabeceras de esa ruta: las de «/» más las suyas, sin los comentarios («_…»)."""
    juntas = {**esperado["rutas"].get("/", {}), **esperado["rutas"][ruta]}
    return {nombre: texto for nombre, texto in juntas.items() if not nombre.startswith("_")}


def _js_del_build(origen, pide_pagina, espera):
    """La ruta de un JS del build: el primer <script src="/assets/….js"> del index.html."""
    encontrado = _JS_DEL_INDEX.search(_pide_con_reintentos(pide_pagina, origen + "/", espera))
    if not encontrado:
        raise SinScriptEnElIndex("el index.html de «/» no trae ningún <script src=\"/assets/….js\">")
    return encontrado.group(1)


def compara(esperado, origen, pide_cabeceras=pide, espera=time.sleep, pide_pagina=pide_pagina):
    """Los fallos de cada ruta: lo que falta, sobra o no coincide. Vacío si todo cuadra."""
    fallos = []
    origen = origen.rstrip("/")
    for ruta in esperado["rutas"]:
        cabeceras = _esperadas(esperado, ruta)
        pedida = ruta
        try:
            if ruta == ASSET_JS:
                pedida = _js_del_build(origen, pide_pagina, espera)
            # Cada nombre con la lista de sus valores: una cabecera repetida se ve
            llegan = {
                k.lower(): (v if isinstance(v, list) else [v])
                for k, v in _pide_con_reintentos(pide_cabeceras, origen + pedida, espera).items()
            }
        except Redirige as error:
            fallos.append(f"{pedida}: {error}; las cabeceras se miran sin seguir redirecciones")
            continue
        except SinScriptEnElIndex as error:
            fallos.append(f"{ruta}: {error}")
            continue
        except Exception as error:  # noqa: BLE001 - cualquier fallo de red es un fallo de la comprobación
            fallos.append(f"{pedida}: no se pudo pedir tras {INTENTOS} intentos ({error})")
            continue
        ruta = pedida
        for nombre in sorted(set(llegan) & GESTIONADAS - set(cabeceras)):
            fallos.append(f"{ruta}: sobra {nombre} («{' | '.join(llegan[nombre])}»), el fichero no la espera")
        for nombre, texto in cabeceras.items():
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
