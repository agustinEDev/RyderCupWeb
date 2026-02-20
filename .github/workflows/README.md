# GitHub Actions Workflows

CI/CD and security pipelines for Ryder Cup Amateur Manager.

## 🚀 Main Pipeline (`ci-cd.yml`)

**Unified security, quality, testing and build pipeline.**

### Triggers
- Push: `main`, `develop`, `feature/**`, `release/**`, `hotfix/**`
- PRs: `develop`, `main`
- Schedule: Mondays 9:00 AM UTC (security)

### Pipeline Phases

```
┌─────────────────────────────────┐
│  PHASE 1: SECURITY (Parallel)   │
├─────────────────────────────────┤
│  ✓ Dependency Audit             │
│  ✓ Secret Scanning (TruffleHog) │
│  ✓ License Compliance            │
│  ℹ Optional: Snyk checks         │
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│  PHASE 2: QUALITY (Parallel)    │
├─────────────────────────────────┤
│  ✓ Lint & Format                │
│  ✓ Tests & Coverage (≥80%)      │
│  ✓ TypeScript Check              │
│  ✓ Bundle Size (≤1400 KB)       │
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│  PHASE 3: BUILD                 │
├─────────────────────────────────┤
│  ✓ Production Build (Vite)      │
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│  PHASE 4: SUMMARY               │
├─────────────────────────────────┤
│  📊 Visual Report                │
└─────────────────────────────────┘
```

### Required Jobs (Blocking)

**Security:**
- `dependency-audit` - Critical/high vulnerabilities
- `secret-scanning` - Hardcoded secrets (TruffleHog)
- `license-check` - No GPL-3.0, AGPL-3.0, LGPL-3.0

**Quality:**
- `lint` - ESLint + Prettier
- `test` - ≥80% lines/statements, ≥75% functions, ≥70% branches
- `type-check` - TypeScript validation
- `code-quality` - Bundle ≤1400 KB

**Build:**
- `build` - Production build with Vite

### Optional Jobs (Non-blocking)

- `outdated-dependencies` - Info only
- `snyk-security` - Requires `SNYK_TOKEN`
- `snyk-code` - Requires `SNYK_TOKEN`

### Artifacts (Retention)

| Artifact | Retention |
|----------|-----------|
| npm-audit-report | 30 days |
| license-report | 30 days |
| outdated-dependencies | 30 days |
| snyk reports | 30 days |
| coverage-report | 30 days |
| build-output | 7 days |

### Required Secrets

```bash
SNYK_TOKEN=your-snyk-token  # Optional, for Snyk jobs
```

## 📝 PR Checks (`pr-checks.yml`)

**Validates PRs before merge.**

### Checks
- ✅ PR size (≤400 lines changed recommended)
- ✅ Conventional commits format
- ✅ Title length (≤72 chars)

### Warnings (Non-blocking)
- ⚠️ PR size 400-800 lines
- ⚠️ Large files (>1000 lines)

### Failures (Blocking)
- ❌ PR size >800 lines
- ❌ Invalid commit format
- ❌ Title >72 chars

## 🔐 Best Practices

1. **Keep PRs small**: <400 lines for faster review
2. **Use conventional commits**: `feat:`, `fix:`, `docs:`, etc.
3. **Monitor Snyk**: Add `SNYK_TOKEN` for security scanning
4. **Check artifacts**: Download reports for local analysis
5. **Fix blockers**: All required jobs must pass

## 📚 Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Snyk Integration](https://snyk.io/docs/github-actions/)
