"""
Excepciones temporales de npm audit (17 nov 2026): un aviso concreto, de herramientas de
desarrollo y sin versión corregida, no bloquea hasta su fecha de caducidad. Lo demás sigue
igual: cualquier otra alta o crítica bloquea, y una excepción caducada también.
"""

import json
import subprocess
import tempfile
import unittest
from pathlib import Path

AQUI = Path(__file__).resolve().parent
FILTRO = AQUI / "npm_audit_excepciones.py"
PUERTA = AQUI / "npm-audit-gate.sh"
GHSA = "GHSA-fc5q-39xc-vjpf"


def _informe(con_otra_alta=False):
    vulns = {
        "picomatch": {
            "name": "picomatch",
            "severity": "high",
            "isDirect": False,
            "via": [{"url": f"https://github.com/advisories/{GHSA}", "severity": "high"}],
        },
        "fdir": {"name": "fdir", "severity": "high", "isDirect": False, "via": ["picomatch"]},
        "vite": {"name": "vite", "severity": "high", "isDirect": True, "via": ["fdir", "picomatch"]},
    }
    if con_otra_alta:
        vulns["lodash"] = {
            "name": "lodash",
            "severity": "high",
            "isDirect": True,
            "via": [{"url": "https://github.com/advisories/GHSA-xxxx-yyyy-zzzz", "severity": "high"}],
        }
    altas = len(vulns)
    return {
        "vulnerabilities": vulns,
        "metadata": {
            "vulnerabilities": {"info": 0, "low": 0, "moderate": 0, "high": altas, "critical": 0, "total": altas}
        },
    }


def _excepciones(caduca):
    return [{"ghsa": GHSA, "paquete": "picomatch", "caduca": caduca, "motivo": "solo desarrollo"}]


class TestExcepcionesDeNpmAudit(unittest.TestCase):
    def _corre(self, informe, excepciones, hoy):
        with tempfile.TemporaryDirectory() as d:
            ruta_i = Path(d) / "audit.json"
            ruta_e = Path(d) / "excepciones.json"
            ruta_i.write_text(json.dumps(informe))
            ruta_e.write_text(json.dumps(excepciones))
            filtro = subprocess.run(
                ["python3", str(FILTRO), str(ruta_i), str(ruta_e), "--hoy", hoy],
                capture_output=True, text=True,
            )
            puerta = subprocess.run(["bash", str(PUERTA), str(ruta_i)], capture_output=True, text=True)
            return filtro, puerta, json.loads(ruta_i.read_text())

    def test_aviso_exceptuado_vigente_no_bloquea_ni_sus_dependientes(self):
        """Given solo el aviso exceptuado (y quien lo arrastra) / When está vigente / Then la puerta pasa."""
        filtro, puerta, informe = self._corre(_informe(), _excepciones("2026-11-24"), "2026-11-17")
        self.assertEqual(filtro.returncode, 0, filtro.stderr)
        self.assertEqual(informe["metadata"]["vulnerabilities"]["high"], 0)
        self.assertEqual(puerta.returncode, 0, puerta.stdout)
        self.assertIn(GHSA, filtro.stdout)

    def test_aviso_exceptuado_no_tapa_otra_alta(self):
        """Given el aviso exceptuado y otra alta / When se filtra / Then la otra sigue bloqueando."""
        _, puerta, informe = self._corre(_informe(con_otra_alta=True), _excepciones("2026-11-24"), "2026-11-17")
        self.assertEqual(informe["metadata"]["vulnerabilities"]["high"], 1)
        self.assertEqual(puerta.returncode, 1)

    def test_excepcion_caducada_vuelve_a_bloquear(self):
        """Given una excepción caducada / When se filtra / Then no se aplica, avisa y la puerta bloquea."""
        filtro, puerta, informe = self._corre(_informe(), _excepciones("2026-11-16"), "2026-11-17")
        self.assertEqual(informe["metadata"]["vulnerabilities"]["high"], 3)
        self.assertEqual(puerta.returncode, 1)
        self.assertIn("caducada", filtro.stdout)

    def test_el_dia_de_la_caducidad_aun_vale(self):
        """Given hoy es el día de la caducidad / When se filtra / Then aún se aplica."""
        _, puerta, _ = self._corre(_informe(), _excepciones("2026-11-17"), "2026-11-17")
        self.assertEqual(puerta.returncode, 0)

    def test_un_ciclo_entre_paquetes_exceptuados_tambien_cae(self):
        """Given vitest y su cobertura que dependen el uno del otro y del aviso / When se filtra / Then caen los dos."""
        informe = _informe()
        informe["vulnerabilities"]["vitest"] = {"name": "vitest", "severity": "high", "via": ["coverage", "picomatch"]}
        informe["vulnerabilities"]["coverage"] = {"name": "coverage", "severity": "high", "via": ["vitest"]}
        informe["metadata"]["vulnerabilities"]["high"] = 5
        _, puerta, filtrado = self._corre(informe, _excepciones("2026-11-24"), "2026-11-17")
        self.assertEqual(filtrado["metadata"]["vulnerabilities"]["high"], 0)
        self.assertEqual(puerta.returncode, 0)

    def test_un_ciclo_que_llega_a_otro_aviso_sigue_bloqueando(self):
        """Given un ciclo en el que uno arrastra otro aviso / When se filtra / Then los dos siguen."""
        informe = _informe(con_otra_alta=True)
        informe["vulnerabilities"]["vitest"] = {"name": "vitest", "severity": "high", "via": ["coverage", "picomatch"]}
        informe["vulnerabilities"]["coverage"] = {"name": "coverage", "severity": "high", "via": ["vitest", "lodash"]}
        _, puerta, filtrado = self._corre(informe, _excepciones("2026-11-24"), "2026-11-17")
        self.assertEqual(filtrado["metadata"]["vulnerabilities"]["high"], 3)
        self.assertEqual(puerta.returncode, 1)

    def test_paquete_con_el_aviso_exceptuado_y_otro_moderado_cuenta_como_moderado(self):
        """Given vite con el aviso exceptuado (alto) y otro moderado / When se filtra / Then cuenta como moderado y no bloquea."""
        informe = _informe()
        informe["vulnerabilities"]["vite"]["via"].append(
            {"url": "https://github.com/advisories/GHSA-mmmm-oooo-dddd", "severity": "moderate"}
        )
        _, puerta, filtrado = self._corre(informe, _excepciones("2026-11-24"), "2026-11-17")
        self.assertEqual(filtrado["metadata"]["vulnerabilities"]["high"], 0)
        self.assertEqual(filtrado["metadata"]["vulnerabilities"]["moderate"], 1)
        self.assertEqual(puerta.returncode, 0)

    def test_informe_sin_recuentos_se_deja_tal_cual_y_la_puerta_lo_rechaza(self):
        """Given un informe sin recuentos (registro caído) / When se filtra / Then no se reescribe y la puerta sale con 2."""
        _, puerta, filtrado = self._corre({"metadata": {"vulnerabilities": {}}}, _excepciones("2026-11-24"), "2026-11-17")
        self.assertEqual(filtrado, {"metadata": {"vulnerabilities": {}}})
        self.assertEqual(puerta.returncode, 2)

    def test_sin_fichero_de_excepciones_no_cambia_nada(self):
        """Given un fichero de excepciones vacío / When se filtra / Then el informe queda igual."""
        _, puerta, informe = self._corre(_informe(), [], "2026-11-17")
        self.assertEqual(informe["metadata"]["vulnerabilities"]["high"], 3)
        self.assertEqual(puerta.returncode, 1)


if __name__ == "__main__":
    unittest.main()
