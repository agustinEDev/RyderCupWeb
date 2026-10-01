"""
Tests del «Result» de las tarjetas de licencias y Dependency Review (#777).

| Caso | Tarjeta           | Entrada                                    | Dice                               |
|------|-------------------|--------------------------------------------|------------------------------------|
| R1   | licenses          | success, 619 revisados, ninguno fuera      | los 619, todos permitidos          |
| R2   | licenses          | failure, uno fuera                         | cuál y con qué licencia            |
| R3   | licenses          | failure, siete fuera                       | los cinco primeros «and 2 more»    |
| R4   | licenses          | failure sin recuento (fallaron los tests)  | que no terminó, ver el log         |
| R5   | licenses          | no corrió                                  | «Not run»                          |
| R6   | licenses          | justo cinco fuera                          | los cinco, sin «and 0 more»        |
| R7   | licenses          | licencia con coma (Custom: a, b)           | cuenta un paquete, no dos          |
| D1   | dependency-review | failure, 1 vulnerable, 1 licencia vetada   | los dos recuentos                  |
| D2   | dependency-review | success                                    | sin vulnerables ni licencias fuera |
| D3   | dependency-review | licencias ilegibles                        | no inventa el número               |
| D4   | dependency-review | licencias con otro formato (una lista)     | no inventa el número               |
| D5   | dependency-review | solo `unlicensed` (NOASSERTION, no falla)  | 0 fuera; los sin licencia, aparte  |
"""

import json
import unittest

import summary_results as sr


class TarjetaDeLicencias(unittest.TestCase):
    def test_R1_todas_permitidas(self):
        r = sr.licenses({"outcome": "success", "checked": "619", "rejected": ""})
        self.assertEqual(r, "619 packages checked: all under a licence in the allow-list.")

    def test_R2_uno_fuera(self):
        r = sr.licenses({"outcome": "failure", "checked": "619", "rejected": "malo@1 (GPL-3.0)"})
        self.assertEqual(r, "1 package outside the allow-list: malo@1 (GPL-3.0). 619 packages checked.")

    def test_R3_muchos_fuera(self):
        fuera = ", ".join(f"p{i}@1 (GPL-3.0)" for i in range(7))
        r = sr.licenses({"outcome": "failure", "checked": "619", "rejected": fuera})
        self.assertTrue(r.startswith("7 packages outside the allow-list: p0@1 (GPL-3.0), "), r)
        self.assertIn("p4@1 (GPL-3.0) and 2 more.", r)
        self.assertNotIn("p5@1", r)

    def test_R4_no_termino(self):
        r = sr.licenses({"outcome": "failure", "checked": "", "rejected": ""})
        self.assertEqual(r, f"The licence check did not finish — {sr.VER_LOG}.")

    def test_R5_no_corrio(self):
        self.assertTrue(sr.licenses({"outcome": "skipped"}).startswith("Not run"))

    def test_R6_justo_cinco(self):
        fuera = ", ".join(f"p{i}@1 (GPL-3.0)" for i in range(5))
        r = sr.licenses({"outcome": "failure", "checked": "619", "rejected": fuera})
        self.assertIn("p4@1 (GPL-3.0). 619", r)
        self.assertNotIn("more", r)

    def test_R7_licencia_con_coma(self):
        r = sr.licenses({"outcome": "failure", "checked": "9", "rejected": "a@1 (Custom: Foo, Bar)"})
        self.assertTrue(r.startswith("1 package outside the allow-list: a@1 (Custom: Foo, Bar)."), r)


class TarjetaDeDependencyReview(unittest.TestCase):
    CAMBIOS = json.dumps([{"name": "a"}, {"name": "b"}, {"name": "c"}])

    def test_D1_vulnerable_y_licencia(self):
        r = sr.dependency_review({
            "outcome": "failure", "changes": self.CAMBIOS,
            "vulnerable": json.dumps([{"name": "a", "vulnerabilities": [{}, {}]}]),
            "licenses": json.dumps({"forbidden": [{"name": "b"}], "unresolved": [], "unlicensed": []}),
        })
        self.assertEqual(r, "3 dependency changes in this PR; 1 with a known vulnerability (2 advisories); "
                            "1 with a licence outside the allow-list.")

    def test_D2_limpio(self):
        r = sr.dependency_review({
            "outcome": "success", "changes": self.CAMBIOS, "vulnerable": "[]",
            "licenses": json.dumps({"forbidden": [], "unresolved": [], "unlicensed": []}),
        })
        self.assertEqual(r, "3 dependency changes in this PR; 0 with a known vulnerability (0 advisories); "
                            "0 with a licence outside the allow-list.")

    def test_D3_licencias_ilegibles(self):
        r = sr.dependency_review({
            "outcome": "failure", "changes": self.CAMBIOS, "vulnerable": "[]", "licenses": "",
        })
        self.assertIn("licences: not reported", r)

    def test_D4_licencias_en_otro_formato(self):
        r = sr.dependency_review({
            "outcome": "failure", "changes": self.CAMBIOS, "vulnerable": "[]", "licenses": "[]",
        })
        self.assertIn("licences: not reported", r)

    def test_D5_sin_licencia_no_cuenta_como_fuera(self):
        r = sr.dependency_review({
            "outcome": "success", "changes": self.CAMBIOS, "vulnerable": "[]",
            "licenses": json.dumps({"forbidden": [], "unresolved": [{"name": "c"}],
                                    "unlicensed": [{"name": "a"}, {"name": "b"}]}),
        })
        self.assertTrue(r.endswith("1 with a licence outside the allow-list "
                                   "(2 with no licence reported, which does not fail)."), r)


if __name__ == "__main__":
    unittest.main()
