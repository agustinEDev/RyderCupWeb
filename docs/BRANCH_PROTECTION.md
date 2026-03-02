# GitFlow & Branch Protection Setup

GitHub branch protection configuration following **GitFlow**.

## 📋 GitFlow Model

```
main (production)
  ↑
  └── release/* → develop (integration)
                    ↑
                    └── feature/* (development)
hotfix/* → main + develop
```

**Main branches:**
- **`main`**: Production code, always stable
- **`develop`**: Integration branch, next version in development

**Support branches:**
- **`feature/*`**: New features (from `develop`)
- **`release/*`**: Release preparation (from `develop` → `main` + `develop`)
- **`hotfix/*`**: Urgent fixes (from `main` → `main` + `develop`)

## 🔒 Branch Protection Rules

**GitHub:** Settings → Branches → Add branch protection rule

### 1️⃣ Protection for `main`

**Branch pattern:** `main`

- ✅ **Require pull request before merging**
  - Approvals: **0** (solo) or **1** (team)
  - Dismiss stale approvals on new commits

- ✅ **Require status checks**
  - Require up-to-date branches
  - Required checks:
    ```
    ✅ All Checks Passed (all-checks)
    ✅ All Security Checks (all-security-checks)
    ✅ E2E Test Summary (e2e-summary)
    ```

- ✅ **Require conversation resolution**
- ✅ **Require linear history** (rebase/squash)
- ✅ **Include administrators**
- ❌ **Allow force pushes** - DISABLED
- ❌ **Allow deletions** - DISABLED
- ✅ **Restrict push access** - Maintainers only

### 2️⃣ Protection for `develop`

**Branch pattern:** `develop`

- ✅ **Require pull request before merging**
  - Approvals: **0** (solo project)
  - Dismiss stale approvals on new commits

- ✅ **Require status checks**
  - Required:
    ```
    ✅ Lint Code (lint)
    ✅ Run Tests (test)
    ✅ Build Application (build)
    ✅ All Checks Passed (all-checks)
    ✅ Dependency Security Audit (dependency-audit)
    ```
  - Optional (non-blocking):
    ```
    ⚠️ Type Check (type-check)
    ⚠️ Code Quality (code-quality)
    ⚠️ E2E tests (e2e-summary)
    ```

- ✅ **Require conversation resolution**
- ✅ **Require linear history**
- ❌ **Allow force pushes** - DISABLED
- ❌ **Allow deletions** - DISABLED

## 🚀 GitFlow Workflow

### New Feature

```bash
git checkout develop && git pull
git checkout -b feature/new-feature
# Work on feature...
git commit -m "feat: new feature"
git push origin feature/new-feature
# Create PR: feature/new-feature → develop
```

### Release

```bash
git checkout develop && git pull
git checkout -b release/v1.8.0
git commit -m "chore: bump version to 1.8.0"
git push origin release/v1.8.0
# Create PR: release/v1.8.0 → main (with full E2E)
# After merge to main, also merge to develop
```

### Hotfix

```bash
git checkout main && git pull
git checkout -b hotfix/fix-critical-bug
git commit -m "fix: critical bug in production"
git push origin hotfix/fix-critical-bug
# Create PR: hotfix/* → main
# After merge, also merge to develop
```

## 📋 Pre-Merge Checklist

### Features → develop
- [ ] CI checks passed (lint, test, build)
- [ ] Unit tests passed
- [ ] Conversations resolved
- [ ] Branch up to date with develop
- [ ] Conventional commits format

### Releases → main
- [ ] All CI checks passed
- [ ] E2E tests passed (all browsers)
- [ ] Security audit passed (0 critical vulnerabilities)
- [ ] Production build successful
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] Tag created after merge

### Hotfixes → main
- [ ] Minimal critical fix
- [ ] Tests reproduce the bug
- [ ] Security audit passed
- [ ] Patch version bumped
- [ ] Also merged to develop

## 🔀 Merge Strategies

- **Features → Develop**: Squash merge (keeps develop clean)
- **Release/Hotfix → Main**: Merge commit (preserves history)
- **Release → Develop** (post-merge): Merge commit

## 🔐 Additional Security

**Enable in Settings → Security:**

- ✅ **Dependabot**: Alerts, security updates, version updates
- ✅ **Secret scanning**: Enable + push protection
- ✅ **Code scanning**: CodeQL analysis (optional)

## 🎯 GitFlow Benefits

1. **Separation**: Develop for experimentation, main for production
2. **Controlled releases**: Full testing before production
3. **Fast hotfixes**: Urgent fixes without affecting development
4. **Quality assurance**: Automated CI/CD on all branches
5. **Traceability**: Clear history of features, releases, and fixes
6. **Professional**: Demonstrates best practices in personal projects

## 📊 Complete Flow Example

```
develop
  ├─ feature/auth-improvements → PR → develop ✅
  ├─ feature/new-dashboard → PR → develop ✅
  └─ release/v1.8.0 → PR → main ✅ → Tag: v1.8.0 → Merge to develop

main
  └─ hotfix/critical-bug → PR → main ✅ → Tag: v1.7.1 → Merge to develop
```

## ⚠️ Emergency Cases

### Urgent Hotfix

```bash
# 1. Create hotfix from main
git checkout main && git pull
git checkout -b hotfix/critical-security-fix

# 2. Make minimal fix
git commit -m "fix(security): patch XSS vulnerability"
git push origin hotfix/critical-security-fix
# Create PR → main with "hotfix" + "security" labels

# 3. After merge to main
git checkout main && git pull
git tag -a v1.7.1 -m "Hotfix: XSS vulnerability"
git push origin v1.7.1

# 4. Merge to develop
git checkout develop && git pull
git merge main
git push origin develop
```

### Revert Merge in Main

```bash
git checkout main && git pull
git revert -m 1 <merge-commit-sha>
git push origin main
# Investigate issue in develop
```

## 📚 References

- [Git Flow Model](https://nvie.com/posts/a-successful-git-branching-model/)
- [GitHub Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Status Checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)

## 🎓 GitFlow Cheat Sheet

| Action | Command |
|--------|---------|
| New feature | `git checkout -b feature/<name> develop` |
| Merge feature | PR → `develop` |
| New release | `git checkout -b release/v1.x.x develop` |
| Finish release | PR → `main`, merge to `develop`, tag |
| Urgent hotfix | `git checkout -b hotfix/<name> main` |
| Finish hotfix | PR → `main`, merge to `develop`, tag |
| View tags | `git tag -l` |
| Create tag | `git tag -a v1.8.0 -m "Release 1.8.0"` |
| Push tag | `git push origin v1.8.0` |
