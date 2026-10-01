"""
Tests de license_gate.py (#777). Solo librería estándar; el CI los pasa en el
job de licencias antes de usar la puerta:

  python3 -m unittest discover -s .github/scripts -p "test_*.py"

| Caso | Licencia(s) del paquete            | Sale |
|------|------------------------------------|------|
| L1   | todas permitidas                   | 0    |
| L2   | GPL-3.0                            | 1    |
| L3   | (MIT OR GPL-3.0)                   | 0    |
| L4   | (MIT AND GPL-3.0)                  | 1    |
| L5   | GPL-3.0 AND GPL-3.0-only           | 1    |
| L6   | MIT* (deducida del fichero)        | 0    |
| L7   | UNKNOWN / Custom: ...              | 1    |
| L8   | lista ["MIT", "GPL-3.0"]           | 1    |
| L9   | GPL-3.0 con excepción del paquete  | 0    |
| L10  | LGPL-3.0-only                      | 1    |
| L11  | mit (minúsculas)                   | 0    |
| L12  | config sin allow-licenses          | 2    |
| L13  | informe ilegible o vacío           | 2    |
| L14  | GITHUB_OUTPUT con los rechazados   | —    |
| L15  | (MIT OR GPL-3.0) AND GPL-3.0       | 1    |
| L16  | GPL-3.0 AND (MIT OR ISC)           | 1    |
| L17  | (MIT OR ISC) AND (GPL-3.0 OR AGPL) | 1    |
| L18  | (MIT OR GPL-3.0) AND (ISC OR X)    | 0    |
"""

import io
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import license_gate

CONFIG = """\
# comentario
allow-licenses:
  - MIT
  - Apache-2.0
  - ISC

# excepciones
allow-dependencies-licenses:
  - pkg:npm/vetado-pero-revisado
"""


class PuertaDeLicencias(unittest.TestCase):
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())
        self.config = self.dir / "config.yml"
        self.config.write_text(CONFIG)
        self.salida = self.dir / "github_output"
        entorno = mock.patch.dict(os.environ, {"GITHUB_OUTPUT": str(self.salida)})
        entorno.start()
        self.addCleanup(entorno.stop)
        # Sin esto, los «::error::» de los casos rojos salen como anotaciones en el CI
        salida = mock.patch("sys.stdout", new_callable=io.StringIO)
        salida.start()
        self.addCleanup(salida.stop)

    def correr(self, paquetes: dict, config: Path | None = None) -> int:
        informe = self.dir / "licenses.json"
        informe.write_text(json.dumps({k: {"licenses": v} for k, v in paquetes.items()}))
        return license_gate.main([str(informe), str(config or self.config)])

    def test_L1_todas_permitidas(self):
        self.assertEqual(self.correr({"a@1": "MIT", "b@2": "Apache-2.0", "c@3": "ISC"}), 0)

    def test_L2_gpl(self):
        self.assertEqual(self.correr({"a@1": "MIT", "malo@1": "GPL-3.0"}), 1)

    def test_L3_or_con_una_permitida(self):
        self.assertEqual(self.correr({"a@1": "(MIT OR GPL-3.0)"}), 0)

    def test_L4_and_con_una_vetada(self):
        self.assertEqual(self.correr({"a@1": "(MIT AND GPL-3.0)"}), 1)

    def test_L5_compuesta_toda_vetada(self):
        self.assertEqual(self.correr({"a@1": "GPL-3.0 AND GPL-3.0-only"}), 1)

    def test_L6_deducida_con_asterisco(self):
        self.assertEqual(self.correr({"a@1": "MIT*"}), 0)

    def test_L7_desconocida_o_propia(self):
        self.assertEqual(self.correr({"a@1": "UNKNOWN"}), 1)
        self.assertEqual(self.correr({"a@1": "Custom: https://example.com"}), 1)

    def test_L8_lista_exige_todas(self):
        self.assertEqual(self.correr({"a@1": ["MIT", "GPL-3.0"]}), 1)
        self.assertEqual(self.correr({"a@1": ["MIT", "ISC"]}), 0)

    def test_L9_excepcion_del_paquete(self):
        self.assertEqual(self.correr({"vetado-pero-revisado@1.2.3": "GPL-3.0"}), 0)
        self.assertEqual(self.correr({"@scope/vetado-pero-revisado@1": "GPL-3.0"}), 1)

    def test_L10_lgpl_vetada(self):
        self.assertEqual(self.correr({"a@1": "LGPL-3.0-only"}), 1)

    def test_L11_mayusculas_da_igual(self):
        self.assertEqual(self.correr({"a@1": "mit"}), 0)

    def test_L12_config_sin_lista(self):
        vacia = self.dir / "vacia.yml"
        vacia.write_text("allow-dependencies-licenses: []\n")
        self.assertEqual(self.correr({"a@1": "MIT"}, config=vacia), 2)

    def test_L13_informe_ilegible_o_vacio(self):
        roto = self.dir / "roto.json"
        roto.write_text("{no es json")
        self.assertEqual(license_gate.main([str(roto), str(self.config)]), 2)
        self.assertEqual(self.correr({}), 2)

    def test_L14_rechazados_para_la_tarjeta(self):
        self.correr({"a@1": "MIT", "malo@1": "GPL-3.0", "peor@2": "UNKNOWN"})
        salida = self.salida.read_text()
        self.assertIn("checked=3\n", salida)
        self.assertIn("rejected=malo@1 (GPL-3.0), peor@2 (UNKNOWN)\n", salida)

    def test_L15_a_L18_parentesis(self):
        self.assertEqual(self.correr({"a@1": "(MIT OR GPL-3.0) AND GPL-3.0"}), 1)
        self.assertEqual(self.correr({"a@1": "GPL-3.0 AND (MIT OR ISC)"}), 1)
        self.assertEqual(self.correr({"a@1": "(MIT OR ISC) AND (GPL-3.0 OR AGPL-3.0)"}), 1)
        self.assertEqual(self.correr({"a@1": "(MIT OR GPL-3.0) AND (ISC OR X)"}), 0)


if __name__ == "__main__":
    unittest.main()
