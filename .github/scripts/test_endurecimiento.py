"""
Guardianes de lo que se endureció tras la re-auditoría del 16 nov 2026. Solo librería
estándar, como el resto de tests de esta carpeta:

  python3 -m unittest discover -s .github/scripts -p "test_*.py"

- P-07: `security.txt` (RFC 9116), para que quien encuentre un fallo sepa a quién
  avisar. Caduca: este test falla un mes antes, para renovarlo a tiempo.
- INF-12: Dependabot espera unos días antes de proponer una versión recién publicada, y
  las imágenes del Dockerfile (las del Kind) van fijadas por digest y vigiladas.
"""

import re
import unittest
from datetime import UTC, datetime, timedelta
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]


def _campos_de_security_txt() -> dict[str, str]:
    texto = (RAIZ / "public" / ".well-known" / "security.txt").read_text(encoding="utf-8")
    campos = {}
    for linea in texto.splitlines():
        if linea and not linea.startswith("#"):
            nombre, _, valor = linea.partition(":")
            campos[nombre.strip().lower()] = valor.strip()
    return campos


def _bloques_de_dependabot() -> list[str]:
    texto = (RAIZ / ".github" / "dependabot.yml").read_text(encoding="utf-8")
    return re.split(r"\n  - package-ecosystem:", texto)[1:]


class TestSecurityTxt(unittest.TestCase):
    def test_says_how_to_report_and_where_it_lives(self):
        campos = _campos_de_security_txt()
        self.assertEqual(campos["contact"], "mailto:admin@rydercupfriends.com")
        self.assertEqual(
            campos["canonical"], "https://www.rydercupfriends.com/.well-known/security.txt"
        )

    def test_does_not_expire_within_a_month(self):
        caduca = datetime.fromisoformat(_campos_de_security_txt()["expires"])
        self.assertGreater(
            caduca,
            datetime.now(UTC) + timedelta(days=30),
            "Renovar Expires en public/.well-known/security.txt (máximo un año)",
        )

    def test_expires_at_most_a_year_ahead(self):
        caduca = datetime.fromisoformat(_campos_de_security_txt()["expires"])
        self.assertLess(caduca, datetime.now(UTC) + timedelta(days=366))


class TestServiceWorker(unittest.TestCase):
    def test_does_not_answer_well_known_files_with_the_app(self):
        # Con la app instalada, el service worker contesta cualquier navegación con el
        # index.html salvo lo que esté en esta lista: security.txt tiene que llegar
        config = (RAIZ / "vite.config.js").read_text(encoding="utf-8")
        lista = config.split("navigateFallbackDenylist:", 1)[1].split("]", 1)[0]
        self.assertIn(r"/^\/\.well-known\//", lista)


class TestDependabot(unittest.TestCase):
    def test_every_ecosystem_waits_before_proposing_a_new_release(self):
        bloques = _bloques_de_dependabot()
        self.assertTrue(bloques)
        for bloque in bloques:
            ecosistema = bloque.split("\n", 1)[0].strip()
            dias = re.search(r"\n    cooldown:\n      default-days: (\d+)", bloque)
            self.assertIsNotNone(dias, f"{ecosistema} sin cooldown")
            self.assertGreaterEqual(int(dias.group(1)), 3, ecosistema)

    def test_the_dockerfile_images_are_watched(self):
        self.assertTrue(
            any(b.split("\n", 1)[0].strip() == '"docker"' for b in _bloques_de_dependabot())
        )


class TestDockerfile(unittest.TestCase):
    def test_each_base_image_is_pinned_by_digest(self):
        texto = (RAIZ / "Dockerfile").read_text(encoding="utf-8")
        imagenes = re.findall(r"^FROM\s+(\S+)", texto, flags=re.MULTILINE)
        self.assertTrue(imagenes)
        for imagen in imagenes:
            self.assertRegex(imagen, r"@sha256:[0-9a-f]{64}$", imagen)


if __name__ == "__main__":
    unittest.main()
