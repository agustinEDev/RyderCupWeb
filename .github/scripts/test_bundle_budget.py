"""
Tests de bundle_budget.py (#374). Solo librería estándar; el CI los pasa en el
job de licencias junto a los demás:

  python3 -m unittest discover -s .github/scripts -p "test_*.py"

Los trozos son bytes aleatorios con semilla: gzip no los comprime, así que su
tamaño comprimido es el suyo más unos pocos bytes de cabecera.

| Caso | Situación                                          | Sale |
|------|----------------------------------------------------|------|
| B1   | arranque por debajo del aviso                      | 0    |
| B2   | arranque entre el aviso y el tope                  | 0    |
| B3   | arranque por encima del tope                       | 1    |
| B4   | arranque justo en el tope                          | 0    |
| B5   | index.html sin ningún JS                           | 1    |
| B6   | index.html apunta a un JS que no está en dist/     | 1    |
| B7   | las pantallas diferidas no cuentan en el arranque  | 0    |
| B7b  | el arranque se mide comprimido                     | 0    |
| B8   | un JS como script y como preload cuenta una vez    | 0    |
| B9   | trozo diferido grande pero bajo su tope            | 0    |
| B10  | un trozo por encima de su tope                     | 1    |
| B11  | total del disco por encima de su aviso             | 0    |
| B12  | el total y la lista salen en el log                | —    |
| B13  | dist/assets sin ningún JS                          | 1    |
| B14  | GITHUB_OUTPUT con el arranque, el tope y el aviso  | —    |
"""

import io
import os
import random
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import bundle_budget

KB = 1024
# Holgura de la cabecera de gzip: un trozo de N KB comprimido pesa N KB y algo
CABECERA = 64


def html(*referencias: tuple[str, str]) -> str:
    """index.html con los JS dados: ("script", nombre) o ("preload", nombre)."""
    etiquetas = []
    for tipo, nombre in referencias:
        if tipo == "script":
            etiquetas.append(f'<script type="module" crossorigin src="/assets/{nombre}" integrity="sha384-x"></script>')
        else:
            etiquetas.append(f'<link rel="modulepreload" crossorigin href="/assets/{nombre}" integrity="sha384-x">')
    etiquetas.append('<link rel="stylesheet" crossorigin href="/assets/index.css">')
    return "<!doctype html><html><head>" + "\n".join(etiquetas) + "</head><body></body></html>"


class PresupuestoDelBundle(unittest.TestCase):
    def setUp(self):
        self.dist = Path(tempfile.mkdtemp())
        (self.dist / "assets").mkdir()
        self.salida = self.dist.parent / f"{self.dist.name}_github_output"
        entorno = mock.patch.dict(os.environ, {"GITHUB_OUTPUT": str(self.salida)})
        entorno.start()
        self.addCleanup(entorno.stop)
        # Sin esto, los «::error::» de los casos rojos salen como anotaciones en el CI
        self.log = io.StringIO()
        salida = mock.patch("sys.stdout", self.log)
        salida.start()
        self.addCleanup(salida.stop)
        self.semilla = 0

    def trozo(self, nombre: str, kb: float) -> str:
        """Un JS incompresible de `kb` KB en dist/assets."""
        self.semilla += 1
        datos = random.Random(self.semilla).randbytes(int(kb * KB) - CABECERA)
        (self.dist / "assets" / nombre).write_bytes(datos)
        return nombre

    def indice(self, *referencias: tuple[str, str]) -> None:
        (self.dist / "index.html").write_text(html(*referencias))

    def correr(self) -> int:
        return bundle_budget.main([str(self.dist)])

    def salidas(self) -> dict:
        if not self.salida.exists():
            return {}
        return dict(linea.split("=", 1) for linea in self.salida.read_text().splitlines() if "=" in linea)

    # --- Arranque ---

    def test_B1_por_debajo_del_aviso(self):
        self.indice(("script", self.trozo("index.js", 100)), ("preload", self.trozo("react.js", 100)))
        self.assertEqual(self.correr(), 0)
        self.assertNotIn("::warning::", self.log.getvalue())

    def test_B2_entre_el_aviso_y_el_tope(self):
        self.indice(("script", self.trozo("index.js", 160)), ("preload", self.trozo("react.js", 100)))
        self.assertEqual(self.correr(), 0)
        self.assertIn("::warning::", self.log.getvalue())

    def test_B3_por_encima_del_tope(self):
        # El pequeño primero en la página: la lista del log va por tamaño
        self.indice(("preload", self.trozo("react.js", 100)), ("script", self.trozo("index.js", 172)))
        self.assertEqual(self.correr(), 1)
        log = self.log.getvalue()
        self.assertIn("::error::", log)
        # Dice cuánto se pasa y lista lo que carga el arranque, el mayor primero
        self.assertIn("by 2 KB", log)
        self.assertLess(log.index("/assets/index.js"), log.index("/assets/react.js"))

    def test_B4_justo_en_el_tope(self):
        self.indice(("script", self.trozo("index.js", 170)), ("preload", self.trozo("react.js", 100)))
        self.assertEqual(self.correr(), 0)

    def test_B5_index_sin_js(self):
        self.trozo("index.js", 10)
        self.indice()
        self.assertEqual(self.correr(), 1)
        self.assertIn("nothing was measured", self.log.getvalue())

    def test_B6_index_apunta_a_un_js_que_no_existe(self):
        self.indice(("script", self.trozo("index.js", 10)), ("preload", "fantasma.js"))
        self.assertEqual(self.correr(), 1)
        self.assertIn("fantasma.js", self.log.getvalue())

    def test_B7_las_diferidas_no_cuentan_en_el_arranque(self):
        self.trozo("CompetitionDetail.js", 250)
        self.indice(("script", self.trozo("index.js", 100)))
        self.assertEqual(self.correr(), 0)
        self.assertEqual(self.salidas()["size_kb"], "100")

    def test_B7_cuenta_lo_comprimido(self):
        # 500 KB de ceros viajan en medio KB: lo que cuenta es lo que viaja
        (self.dist / "assets" / "index.js").write_bytes(bytes(500 * KB))
        self.indice(("script", "index.js"))
        self.assertEqual(self.correr(), 0)
        self.assertLess(int(self.salidas()["size_kb"]), 5)

    def test_B8_script_y_preload_del_mismo_cuentan_una_vez(self):
        index = self.trozo("index.js", 150)
        self.indice(("script", index), ("preload", index))
        self.assertEqual(self.correr(), 0)
        self.assertEqual(self.salidas()["size_kb"], "150")

    # --- Trozos ---

    def test_B9_trozo_diferido_grande_bajo_su_tope(self):
        self.trozo("teselas.js", 300)
        self.indice(("script", self.trozo("index.js", 100)))
        self.assertEqual(self.correr(), 0)

    def test_B10_trozo_por_encima_de_su_tope(self):
        self.trozo("teselas.js", 330)
        self.indice(("script", self.trozo("index.js", 100)))
        self.assertEqual(self.correr(), 1)
        log = self.log.getvalue()
        self.assertIn("::error::", log)
        self.assertIn("teselas.js", log)

    def test_B10_tambien_un_trozo_del_arranque(self):
        # El arranque solo pesa este trozo y cabe en su tope por poco, pero el
        # tope por trozo es más bajo que un arranque de un solo fichero de 330
        with mock.patch.object(bundle_budget, "MAX_STARTUP_KB", 400):
            self.indice(("script", self.trozo("index.js", 330)))
            self.assertEqual(self.correr(), 1)
        self.assertIn("index.js", self.log.getvalue())

    # --- Total del disco ---

    def test_B11_total_por_encima_de_su_aviso_no_falla(self):
        with mock.patch.object(bundle_budget, "TOTAL_WARNING_KB", 500):
            for n in range(3):
                self.trozo(f"pantalla{n}.js", 200)
            self.indice(("script", self.trozo("index.js", 100)))
            self.assertEqual(self.correr(), 0)
        self.assertIn("::warning::", self.log.getvalue())

    def test_B12_el_total_y_la_lista_salen_en_el_log(self):
        self.trozo("pantalla.js", 50)
        self.indice(("script", self.trozo("index.js", 100)))
        self.correr()
        log = self.log.getvalue()
        self.assertIn("150 KB", log)
        self.assertIn("pantalla.js", log)

    def test_B13_dist_sin_js(self):
        self.indice()
        self.assertEqual(self.correr(), 1)
        self.assertIn("::error::", self.log.getvalue())

    # --- Salidas para la tarjeta ---

    def test_B14_github_output(self):
        self.indice(("script", self.trozo("index.js", 100)))
        self.correr()
        self.assertEqual(
            self.salidas(),
            {"size_kb": "100", "budget_kb": "270", "warning_kb": "255"},
        )


if __name__ == "__main__":
    unittest.main()
