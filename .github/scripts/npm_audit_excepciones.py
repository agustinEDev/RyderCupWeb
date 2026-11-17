"""
Excepciones temporales de npm audit (decidido por Agustín el 17 nov 2026).

Quita del informe JSON de `npm audit` los paquetes afectados SOLO por avisos exceptuados y
vigentes (`.github/npm-audit-excepciones.json`), y rehace los recuentos para que la puerta
(`npm-audit-gate.sh`) decida con ellos. Pensado para un aviso de herramientas de desarrollo
sin versión corregida: cada excepción lleva su GHSA, el paquete, una fecha de caducidad y el
motivo. Una excepción caducada no se aplica (vuelve a bloquear) y se avisa. Cualquier otro
aviso sigue contando igual.

Uso: npm_audit_excepciones.py audit-report.json excepciones.json [--hoy AAAA-MM-DD]
Reescribe el informe en el sitio.
"""

import argparse
import json
from datetime import UTC, date, datetime
from pathlib import Path


def _vigentes(excepciones: list[dict], hoy: date) -> set[str]:
    activas = set()
    for e in excepciones:
        caduca = date.fromisoformat(e["caduca"])
        if hoy <= caduca:
            activas.add(e["ghsa"])
            print(f"::warning::npm audit: {e['ghsa']} ({e['paquete']}) exceptuado hasta {e['caduca']}: {e['motivo']}")
        else:
            print(f"::error::npm audit: la excepción de {e['ghsa']} ({e['paquete']}) está caducada desde {e['caduca']}")
    return activas


def _ghsa(via: dict) -> str:
    return str(via.get("url", "")).rstrip("/").rsplit("/", 1)[-1]


def filtra(informe: dict, activas: set[str]) -> dict:
    vulns = informe.get("vulnerabilities", {})
    # Se quedan los que llegan, siguiendo de quién dependen, a un aviso no exceptuado; los
    # demás solo están por avisos exceptuados. Así un ciclo (vitest <-> coverage) no importa
    quedan_por: set[str] = {
        nombre
        for nombre, v in vulns.items()
        if any(isinstance(x, dict) and _ghsa(x) not in activas for x in v.get("via", []))
        or not v.get("via")
    }
    cambio = True
    while cambio:
        cambio = False
        for nombre, v in vulns.items():
            if nombre not in quedan_por and any(
                isinstance(x, str) and x in quedan_por for x in v.get("via", [])
            ):
                quedan_por.add(nombre)
                cambio = True
    quedan = {k: v for k, v in vulns.items() if k in quedan_por}
    recuento = {s: 0 for s in ("info", "low", "moderate", "high", "critical")}
    for v in quedan.values():
        recuento[v.get("severity", "info")] = recuento.get(v.get("severity", "info"), 0) + 1
    recuento["total"] = sum(recuento[s] for s in ("info", "low", "moderate", "high", "critical"))
    informe["vulnerabilities"] = quedan
    informe.setdefault("metadata", {})["vulnerabilities"] = recuento
    return informe


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("informe")
    p.add_argument("excepciones")
    p.add_argument("--hoy", default=datetime.now(UTC).date().isoformat())
    a = p.parse_args()
    ruta = Path(a.informe)
    informe = json.loads(ruta.read_text())
    if "metadata" not in informe or "vulnerabilities" not in informe.get("metadata", {}):
        return  # sin recuentos: la puerta dirá que no se ha auditado nada
    excepciones = json.loads(Path(a.excepciones).read_text()) if Path(a.excepciones).exists() else []
    activas = _vigentes(excepciones, date.fromisoformat(a.hoy))
    ruta.write_text(json.dumps(filtra(informe, activas)))


if __name__ == "__main__":
    main()
