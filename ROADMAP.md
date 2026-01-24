# 🗺️ Roadmap - RyderCupFriends Frontend

> **Versión:** 1.15.0 → 1.16.0 → 2.1.0
> **Última actualización:** 23 Ene 2026
> **Estado:** ✅ v1.15.0 Completada | 📋 v1.16.0 en progreso (Major Dependencies)
> **Stack:** React 18 + Vite 7 + Tailwind CSS 3.4 + TanStack Query + Zustand

---

## 📋 Próximos Pasos (Planificado)

### 🎯 Roadmap v1.16.0 - Major Dependencies Update

> **Objetivo:** Actualizar dependencias con breaking changes (React 19, Sentry 10, Router 7, etc.)
> **Duración:** 2-3 semanas (4 sprints técnicos)
> **Tipo:** Major version upgrades + Modernización del stack
> **Estado:** 🚀 En Progreso (Sprint 1 y 2 completados)

#### 📊 Resumen Ejecutivo

**Versión actual:** v1.15.0
**Próxima versión:** v1.16.0
**Dependencias a actualizar:** 11 paquetes (10 major + 1 minor crítico)
**Tests afectados estimados:** ~100-150 tests (de 712 totales)
**Riesgo:** MEDIO-ALTO (breaking changes documentados)

**Motivación:**
- React 19 trae mejoras de performance significativas (React Compiler)
- Sentry 10.x tiene mejor integración con React 19
- React Router 7 mejora type safety y data loading
- Tailwind 4 reduce bundle size (~20% más ligero)
- ESLint 9 mejora detección de errores

**Beneficios esperados:**
- ✅ Performance: +15-20% faster rendering (React Compiler)
- ✅ Bundle size: -10-15% (Tailwind 4 + tree-shaking mejorado)
- ✅ DX: Mejor type safety (Router 7)
- ✅ Security: Últimas versiones con patches de seguridad
- ✅ Soporte: Versiones LTS con soporte a largo plazo

#### 📦 Dependencias a Actualizar (Agrupadas)

**Grupo 1: React 19 Ecosystem (6 paquetes) - Sprint 1**
| Paquete | Actual | Target | Breaking Changes |
|---------|--------|--------|------------------|
| react | 18.3.1 | **19.2.3** | New APIs, Suspense changes |
| react-dom | 18.3.1 | **19.2.3** | createRoot required |
| @types/react | 18.3.27 | **19.2.8** | Type definitions |
| @types/react-dom | 18.3.7 | **19.2.3** | Type definitions |
| @vitejs/plugin-react | 4.7.0 | **5.1.2** | React 19 support |
| eslint-plugin-react-hooks | 4.6.2 | **7.0.1** | New hook rules |

**Grupo 2: Monitoring & Routing (2 paquetes) - Sprint 2**
| Paquete | Actual | Target | Breaking Changes |
|---------|--------|--------|------------------|
| @sentry/react | 7.120.4 | **10.34.0** | 3 major versions! API changes |
| react-router-dom | 6.30.3 | **7.12.0** | Data loading, type safety |

**Grupo 3: Build Tools & Styling (2 paquetes) - Sprint 3**
| Paquete | Actual | Target | Breaking Changes |
|---------|--------|--------|------------------|
| tailwindcss | 3.4.19 | **4.1.18** | Config format, utilities |
| eslint | 8.57.1 | **9.39.2** | Flat config required |

**Grupo 4: Verificación Final (1 paquete) - Sprint 4**
| Paquete | Actual | Target | Tipo |
|---------|--------|--------|------|
| @sentry/replay | 7.120.4 | **7.116.0** | Downgrade (peer dep fix) |

---

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

#### Sprint 1-2 (Semanas 1-2): Roles & Golf Courses

**1.1 Sistema de Roles (RBAC)**
- [ ] Domain: Role entity, RoleName enum (ADMIN, CREATOR, PLAYER)
- [ ] Application: AssignRoleUseCase, RemoveRoleUseCase, GetUserRolesUseCase
- [ ] Infrastructure: ApiRoleRepository con endpoints `/api/v1/admin/users/{id}/roles`
- [ ] Presentation: RoleGuard HOC para rutas protegidas por rol
- [ ] Components: RoleBadge component con colores diferenciados
- [ ] Hooks: useAuth() con método hasRole(role)
- [ ] Store: authStore con roles[] en Zustand

**1.2 Gestión de Campos de Golf (Golf Courses CRUD)**
- [ ] Domain: GolfCourse entity, Tee entity, Hole entity, ApprovalStatus enum
- [ ] Value Objects: TeeCategory, GolfCourseType, SlopeRating, CourseRating
- [ ] Application: 5 use cases (Create, Update, Delete, GetById, Search)
- [ ] Infrastructure: ApiGolfCourseRepository con endpoints `/api/v1/admin/golf-courses`
- [ ] Presentation: Formulario de 3 pasos (Basic Info → Tees → Holes)
- [ ] Components: GolfCourseCard, TeeSelector, HoleTable
- [ ] Validations: Zod schemas para validación de formularios

#### Sprint 2 (Semana 3): Course Approval System

**2.1 Sistema de Aprobación de Campos**
- [ ] Application: ApproveGolfCourseUseCase, RejectGolfCourseUseCase, ListPendingCoursesUseCase
- [ ] Infrastructure: Endpoints `/api/v1/admin/golf-courses/pending`, `/approve`, `/reject`
- [ ] Presentation: Admin panel con lista de campos pendientes
- [ ] Components: ApprovalStatusBadge (🟡 Pending, ✅ Approved, ❌ Rejected)
- [ ] Notifications: Email automático al Creator (aprobado/rechazado)
- [ ] Toast: Notificaciones in-app con link al campo

#### Sprint 3 (Semana 4): Schedule & Invitations

**3.1 Planificación de Rounds & Matches**
- [ ] Domain: Round entity, Match entity, MatchFormat enum, SessionType enum
- [ ] Value Objects: PlayingHandicap (cálculo WHS automático)
- [ ] Application: 6 use cases (CreateRound, UpdateRound, DeleteRound, CreateMatch, UpdateMatchPlayers, CancelMatch)
- [ ] Infrastructure: Endpoints `/api/v1/competitions/{id}/rounds`, `/matches`
- [ ] Presentation: Vista de schedule con drag & drop
- [ ] Components: RoundCard, MatchCard, PlayerSearchBox, TeeSelector
- [ ] Hooks: useDragAndDrop, usePlayerSearch
- [ ] Store: competitionStore con schedule[] y matches[]

**3.2 Sistema de Invitaciones**
- [ ] Domain: Invitation entity, InvitationStatus enum, InvitationToken VO
- [ ] Application: 5 use cases (SendInvitation, SendInvitationByEmail, RespondToInvitation, ListMyInvitations, RegisterWithToken)
- [ ] Infrastructure: Endpoints `/api/v1/competitions/{id}/invitations`, `/by-email`, `/respond`
- [ ] Presentation: Panel de invitaciones, lista de pendientes, registro con token
- [ ] Components: InvitationCard, InvitationResponseButtons, InvitationBadge
- [ ] Store: invitationStore con pendingInvitations[]

#### Sprint 4-5 (Semanas 5-7): Live Scoring & Validation

**4.1 Interfaz de Scoring (Player)**
- [ ] Domain: HoleScore entity, ValidationStatus enum, ScorecardStatus enum
- [ ] Application: 8 use cases (AnnotateHoleScore, UpdateHoleScore, GetScoringView, SubmitScorecard, GetDiscrepancies, CalculateMatchStanding)
- [ ] Infrastructure: Endpoints `/api/v1/matches/{id}/scores/holes/{hole_number}`, `/scoring-view`, `/scorecard/submit`
- [ ] Presentation: Vista de 3 pestañas (Anotar, Scorecard, Leaderboard)
- [ ] Components: HoleInput, ScorecardTable, ValidationIcon, MatchStatusDisplay
- [ ] Hooks: useScoring, useMatchPolling (actualización cada 10s)
- [ ] Store: scoringStore con currentMatch, currentHole, scores[]

**4.2 Validación Dual & Entrega de Tarjeta**
- [ ] Validación pre-entrega: 18/18 hoyos ✅
- [ ] Modal de confirmación con resumen
- [ ] Bloqueo si hay discrepancias (❌)
- [ ] Modal de ayuda: "Habla con tu marcador para resolver diferencias"
- [ ] Backend marca tarjeta como SUBMITTED (inmutable)
- [ ] Notificación al marcador (ya puede entregar la suya)

#### Sprint 5 (Semana 6-7): Leaderboards

**5.1 Leaderboard Global de Competición**
- [ ] Application: GetCompetitionLeaderboardUseCase
- [ ] Infrastructure: Endpoint `/api/v1/competitions/{id}/leaderboard`
- [ ] Presentation: Vista pública con team standings y matches activos
- [ ] Components: TeamStandingsBar, MatchSummaryCard, RoundAccordion
- [ ] Hooks: useLeaderboardPolling (actualización cada 30s)
- [ ] Optimizations: React Query caching con staleTime 30s

#### 📊 Métricas Objetivo v2.1.0

| Métrica | v1.15.0 | v2.1.0 Objetivo | Incremento |
|---------|---------|-----------------|------------|
| **Tests** | 717 | 800-900 | +12-26% |
| **Rutas** | 11 | 20-25 | +80-130% |
| **Cobertura Lines** | 82-83% | 85-87% | +3-4% |
| **Bundle Size** | ~250 KB | 300-350 KB | +50-100 KB |
| **Security Score** | 9.0/10 | 9.2/10 | +0.2 |
| **API Endpoints** | 15 | 35-45 | +130-200% |

#### 🗓️ Timeline Detallado

| Sprint | Semanas | Features | Tests Estimados | PRs Estimados |
|--------|---------|----------|-----------------|---------------|
| Sprint 1 | 1-2 | Roles + Golf Courses CRUD | 100+ | 4-5 |
| Sprint 2 | 3 | Course Approval | 25+ | 2 |
| Sprint 3 | 4 | Schedule + Invitations | 90+ | 5-6 |
| Sprint 4 | 5 | Live Scoring UI (3 tabs) | 80+ | 3-4 |
| Sprint 5 | 6-7 | Validation + Leaderboards | 65+ | 3-4 |
| **Total** | **7** | **9 módulos** | **360+** | **17-21** |

---

### 🔄 Roadmap Post-v2.1.0

#### v2.2.0 (Futuro) - Estimado: 3-4 meses
**Features de Seguridad:**
- [ ] 2FA/MFA (TOTP) - 8-12h
- [ ] reCAPTCHA v3 - 3-4h
- [ ] Device Fingerprinting (v2) - 6-8h
- [ ] Sistema de avatares - 4-6h

**Features Nuevas:**
- [ ] WebSocket para scoring (reemplazar polling)
- [ ] Notificaciones push (PWA)
- [ ] Chat entre jugadores en match
- [ ] Export de scorecards a PDF
- [ ] Estadísticas avanzadas por jugador

**Mejora esperada:** 9.0/10 → 9.5/10

#### v3.0.0 (Futuro) - 6-8 meses
**Features:**
- OAuth 2.0 / Social Login
- WebAuthn (Hardware Keys)
- PWA completo con offline mode
- Real-time notifications
- Analytics avanzado con gráficos
- Multi-tournament leaderboards
- Player rankings globales

**Mejora esperada:** 9.5/10 → 10/10 🏆

---

## 🔗 Documentación

- **CHANGELOG.md** - Historial detallado de cambios
- **CLAUDE.md** - Contexto para AI (instrucciones del proyecto)
- **ADRs:** `docs/architecture/decisions/`
- **Backend:** Configurar variable `BACKEND_PATH` con la ruta local del repositorio backend
- **API Docs:** `http://localhost:{BACKEND_PORT}/docs` (por defecto puerto 8000)

---

## ✅ Historial de Versiones Completadas

### v1.15.0 - Data Integrity Improvements (23 Ene 2026)
**Objetivo:** Mejorar OWASP A08 de 7.0/10 → 9.0/10 ✅
- ✅ SRI (Subresource Integrity) con `vite-plugin-sri` (SHA-384)
- ✅ CI/CD Commit Verification (firmas GPG)
- ✅ Package-Lock Validation
- ✅ Actualización dependencias: `framer-motion` (v12.27.0), `vite` (v7.3.1), `i18next` (v25.7.4), `react-i18next` (v16.5.2).
- ✅ Actualización Actions: `snyk/actions/node` (v1.0.0), `trufflesecurity/trufflehog` (v3.92.5).

#### 📝 Configuración Manual Requerida (Usuario)

1. **Configurar GPG_PUBLIC_KEYS secret en GitHub:**
   - Ir a: `Settings → Secrets and variables → Actions`
   - Crear nuevo secret: `GPG_PUBLIC_KEYS`
   - Valor: Exportar claves públicas con `gpg --armor --export [KEY-ID]`
   - Incluir todas las claves del equipo (separadas por newline)

2. **Testing del workflow:**
   - Crear commit SIN firmar → CI debe fallar ❌
   - Crear commit firmado → CI debe pasar ✅
   - Modificar package-lock.json manualmente → CI debe fallar ❌

---

### v1.14.0 - Device Fingerprinting Improvements (17 Ene 2026)
**Objetivo:** Resolver bugs críticos del sistema de device fingerprinting
- ✅ Tests: 540 → 712 (+172 netos)
- ✅ Cobertura Device Module: 85% → 97%
- ✅ 19 bugs resueltos (3 críticos, 7 medios, 9 UX)
- ✅ Immediate Device Revocation Detection (event-driven)
- ✅ Backend-Driven `is_current_device`
- ✅ Componentes: ConfirmModal, Skeleton Loader, Inline Errors
- ✅ Mejoras Accessibility (WCAG 2.1 AA)

---

### Versiones Anteriores (Detalle)
Ver **CHANGELOG.md** para historial completo de versiones anteriores.

---

**Estado General del Proyecto:**

#### 📊 Métricas Clave
- **Tests:** 717 tests (100% pass rate, 99.86% success)
- **Cobertura:** Domain 100%, Application 90%+, Lines 82-83%
- **Bundle inicial:** ~250 KB (gzip)
- **Páginas:** 11 rutas (5 públicas, 6 protegidas)
- **CI/CD:** 13 jobs (Quality Gates activos)

#### ✅ Features Implementadas (General)
- ✅ Clean Architecture + DDD
- ✅ Autenticación (httpOnly cookies, refresh tokens)
- ✅ Device Fingerprinting con revocación en tiempo real
- ✅ CRUD Competiciones + Enrollments
- ✅ Handicaps (Manual + RFEG)
- ✅ Password Reset Flow
- ✅ i18n (ES/EN)
- ✅ Sentry Monitoring (Error tracking + Session replay)
- ✅ Data Integrity (SRI, Signed Commits, Package-lock validation)
- ✅ Security Scanning (Snyk, TruffleHog, License checks)

#### 🔐 Seguridad OWASP Top 10 2021

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

**Última revisión:** 24 Ene 2026
**Próxima revisión:** v1.16.0 o próximo sprint