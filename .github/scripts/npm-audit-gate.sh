#!/usr/bin/env bash
# Puerta de `npm audit`: decide con el informe JSON si la PR pasa.
#
# Bloquea con vulnerabilidades altas o críticas; las moderadas solo avisan.
# Hasta el 30 sep 2026, si el registro fallaba el informe no traía números, la
# comparación con `null` fallaba sin cortar el script y salía «sin críticas ni
# altas» sin haber auditado nada. Un informe sin números no es un aprobado, y
# tampoco uno con recuentos que no son enteros no negativos: bash no compara un
# 0.5 o un número enorme, el `if` lo toma por falso y aprobaba (CodeRabbit).
#
# Uso: npm-audit-gate.sh audit-report.json
# Salidas: 0 aprobado · 1 altas o críticas · 2 no se pudo comprobar
# Escribe critical/high/moderate/total en $GITHUB_OUTPUT si existe.
set -euo pipefail

informe="${1:-audit-report.json}"

if ! numeros=$(jq -er '.metadata.vulnerabilities
    | [.critical, .high, .moderate, .total]
    | if all(type == "number" and . >= 0 and . == floor and . < 1000000000) then @tsv
      else error("sin recuentos válidos") end' "$informe" 2>/dev/null); then
  echo "::error::El informe de npm audit no trae el recuento ($informe): no se ha auditado nada"
  jq -r '.error.summary // empty' "$informe" 2>/dev/null || true
  exit 2
fi

IFS=$'\t' read -r criticas altas moderadas total <<< "$numeros"

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "critical=$criticas"
    echo "high=$altas"
    echo "moderate=$moderadas"
    echo "total=$total"
  } >> "$GITHUB_OUTPUT"
fi

echo "📊 npm audit: $criticas críticas, $altas altas, $moderadas moderadas ($total en total)"

if [ "$criticas" -gt 0 ] || [ "$altas" -gt 0 ]; then
  echo "::error::$criticas críticas y $altas altas: 'npm audit' para verlas, 'npm audit fix' o un override"
  exit 1
fi

if [ "$moderadas" -gt 0 ]; then
  echo "::warning::$moderadas moderadas (no bloquean)"
fi
echo "✅ Sin vulnerabilidades altas ni críticas"
