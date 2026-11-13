"""
Tests de smoke_static_site.py: la integridad (SRI) del index.html. Solo librería estándar:

  python3 -m unittest discover -s .github/scripts -p "test_*.py"

Si el build perdiera el SRI (`sri()` fuera de vite.config.js), el humo seguía en verde:
solo comprobaba los `integrity` que había (probador de la #1098, 11 nov 2026).

| Caso | Situación                                                            | Fallos |
|------|----------------------------------------------------------------------|--------|
| R1   | integrity en todos los scripts, modulepreload y estilos del build   | 0      |
| R2   | un <script src> del build sin integrity: dice cuál                   | 1      |
| R3   | un <link rel=modulepreload> sin integrity                            | 1      |
| R4   | un <link rel=stylesheet> sin integrity                               | 1      |
| R5   | iconos y manifiesto sin integrity: no se les pide (no lo admiten)    | 0      |
| R6   | rel con varios valores («preload stylesheet») sin integrity          | 1      |
| R7   | <link rel=preload as=script|style> sin integrity                    | 1      |
| R8   | recursos con dirección relativa (`assets/x.js`, `./assets/x.js`):    | 1 c/u  |
|      | se miran igual (existe, integrity, hash); antes se saltaban (#1100) |        |
| R9   | lo de fuera del build (https:, //cdn, data:, #) no se mira           | 0      |
"""

import base64
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

import smoke_static_site as smoke

JS = b"console.log(1)"
CSS = b"body{}"


def _sri(contenido):
    return "sha384-" + base64.b64encode(hashlib.sha384(contenido).digest()).decode()


def _dist(raiz, *, script=True, precarga=True, estilo=True, rel_estilo="stylesheet", extra=""):
    """Un build mínimo; cada flag dice si esa etiqueta lleva integrity."""
    d = Path(raiz)
    (d / "assets").mkdir()
    (d / "assets/index.js").write_bytes(JS)
    (d / "assets/vendor.js").write_bytes(JS)
    (d / "assets/index.css").write_bytes(CSS)
    (d / "favicon.svg").write_text("<svg/>")
    (d / "version.json").write_text(json.dumps({"version": "1.0.0"}))
    (d / "sw.js").write_text("")
    (d / "manifest.webmanifest").write_text("{}")
    con = lambda contenido, si: f' integrity="{_sri(contenido)}"' if si else ""
    (d / "index.html").write_text(
        "<html><head>"
        f'<script type="module" crossorigin src="/assets/index.js"{con(JS, script)}></script>'
        f'<link rel="modulepreload" crossorigin href="/assets/vendor.js"{con(JS, precarga)}>'
        f'<link rel="{rel_estilo}" crossorigin href="/assets/index.css"{con(CSS, estilo)}>'
        f"{extra}"
        '<link rel="icon" href="/favicon.svg"><link rel="manifest" href="/manifest.webmanifest">'
        '</head><body><div id="root"></div></body></html>'
    )
    return d


class IntegridadObligatoria(unittest.TestCase):
    def fallos(self, **flags):
        with tempfile.TemporaryDirectory() as raiz:
            return smoke.comprobar(_dist(raiz, **flags), "1.0.0")

    def test_r1_todo_con_integrity(self):
        self.assertEqual(self.fallos(), [])

    def test_r2_script_sin_integrity(self):
        fallos = self.fallos(script=False)
        self.assertEqual(len(fallos), 1)
        self.assertIn("/assets/index.js", fallos[0])
        self.assertIn("integrity", fallos[0])

    def test_r3_precarga_sin_integrity(self):
        fallos = self.fallos(precarga=False)
        self.assertEqual(len(fallos), 1)
        self.assertIn("/assets/vendor.js", fallos[0])

    def test_r4_estilo_sin_integrity(self):
        fallos = self.fallos(estilo=False)
        self.assertEqual(len(fallos), 1)
        self.assertIn("/assets/index.css", fallos[0])

    def test_r5_iconos_y_manifiesto_no_lo_necesitan(self):
        # El build tiene icono y manifiesto sin integrity, y no salen en los fallos
        with tempfile.TemporaryDirectory() as raiz:
            dist = _dist(raiz)
            self.assertIn('rel="icon"', (dist / "index.html").read_text())
            self.assertEqual(smoke.comprobar(dist, "1.0.0"), [])

    def test_r6_rel_con_varios_valores(self):
        fallos = self.fallos(estilo=False, rel_estilo="preload stylesheet")
        self.assertEqual(len(fallos), 1)
        self.assertIn("/assets/index.css", fallos[0])


    def test_r7_preload_de_script_o_estilo(self):
        for como in ("script", "style"):
            extra = f'<link rel="preload" as="{como}" href="/assets/vendor.js">'
            fallos = self.fallos(extra=extra)
            self.assertEqual(len(fallos), 1, como)
            self.assertIn("/assets/vendor.js", fallos[0])
        # Un preload de otra cosa (una imagen) no lo admite: no se pide
        self.assertEqual(self.fallos(extra='<link rel="preload" as="image" href="/favicon.svg">'), [])

    def test_r8_direcciones_relativas(self):
        for ruta in ("assets/vendor.js", "./assets/vendor.js"):
            sin = f'<script type="module" src="{ruta}"></script>'
            fallos = self.fallos(extra=sin)
            self.assertEqual(len(fallos), 1, ruta)
            self.assertIn("sin integrity", fallos[0])
            mal = f'<script type="module" src="{ruta}" integrity="{_sri(b"otro")}"></script>'
            fallos = self.fallos(extra=mal)
            self.assertEqual(len(fallos), 1, ruta)
            self.assertIn("no cuadra", fallos[0])
            bien = f'<link rel="modulepreload" href="{ruta}" integrity="{_sri(JS)}">'
            self.assertEqual(self.fallos(extra=bien), [], ruta)
            falta = f'<link rel="modulepreload" href="{ruta.replace("vendor", "nada")}" integrity="{_sri(JS)}">'
            fallos = self.fallos(extra=falta)
            self.assertEqual(len(fallos), 1, ruta)
            self.assertIn("404", fallos[0])

    def test_r8_cuenta_los_relativos(self):
        with tempfile.TemporaryDirectory() as raiz:
            cuentas = {}
            extra = f'<link rel="modulepreload" href="./assets/vendor.js" integrity="{_sri(JS)}">'
            smoke.comprobar(_dist(raiz, extra=extra), "1.0.0", cuentas)
            self.assertEqual(cuentas["resources"], 6)
            self.assertEqual(cuentas["integrity"], 4)

    def test_r9_lo_de_fuera_no_se_mira(self):
        for ruta in ("https://cdn.example/x.js", "//cdn.example/x.js", "data:text/javascript,1", "#x", ""):
            self.assertEqual(self.fallos(extra=f'<script src="{ruta}"></script>'), [], ruta)

if __name__ == "__main__":
    unittest.main()
