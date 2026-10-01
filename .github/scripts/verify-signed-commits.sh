#!/usr/bin/env bash
# Comprueba que TODOS los commits de una PR (o de un push) están firmados y
# verificados por GitHub.
#
# Hasta el 30 sep 2026 el check verificaba `HEAD`, que en una PR es el commit de
# merge sintético que firma el propio GitHub: un commit sin firmar en la rama
# pasaba (la PR #80 tiene uno). Y sin el secreto de las claves salía en verde
# sin mirar nada. GitHub ya verifica cada firma contra las claves que tiene
# registradas cada usuario (también la suya en merges y en Dependabot), así que
# se le pregunta a él: sin secretos, y válido en las PRs de Dependabot.
#
# Todo pasa por la comparación base...cabeza, paginada: la lista de commits de
# una PR se corta en 250 y la comparación sin paginar también, y una release
# grande pasaba medio sin mirar. Si no se ven todos, no es un aprobado.
#
# Uso:
#   verify-signed-commits.sh pr <número>
#   verify-signed-commits.sh range <antes> <después>   (un push; <antes> vacío o
#       ceros = rama nueva: se compara con la rama por defecto)
# Salidas: 0 todos verificados · 1 alguno sin verificar · 2 no se pudo comprobar
set -euo pipefail

REPO="${GITHUB_REPOSITORY:?Falta GITHUB_REPOSITORY}"
CEROS="0000000000000000000000000000000000000000"
FORMATO='[.sha, (.commit.verification.verified | tostring), .commit.verification.reason] | @tsv'

no_se_pudo() {
  echo "::error::$1"
  exit 2
}

# Los commits de base...cabeza, todos, y cuántos dice GitHub que son
comparar() {
  local base="$1" cabeza="$2"
  total=$(gh api "repos/$REPO/compare/$base...$cabeza?per_page=1" --jq '.total_commits') \
    || no_se_pudo "No se pudo comparar $base...$cabeza"
  commits=$(gh api --paginate "repos/$REPO/compare/$base...$cabeza?per_page=100" \
    --jq ".commits[] | $FORMATO") || no_se_pudo "No se pudo leer $base...$cabeza"
}

modo="${1:-}"
case "$modo" in
  pr)
    [ -n "${2:-}" ] || no_se_pudo "Falta el número de la PR"
    shas=$(gh api "repos/$REPO/pulls/$2" --jq '.base.sha + " " + .head.sha') \
      || no_se_pudo "No se pudo leer la PR #$2"
    read -r base cabeza <<< "$shas"
    comparar "$base" "$cabeza"
    ;;
  range)
    antes="${2:-}"
    despues="${3:-}"
    [ -n "$despues" ] || no_se_pudo "Falta el commit final del push"
    if [ -z "$antes" ] || [ "$antes" = "$CEROS" ]; then
      # Rama nueva: sus commits son los que no están en la rama por defecto
      defecto=$(gh api "repos/$REPO" --jq '.default_branch') \
        || no_se_pudo "No se pudo leer la rama por defecto"
      comparar "$defecto" "$despues"
      if [ "$total" = "0" ]; then
        # Una rama nueva sin commits propios: queda la punta
        total=1
        commits=$(gh api "repos/$REPO/commits/$despues" --jq "$FORMATO") \
          || no_se_pudo "No se pudo leer el commit $despues"
      fi
    else
      comparar "$antes" "$despues"
    fi
    ;;
  *)
    no_se_pudo "Uso: $0 pr <número> | range <antes> <después>"
    ;;
esac

[ -n "$commits" ] || no_se_pudo "No hay commits que verificar: no se ha comprobado nada"

vistos=$(printf '%s\n' "$commits" | wc -l | tr -d ' ')
[ "$vistos" = "$total" ] \
  || no_se_pudo "GitHub dice $total commits y se han podido leer $vistos: no se han mirado todos"

sin_firmar=$(printf '%s\n' "$commits" | awk -F'\t' '$2 != "true"')

if [ -n "$sin_firmar" ]; then
  while IFS=$'\t' read -r sha _ motivo; do
    echo "::error::Commit ${sha:0:9} sin firma verificada ($motivo)"
  done <<< "$sin_firmar"
  echo "Firma con 'git commit -S' (o 'git rebase --exec \"git commit --amend --no-edit -S\"') y vuelve a subir."
  exit 1
fi

echo "✅ $vistos commit(s) con firma verificada por GitHub"
