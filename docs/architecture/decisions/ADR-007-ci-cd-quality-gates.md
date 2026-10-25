# ADR-007: CI/CD Quality Gates

**Date:** December 24, 2025
**Status:** Accepted (Implemented in v1.8.0). The bundle gate was replaced on 25 Oct 2026 (#374): it now budgets the gzipped JS `index.html` loads and caps each chunk, instead of summing every `dist/assets/*.js`. See `.github/scripts/bundle_budget.py`.
**Decision Makers:** Frontend development team

## Context and Problem

Current CI/CD pipeline runs tests and builds, but doesn't prevent common quality issues:

- **Coverage degradation**: Can drop unnoticed
- **Uncontrolled bundle size**: Can grow unbounded
- **Inconsistent formatting**: Makes code reviews harder
- **Massive PRs**: Large pull requests prone to bugs
- **Inconsistent commits**: Difficult to read history

**Requirements:**
- Prevent quality degradation automatically
- Immediate feedback on PRs
- Fast execution (don't slow CI significantly)
- Easy to maintain and adjust

## Options Considered

1. **SonarQube Cloud**: Complete quality platform (paid)
2. **Codecov**: Coverage tracking with badges (paid for private)
3. **Custom CI scripts**: Bash scripts (free, flexible)
4. **Pre-commit hooks**: Local validation only (not guaranteed)
5. **Do nothing**: Trust manual code reviews

## Decision

**Adopt custom quality gates in CI/CD** with integrated bash scripts:

### Implementations:

**1. Coverage Threshold Enforcement**
- Tool: Vitest coverage + bash script
- Thresholds: Lines 80%, Statements 80%, Functions 75%, Branches 70%
- Location: `.github/workflows/ci.yml`

**2. Bundle Size Budget**
- Tool: Bash script + `du`
- Budget: 1,400 KB max, warning at 1,300 KB
- Location: `.github/workflows/ci.yml`

**3. Prettier Format Check**
- Tool: Prettier with `--check` flag
- Files: `*.{js,jsx,ts,tsx,css,json}`
- Location: `.github/workflows/ci.yml`

**4. PR Size Check**
- Tool: GitHub Actions script
- Limits: XL >1000 changes (fails), L >500 (warning)
- Location: `.github/workflows/pr-checks.yml`

**5. Conventional Commits**
- Tool: `amannn/action-semantic-pull-request`
- Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore
- Location: `.github/workflows/pr-checks.yml`

## Rationale

**Why custom scripts vs SonarQube:**

**Advantages:**
- ✅ **Free**: No subscription costs
- ✅ **Fast**: Executes in 10-20 extra seconds
- ✅ **Flexible**: Easy to adjust thresholds as project evolves
- ✅ **No vendor lock-in**: Independent of external services
- ✅ **Transparent**: Scripts visible in repo

**Accepted trade-offs:**
- ❌ No fancy UI (acceptable, CI logs sufficient)
- ❌ No metric history (acceptable for now)
- ❌ Manual script maintenance (minimal effort)

**Why these specific thresholds:**

**Coverage (80/80/75/70):**
- Based on current project coverage (90%+)
- Allow flexibility in utility functions (75%)
- Branches less strict (70%) - hard to cover 100%

**Bundle size (1,400 KB):**
- Current project: ~1,308 KB (with optimizations)
- Budget: 1,400 KB (7% margin)
- Warning: 1,300 KB (93% of budget)
- Rationale: SPA with React + Router + Sentry + country data must stay <1.5MB for good LCP

**PR size (1,000 changes):**
- Based on research: PRs >400 lines reduce review effectiveness 60%
- 1,000 changes = absolute limit
- 500 changes = warning to consider split

## Consequences

**Positive:**
- ✅ **Quality guaranteed**: Can't merge code that degrades metrics
- ✅ **Fast feedback**: Developers know immediately if something's wrong
- ✅ **Automation**: Doesn't depend on reviewers remembering checks
- ✅ **Visible metrics**: CI logs show trends clearly
- ✅ **Quality culture**: Team maintains high standards

**Negative (mitigated):**
- ⏱️ **CI time increases**: +10-20 seconds per build
  - *Mitigation*: Checks run in parallel when possible
  
- ⚠️ **Possible false positives**: Scripts may fail on valid changes
  - *Mitigation*: Adjustable thresholds, continue-on-error where appropriate
  
- 🔧 **Maintenance**: Bash scripts may need updates
  - *Mitigation*: Simple scripts, well documented, versioned in repo

## Implementation

**Files:**
- `.github/workflows/ci.yml` - Coverage + Bundle size + Prettier
- `.github/workflows/pr-checks.yml` - PR size + Conventional commits
- `docs/architecture/decisions/ADR-007-ci-cd-quality-gates.md` - This doc

**Coverage Failure Example:**
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

**Bundle Failure Example:**
```bash
📦 Bundle size analysis:
  Total JS bundle size: 1,450 KB

❌ Bundle size (1,450 KB) exceeds budget (1,400 KB)!
💡 Tip: Consider code splitting, tree shaking, or removing unused dependencies
```

## Validation

**Success Metrics (after 1 month):**
- ✅ **0 undetected** coverage degradations
- ✅ **0 bundles >1,400KB** merged without discussion
- ✅ **90%+ PRs** are <500 lines
- ✅ **100% commits** follow conventional commits
- ✅ **CI time** stays <5 minutes

## Alternatives Rejected

**SonarQube Cloud:**
- Why not: $10/month per project, overkill for small project
- When to reconsider: If team grows >5 people or project becomes critical

**Codecov:**
- Why not: $5/month, only covers coverage (not bundle size, PR size, etc.)
- When to reconsider: If need badges or coverage trends

**Pre-commit hooks:**
- Why not: Easy to bypass with `--no-verify`
- When to use: As complement, not replacement for CI

## References

- [Google: How to do Code Review](https://google.github.io/eng-practices/review/)
- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Web Performance Budget](https://web.dev/performance-budgets-101/)
- [Vitest Coverage](https://vitest.dev/guide/coverage.html)
