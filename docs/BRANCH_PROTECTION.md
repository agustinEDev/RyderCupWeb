# Configuración de GitFlow y Branch Protection

Este documento detalla la configuración recomendada de protección para las ramas principales en GitHub siguiendo **GitFlow**.

## 📋 Modelo GitFlow

Este proyecto utiliza **GitFlow** como estrategia de branching:

```
main (producción)
  ↑
  └── release/* → develop (integración)
                    ↑
                    └── feature/* (desarrollo)
hotfix/* → main + develop
```

### Ramas Principales

- **`main`**: Código en producción, siempre estable
- **`develop`**: Rama de integración, próxima versión en desarrollo

### Ramas de Soporte

- **`feature/*`**: Nuevas funcionalidades (desde `develop`)
- **`release/*`**: Preparación de release (desde `develop` → `main` + `develop`)
- **`hotfix/*`**: Correcciones urgentes (desde `main` → `main` + `develop`)

## 🔒 Reglas de Protección de Ramas

### Configuración en GitHub

Ve a: **Settings** → **Branches** → **Add branch protection rule**

### 1️⃣ Protección para `main`

**Branch name pattern:** `main`

#### Configuración:

- ✅ **Require a pull request before merging**
  - Require approvals: **0** (proyecto individual) o **1** (si hay colaboradores)
  - Dismiss stale pull request approvals when new commits are pushed
  - Require review from Code Owners (opcional)

- ✅ **Require status checks to pass before merging**
  - Require branches to be up to date before merging
  
  **Status checks requeridos:**
  ```
  ✅ All Checks Passed (all-checks)
  ✅ All Security Checks (all-security-checks)
  ✅ E2E Test Summary (e2e-summary)
  ```

- ✅ **Require conversation resolution before merging**
- ✅ **Require linear history** (rebase or squash)
- ✅ **Include administrators** (aplicar a todos)
- ❌ **Allow force pushes** - DESACTIVADO
- ❌ **Allow deletions** - DESACTIVADO

- ✅ **Restrict who can push to matching branches**
  - Solo: Maintainers, Release Managers

### 2️⃣ Protección para `develop`

**Branch name pattern:** `develop`

**Branch name pattern:** `develop`

#### Configuración:

- ✅ **Require a pull request before merging**
  - Require approvals: **0** (proyecto individual)
  - Dismiss stale pull request approvals when new commits are pushed

- ✅ **Require status checks to pass before merging**
  - Require branches to be up to date before merging
  
  **Status checks requeridos:**
  ```
  ✅ Lint Code (lint)
  ✅ Run Tests (test)
  ✅ Build Application (build)
  ✅ All Checks Passed (all-checks)
  ✅ Dependency Security Audit (dependency-audit)
  ```
  
  **Status checks opcionales (no bloqueantes):**
  ```
  ⚠️ Type Check (type-check)
  ⚠️ Code Quality (code-quality)
  ⚠️ E2E tests (e2e-summary)
  ```

- ✅ **Require conversation resolution before merging**
- ✅ **Require linear history** (rebase or squash)
- ❌ **Allow force pushes** - DESACTIVADO (excepto force-with-lease para rebase)
- ❌ **Allow deletions** - DESACTIVADO

## 🚀 Workflow de Trabajo GitFlow

### 1. Nueva Feature

```bash
# Desde develop actualizado
git checkout develop
git pull origin develop

# Crear feature branch
git checkout -b feature/nueva-funcionalidad

# Trabajar en la feature...
git add .
git commit -m "feat: nueva funcionalidad"

# Push al remoto
git push origin feature/nueva-funcionalidad

# Crear PR: feature/nueva-funcionalidad → develop
```

### 2. Release

```bash
# Crear release branch desde develop
git checkout develop
git pull origin develop
git checkout -b release/v1.8.0

# Ajustes finales, bumps de versión
git commit -m "chore: bump version to 1.8.0"
git push origin release/v1.8.0

# Crear PR: release/v1.8.0 → main (con E2E completo)
# Después del merge a main, también mergear a develop
```

### 3. Hotfix

```bash
# Desde main (producción rota)
git checkout main
git pull origin main
git checkout -b hotfix/fix-critical-bug

# Fix rápido
git commit -m "fix: critical bug in production"
git push origin hotfix/fix-critical-bug

# Crear PR: hotfix/fix-critical-bug → main
# Después mergear también a develop
```

## 📋 Checklist Pre-Merge

### Para Features (→ develop)

- [ ] ✅ CI checks pasaron (lint, test, build)
- [ ] ✅ Tests unitarios pasaron
- [ ] ✅ Todas las conversaciones resueltas (si aplica)
- [ ] ✅ Rama actualizada con develop
- [ ] ✅ Commits siguen conventional commits

### Para Releases (→ main)

- [ ] ✅ Todos los checks de CI pasaron
- [ ] ✅ Tests E2E pasaron en todos los navegadores
- [ ] ✅ Security audit pasó (0 vulnerabilidades críticas)
- [ ] ✅ Build de producción exitoso
- [ ] ✅ CHANGELOG.md actualizado
- [ ] ✅ Versión bumpeada en package.json
- [ ] ✅ Documentación actualizada
- [ ] ✅ Tag creado después del merge

### Para Hotfixes (→ main)

- [ ] ✅ Fix mínimo y crítico
- [ ] ✅ Tests que reproducen el bug
- [ ] ✅ Security audit pasó
- [ ] ✅ Versión patch bumpeada
- [ ] ✅ Mergear también a develop después

## 🔀 Estrategias de Merge

### Features → Develop
- **Squash and merge** (recomendado)
- Combina todos los commits en uno
- Mantiene develop limpio

### Release/Hotfix → Main
- **Merge commit** (recomendado)
- Preserva el historial de release
- Permite trazar origen

### Release → Develop (post-merge)
- **Merge commit**
- Incorpora cambios de release a develop

## 🔐 Seguridad Adicional

### Dependabot Alerts
Habilitar en: **Settings** → **Security** → **Dependabot**
- ✅ Enable Dependabot alerts
- ✅ Enable Dependabot security updates
- ✅ Enable Dependabot version updates

### Secret Scanning
Habilitar en: **Settings** → **Security** → **Secret scanning**
- ✅ Enable secret scanning
- ✅ Enable push protection

### Code Scanning
Habilitar en: **Security** → **Code scanning**
- ✅ Set up CodeQL analysis (opcional)

## 🎯 Ventajas de GitFlow + CI/CD (Proyecto Individual)

1. **Separación de Concerns**: Develop para experimentación, main para producción
2. **Releases Controlados**: Ramas de release permiten testing completo
3. **Hotfixes Rápidos**: Correcciones urgentes sin afectar desarrollo
4. **Calidad Garantizada**: CI/CD automatizado en todas las ramas
5. **Seguridad Automatizada**: Auditorías y scans en cada merge
6. **Trazabilidad**: Historial claro de features, releases y fixes
7. **Disciplina**: Aunque trabajes solo, mantiene orden y buenas prácticas
8. **Portfolio**: Demuestra profesionalismo en proyectos personales

## 📊 Ejemplo de Flujo Completo

```
develop (integración)
  │
  ├─ feature/auth-improvements
  │    ├─ commit: feat: add 2FA
  │    └─ PR → develop (1 approval) ✅
  │
  ├─ feature/new-dashboard
  │    ├─ commit: feat: redesign dashboard
  │    └─ PR → develop (1 approval) ✅
  │
  └─ release/v1.8.0 (desde develop)
       ├─ commit: chore: bump to 1.8.0
       ├─ PR → main (2 approvals + E2E) ✅
       ├─ Tag: v1.8.0
       └─ Merge back → develop

main (producción)
  │
  └─ hotfix/critical-bug
       ├─ commit: fix: XSS vulnerability
       ├─ PR → main (2 approvals) ✅
       ├─ Tag: v1.7.1
       └─ Merge back → develop
```

## ⚠️ Casos de Emergencia

### Hotfix Urgente en Producción

```bash
# 1. Crear hotfix desde main
git checkout main
git pull origin main
git checkout -b hotfix/critical-security-fix

# 2. Hacer el fix mínimo
# ... editar archivos ...
git commit -m "fix(security): patch XSS vulnerability"

# 3. Push y crear PR urgente
git push origin hotfix/critical-security-fix
# PR → main con label "hotfix" y "security"

# 4. Después del merge a main
git checkout main
git pull origin main
git tag -a v1.7.1 -m "Hotfix: XSS vulnerability"
git push origin v1.7.1

# 5. Mergear también a develop
git checkout develop
git pull origin develop
git merge main  # O cherry-pick el hotfix
git push origin develop
```

### Revertir un Merge en Main

```bash
# Si algo salió mal después de mergear a main
git checkout main
git pull origin main

# Crear commit de revert
git revert -m 1 <merge-commit-sha>

# Push del revert
git push origin main

# Investigar el problema en develop
git checkout develop
# ... fix ...
```

## 📚 Referencias

- [Git Flow Original](https://nvie.com/posts/a-successful-git-branching-model/)
- [GitHub Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Status Checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)

## 🎓 GitFlow Cheat Sheet

| Acción | Comando |
|--------|---------|
| Nueva feature | `git checkout -b feature/nombre develop` |
| Mergear feature | PR → `develop` |
| Nueva release | `git checkout -b release/v1.x.x develop` |
| Finalizar release | PR → `main`, luego merge a `develop`, tag |
| Hotfix urgente | `git checkout -b hotfix/nombre main` |
| Finalizar hotfix | PR → `main`, luego merge a `develop`, tag |
| Ver tags | `git tag -l` |
| Crear tag | `git tag -a v1.8.0 -m "Release 1.8.0"` |
| Push tag | `git push origin v1.8.0` |
