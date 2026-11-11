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
"""

import json
import unittest
from pathlib import Path
from unittest import mock

import cabeceras_de_produccion as cp

SENTRY = "https://sentry.example/api/1/security/?sentry_key=k"
ESPERADO = {
    "sentry_csp": SENTRY,
    "rutas": {
        "/": {
            "x-frame-options": "DENY",
            "content-security-policy": "default-src 'self'; script-src 'self'; report-uri {sentry_csp}",
        },
        "/logo.png": {"cross-origin-resource-policy": "cross-origin"},
    },
}


def respuestas(por_ruta):
    """Un `pide` falso: las cabeceras que devuelve cada ruta (en minúsculas o no)."""
    def pide(url):
        for ruta, cabeceras in por_ruta.items():
            if url.endswith(ruta):
                return cabeceras
        raise AssertionError(url)
    return pide


BUENAS = {
    "/": {"X-Frame-Options": "DENY", "Content-Security-Policy": f"default-src 'self'; script-src 'self'; report-uri {SENTRY}"},
    "/logo.png": {"Cross-Origin-Resource-Policy": "cross-origin"},
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
        malas = {**BUENAS, "/logo.png": {"Cross-Origin-Resource-Policy": "same-origin"}}
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
        dos_corp = {**BUENAS, "/logo.png": {"Cross-Origin-Resource-Policy": ["same-origin", "cross-origin"]}}
        self.assertIn("2 veces", self.comprueba(dos_corp)[0])

    def test_h8_el_fichero_de_verdad(self):
        esperado = json.loads((Path(__file__).parent / "cabeceras_de_produccion.json").read_text())
        self.assertIn("/", esperado["rutas"])
        self.assertIn("/images/rcf-monogram-white.png", esperado["rutas"])
        self.assertIn("content-security-policy", esperado["rutas"]["/"])


class Salida(unittest.TestCase):
    def test_main_sale_1_con_fallos_y_0_sin_ellos(self):
        with mock.patch.object(cp, "compara", return_value=["falta x"]), mock.patch("builtins.print"):
            self.assertEqual(cp.main(["https://www.example"]), 1)
        with mock.patch.object(cp, "compara", return_value=[]), mock.patch("builtins.print"):
            self.assertEqual(cp.main(["https://www.example"]), 0)


if __name__ == "__main__":
    unittest.main()
