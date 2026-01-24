# 🗺️ Roadmap - RyderCupFriends Frontend

> **Versión:** 1.15.0 → 1.16.0 → 2.1.0
> **Última actualización:** 24 Ene 2026
> **Estado:** 🚀 v1.16.0 En Progreso (Sprint 4 pendiente) | 📋 v2.1.0 Planificada
> **Stack:** React 19 + Vite 7.3 + Tailwind CSS 4 + ESLint 9

---

## 📋 Próximos Pasos (Planificado)

### 🎯 Roadmap v1.16.0 - Major Dependencies Update

> **Objetivo:** Actualizar dependencias con breaking changes (React 19, Sentry 10, Router 7, etc.)
> **Duración:** 2-3 semanas (4 sprints técnicos)
> **Tipo:** Major version upgrades + Modernización del stack
> **Estado:** ⏳ Sprint 4 Pendiente (Verificación)

#### 📦 Dependencias Pendientes

**Grupo 4: Verificación Final (1 paquete) - Sprint 4**
| Paquete | Actual | Target | Tipo |
|---------|--------|--------|------|
| @sentry/replay | 7.120.4 | **7.116.0** | Downgrade (peer dep fix) |

#### Tareas Sprint 4:
- [ ] Downgrade `@sentry/replay` (si es necesario)
- [ ] Ejecutar tests completos
- [ ] Benchmarking de performance
- [ ] Verificación final de seguridad

---

### 🚀 Roadmap v2.1.0 - Competition Module Evolution

> **Objetivo:** Convertir la gestión básica de torneos en un sistema completo de planificación, scoring y leaderboards en tiempo real.
> **Duración:** 7 semanas (paralelo con backend v2.1.0)
> **Backend compatible:** FastAPI v2.1.0 (RyderCupAm)

*... (Se mantiene igual que la versión anterior) ...*

---

## ✅ Historial de Implementaciones (Completado)

### 🎯 v1.16.0 - Major Dependencies Update (Sprints 1-3)

> **Estado:** ✅ Parcialmente Completado (24 Ene 2026)
> **Objetivo:** Modernizar el stack tecnológico completo.

#### ✅ Sprint 3: Build Tools & Styling (Tailwind 4, ESLint 9)
- `tailwindcss`: v3.4.19 → **v4.1.18** (CSS-first)
- `eslint`: v8.55.0 → **v9.39.2** (Flat config)
- Migración completa de configuración (`eslint.config.js`, `@theme` CSS)

#### ✅ Sprint 2: Monitoring & Routing (Sentry 10, React Router 7)
- `@sentry/react`: v7.120.4 → **v10.34.0**
- `react-router-dom`: v6.20.0 → **v7.12.0**
- Docker build fix (Sentry 10 supports React 19)

#### ✅ Sprint 1: React 19 Ecosystem
- `react` & `react-dom`: v18.2.0 → **v19.2.3**
- `@vitejs/plugin-react`: v4.7.0 → **v5.1.2**
- `prop-types` removido (incompatible con React 19)

---

### 🎯 v1.15.0 - Data Integrity Improvements (A08)

> **Estado:** ✅ Completado (23 Ene 2026)
> **Objetivo:** Mejorar OWASP A08 (Data Integrity) de 7.0/10 a 9.0/10

#### ✅ Tareas Implementadas:
- ✅ **SRI (Subresource Integrity):**
  - Implementado `vite-plugin-sri` (SHA-384).
  - Assets críticos protegidos con hashes de integridad.
- ✅ **CI/CD Commit Verification:**
  - Job `commit-verification` en GitHub Actions.
  - Verificación de firmas GPG en cada commit.
- ✅ **Package-Lock Validation:**
  - Check de integridad en CI/CD.
  - Previene dependency confusion attacks.
- ✅ **Actualización de Dependencias:**
  - NPM: `framer-motion` (v12.27.0), `vite` (v7.3.1), `i18next` (v25.7.4), `react-i18next` (v16.5.2).
  - Actions: `snyk/actions/node` (v1.0.0), `trufflesecurity/trufflehog` (v3.92.5).

---

### 🎯 v1.14.0 - Device Fingerprinting Improvements

> **Estado:** ✅ Completado (17 Ene 2026)
> **Objetivo:** Resolver bugs críticos y mejorar robustez del sistema de device fingerprinting

*... (Se mantiene igual que la versión anterior) ...*

---

## 📊 Estado Actual (v1.16.0-dev)

### Métricas Clave
- **Tests:** 717 tests (100% pass rate)
- **Bundle inicial:** ~250 KB (gzip)
- **Cobertura:** Domain 100%, Application 90%+
- **Security Score (OWASP):** 9.0/10
- **Stack:** React 19, Vite 7.3, Tailwind 4, ESLint 9

### Completado (v1.x)
- ✅ Modern Build Stack (v1.16.0)
- ✅ Data Integrity (SRI, Signed Commits) - **v1.15.0**
- ✅ Device Fingerprinting (Clean Arch) - **v1.14.0**
- ✅ Clean Architecture + DDD
- ✅ Autenticación (httpOnly cookies, refresh tokens)
- ✅ CRUD Competiciones + Enrollments
- ✅ Handicaps (Manual + RFEG)
- ✅ Password Reset Flow
- ✅ i18n (ES/EN)
- ✅ Sentry Monitoring
- ✅ CI/CD Pipeline (Quality Gates)
- ✅ Security Scanning (Snyk, TruffleHog)

---

## 🔐 Seguridad OWASP Top 10 2021

| Categoría | Score | Estado | Prioridad |
|-----------|-------|--------|-----------|
| A01: Broken Access Control | 8.5/10 | ✅ Excelente | 🟢 Baja |
| A02: Cryptographic Failures | 9.5/10 | ✅ Excelente | 🟢 Baja |
| A03: Injection | 9.5/10 | ✅ Excelente | 🟢 Baja |
| A04: Insecure Design | 8.5/10 | ✅ Excelente | 🟢 Baja |
| A05: Security Misconfiguration | 10.0/10 | ✅ Perfecto | 🟢 Baja |
| A06: Vulnerable Components | 9.5/10 | ✅ Excelente | 🟢 Baja |
| A07: Auth Failures | 9.0/10 | ✅ Excelente | 🟢 Baja |
| A08: Data Integrity | 9.0/10 | ✅ Excelente | 🟢 Baja |
| A09: Logging & Monitoring | 9.5/10 | ✅ Excelente | 🟢 Baja |
| A10: SSRF | 9.0/10 | ✅ N/A | 🟢 Baja |
| **TOTAL (Media)** | **9.2/10** | | |

---

## 🔗 Documentación

- **CHANGELOG.md** - Historial detallado de cambios
- **CLAUDE.md** - Contexto para AI (instrucciones del proyecto)
- **ADRs:** `docs/architecture/decisions/`
- **Backend:** Configurar variable `BACKEND_PATH` con la ruta local del repositorio backend
- **API Docs:** `http://localhost:{BACKEND_PORT}/docs` (por defecto puerto 8000)

---

**Última revisión:** 24 Ene 2026 (Sprint 3 Completado)
**Próxima revisión:** Sprint 4 (Verificación Final)
