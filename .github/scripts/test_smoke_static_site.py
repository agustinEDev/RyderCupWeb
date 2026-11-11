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

if __name__ == "__main__":
    unittest.main()
