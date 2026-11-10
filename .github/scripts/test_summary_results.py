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
| P1   | build-ci          | build bien                                 | OK; el presupuesto, en Render      |
| P4   | build-ci          | el precache del SW se queda corto          | lo dice primero, sin «OK»          |
| P7   | build-ci          | sin dist/                                  | lo dice al final                   |
| P5   | build-render      | build bien, precache corto                 | el precache, no «npm run build»    |
| P6   | build-render      | precache entero                            | la tarjeta de siempre              |
| P8   | build-render      | arranque dentro del presupuesto            | el arranque gzip y su tope         |
| P9   | build-render      | un trozo se pasa (#374)                    | el fallo, sin el porcentaje        |
| P10  | build-render      | el arranque se pasa                        | el exceso una sola vez             |
| P11  | build-render      | arranque por encima del aviso              | «Close to the budget.»             |
| P12  | build-render      | sin medir                                  | lo dice                            |
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


class TarjetaDelBuild(unittest.TestCase):
    # El presupuesto del arranque se mide en el build de Render (9 nov 2026): el de
    # esta entrada compila sin el DSN de Sentry y pesaría menos que lo que se sirve
    BASE = {"build_outcome": "success", "output_outcome": "success"}

    def test_P1_build_bien(self):
        r = sr.build_ci({**self.BASE, "precache_outcome": "success"})
        self.assertEqual(r, "Production build OK, kept as the build-output artifact. The startup JS budget is checked on the Render build.")

    def test_P4_el_precache_se_queda_corto(self):
        r = sr.build_ci({**self.BASE, "precache_outcome": "failure"})
        self.assertTrue(r.startswith("Production build done, but the service worker does not precache the whole app"), r)
        self.assertNotIn("OK", r)

    def test_P7_sin_dist(self):
        r = sr.build_ci({**self.BASE, "precache_outcome": "success", "output_outcome": "failure"})
        self.assertTrue(r.endswith("But dist/ is missing."), r)


class TarjetaDelBuildDeRender(unittest.TestCase):
    BASE = {"build_outcome": "success", "node": "v22.1.0", "npm": "10.9.0", "lock_packages": "600", "lock_differences": "0"}
    PRESUPUESTO = {"size_kb": "240", "budget_kb": "270", "warning_kb": "255"}

    def test_P5_build_bien_precache_corto(self):
        r = sr.build_render({**self.BASE, "precache_outcome": "failure"})
        self.assertIn("the service worker does not precache the whole app", r)
        self.assertNotIn("npm run build failed", r)

    def test_P6_precache_entero_no_lo_menciona(self):
        r = sr.build_render({**self.BASE, "precache_outcome": "success", "smoke_outcome": "success",
                             "smoke_resources": "30", "smoke_integrity": "28", "smoke_chunks": "200", "smoke_failures": "0"})
        self.assertNotIn("precache", r)
        self.assertIn("Static-site smoke passed", r)

    def test_P8_arranque_dentro_del_presupuesto(self):
        r = sr.build_render({**self.BASE, **self.PRESUPUESTO, "problems": ""})
        self.assertIn("Startup JS 240 KB gzip of a 270 KB budget (88%; warns above 255 KB).", r)

    def test_P9_un_trozo_se_pasa(self):
        r = sr.build_render({**self.BASE, **self.PRESUPUESTO,
                             "problems": "teselas.js is 330 KB gzip, over the 320 KB limit for one chunk"})
        self.assertIn("The bundle check failed: teselas.js is 330 KB gzip", r)
        self.assertNotIn("(88%", r)

    def test_P10_el_arranque_se_pasa_una_vez(self):
        problema = "Startup JS is 272 KB gzip, over the 270 KB budget by 2 KB"
        r = sr.build_render({**self.BASE, **self.PRESUPUESTO, "size_kb": "272", "problems": problema})
        self.assertEqual(r.count("by 2 KB"), 1, r)

    def test_P11_cerca_del_tope(self):
        r = sr.build_render({**self.BASE, **self.PRESUPUESTO, "size_kb": "260", "problems": ""})
        self.assertIn("Close to the budget.", r)

    def test_P12_sin_medir(self):
        r = sr.build_render({**self.BASE, "problems": ""})
        self.assertIn("no JS was measured", r)


if __name__ == "__main__":
    unittest.main()
