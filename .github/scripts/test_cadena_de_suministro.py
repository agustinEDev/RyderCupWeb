"""
Guardianes de la cadena de suministro del CI (re-auditoría del 16 nov 2026). Solo
librería estándar; el CI los pasa en el job de licencias:

  python3 -m unittest discover -s .github/scripts -p "test_*.py"

- INF-07: gitleaks con sus reglas por defecto, su autoprueba y el escaneo del historial,
  con el binario verificado por sha256.
- INF-06: el comprobador de licencias va fijado, con su lock e integridad, en
  .github/license-tool (fuera del árbol de la app), no un `npx` que baja la última versión
  de npm en cada ejecución.
"""

import json
import re
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
CI = (RAIZ / ".github" / "workflows" / "ci-cd.yml").read_text(encoding="utf-8")


class TestGitleaks(unittest.TestCase):
    def test_config_loads_the_default_rules(self):
        config = (RAIZ / ".gitleaks.toml").read_text(encoding="utf-8")
        self.assertRegex(config, r"\[extend\]\s*\n\s*useDefault\s*=\s*true")

    def test_ci_verifies_the_binary_self_tests_and_scans_the_history(self):
        paso = CI.split("- name: Gitleaks (generic secrets)", 1)[1].split("\n      - name:", 1)[0]
        self.assertIn("sha256sum --check --strict", paso)
        self.assertRegex(paso, r"GITLEAKS_SHA256: [0-9a-f]{64}")
        self.assertIn("bash .github/scripts/gitleaks_self_test.sh", paso)
        self.assertIn("gitleaks git . --config .gitleaks.toml", paso)
        self.assertLess(paso.index("gitleaks_self_test.sh"), paso.index("gitleaks git ."))

    def test_the_test_file_allowlist_is_anchored_to_test_files(self):
        config = (RAIZ / ".gitleaks.toml").read_text(encoding="utf-8")
        rutas = re.findall(r"'''(.+?)'''", config)
        self.assertEqual(rutas, [r"\.test\.(js|jsx|ts|tsx)$"])


class TestLicenseChecker(unittest.TestCase):
    def test_no_npx_download_of_a_license_tool(self):
        self.assertNotRegex(CI, r"npx\s+license-checker")

    def test_the_license_tool_is_pinned_with_integrity_outside_the_app_tree(self):
        carpeta = RAIZ / ".github" / "license-tool"
        paquete = json.loads((carpeta / "package.json").read_text(encoding="utf-8"))
        version = paquete["devDependencies"].get("license-checker-rseidelsohn")
        self.assertRegex(version or "", r"^\d+\.\d+\.\d+$")
        lock = json.loads((carpeta / "package-lock.json").read_text(encoding="utf-8"))
        entrada = lock["packages"]["node_modules/license-checker-rseidelsohn"]
        self.assertEqual(entrada["version"], version)
        self.assertTrue(entrada["integrity"].startswith("sha512-"))
        # Fuera del árbol de la app: sus dependencias no entran en el informe de licencias
        app = json.loads((RAIZ / "package.json").read_text(encoding="utf-8"))
        self.assertNotIn("license-checker-rseidelsohn", app.get("devDependencies", {}))
        # Que arranque en la Node 22 del CI (la 5.x pide Node 24)
        self.assertEqual(entrada["engines"]["node"], ">=18")

    def test_dependabot_keeps_the_license_tool_up_to_date(self):
        dependabot = (RAIZ / ".github" / "dependabot.yml").read_text(encoding="utf-8")
        self.assertIn('directory: "/.github/license-tool"', dependabot)

    def test_ci_runs_the_installed_binary(self):
        self.assertIn("npm ci --prefix .github/license-tool --ignore-scripts", CI)
        self.assertIn(".github/license-tool/node_modules/.bin/license-checker-rseidelsohn --start .", CI)


if __name__ == "__main__":
    unittest.main()
