# ADR-007: Quality Gates en Pipeline CI/CD

**Fecha**: 24 de diciembre de 2025
**Estado**: Aceptado (Implementado en v1.8.0)
**Decisores**: Equipo de desarrollo frontend

## Contexto y Problema

El pipeline de CI/CD actual ejecuta tests y build, pero no previene problemas comunes de calidad:

- **Degradación de cobertura de tests**: La cobertura puede bajar sin que nadie lo note
- **Bundle size sin control**: El bundle JavaScript puede crecer sin límites afectando performance
- **Formato inconsistente**: Código sin formateo uniforme dificulta code reviews
- **PRs masivos**: Pull requests muy grandes son difíciles de revisar y propensas a bugs
- **Commits inconsistentes**: Sin convención de commits, el historial es difícil de leer

**Requisitos:**
- Prevenir degradación de calidad automáticamente
- Feedback inmediato en PRs
- No ralentizar significativamente el CI
- Fácil de mantener y ajustar

## Opciones Consideradas

1. **SonarQube Cloud**: Plataforma completa de quality gates (pago)
2. **Codecov**: Coverage tracking con badges (pago para privados)
3. **Custom scripts en CI**: Scripts bash personalizados (gratis, flexible)
4. **Pre-commit hooks locales**: Validaciones solo locales (no garantizado)
5. **No hacer nada**: Confiar en code reviews manuales

## Decisión

**Adoptamos quality gates personalizados en CI/CD** con scripts bash integrados:

### Implementaciones:

1. **Coverage Threshold Enforcement**
   - Tool: Vitest coverage + script bash
   - Thresholds: Lines 80%, Statements 80%, Functions 75%, Branches 70%
   - Ubicación: `.github/workflows/ci.yml`

2. **Bundle Size Budget**
   - Tool: Script bash + `du`
   - Budget: 500 KB máximo, warning en 400 KB
   - Ubicación: `.github/workflows/ci.yml`

3. **Prettier Format Check**
   - Tool: Prettier con flag `--check`
   - Archivos: `*.{js,jsx,ts,tsx,css,json}`
   - Ubicación: `.github/workflows/ci.yml`

4. **PR Size Check**
   - Tool: GitHub Actions script
   - Limits: XL >1000 cambios (falla), L >500 (warning)
   - Ubicación: `.github/workflows/pr-checks.yml`

5. **Conventional Commits**
   - Tool: `amannn/action-semantic-pull-request`
   - Tipos: feat, fix, docs, style, refactor, perf, test, build, ci, chore
   - Ubicación: `.github/workflows/pr-checks.yml`

## Justificación

### Por qué custom scripts vs SonarQube:

**Ventajas:**
- ✅ **Gratis**: Sin costos de suscripción
- ✅ **Rápido**: Ejecuta en 10-20 segundos adicionales
- ✅ **Flexible**: Fácil ajustar thresholds según evoluciona el proyecto
- ✅ **Sin vendor lock-in**: No dependemos de servicio externo
- ✅ **Transparente**: Scripts visibles en el repo

**Desventajas aceptadas:**
- ❌ Sin UI gráfica bonita (acceptable, logs en CI son suficientes)
- ❌ Sin historial de métricas (acceptable por ahora)
- ❌ Mantenimiento manual de scripts (minimal effort)

### Por qué estos thresholds específicos:

**Coverage (80/80/75/70):**
- Basados en coverage actual del proyecto (90%+)
- Permiten flexibilidad en funciones utilitarias (75%)
- Branches menos estrictos (70%) porque son difíciles de cubrir al 100%

**Bundle size (500 KB):**
- Proyecto actual: ~350 KB
- Budget: 500 KB (43% de margen)
- Warning: 400 KB (80% del budget)
- Justificación: SPA con React + Router + Sentry debe mantenerse <500KB para buen LCP

**PR size (1000 cambios):**
- Basado en research: PRs >400 líneas reducen 60% la efectividad del review
- 1000 cambios = límite absoluto
- 500 cambios = warning para considerar split

## Consecuencias

### Positivas:

1. **Calidad garantizada**: No se puede mergear código que degrada métricas
2. **Feedback rápido**: Desarrolladores saben inmediatamente si algo está mal
3. **Automatización**: No depende de reviewers recordar verificar cobertura/bundle
4. **Métricas visibles**: Logs de CI muestran tendencias claramente
5. **Cultura de calidad**: El equipo se acostumbra a mantener estándares altos

### Negativas (mitigadas):

1. **Tiempo de CI aumenta**: +10-20 segundos por build
   - *Mitigación*: Los checks corren en paralelo cuando es posible

2. **Posibles falsos positivos**: Scripts pueden fallar por cambios válidos
   - *Mitigación*: Thresholds ajustables, continue-on-error donde apropiado

3. **Fricción inicial**: Devs pueden frustrarse con rechazos
   - *Mitigación*: Mensajes claros con instrucciones de cómo resolver

4. **Mantenimiento**: Scripts bash pueden necesitar updates
   - *Mitigación*: Scripts simples, bien documentados, versionados en repo

## Implementación

### Archivos modificados:

- `.github/workflows/ci.yml`: Coverage + Bundle size + Prettier
- `.github/workflows/pr-checks.yml`: PR size + Conventional commits (nuevo)
- `docs/architecture/decisions/ADR-007-ci-cd-quality-gates.md`: Este documento

### Ejemplo de fallo de coverage:

```bash
📊 Checking coverage thresholds...
  Lines: 78.5%
  Statements: 77.2%
  Functions: 80.1%
  Branches: 72.3%

❌ Lines coverage (78.5%) is below threshold (80%)
❌ Statements coverage (77.2%) is below threshold (80%)

💡 Tip: Add more tests to increase coverage
```

### Ejemplo de fallo de bundle:

```bash
📦 Bundle size analysis:
  Total JS bundle size: 542 KB

❌ Bundle size (542 KB) exceeds budget (500 KB)!
💡 Tip: Consider code splitting, tree shaking, or removing unused dependencies
```

## Alternativas Rechazadas

### SonarQube Cloud
- **Por qué no**: $10/mes por proyecto, overkill para un proyecto pequeño
- **Cuándo reconsiderar**: Si el equipo crece >5 personas o proyecto se vuelve crítico

### Codecov
- **Por qué no**: $5/mes, solo cubre coverage (no bundle size, PR size, etc.)
- **Cuándo reconsiderar**: Si necesitamos badges bonitos o coverage trends

### Pre-commit hooks locales
- **Por qué no**: Fácil de bypasear con `--no-verify`
- **Cuándo usar**: Como complemento, no como reemplazo del CI

## Métricas de Éxito

Después de 1 mes de implementación, evaluaremos:

- ✅ **0 degradaciones de coverage** no detectadas
- ✅ **0 bundles >500KB** mergeados sin discusión
- ✅ **90%+ de PRs** son <500 líneas
- ✅ **100% de commits** siguen conventional commits
- ✅ **CI time** se mantiene <5 minutos

## Referencias

- [Google: How to do Code Review](https://google.github.io/eng-practices/review/)
- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Web Performance Budget](https://web.dev/performance-budgets-101/)
- [Vitest Coverage](https://vitest.dev/guide/coverage.html)
- [GitHub Actions Best Practices](https://docs.github.com/en/actions/learn-github-actions/best-practices-for-github-actions)

## Historial de Cambios

- **2025-12-24**: Creación del ADR, implementación inicial
