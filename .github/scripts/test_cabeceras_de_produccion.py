"""
Tests de cabeceras_de_produccion.py. Solo librería estándar; el CI los pasa con los
demás:

  python3 -m unittest discover -s .github/scripts -p "test_*.py"

Las cabeceras de producción viven en el dashboard de Render, fuera del repo: entre
diciembre de 2025 y agosto de 2026 faltó una sin que nadie lo notara (FE-05, fase 4 del
plan a 9). El comprobador las pide a producción y las compara con
cabeceras_de_produccion.json.

| Caso | Situación                                                           | Sale |
|------|---------------------------------------------------------------------|------|
| H1   | todas las cabeceras como en el fichero                              | 0    |
| H2   | falta una cabecera: dice cuál y en qué ruta                         | 1    |
| H3   | una cabecera con otro valor: dice cuál, lo esperado y lo que llegó  | 1    |
| H4   | la CSP con las mismas directivas en otro orden o con otros espacios | 0    |
| H5   | la CSP con una directiva de más o de menos: dice cuál               | 1    |
| H6   | el marcador {sentry_csp} se sustituye por la dirección de Sentry    | 0    |
| H7   | no se puede pedir la página: lo dice y sale 1                       | 1    |
| H8   | el fichero de verdad se puede leer y trae las dos rutas             | —    |
| H9   | una cabecera repetida (dos CSP, dos CORP): el navegador aplica las  | 1    |
|      | dos, así que es un fallo aunque una sea la buena                    |      |
| H10  | un fallo de red pasajero: se reintenta y, si a la segunda llega, OK | 0    |
| H11  | llega una de seguridad que el fichero no espera (una                | 1    |
|      | Content-Security-Policy-Report-Only vieja): sobra; las de Cloudflare |      |
|      | (report-to, nel) y las que no son de seguridad no cuentan           |      |
| H12  | cada ruta lleva las de «/» más las suyas (las suyas mandan)         | 1    |
| H13  | /assets/*.js: se mira un JS de verdad, sacado del index.html de «/» | 0    |
| H14  | sin un JS en el index.html, o sin poder pedir «/»: lo dice          | 1    |
| H15  | una redirección es un fallo: no se sigue ni se reintenta            | 1    |
| H16  | `pide` no sigue redirecciones (servidor local, no producción)       | —    |
| H17  | fuera de la CSP, los espacios dan igual («max-age=1;  x»)           | 0    |
| H18  | las claves «_…» (comentarios) no son cabeceras                      | 0    |
"""

import http.server
import json
import threading
import unittest
from pathlib import Path
from unittest import mock

import cabeceras_de_produccion as cp

SENTRY = "https://sentry.example/api/1/security/?sentry_key=k"
ESPERADO = {
    "sentry_csp": SENTRY,
    "rutas": {
        "/": {
            "_comentario": "no es una cabecera",
            "x-frame-options": "DENY",
            "content-security-policy": "default-src 'self'; script-src 'self'; report-uri {sentry_csp}",
        },
        "/logo.png": {"_comentario": "tampoco", "cross-origin-resource-policy": "cross-origin"},
    },
}
CSP_BUENA = f"default-src 'self'; script-src 'self'; report-uri {SENTRY}"


def respuestas(por_ruta):
    """Un `pide` falso: las cabeceras que devuelve cada ruta (en minúsculas o no)."""
    def pide(url):
        for ruta, cabeceras in por_ruta.items():
            if url.endswith(ruta):
                return cabeceras
        raise AssertionError(url)
    return pide


BUENAS = {
    "/": {"X-Frame-Options": "DENY", "Content-Security-Policy": CSP_BUENA, "Server": "cloudflare"},
    # Cada ruta lleva también las de «/» (en Render, la regla /* cubre todo)
    "/logo.png": {"X-Frame-Options": "DENY", "Content-Security-Policy": CSP_BUENA, "Cross-Origin-Resource-Policy": "cross-origin"},
}


class ComprobarCabeceras(unittest.TestCase):
    def comprueba(self, por_ruta):
        return cp.compara(ESPERADO, "https://www.example", respuestas(por_ruta))

    def test_h1_todas_bien(self):
        self.assertEqual(self.comprueba(BUENAS), [])

    def test_h2_falta_una(self):
        malas = {**BUENAS, "/": {"Content-Security-Policy": BUENAS["/"]["Content-Security-Policy"]}}
        fallos = self.comprueba(malas)
        self.assertEqual(len(fallos), 1)
        self.assertIn("x-frame-options", fallos[0])
        self.assertIn("/", fallos[0])

    def test_h3_otro_valor(self):
        malas = {**BUENAS, "/logo.png": {**BUENAS["/logo.png"], "Cross-Origin-Resource-Policy": "same-origin"}}
        fallos = self.comprueba(malas)
        self.assertEqual(len(fallos), 1)
        self.assertIn("cross-origin", fallos[0])
        self.assertIn("same-origin", fallos[0])

    def test_h4_csp_en_otro_orden(self):
        csp = f"script-src  'self' ;report-uri {SENTRY};  default-src 'self'"
        self.assertEqual(self.comprueba({**BUENAS, "/": {**BUENAS["/"], "Content-Security-Policy": csp}}), [])

    def test_h5_csp_con_directiva_de_mas_o_de_menos(self):
        de_mas = {**BUENAS, "/": {**BUENAS["/"], "Content-Security-Policy": BUENAS["/"]["Content-Security-Policy"] + "; img-src *"}}
        fallos = self.comprueba(de_mas)
        self.assertEqual(len(fallos), 1)
        self.assertIn("img-src", fallos[0])
        de_menos = {**BUENAS, "/": {**BUENAS["/"], "Content-Security-Policy": "default-src 'self'; script-src 'self'"}}
        self.assertIn("report-uri", self.comprueba(de_menos)[0])

    def test_h6_marcador_sustituido(self):
        self.assertEqual(cp.valor(ESPERADO, "{sentry_csp}x"), SENTRY + "x")

    def test_h7_no_se_puede_pedir(self):
        intentos = []
        def pide(url):
            intentos.append(url)
            raise OSError("sin red")
        fallos = cp.compara(ESPERADO, "https://www.example", pide, espera=lambda s: None)
        self.assertTrue(fallos)
        self.assertIn("sin red", fallos[0])
        self.assertEqual(len(intentos), 2 * 3)  # dos rutas, tres intentos cada una

    def test_h10_fallo_pasajero(self):
        veces = {"n": 0}
        buenas = respuestas(BUENAS)
        def pide(url):
            veces["n"] += 1
            if veces["n"] == 1:
                raise OSError("timeout")
            return buenas(url)
        esperas = []
        self.assertEqual(cp.compara(ESPERADO, "https://www.example", pide, espera=esperas.append), [])
        self.assertEqual(len(esperas), 1)

    def test_h9_cabecera_repetida(self):
        vieja = "default-src 'self'; style-src https://fonts.googleapis.com"
        malas = {**BUENAS, "/": {**BUENAS["/"], "Content-Security-Policy": [vieja, BUENAS["/"]["Content-Security-Policy"]]}}
        fallos = self.comprueba(malas)
        self.assertEqual(len(fallos), 1)
        self.assertIn("2 veces", fallos[0])
        dos_corp = {**BUENAS, "/logo.png": {**BUENAS["/logo.png"], "Cross-Origin-Resource-Policy": ["same-origin", "cross-origin"]}}
        self.assertIn("2 veces", self.comprueba(dos_corp)[0])

    def test_h8_el_fichero_de_verdad(self):
        esperado = json.loads((Path(__file__).parent / "cabeceras_de_produccion.json").read_text())
        self.assertIn("/", esperado["rutas"])
        self.assertIn("/images/rcf-monogram-white.png", esperado["rutas"])
        self.assertIn("content-security-policy", esperado["rutas"]["/"])
        # Un JS del build y una ruta profunda de la SPA (#1100)
        self.assertIn(cp.ASSET_JS, esperado["rutas"])
        profundas = [r for r in esperado["rutas"] if r.count("/") >= 3 and not r.startswith(("/assets/", "/images/"))]
        self.assertTrue(profundas)

    def test_h11_sobra_una_de_seguridad(self):
        vieja = "default-src 'self'; style-src https://fonts.googleapis.com"
        malas = {**BUENAS, "/": {**BUENAS["/"], "Content-Security-Policy-Report-Only": vieja}}
        fallos = self.comprueba(malas)
        self.assertEqual(len(fallos), 1)
        self.assertIn("content-security-policy-report-only", fallos[0])
        self.assertIn("sobra", fallos[0])
        hsts = {**BUENAS, "/logo.png": {**BUENAS["/logo.png"], "Strict-Transport-Security": "max-age=1"}}
        self.assertIn("strict-transport-security", self.comprueba(hsts)[0])
        # Lo que añade el Cloudflare de Render (NEL) y lo que no es de seguridad no cuenta
        cloudflare = {"Report-To": '{"group":"cf-nel"}', "NEL": "{}", "Cache-Control": "no-cache", "Vary": "x"}
        otras = {r: {**c, **cloudflare} for r, c in BUENAS.items()}
        self.assertEqual(self.comprueba(otras), [])

    def test_h12_cada_ruta_lleva_las_de_la_raiz(self):
        sin_xfo = {**BUENAS, "/logo.png": {k: v for k, v in BUENAS["/logo.png"].items() if k != "X-Frame-Options"}}
        fallos = self.comprueba(sin_xfo)
        self.assertEqual(len(fallos), 1)
        self.assertIn("/logo.png", fallos[0])
        self.assertIn("x-frame-options", fallos[0])
        # La suya manda sobre la de «/»: same-origin en el logo es un fallo, aunque «/» lo diga
        esperado = {**ESPERADO, "rutas": {**ESPERADO["rutas"], "/": {**ESPERADO["rutas"]["/"], "cross-origin-resource-policy": "same-origin"}}}
        buenas = {"/": {**BUENAS["/"], "Cross-Origin-Resource-Policy": "same-origin"}, "/logo.png": BUENAS["/logo.png"]}
        self.assertEqual(cp.compara(esperado, "https://www.example", respuestas(buenas)), [])


class ElJsDelBuild(unittest.TestCase):
    ESPERADO = {**ESPERADO, "rutas": {"/": ESPERADO["rutas"]["/"], cp.ASSET_JS: {}}}
    INDEX = (
        '<html><head><link rel="modulepreload" href="/assets/vendor-x.js">'
        '<script type="module" crossorigin src="/assets/index-AbC_1.js" integrity="sha384-x"></script>'
        "</head></html>"
    )

    def comprueba(self, index, cabeceras_del_js=None, pagina=None):
        pedidas = []

        def pide(url):
            pedidas.append(url)
            if url.endswith("/assets/index-AbC_1.js"):
                return cabeceras_del_js if cabeceras_del_js is not None else BUENAS["/"]
            return respuestas({"/": BUENAS["/"]})(url)

        def pide_pagina(url):
            pedidas.append("pagina " + url)
            return pagina(url) if pagina else index

        fallos = cp.compara(self.ESPERADO, "https://www.example", pide, espera=lambda s: None, pide_pagina=pide_pagina)
        return fallos, pedidas

    def test_h13_mira_el_js_del_index(self):
        fallos, pedidas = self.comprueba(self.INDEX)
        self.assertEqual(fallos, [])
        self.assertIn("https://www.example/assets/index-AbC_1.js", pedidas)
        self.assertIn("pagina https://www.example/", pedidas)
        fallos, _ = self.comprueba(self.INDEX, {"Content-Security-Policy": CSP_BUENA})
        self.assertEqual(len(fallos), 1)
        self.assertIn("/assets/index-AbC_1.js", fallos[0])
        self.assertIn("x-frame-options", fallos[0])

    def test_h14_sin_js_en_el_index(self):
        fallos, _ = self.comprueba("<html><body>mantenimiento</body></html>")
        self.assertEqual(len(fallos), 1)
        self.assertIn(cp.ASSET_JS, fallos[0])

        def sin_red(url):
            raise OSError("sin red")
        fallos, _ = self.comprueba(None, pagina=sin_red)
        self.assertEqual(len(fallos), 1)
        self.assertIn("sin red", fallos[0])


class Redirecciones(unittest.TestCase):
    def test_h15_una_redireccion_es_un_fallo(self):
        veces = []

        def pide(url):
            veces.append(url)
            if url.endswith("/logo.png"):
                raise cp.Redirige("redirige (301) a https://otro.example/logo.png")
            return BUENAS["/"]
        fallos = cp.compara(ESPERADO, "https://www.example", pide, espera=lambda s: None)
        self.assertEqual(len(fallos), 1)
        self.assertIn("/logo.png", fallos[0])
        self.assertIn("redirige", fallos[0])
        self.assertEqual(veces.count("https://www.example/logo.png"), 1)  # no se reintenta

    def test_h16_pide_no_sigue_redirecciones(self):
        pedidas = []

        class Manejador(http.server.BaseHTTPRequestHandler):
            def do_GET(self):  # noqa: N802 - nombre de la librería
                pedidas.append(self.path)
                if self.path == "/vieja":
                    self.send_response(301)
                    self.send_header("Location", "/nueva")
                else:
                    self.send_response(200)
                    self.send_header("X-Frame-Options", "DENY")
                    self.send_header("Content-Type", "text/html")
                self.end_headers()
                if self.path != "/vieja":
                    self.wfile.write(b'<script src="/assets/a.js"></script>')

            def log_message(self, *args):
                pass

        servidor = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Manejador)
        threading.Thread(target=servidor.serve_forever, daemon=True).start()
        base = f"http://127.0.0.1:{servidor.server_address[1]}"
        try:
            self.assertEqual(cp.pide(base + "/nueva")["x-frame-options"], ["DENY"])
            self.assertIn("/assets/a.js", cp.pide_pagina(base + "/nueva"))
            for funcion in (cp.pide, cp.pide_pagina):
                with self.assertRaises(cp.Redirige) as error:
                    funcion(base + "/vieja")
                self.assertIn("301", str(error.exception))
                self.assertIn("/nueva", str(error.exception))
        finally:
            servidor.shutdown()
            servidor.server_close()
        self.assertEqual(pedidas.count("/vieja"), 2)
        self.assertEqual(pedidas.count("/nueva"), 2)  # las dos de arriba: ninguna por redirección


class Normalizacion(unittest.TestCase):
    def test_h17_los_espacios_dan_igual_fuera_de_la_csp(self):
        esperado = {"rutas": {"/": {"strict-transport-security": "max-age=1; includeSubDomains"}}}
        llegan = respuestas({"/": {"Strict-Transport-Security": "  max-age=1;   includeSubDomains "}})
        self.assertEqual(cp.compara(esperado, "https://www.example", llegan), [])

    def test_h18_los_comentarios_no_son_cabeceras(self):
        # ESPERADO lleva «_comentario» en las dos rutas, y producción no lo manda
        self.assertEqual(cp.compara(ESPERADO, "https://www.example", respuestas(BUENAS)), [])


class Salida(unittest.TestCase):
    def test_main_sale_1_con_fallos_y_0_sin_ellos(self):
        with mock.patch.object(cp, "compara", return_value=["falta x"]), mock.patch("builtins.print"):
            self.assertEqual(cp.main(["https://www.example"]), 1)
        with mock.patch.object(cp, "compara", return_value=[]), mock.patch("builtins.print"):
            self.assertEqual(cp.main(["https://www.example"]), 0)


if __name__ == "__main__":
    unittest.main()
