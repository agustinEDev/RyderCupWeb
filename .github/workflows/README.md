# GitHub Actions Workflows

Este directorio contiene los workflows de CI/CD y seguridad para el proyecto Ryder Cup Amateur Manager.

## 📋 Workflows Disponibles

### 🚀 CI/CD & Security Pipeline (`ci-cd.yml`)

**Workflow principal unificado** que combina todos los checks de seguridad, calidad de código, testing y build en un pipeline secuencial con dependencias.

#### Triggers
- Push a branches: `main`, `develop`, `feature/**`, `release/**`, `hotfix/**`
- Pull requests a: `develop`, `main`
- Scheduled: Lunes a las 9:00 AM UTC (security checks)

#### Fases de Ejecución

```
┌─────────────────────────────────────────┐
│  FASE 1: SECURITY CHECKS (Paralelo)    │
├─────────────────────────────────────────┤
│  ✓ Dependency Audit (npm audit)        │
│  ✓ Secret Scanning (TruffleHog)        │
│  ✓ License Compliance                   │
│  ✓ Snyk Dependencies (opcional)         │
│  ✓ Snyk Code Analysis (opcional)        │
│  ℹ Outdated Dependencies (info)         │
└─────────────────────────────────────────┘
              ↓ (needs)
┌─────────────────────────────────────────┐
│  FASE 2: QUALITY & TESTING (Paralelo)  │
├─────────────────────────────────────────┤
│  ✓ Lint & Format Check                 │
│  ✓ Unit Tests & Coverage                │
│  ✓ TypeScript Type Check                │
│  ✓ Code Quality & Bundle Size           │
└─────────────────────────────────────────┘
              ↓ (needs)
┌─────────────────────────────────────────┐
│  FASE 3: BUILD                          │
├─────────────────────────────────────────┤
│  ✓ Build Application                    │
└─────────────────────────────────────────┘
              ↓ (needs all)
┌─────────────────────────────────────────┐
│  FASE 4: SUMMARY                        │
├─────────────────────────────────────────┤
│  📊 Pipeline Summary (visual report)    │
└─────────────────────────────────────────┘
```

#### Jobs Críticos (Bloquean el Pipeline)

Los siguientes jobs **deben pasar** para que el pipeline continúe:

**Fase 1 - Security:**
- 🔒 `dependency-audit` - Detecta vulnerabilidades críticas/high en dependencias
- 🔐 `secret-scanning` - Busca secrets hardcodeados con TruffleHog
- 📜 `license-check` - Verifica licencias prohibidas (GPL-3.0, AGPL-3.0, LGPL-3.0)

**Fase 2 - Quality:**
- 🔍 `lint` - ESLint + Prettier
- 🧪 `test` - Tests unitarios + cobertura ≥80% (lines/statements), ≥75% (functions), ≥70% (branches)
- 📝 `type-check` - TypeScript (si existe)
- 📊 `code-quality` - Bundle size ≤1000 KB

**Fase 3 - Build:**
- 🏗️ `build` - Build de producción con Vite

#### Jobs Informativos (No Bloquean)

- 📦 `outdated-dependencies` - Reporta paquetes desactualizados (solo informativo)
- 🐍 `snyk-security` - Scan de dependencias con Snyk (requiere `SNYK_TOKEN`)
- 🔍 `snyk-code` - Análisis de código con Snyk (requiere `SNYK_TOKEN`)

> **Nota:** Los jobs de Snyk usan `continue-on-error: true` y requieren configurar el secret `SNYK_TOKEN`. Si no está configurado, se saltarán sin fallar el pipeline.

#### Pipeline Summary

Al finalizar, se genera un **summary visual** en la pestaña "Summary" de GitHub Actions con:

- ✅ Estado de cada fase y job
- 📊 Tabla con resultados detallados
- 🎯 Indicador de éxito/fallo final
- 📝 Lista de jobs que fallaron (si aplica)

#### Artifacts Generados

| Artifact | Descripción | Retención |
|----------|-------------|-----------|
| `npm-audit-report` | Reporte de vulnerabilidades npm | 30 días |
| `license-report` | Reporte de licencias de dependencias | 30 días |
| `outdated-dependencies` | Paquetes desactualizados | 30 días |
| `snyk-security-report` | SARIF de vulnerabilidades Snyk | 30 días |
| `snyk-code-report` | SARIF de análisis de código Snyk | 30 días |
| `coverage-report` | Reporte de cobertura de tests | 30 días |
| `build-output` | Build de producción (dist/) | 7 días |

#### Configuración Requerida

**Secrets:**
- `SNYK_TOKEN` (opcional) - Token de Snyk para scans avanzados

**Permisos:**
```yaml
permissions:
  contents: read
  security-events: write
```

#### Thresholds y Budgets

**Coverage:**
- Lines: ≥80%
- Statements: ≥80%
- Functions: ≥75%
- Branches: ≥70%

**Bundle Size:**
- Maximum: 1000 KB
- Warning: 800 KB

**Vulnerabilities:**
- Critical: ❌ Fail
- High: ❌ Fail
- Moderate: ⚠️ Warning (pass)

**Licenses:**
- Forbidden: GPL-3.0, AGPL-3.0, LGPL-3.0

---

### 🗂️ Workflows Deprecados

Los siguientes workflows han sido **unificados** en `ci-cd.yml`:

- ~~`ci.yml`~~ - CI Pipeline (deprecado)
- ~~`security.yml`~~ - Security Checks (deprecado)

> **Recomendación:** Eliminar o archivar estos workflows para evitar ejecuciones duplicadas.

---

### 🔧 Otros Workflows

#### `pr-checks.yml`
Validaciones específicas para Pull Requests.

#### `auto-fix-pr-title.yml`
Corrección automática de títulos de PR según Conventional Commits.

---

## 🚀 Uso

### Ejecutar manualmente el pipeline

Puedes ejecutar el pipeline manualmente desde la pestaña "Actions" de GitHub seleccionando el workflow y haciendo click en "Run workflow".

### Ver el summary

1. Ve a la pestaña "Actions" en GitHub
2. Selecciona el workflow run
3. Haz click en "Summary" (arriba a la izquierda)
4. Verás un reporte visual con tablas y estado de cada fase

### Debugging

Si un job falla:

1. Haz click en el job que falló
2. Revisa los logs expandiendo cada step
3. Los emojis ayudan a identificar rápidamente el estado:
   - ✅ Paso exitoso
   - ❌ Paso fallido
   - ⚠️ Warning (no bloquea)
   - 📊 Información
   - 💡 Sugerencia de solución

---

## 📚 Referencias

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [YAML Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [TruffleHog](https://github.com/trufflesecurity/trufflehog)
- [Snyk](https://snyk.io/)
- [GitHub Job Summaries](https://github.blog/2022-05-09-supercharging-github-actions-with-job-summaries/)

---

**Última actualización:** 2026-01-10
**Versión del pipeline:** v1.0.0
