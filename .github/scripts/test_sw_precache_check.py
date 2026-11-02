"""
Tests de sw_precache_check.py. Solo librería estándar; el CI los pasa con los
demás:

  python3 -m unittest discover -s .github/scripts -p "test_*.py"

minimatch 11 con el glob 11 de workbox dejaba el precache en 4 ficheros de 251,
sin un error en el build (2 nov 2026): la app instalada se quedaba sin la app.

| Caso | Situación                                                   | Sale |
|------|-------------------------------------------------------------|------|
| P1   | todo JS/MJS/CSS de assets, index.html y offline.html dentro | 0    |
| P2   | falta un .js (o un .css) de assets: dice cuál               | 1    |
| P3   | falta index.html u offline.html: dice cuál                  | 1    |
| P4   | no hay sw.js                                                | 1    |
| P5   | sw.js sin lista de precache que leer                        | 1    |
| P6   | las fuentes que se dejan fuera a propósito no cuentan       | 0    |
"""

import io
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import sw_precache_check

ASSETS = ["assets/index-AbC123.js", "assets/teselas-XyZ789.js", "assets/maplibre-gl-worker-Q1.mjs", "assets/index-Dpg.css"]
PAGINAS = ["index.html", "offline.html"]


class PrecacheDelServiceWorker(unittest.TestCase):
    def setUp(self):
        self.dist = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.dist)
        (self.dist / "assets").mkdir()
        for fichero in ASSETS + PAGINAS:
            (self.dist / fichero).write_text("x")
        # Sin esto, los «::error::» de los casos rojos salen como anotaciones en el CI
        self.log = io.StringIO()
        salida = mock.patch("sys.stdout", self.log)
        salida.start()
        self.addCleanup(salida.stop)

    def sw(self, urls: list[str]) -> None:
        """Un sw.js como el que genera workbox, minificado."""
        lista = ",".join(f'{{url:"{u}",revision:null}}' for u in urls)
        (self.dist / "sw.js").write_text(f'define(["./workbox-1"],function(e){{e.precacheAndRoute([{lista}],{{}})}});')

    def correr(self) -> int:
        return sw_precache_check.main([str(self.dist)])

    def test_P1_todo_dentro(self):
        self.sw(ASSETS + PAGINAS + ["icons/pwa-192x192.png"])
        self.assertEqual(self.correr(), 0)
        self.assertNotIn("::error::", self.log.getvalue())

    def test_P1_las_comillas_dobles_de_un_sw_sin_minificar(self):
        lista = ",".join(f'{{"url": "{u}", "revision": null}}' for u in ASSETS + PAGINAS)
        (self.dist / "sw.js").write_text(f"self.precacheAndRoute([{lista}]);")
        self.assertEqual(self.correr(), 0)

    def test_P2_falta_un_js(self):
        self.sw([a for a in ASSETS if "teselas" not in a] + PAGINAS)
        self.assertEqual(self.correr(), 1)
        self.assertIn("assets/teselas-XyZ789.js", self.log.getvalue())

    def test_P2_falta_un_css(self):
        self.sw([a for a in ASSETS if not a.endswith(".css")] + PAGINAS)
        self.assertEqual(self.correr(), 1)
        self.assertIn("assets/index-Dpg.css", self.log.getvalue())

    def test_P2_falta_el_worker_mjs(self):
        self.sw([a for a in ASSETS if not a.endswith(".mjs")] + PAGINAS)
        self.assertEqual(self.correr(), 1)

    def test_P2_un_js_en_una_subcarpeta_de_assets(self):
        (self.dist / "assets" / "trozos").mkdir()
        (self.dist / "assets" / "trozos" / "otro.js").write_text("x")
        self.sw(ASSETS + PAGINAS)
        self.assertEqual(self.correr(), 1)
        self.assertIn("assets/trozos/otro.js", self.log.getvalue())

    def test_P2_el_caso_real_cuatro_de_doscientos(self):
        # Lo que dejaba minimatch 11 con glob 11: solo lo de fuera de assets
        self.sw(["offline.js", "offline.html", "icons/pwa-192x192.png", "icons/pwa-512x512.png"])
        self.assertEqual(self.correr(), 1)

    def test_P3_falta_index_html(self):
        self.sw(ASSETS + ["offline.html"])
        self.assertEqual(self.correr(), 1)
        self.assertIn("index.html", self.log.getvalue())

    def test_P3_falta_offline_html(self):
        self.sw(ASSETS + ["index.html"])
        self.assertEqual(self.correr(), 1)
        self.assertIn("offline.html", self.log.getvalue())

    def test_P4_sin_sw_js(self):
        self.assertEqual(self.correr(), 1)
        self.assertIn("::error::", self.log.getvalue())

    def test_P5_sw_js_sin_lista_que_leer(self):
        (self.dist / "sw.js").write_text("self.addEventListener('install', () => self.skipWaiting());")
        self.assertEqual(self.correr(), 1)
        # Que diga que no encontró la lista, no que faltan los ficheros
        self.assertIn("No precache list found", self.log.getvalue())

    def test_P6_las_fuentes_que_se_dejan_fuera_no_cuentan(self):
        for fuente in ["inter-cyrillic-wght-normal-B.woff2", "poppins-devanagari-400-normal-C.woff"]:
            (self.dist / "assets" / fuente).write_text("x")
        self.sw(ASSETS + PAGINAS)
        self.assertEqual(self.correr(), 0)

    def test_sin_argumento(self):
        self.assertEqual(sw_precache_check.main([]), 1)


if __name__ == "__main__":
    unittest.main()
