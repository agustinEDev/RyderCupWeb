"""
El «Result» de la tarjeta de cada job, leído de lo que ha escrito su herramienta.

Cada comprobación se pide por su nombre con pares clave=valor:

  summary_results.py lint outcome=failure report=$RUNNER_TEMP/eslint.json

`outcome` es el del paso que ejecuta la herramienta: si no es success ni failure,
ese paso no llegó a correr (falló uno anterior o se canceló) y se dice así. Un
número que no se puede leer se dice («see the step log»), nunca se inventa.

Imprime una línea y sale con 0 siempre: la tarjeta no tumba el job.
"""

import json
import re
import sys
from pathlib import Path

VER_LOG = "see the step log"
_ANSI = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]")


def _leer(ruta: str | None) -> str | None:
    if not ruta:
        return None
    try:
        return _ANSI.sub("", Path(ruta).read_text("utf-8", "replace"))
    except OSError:
        return None


def _json(ruta: str | None):
    texto = _leer(ruta)
    if texto is None:
        return None
    try:
        return json.loads(texto)
    except ValueError:
        return None


def _entero(valor: str | None) -> int | None:
    return int(valor) if valor and valor.strip().isdigit() else None


def _json_texto(texto: str | None):
    try:
        return json.loads(texto or "null")
    except ValueError:
        return None


def _plural(n: int, singular: str, plural: str | None = None) -> str:
    return f"{n} {singular if n == 1 else (plural or singular + 's')}"


def _no_corrio(p: dict) -> str | None:
    if p.get("outcome") in ("success", "failure"):
        return None
    return f"Not run: an earlier step failed or the job was cancelled ({VER_LOG})."


# ---------------------------------------------------------------- seguridad


def commits(p: dict) -> str:
    if p.get("event") == "schedule" and p.get("outcome") == "success":
        return "Scheduled run: there are no new commits to verify."
    if aviso := _no_corrio(p):
        return aviso
    verificados, sin_firmar = _entero(p.get("verified")), _entero(p.get("unsigned"))
    total = _entero(p.get("total"))
    if verificados is not None:
        return f"{_plural(verificados, 'commit')} checked: all signed and verified by GitHub."
    if sin_firmar is not None:
        de = f" of {total}" if total is not None else ""
        return f"{sin_firmar}{de} commit(s) are not signed or not verified by GitHub."
    if p.get("outcome") == "failure":
        return f"The commits could not be checked (GitHub API error or unsupported event) — {VER_LOG}."
    return f"Passed, but the number of commits could not be read — {VER_LOG}."


def audit(p: dict) -> str:
    if aviso := _no_corrio(p):
        return aviso
    numeros = [_entero(p.get(k)) for k in ("critical", "high", "moderate", "total")]
    if None in numeros:
        return f"npm audit returned no counts (registry error?): nothing was audited — {VER_LOG}."
    criticas, altas, moderadas, total = numeros
    return f"{criticas} critical, {altas} high, {moderadas} moderate ({_plural(total, 'vulnerability', 'vulnerabilities')} in total)."


def secrets(p: dict) -> str:
    alcance = {
        "pull_request": "the commits of this PR",
        "push": "the commits of this push",
    }.get(p.get("event", ""), "the whole git history")
    if p.get("outcome") == "success":
        return f"No verified secret found in {alcance}."
    if p.get("outcome") == "failure":
        # La acción de TruffleHog no deja su salida a los pasos siguientes: ni el
        # recuento ni el fichero se pueden leer aquí
        return (f"TruffleHog found a verified (live) secret in {alcance}, or the scan errored. "
                f"The count and the file and line are in the step log and its annotations.")
    return _no_corrio(p) or ""


def licenses(p: dict) -> str:
    """Lo que escribe license_gate.py: checked=N y rejected=«paquete (licencia), ...»."""
    if aviso := _no_corrio(p):
        return aviso
    revisados = _entero(p.get("checked"))
    if revisados is None:
        return f"The licence check did not finish — {VER_LOG}."
    fuera = [f for f in re.split(r"(?<=\)), ", p.get("rejected") or "") if f]
    if not fuera:
        return f"{_plural(revisados, 'package')} checked: all under a licence in the allow-list."
    quienes = ", ".join(fuera[:5]) + (f" and {len(fuera) - 5} more" if len(fuera) > 5 else "")
    return (f"{_plural(len(fuera), 'package')} outside the allow-list: {quienes}. "
            f"{_plural(revisados, 'package')} checked.")


def dependency_review(p: dict) -> str:
    if aviso := _no_corrio(p):
        return aviso
    try:
        cambios = json.loads(p.get("changes") or "null")
        vulnerables = json.loads(p.get("vulnerable") or "null")
    except ValueError:
        cambios = vulnerables = None
    # invalid-license-changes es un objeto {forbidden, unresolved, unlicensed}
    licencias = _json_texto(p.get("licenses"))
    if isinstance(licencias, dict):
        # La acción solo falla con forbidden y unresolved (SPDX inválido);
        # unlicensed (NOASSERTION) solo lo informa
        def _cuantas(clave: str) -> int:
            valor = licencias.get(clave)
            return len(valor) if isinstance(valor, list) else 0
        fuera = _cuantas("forbidden") + _cuantas("unresolved")
        de_licencia = f"{fuera} with a licence outside the allow-list"
        if sin := _cuantas("unlicensed"):
            de_licencia += f" ({sin} with no licence reported, which does not fail)"
    else:
        de_licencia = "licences: not reported"
    if isinstance(cambios, list) and isinstance(vulnerables, list):
        avisos = sum(len(c.get("vulnerabilities") or []) for c in vulnerables if isinstance(c, dict))
        return (f"{_plural(len(cambios), 'dependency change')} in this PR; "
                f"{len(vulnerables)} with a known vulnerability ({_plural(avisos, 'advisory', 'advisories')}); "
                f"{de_licencia}.")
    if p.get("outcome") == "success":
        return ("No added or updated dependency has a known vulnerability of moderate severity or worse, "
                "or a licence outside the allow-list.")
    return (f"A dependency with a known vulnerability or a licence outside the allow-list is being added, "
            f"or the review errored — {VER_LOG}.")


def outdated(p: dict) -> str:
    if aviso := _no_corrio(p):
        return aviso
    informe = _json(p.get("report"))
    if not isinstance(informe, dict):
        return f"npm outdated produced no report — {VER_LOG}."
    if not informe:
        return "All packages are up to date."
    mayores = 0
    for datos in informe.values():
        datos = datos[0] if isinstance(datos, list) and datos else datos
        if not isinstance(datos, dict):
            continue
        actual, ultima = str(datos.get("current") or ""), str(datos.get("latest") or "")
        if actual and ultima and actual.split(".")[0] != ultima.split(".")[0]:
            mayores += 1
    resto = len(informe) - mayores
    return (f"{_plural(len(informe), 'package')} outdated: {mayores} behind a major version, "
            f"{resto} only minor/patch (or not installed). Informational: never fails.")


def semgrep(p: dict) -> str:
    if aviso := _no_corrio(p):
        return aviso
    log = _leer(p.get("log")) or ""
    sarif = _json(p.get("sarif"))
    resultados = reglas = None
    if isinstance(sarif, dict):
        corridas = sarif.get("runs") or []
        resultados = [r for c in corridas for r in (c.get("results") or [])]
        reglas = sum(len(((c.get("tool") or {}).get("driver") or {}).get("rules") or []) for c in corridas)
    if resultados is None:
        return f"Semgrep wrote no results (it stopped before scanning) — {VER_LOG}."
    # Las reglas que han corrido salen en el log; el SARIF trae todas las de los
    # tres paquetes, también las de otros lenguajes (563 frente a 83, 1 oct 2026)
    ran = re.search(r"Ran ([\d,]+) rules? on ([\d,]+) files?", log)
    if ran:
        ficheros = _plural(int(ran.group(2).replace(",", "")), "file")
        alcance = f"{ran.group(1)} rules run on {ficheros} of src"
    else:
        alcance = f"{reglas} rules loaded (rules run and files scanned: {VER_LOG})"
    texto = f"{_plural(len(resultados), 'finding')} · {alcance} (OWASP Top 10, React, JavaScript)."
    if resultados:
        ejemplos = []
        for r in resultados[:3]:
            sitio = ((r.get("locations") or [{}])[0].get("physicalLocation") or {})
            fichero = (sitio.get("artifactLocation") or {}).get("uri", "?")
            linea = (sitio.get("region") or {}).get("startLine", "?")
            regla = str(r.get("ruleId", "?")).rsplit(".", 1)[-1]
            ejemplos.append(f"`{regla}` in {fichero}:{linea}")
        texto += " First: " + "; ".join(ejemplos) + ". All of them are in the Security tab."
    return texto


# ---------------------------------------------------------------- calidad


def lint(p: dict) -> str:
    if aviso := _no_corrio(p):
        return aviso
    informe = _json(p.get("report"))
    if not isinstance(informe, list):
        return f"ESLint produced no report (configuration error?) — {VER_LOG}."
    errores = sum(f.get("errorCount", 0) for f in informe)
    avisos = sum(f.get("warningCount", 0) for f in informe)
    con_algo = sum(1 for f in informe if f.get("errorCount") or f.get("warningCount"))
    texto = f"{_plural(errores, 'error')}, {_plural(avisos, 'warning')} in {len(informe)} files linted"
    return texto + (f" ({con_algo} with problems)." if con_algo else ".")


def typecheck(p: dict) -> str:
    if p.get("has_ts") == "false":
        return "No TypeScript files in src: nothing to type-check."
    if aviso := _no_corrio(p):
        return aviso
    log = _leer(p.get("log"))
    if log is None:
        return f"tsc wrote no output file — {VER_LOG}."
    errores = len(re.findall(r"error TS\d+", log))
    if p.get("outcome") == "success":
        return f"tsc --noEmit: {_plural(errores, 'type error')}."
    if errores:
        return f"tsc --noEmit: {_plural(errores, 'type error')}."
    return f"tsc failed without listing type errors — {VER_LOG}."


def architecture(p: dict) -> str:
    if aviso := _no_corrio(p):
        return aviso
    log = _leer(p.get("log")) or ""
    limpio = re.search(r"no dependency violations found \(([\d,]+) modules, ([\d,]+) dependencies cruised\)", log)
    if limpio:
        return f"No violations: {limpio.group(1)} modules and {limpio.group(2)} dependencies checked against the layer rules."
    sucio = re.search(
        r"([\d,]+) dependency violations? \(([\d,]+) errors?, ([\d,]+) warnings?\)\. "
        r"([\d,]+) modules, ([\d,]+) dependencies cruised", log)
    if not sucio:
        return f"dependency-cruiser printed no summary — {VER_LOG}."
    v, e, w, m, d = sucio.groups()
    texto = f"{v} violation(s) ({e} errors, {w} warnings) in {m} modules / {d} dependencies."
    # Primero los errores, que son los que bloquean
    todas = re.findall(r"^\s*(error|warn)\s+([\w-]+):\s*(\S+)\s*→\s*(\S+)", log, re.MULTILINE)
    primeras = sorted(todas, key=lambda v: v[0] != "error")[:3]
    if primeras:
        texto += " First: " + "; ".join(f"{s} `{r}` {a} → {b}" for s, r, a, b in primeras) + "."
    return texto


def _umbrales(config: str | None) -> dict[str, float]:
    texto = _leer(config) or ""
    bloque = re.search(r"thresholds:\s*\{([^}]*)\}", texto)
    if not bloque:
        return {}
    return {k: float(v) for k, v in re.findall(r"(\w+)\s*:\s*([\d.]+)", bloque.group(1))}


def tests(p: dict) -> str:
    if aviso := _no_corrio(p):
        return aviso
    log = _leer(p.get("log")) or ""
    partes = []
    resumen = re.search(r"^\s*Tests\s+(.+?)\s*\((\d+)\)\s*$", log, re.MULTILINE)
    if resumen:
        cuenta = dict((k, int(n)) for n, k in re.findall(r"(\d+) (passed|failed|skipped|todo)", resumen.group(1)))
        texto = (f"{cuenta.get('passed', 0)} passed, {cuenta.get('failed', 0)} failed, "
                 f"{cuenta.get('skipped', 0) + cuenta.get('todo', 0)} skipped (of {resumen.group(2)})")
        ficheros = re.search(r"^\s*Test Files\s+.*\((\d+)\)\s*$", log, re.MULTILINE)
        if ficheros:
            texto += f" in {ficheros.group(1)} files"
        duracion = re.search(r"^\s*Duration\s+(\S+)", log, re.MULTILINE)
        if duracion:
            texto += f", {duracion.group(1)}"
        partes.append(texto + ".")
        errores = re.search(r"^\s*Errors\s+(\d+) errors?", log, re.MULTILINE)
        if errores:
            partes.append(f"Plus {_plural(int(errores.group(1)), 'unhandled error')} outside the tests (these fail the run too).")
    else:
        partes.append(f"Vitest printed no test summary — {VER_LOG}.")

    cobertura = _json(p.get("coverage"))
    umbrales = _umbrales(p.get("config"))
    if isinstance(cobertura, dict) and isinstance(cobertura.get("total"), dict):
        medidas = []
        for clave in ("lines", "statements", "functions", "branches"):
            pct = (cobertura["total"].get(clave) or {}).get("pct")
            minimo = umbrales.get(clave)
            if pct is None:
                medidas.append(f"{clave} ?")
            elif minimo is None:
                medidas.append(f"{clave} {pct}%")
            else:
                medidas.append(f"{clave} {pct}% (min {minimo:g}) {'✅' if pct >= minimo else '❌'}")
        partes.append("Coverage: " + " · ".join(medidas) + ".")
    else:
        partes.append("Coverage: not reported (Vitest does not write it when a test fails).")
    return " ".join(partes)


# ---------------------------------------------------------------- build


def build_ci(p: dict) -> str:
    if p.get("build_outcome") not in ("success", "failure"):
        return f"Not run: an earlier step failed or the job was cancelled ({VER_LOG})."
    if p.get("build_outcome") == "failure":
        return f"vite build failed — {VER_LOG}."
    tam, tope, aviso = (_entero(p.get(k)) for k in ("size_kb", "budget_kb", "warning_kb"))
    if tam is None:
        return f"Production build done, but no JS bundle was measured in dist/assets — {VER_LOG}."
    texto = f"Production build OK. JS bundle {tam} KB"
    if tope:
        texto += f" of a {tope} KB budget ({tam * 100 // tope}%"
        texto += f"; warns above {aviso} KB)." if aviso else ")."
        if tam > tope:
            texto += f" Over the budget by {tam - tope} KB."
        elif aviso and tam > aviso:
            texto += " Close to the budget."
    else:
        texto += f" (budget: {VER_LOG})."
    if p.get("output_outcome") == "failure":
        texto += " But dist/ is missing."
    return texto


def build_render(p: dict) -> str:
    if p.get("build_outcome") not in ("success", "failure"):
        return f"Not run: an earlier step failed or the job was cancelled ({VER_LOG})."
    partes = []
    if p.get("node") and p.get("npm"):
        partes.append(f"Node {p['node']} · npm {p['npm']} (Render's, npm not upgraded).")
    iguales, distintos = _entero(p.get("lock_packages")), _entero(p.get("lock_differences"))
    if distintos:
        partes.append(f"npm install would install {_plural(distintos, 'package')} at a different version than the lockfile.")
    elif iguales is not None:
        partes.append(f"npm install kept the same {iguales} versions as the lockfile.")
    elif p.get("build_outcome") == "failure":
        partes.append(f"npm install or the lockfile comparison failed — {VER_LOG}.")
    if p.get("build_outcome") == "failure":
        if iguales is not None and not distintos:
            partes.append(f"npm run build failed — {VER_LOG}.")
        return " ".join(partes)
    recursos, con_hash, trozos = (_entero(p.get(k)) for k in ("smoke_resources", "smoke_integrity", "smoke_chunks"))
    fallos = _entero(p.get("smoke_failures"))
    if p.get("smoke_outcome") not in ("success", "failure"):
        partes.append("Static-site smoke not run.")
    elif fallos:
        partes.append(f"Static-site smoke failed: {_plural(fallos, 'problem')} — {VER_LOG}.")
    elif p.get("smoke_outcome") == "success" and None not in (recursos, con_hash, trozos):
        partes.append(f"Static-site smoke passed: the {recursos} resources index.html references are served "
                      f"({con_hash} with a matching integrity hash), every lazy chunk the {trozos} JS/CSS files "
                      f"ask for exists, version.json says {p.get('smoke_version') or '?'}, and the service worker "
                      "and manifest are there.")
    elif p.get("smoke_outcome") == "success":
        partes.append(f"Static-site smoke passed (counts not readable — {VER_LOG}).")
    else:
        partes.append(f"Static-site smoke failed — {VER_LOG}.")
    return " ".join(partes)


# ---------------------------------------------------------------- PR


def pr_title(p: dict) -> str:
    titulo = (p.get("title") or "").replace("`", "'")
    if p.get("outcome") == "success":
        return f"PR title is valid: `{titulo}`."
    if p.get("outcome") == "failure":
        motivo = next((l.strip() for l in (p.get("error") or "").splitlines() if l.strip()), "")
        return f"PR title `{titulo}` is not valid" + (f": {motivo}" if motivo else f" — {VER_LOG}.")
    return _no_corrio(p) or ""


COMPROBACIONES = {
    "commits": commits, "audit": audit, "secrets": secrets, "licenses": licenses,
    "dependency-review": dependency_review, "outdated": outdated, "semgrep": semgrep,
    "lint": lint, "typecheck": typecheck, "architecture": architecture, "tests": tests,
    "build-ci": build_ci, "build-render": build_render, "pr-title": pr_title,
}


def main(argv: list[str]) -> int:
    try:
        nombre, pares = argv[0], argv[1:]
        parametros = dict(par.split("=", 1) for par in pares)
        print(COMPROBACIONES[nombre](parametros))
    except Exception as error:  # noqa: BLE001 - la tarjeta nunca tumba el job
        print(f"The result could not be read ({type(error).__name__}) — {VER_LOG}.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
