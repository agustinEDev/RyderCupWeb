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


_ORDEN = ["info", "low", "moderate", "high", "critical"]


def _mayor(severidades: list[str]) -> str | None:
    validas = [x for x in severidades if x in _ORDEN]
    return max(validas, key=_ORDEN.index) if validas else None


def filtra(informe: dict, activas: set[str]) -> dict:
    """
    Quita los paquetes que solo llegan a avisos exceptuados y rehace la severidad de los
    que quedan con lo que les queda: un paquete con el aviso exceptuado (alto) y otro
    moderado cuenta como moderado. Así un ciclo (vitest <-> coverage) no importa.
    """
    vulns = informe.get("vulnerabilities", {})
    sev: dict[str, str] = {}
    for nombre, v in vulns.items():
        propias = [
            x.get("severity", v.get("severity", "info"))
            for x in v.get("via", [])
            if isinstance(x, dict) and _ghsa(x) not in activas
        ]
        if not v.get("via"):
            propias.append(v.get("severity", "info"))
        if (m := _mayor(propias)) is not None:
            sev[nombre] = m
    cambio = True
    while cambio:  # punto fijo: hereda la severidad de lo que arrastra y aún queda
        cambio = False
        for nombre, v in vulns.items():
            heredadas = [sev[x] for x in v.get("via", []) if isinstance(x, str) and x in sev]
            nueva = _mayor([*heredadas, *([sev[nombre]] if nombre in sev else [])])
            if nueva is not None and sev.get(nombre) != nueva:
                sev[nombre] = nueva
                cambio = True
    quedan = {k: {**v, "severity": sev[k]} for k, v in vulns.items() if k in sev}
    recuento = {s: 0 for s in _ORDEN}
    for v in quedan.values():
        recuento[v["severity"]] += 1
    recuento["total"] = sum(recuento[s] for s in _ORDEN)
    informe["vulnerabilities"] = quedan
    informe.setdefault("metadata", {})["vulnerabilities"] = recuento
    return informe


def _informe_completo(informe: dict) -> bool:
    """Si trae la lista y los recuentos enteros: si no, la puerta lo rechaza tal cual."""
    recuentos = informe.get("metadata", {}).get("vulnerabilities")
    return (
        isinstance(informe.get("vulnerabilities"), dict)
        and isinstance(recuentos, dict)
        and all(isinstance(recuentos.get(s), int) and recuentos.get(s) >= 0 for s in ("critical", "high", "moderate", "total"))
    )


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("informe")
    p.add_argument("excepciones")
    p.add_argument("--hoy", default=datetime.now(UTC).date().isoformat())
    a = p.parse_args()
    ruta = Path(a.informe)
    informe = json.loads(ruta.read_text())
    if not _informe_completo(informe):
        print("::warning::npm audit: informe incompleto, se deja tal cual para la puerta")
        return  # la puerta dirá que no se ha auditado nada
    excepciones = json.loads(Path(a.excepciones).read_text()) if Path(a.excepciones).exists() else []
    activas = _vigentes(excepciones, date.fromisoformat(a.hoy))
    ruta.write_text(json.dumps(filtra(informe, activas)))


if __name__ == "__main__":
    main()
