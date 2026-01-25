# 🗺️ Roadmap - RyderCupFriends Frontend

> **Versión:** 1.15.0 → 1.16.0 → 2.1.0
> **Última actualización:** 24 Ene 2026
> **Estado:** ✅ v1.16.0 Completada (24 Ene 2026) | 📋 v2.1.0 Planificada
> **Stack:** React 19 + Vite 7.3 + Tailwind CSS 4 + ESLint 9

---

## 📋 Próximos Pasos (Planificado)

### 🚀 Roadmap v2.1.0 - Competition Module Evolution

> **Objetivo:** Convertir la gestión básica de torneos en un sistema completo de planificación, scoring y leaderboards en tiempo real.
> **Duración:** 7 semanas (paralelo con backend v2.1.0)
> **Backend compatible:** FastAPI v2.1.0 (RyderCupAm)

#### 📦 Nuevas Dependencias Principales

```json
{
  "@tanstack/react-query": "^5.x",      // Caching y data fetching
  "zustand": "^4.x",                     // State management global
  "zod": "^3.x",                         // Validación de schemas
  "@dnd-kit/core": "^6.x",               // Drag & Drop para scheduling
  "react-hot-toast": "^2.x"              // Ya instalado, uso intensivo
}
```

---

#### 📅 Sprint Breakdown (7 semanas)

> **Fechas estimadas:** 27 Ene 2026 - 17 Mar 2026
> **Equipo:** 1 Frontend Dev + 1 Backend Dev (paralelo)

---

### 📌 Sprint 1: RBAC Foundation & Golf Courses (1.5 semanas)

**Fechas:** 27 Ene - 6 Feb 2026
**Owner:** Frontend Dev
**Dependencias:** Backend API v2.1.0 Sprint 1 (roles endpoints)

#### Tareas

| # | Tarea | Esfuerzo | Prioridad | Owner |
|---|-------|----------|-----------|-------|
| 1.1 | Instalar dependencias (@tanstack/react-query, zustand, zod) | 2h | P0 | Frontend |
| 1.2 | Configurar React Query client + devtools | 3h | P0 | Frontend |
| 1.3 | Crear zustand stores (authStore con roles) | 4h | P0 | Frontend |
| 1.4 | Implementar RoleGuard component + tests | 5h | P0 | Frontend |
| 1.5 | Crear página Admin: User Management (/admin/users) | 8h | P0 | Frontend |
| 1.6 | Crear página Admin: Golf Courses Pending (/admin/golf-courses/pending) | 8h | P1 | Frontend |
| 1.7 | Crear página Creator: Request Golf Course (/creator/golf-courses/new) | 12h | P1 | Frontend |
| 1.8 | Implementar validaciones Zod para Golf Courses | 6h | P1 | Frontend |
| 1.9 | Tests unitarios (Domain + Application) | 10h | P0 | Frontend |

**Criterios de Aceptación:**
- ✅ `useAuthStore` con método `hasRole(role)` funcional
- ✅ `RoleGuard` bloquea acceso por rol (redirect a /dashboard)
- ✅ Admin puede asignar/remover roles a usuarios
- ✅ Admin puede aprobar/rechazar campos de golf pendientes
- ✅ Creator puede solicitar nuevo campo (status: PENDING_APPROVAL)
- ✅ Validación Zod: 18 hoyos, par 66-76, stroke index únicos
- ✅ ≥80% test coverage en nuevos módulos

**Estimación Total:** **58 horas** (~1.5 semanas)

---

### 📌 Sprint 2: Competition Scheduling & Drag-Drop (1.5 semanas)

**Fechas:** 7 Feb - 17 Feb 2026
**Owner:** Frontend Dev
**Dependencias:** Backend API v2.1.0 Sprint 2 (schedule endpoints)

#### Tareas

| # | Tarea | Esfuerzo | Prioridad | Owner |
|---|-------|----------|-----------|-------|
| 2.1 | Instalar @dnd-kit/core + configurar providers | 3h | P0 | Frontend |
| 2.2 | Crear competitionStore (Zustand) para scheduling | 5h | P0 | Frontend |
| 2.3 | Crear página Creator: Schedule (/creator/competitions/:id/schedule) | 16h | P0 | Frontend |
| 2.4 | Implementar Drag & Drop para asignar jugadores a matches | 12h | P0 | Frontend |
| 2.5 | Crear componentes: RoundCard, MatchCard, PlayerSearchBox | 10h | P0 | Frontend |
| 2.6 | Implementar auto-cálculo de playing handicaps (backend retorna) | 6h | P1 | Frontend |
| 2.7 | Validación Zod: Match format rules (SINGLES no requiere team_b_player_2) | 5h | P1 | Frontend |
| 2.8 | Tests unitarios + integration (Drag & Drop behavior) | 12h | P0 | Frontend |

**Criterios de Aceptación:**
- ✅ Creator puede crear rounds con fecha + campo de golf
- ✅ Creator puede crear matches (FOURBALL, FOURSOMES, SINGLES, GREENSOME)
- ✅ Drag & Drop permite asignar jugadores a posiciones de match
- ✅ Backend calcula automáticamente playing handicaps (frontend solo muestra)
- ✅ Validación Zod: SINGLES solo requiere 1 jugador por equipo
- ✅ UI responsive (mobile + desktop)
- ✅ ≥80% test coverage

**Estimación Total:** **69 horas** (~1.7 semanas)

---

### 📌 Sprint 3: Invitations System (1 semana)

**Fechas:** 18 Feb - 24 Feb 2026
**Owner:** Frontend Dev
**Dependencias:** Backend API v2.1.0 Sprint 3 (invitations endpoints)

#### Tareas

| # | Tarea | Esfuerzo | Prioridad | Owner |
|---|-------|----------|-----------|-------|
| 3.1 | Crear invitationStore (Zustand) | 4h | P0 | Frontend |
| 3.2 | Crear página Creator: Invitations (/creator/competitions/:id/invitations) | 10h | P0 | Frontend |
| 3.3 | Implementar envío de invitaciones (por email o user ID) | 8h | P0 | Frontend |
| 3.4 | Crear página Player: My Invitations (/player/invitations) | 8h | P0 | Frontend |
| 3.5 | Implementar respuesta a invitaciones (ACCEPTED, DECLINED) | 6h | P0 | Frontend |
| 3.6 | Componentes: InvitationCard, InvitationBadge (status colors) | 6h | P1 | Frontend |
| 3.7 | Tests unitarios (use cases + stores) | 8h | P0 | Frontend |

**Criterios de Aceptación:**
- ✅ Creator puede invitar jugadores a competición (por email o ID)
- ✅ Player ve lista de invitaciones pendientes
- ✅ Player puede aceptar/rechazar invitaciones
- ✅ Status badges con colores (PENDING: yellow, ACCEPTED: green, DECLINED: red)
- ✅ Toasts de confirmación en todas las acciones
- ✅ ≥80% test coverage

**Estimación Total:** **50 horas** (~1.25 semanas)

---

### 📌 Sprint 4: Scoring System (3 tabs) (2 semanas)

**Fechas:** 25 Feb - 10 Mar 2026
**Owner:** Frontend Dev
**Dependencias:** Backend API v2.1.0 Sprint 4 (scoring endpoints)

#### Tareas

| # | Tarea | Esfuerzo | Prioridad | Owner |
|---|-------|----------|-----------|-------|
| 4.1 | Crear scoringStore (Zustand) con current hole + scores | 6h | P0 | Frontend |
| 4.2 | Crear página Player: Match Scoring (/player/matches/:id/scoring) | 4h | P0 | Frontend |
| 4.3 | Implementar Tab 1: Input (score entry + validation) | 14h | P0 | Frontend |
| 4.4 | Implementar Tab 2: Scorecard (tabla de hoyos completa) | 12h | P0 | Frontend |
| 4.5 | Implementar Tab 3: Leaderboard (match standing) | 10h | P0 | Frontend |
| 4.6 | Configurar React Query polling (refetchInterval: 10s) | 5h | P0 | Frontend |
| 4.7 | Implementar validación dual (player vs marker) | 8h | P0 | Frontend |
| 4.8 | Componentes: HoleInput, ScorecardTable, ValidationIcon | 10h | P1 | Frontend |
| 4.9 | Implementar "Submit Scorecard" (solo cuando 18 hoyos completados) | 6h | P1 | Frontend |
| 4.10 | Tests unitarios + E2E (scoring flow completo) | 16h | P0 | Frontend |

**Criterios de Aceptación:**
- ✅ Player puede anotar scores hoyo por hoyo
- ✅ Marker anota independientemente en otro dispositivo
- ✅ Validación dual: ✅ (match), ❌ (mismatch), ⚪ (pending)
- ✅ Polling cada 10s actualiza scores del marcador
- ✅ Scorecard muestra todos los 18 hoyos con estado
- ✅ Leaderboard muestra standing del match en tiempo real
- ✅ Submit solo habilitado cuando 18 hoyos validados
- ✅ ≥85% test coverage

**Estimación Total:** **91 horas** (~2.3 semanas)

---

### 📌 Sprint 5: Leaderboards & Polish (1 semana)

**Fechas:** 11 Mar - 17 Mar 2026
**Owner:** Frontend Dev
**Dependencias:** Backend API v2.1.0 Sprint 5 (leaderboard endpoints)

#### Tareas

| # | Tarea | Esfuerzo | Prioridad | Owner |
|---|-------|----------|-----------|-------|
| 5.1 | Crear página pública: Leaderboard (/competitions/:id/leaderboard) | 12h | P0 | Frontend |
| 5.2 | Configurar polling condicional (solo si hay matches activos) | 4h | P0 | Frontend |
| 5.3 | Componentes: TeamStandingsBar, MatchSummaryCard | 10h | P0 | Frontend |
| 5.4 | Implementar filtros (por round, por formato) | 6h | P1 | Frontend |
| 5.5 | Polish UI/UX (animaciones Framer Motion, loading states) | 8h | P1 | Frontend |
| 5.6 | Optimización de bundle (code splitting, lazy loading) | 6h | P1 | Frontend |
| 5.7 | Tests E2E completos (Playwright: flujo completo creator → player) | 12h | P0 | Frontend |
| 5.8 | Documentación (ADRs, README updates) | 6h | P1 | Frontend |

**Criterios de Aceptación:**
- ✅ Leaderboard público muestra standings de equipos
- ✅ Polling cada 30s solo si hay matches IN_PROGRESS
- ✅ Filtros por round y formato funcionales
- ✅ Animaciones suaves (Framer Motion)
- ✅ Bundle size ≤1200 KB (target: mantener <1318 KB actual)
- ✅ E2E tests cover: create competition → schedule → invite → score → leaderboard
- ✅ ≥85% test coverage global

**Estimación Total:** **64 horas** (~1.6 semanas)

---

#### 📊 Resumen de Esfuerzo v2.1.0

| Sprint | Duración | Horas | Tareas | Prioridad |
|--------|----------|-------|--------|-----------|
| Sprint 1 | 1.5 sem | 58h | RBAC + Golf Courses | P0 |
| Sprint 2 | 1.5 sem | 69h | Scheduling + Drag-Drop | P0 |
| Sprint 3 | 1 sem | 50h | Invitations | P0 |
| Sprint 4 | 2 sem | 91h | Scoring (3 tabs) | P0 |
| Sprint 5 | 1 sem | 64h | Leaderboards + Polish | P0/P1 |
| **TOTAL** | **7 sem** | **332h** | **49 tareas** | - |

**Esfuerzo Promedio:** ~47 horas/semana (1.2 FTE)

---

#### ✅ Acceptance Criteria Global (v2.1.0)

1. **Funcionalidad:**
   - ✅ Admin gestiona usuarios y aprueba campos de golf
   - ✅ Creator planifica torneos (rounds + matches) con drag & drop
   - ✅ Creator invita jugadores por email o user ID
   - ✅ Player anota scores en tiempo real con validación dual
   - ✅ Leaderboard público actualiza cada 30s (solo si hay matches activos)

2. **Testing:**
   - ✅ ≥85% test coverage (lines)
   - ✅ ≥75% test coverage (functions)
   - ✅ E2E tests cubren flujo completo
   - ✅ 0 tests failing en pipeline

3. **Performance:**
   - ✅ Bundle size ≤1200 KB
   - ✅ Build time ≤6s
   - ✅ Polling optimizado (solo cuando necesario)

4. **Security:**
   - ✅ RoleGuard protege rutas por rol
   - ✅ 0 vulnerabilities (npm audit)
   - ✅ OWASP Score ≥9.0/10

5. **Documentation:**
   - ✅ ADRs actualizados (ADR-009, ADR-010)
   - ✅ CHANGELOG.md con v2.1.0 completo
   - ✅ CLAUDE.md actualizado con nuevas rutas/stores

---

#### 🔄 Handoffs & Dependencies

| Sprint | Frontend Needs | Backend Delivers | Sync Point |
|--------|---------------|------------------|------------|
| Sprint 1 | Roles endpoints | `POST /admin/users/{id}/roles` | Viernes semana 1 |
| Sprint 2 | Schedule endpoints | `POST /competitions/{id}/rounds` | Viernes semana 3 |
| Sprint 3 | Invitations endpoints | `POST /invitations/{id}/respond` | Viernes semana 4 |
| Sprint 4 | Scoring endpoints | `GET /matches/{id}/scoring-view` | Viernes semana 6 |
| Sprint 5 | Leaderboard endpoints | `GET /competitions/{id}/leaderboard` | Viernes semana 7 |

**Comunicación:** Daily standups + PR reviews cruzados Frontend ↔ Backend

---

## ✅ Historial de Implementaciones (Completado)

### 🎯 v1.16.0 - Major Dependencies Update (Sprints 1-4)

> **Estado:** ✅ Completado (24 Ene 2026)
> **Objetivo:** Modernizar el stack tecnológico completo.

#### ✅ Sprint 4: Verificación Final
- `@sentry/replay`: downgrade a **7.116.0** (peer dependency fix)
- Tests: 717 passed, 0 failed ✅
- Security: 0 vulnerabilities ✅
- Performance: Bundle 1318 KB (gzipped ~460 KB)
- UI Fixes: Modal overlay opacity, toast positioning, cursor-pointer

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

> **Estado:** ✅ Completado (24 Ene 2026)
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

## 📊 Estado Actual (v1.16.0 ✅)

### Métricas Clave

- **Tests:** 717 passing, 1 skipped, 0 failed ✅
- **Coverage:** ≥85% lines, ≥75% functions ✅
- **Bundle:** 1318 KB (~460 KB gzipped) ⚠️ (target: ≤1000 KB)
- **Build time:** 5.83s ⚡
- **Security:** 0 vulnerabilities ✅
- **OWASP Score:** 8.75/10 ✅

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

**Última revisión:** 24 Ene 2026 (v1.16.0 Completada)
**Próxima revisión:** Inicio v2.1.0