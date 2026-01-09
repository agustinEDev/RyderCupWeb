# 🗺️ Roadmap - RyderCupFriends Frontend

> **Versión:** 1.11.4 → 2.1.0 (En Desarrollo)
> **Última actualización:** 7 Ene 2026
> **Estado:** 🚧 Preparando v2.1.0
> **Stack:** React 18 + Vite 7 + Tailwind CSS 3.4 + TanStack Query + Zustand

---

## 📊 Estado Actual (v1.11.4)

### Métricas Clave
- **Tests:** 540 tests (100% pass rate)
- **Bundle inicial:** 47 KB (reducido de 978 KB)
- **Cobertura:** Domain 100%, Application 90%+
- **Security Score (OWASP):** 8.75/10
- **Páginas:** 11 rutas (5 públicas, 6 protegidas)

### Completado (v1.x)
- ✅ Clean Architecture + DDD
- ✅ Autenticación (httpOnly cookies, refresh tokens)
- ✅ CRUD Competiciones + Enrollments
- ✅ Handicaps (Manual + RFEG)
- ✅ Password Reset Flow
- ✅ i18n (ES/EN) - **28 Dic 2025**
- ✅ Sentry Monitoring
- ✅ CI/CD Pipeline (Quality Gates)
- ✅ Security Scanning (Snyk) - **4 Ene 2026**
- ✅ Dependencies Update (9 paquetes) - **4 Ene 2026**

---

## 🔐 Seguridad OWASP Top 10 2021

| Categoría | Score | Estado | Prioridad |
|-----------|-------|--------|-----------|
| A01: Broken Access Control | 8.0/10 | ✅ Bien | 🟠 Alta |
| A02: Cryptographic Failures | 9.0/10 | ✅ Excelente | 🟢 Baja |
| A03: Injection | 8.5/10 | ✅ Excelente | 🟢 Baja |
| A04: Insecure Design | 8.0/10 | ✅ Bien | 🟠 Alta |
| A05: Security Misconfiguration | 10.0/10 | ✅ Perfecto | 🟢 Baja |
| A06: Vulnerable Components | 9.5/10 | ✅ Excelente | 🟢 Baja |
| A07: Auth Failures | 9.0/10 | ✅ Excelente | 🟢 Baja |
| A08: Data Integrity | 7.0/10 | ⚠️ Parcial | 🟡 Media |
| A09: Logging & Monitoring | 9.5/10 | ✅ Excelente | 🟢 Baja |
| A10: SSRF | 9.0/10 | ✅ N/A | 🟢 Baja |
| **TOTAL (Media)** | **8.75/10** | | |

### Protecciones Implementadas
- ✅ React Auto-Escaping (XSS)
- ✅ httpOnly Cookies (21 Dic 2025)
- ✅ Password Policy 12+ chars (OWASP ASVS V2.1)
- ✅ Refresh Token Flow + Interceptor
- ✅ Logout por Inactividad (30 min)
- ✅ Broadcast Channel Multi-Tab
- ✅ CSP sin unsafe-inline
- ✅ Snyk Security Scanning (CI/CD)
- ✅ Security Tests Suite (12 tests E2E)

### Pendientes (Alta Prioridad)
- ❌ 2FA/MFA (TOTP)
- ❌ reCAPTCHA v3
- ❌ Device Fingerprinting

---

## 🚀 Historial de Versiones

### v1.11.4 (5 Ene 2026) - GitHub Actions Fixes
**Cambios:**
- Fix errores en workflows de GitHub Actions (3 fixes críticos)
- **PR Checks:** Delay de 10s para esperar auto-fix en Dependabot PRs
- **Snyk SARIF:** Sintaxis corregida + uploads condicionales
- **TruffleHog:** Scan alternativo para Dependabot PRs

**Workflows corregidos:** pr-checks.yml, security.yml
**Estado CI/CD:** ✅ 100% passing (developer + Dependabot PRs)

### v1.11.3 (4 Ene 2026) - Dependencies Update
**Cambios:**
- Actualizadas 9 dependencias (2 producción, 7 desarrollo)
- framer-motion 12.23.24 → 12.23.26
- lucide-react 0.553.0 → 0.562.0
- tailwindcss 3.3.6 → 3.4.19
- vite 7.2.2 → 7.3.0
- autoprefixer 10.4.16 → 10.4.23
- eslint-plugin-react-refresh 0.4.5 → 0.4.26
- jsdom 27.2.0 → 27.4.0
- @tailwindcss/postcss 4.1.17 → 4.1.18
- @testing-library/react 16.3.0 → 16.3.1

**Tests:** 540 unitarios + 8 integración (100% passing)
**Bundle:** 901 KB (bajo threshold 1000 KB)

### v1.11.2 (4 Ene 2026) - Snyk Integration
**Cambios:**
- Integración Snyk en CI/CD (security + code analysis)
- Fix i18n loading button en Login

**Mejora OWASP:** +0.15 (8.60 → 8.75)
**Categorías mejoradas:** A05 (+0.5), A06 (+0.5), A09 (+0.5)

### v1.11.0 (28 Dic 2025) - i18n Complete
**Cambios:**
- Soporte completo ES/EN (28 páginas)
- LanguageSwitcher con banderas
- Países bilingües (name_en/name_es)
- Estados traducidos (competiciones, enrollments)

**Namespaces:** auth, common, landing, dashboard, profile, competitions

### v1.8.5 (27 Dic 2025) - Password Reset
**Cambios:**
- Sistema completo de recuperación de contraseña
- 3 Use Cases + Repository methods
- ForgotPassword + ResetPassword pages
- Anti-enumeración security
- 53 tests unitarios + 24 E2E

**Tiempo:** 7h (estimado 10-14.5h)

### v1.8.0 (25 Dic 2025) - Security Release
**Cambios:**
- httpOnly Cookies migration
- Refresh Token Flow (interceptor)
- Logout por inactividad (30 min)
- Broadcast Channel multi-tab
- CSP sin unsafe-inline
- CI/CD Quality Gates
- Security Tests Suite (12 tests)

**Mejora OWASP:** +2.0 (7.5 → 9.5)
**Tiempo:** 28.5h
**Tests:** 419 → 540

---

## 🚀 Roadmap v2.1.0 - Competition Module Evolution

> **Objetivo:** Convertir la gestión básica de torneos en un sistema completo de planificación, scoring y leaderboards en tiempo real.
> **Duración:** 7 semanas (paralelo con backend v2.1.0)
> **Backend compatible:** FastAPI v2.1.0 (RyderCupAm)

---

### 📦 Nuevas Dependencias Principales

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

### Sprint 1-2 (Semanas 1-2): Roles & Golf Courses

#### **1.1 Sistema de Roles (RBAC)**
- [ ] Domain: Role entity, RoleName enum (ADMIN, CREATOR, PLAYER)
- [ ] Application: AssignRoleUseCase, RemoveRoleUseCase, GetUserRolesUseCase
- [ ] Infrastructure: ApiRoleRepository con endpoints `/api/v1/admin/users/{id}/roles`
- [ ] Presentation: RoleGuard HOC para rutas protegidas por rol
- [ ] Components: RoleBadge component con colores diferenciados
- [ ] Hooks: useAuth() con método hasRole(role)
- [ ] Store: authStore con roles[] en Zustand

**Rutas nuevas:**
- `/admin/users` - Lista de usuarios con gestión de roles (ADMIN only)
- `/admin/users/:id/roles` - Modal para asignar/remover roles

**Tests:** 40+ tests unitarios (use cases, repository, guards)

---

#### **1.2 Gestión de Campos de Golf (Golf Courses CRUD)**
- [ ] Domain: GolfCourse entity, Tee entity, Hole entity, ApprovalStatus enum
- [ ] Value Objects: TeeCategory, GolfCourseType, SlopeRating, CourseRating
- [ ] Application: 5 use cases (Create, Update, Delete, GetById, Search)
- [ ] Infrastructure: ApiGolfCourseRepository con endpoints `/api/v1/admin/golf-courses`
- [ ] Presentation: Formulario de 3 pasos (Basic Info → Tees → Holes)
- [ ] Components: GolfCourseCard, TeeSelector, HoleTable
- [ ] Validations: Zod schemas para validación de formularios

**Rutas nuevas:**
- `/admin/golf-courses` - Lista de campos (ADMIN only)
- `/admin/golf-courses/new` - Crear campo (formulario 3 pasos)
- `/admin/golf-courses/:id/edit` - Editar campo existente
- `/creator/golf-courses/new` - Crear campo (CREATOR, queda PENDING_APPROVAL)

**Formulario Step 3 - Opciones de carga de hoyos:**
- Plantillas predefinidas (Par 72, Par 71, Par 70)
- Tabla editable manual (18 filas)
- Upload JSON (avanzado)

**Tests:** 60+ tests (domain entities, use cases, validaciones Zod)

---

### Sprint 2 (Semana 3): Course Approval System

#### **2.1 Sistema de Aprobación de Campos**
- [ ] Application: ApproveGolfCourseUseCase, RejectGolfCourseUseCase, ListPendingCoursesUseCase
- [ ] Infrastructure: Endpoints `/api/v1/admin/golf-courses/pending`, `/approve`, `/reject`
- [ ] Presentation: Admin panel con lista de campos pendientes
- [ ] Components: ApprovalStatusBadge (🟡 Pending, ✅ Approved, ❌ Rejected)
- [ ] Notifications: Email automático al Creator (aprobado/rechazado)
- [ ] Toast: Notificaciones in-app con link al campo

**Rutas nuevas:**
- `/admin/golf-courses/pending` - Panel de aprobación (ADMIN only)

**Features:**
- Badge con contador de campos pendientes en navbar admin
- Modal de detalle con todos los datos (tees, hoyos)
- Botones: Aprobar | Rechazar | Editar y Aprobar
- Campo de comentario obligatorio si rechaza

**Tests:** 25+ tests (use cases, flujo de aprobación)

---

### Sprint 3 (Semana 4): Schedule & Invitations

#### **3.1 Planificación de Rounds & Matches**
- [ ] Domain: Round entity, Match entity, MatchFormat enum, SessionType enum
- [ ] Value Objects: PlayingHandicap (cálculo WHS automático)
- [ ] Application: 6 use cases (CreateRound, UpdateRound, DeleteRound, CreateMatch, UpdateMatchPlayers, CancelMatch)
- [ ] Infrastructure: Endpoints `/api/v1/competitions/{id}/rounds`, `/matches`
- [ ] Presentation: Vista de schedule con drag & drop
- [ ] Components: RoundCard, MatchCard, PlayerSearchBox, TeeSelector
- [ ] Hooks: useDragAndDrop, usePlayerSearch
- [ ] Store: competitionStore con schedule[] y matches[]

**Rutas nuevas:**
- `/creator/competitions/:id/schedule` - Vista de planificación (CREATOR/ADMIN only)

**Features clave:**
- Drag & Drop para reordenar matches
- Buscador de jugadores con autocompletar (por nombre/email)
- Selector de tee por jugador individual
- Playing Handicap auto-calculado y mostrado (WHS)
- Formatos: Fourball, Foursomes, Singles, Greensome
- Shotgun start: starting_hole configurable (1-18)

**Tests:** 50+ tests (entities, cálculo handicap, drag & drop)

---

#### **3.2 Sistema de Invitaciones**
- [ ] Domain: Invitation entity, InvitationStatus enum, InvitationToken VO
- [ ] Application: 5 use cases (SendInvitation, SendInvitationByEmail, RespondToInvitation, ListMyInvitations, RegisterWithToken)
- [ ] Infrastructure: Endpoints `/api/v1/competitions/{id}/invitations`, `/by-email`, `/respond`
- [ ] Presentation: Panel de invitaciones, lista de pendientes, registro con token
- [ ] Components: InvitationCard, InvitationResponseButtons, InvitationBadge
- [ ] Store: invitationStore con pendingInvitations[]

**Rutas nuevas:**
- `/creator/competitions/:id/invitations` - Panel de invitaciones
- `/player/invitations` - Lista de invitaciones pendientes
- `/auth/register?invitation_token=...` - Registro con auto-inscripción

**Features:**
- Buscar usuarios registrados (autocompletar)
- Invitar por email (no registrados)
- Badge de notificación en navbar (invitaciones pendientes)
- Expiración 7 días, opción de re-enviar
- Auto-inscripción al aceptar invitación
- Mensaje personal opcional

**Tests:** 40+ tests (flujo completo, expiración, auto-enroll)

---

### Sprint 4-5 (Semanas 5-7): Live Scoring & Validation

#### **4.1 Interfaz de Scoring (Player)**
- [ ] Domain: HoleScore entity, ValidationStatus enum, ScorecardStatus enum
- [ ] Application: 8 use cases (AnnotateHoleScore, UpdateHoleScore, GetScoringView, SubmitScorecard, GetDiscrepancies, CalculateMatchStanding)
- [ ] Infrastructure: Endpoints `/api/v1/matches/{id}/scores/holes/{hole_number}`, `/scoring-view`, `/scorecard/submit`
- [ ] Presentation: Vista de 3 pestañas (Anotar, Scorecard, Leaderboard)
- [ ] Components: HoleInput, ScorecardTable, ValidationIcon, MatchStatusDisplay
- [ ] Hooks: useScoring, useMatchPolling (actualización cada 10s)
- [ ] Store: scoringStore con currentMatch, currentHole, scores[]

**Rutas nuevas:**
- `/player/matches/:id/scoring` - Interfaz de anotación (PLAYER only)

**Pestaña 1: Anotar (Input Tab)**
- Navegación libre entre hoyos (← → botones, mapa visual)
- Input bruto + strokes received calculado → score neto
- Validación dual en tiempo real:
  - ✅ Verde: Coincide con marcador
  - ❌ Rojo: Discrepancia
  - ⚪ Gris: Sin anotar
- Auto-guardar al cambiar de hoyo
- Mapa de progreso visual (18 hoyos)

**Pestaña 2: Scorecard (Vista Completa)**
- Tabla tradicional de scorecard
- Columnas: Hoyo | Par | SI | Player Bruto | Player Neto | Marker Bruto | Marker Neto | Result
- Match status: "2 UP (14 holes played)"

**Pestaña 3: Leaderboard (Match Status)**
- Estado actual del match (quién va ganando)
- Últimos hoyos jugados
- Team standings global (puntos acumulados)

**Tests:** 80+ tests (cálculos, validación, polling, edge cases)

---

#### **4.2 Validación Dual & Entrega de Tarjeta**
- [ ] Validación pre-entrega: 18/18 hoyos ✅
- [ ] Modal de confirmación con resumen
- [ ] Bloqueo si hay discrepancias (❌)
- [ ] Modal de ayuda: "Habla con tu marcador para resolver diferencias"
- [ ] Backend marca tarjeta como SUBMITTED (inmutable)
- [ ] Notificación al marcador (ya puede entregar la suya)

**Reglas de negocio:**
- NO se puede entregar si hay ❌ en algún hoyo
- Después de entregar, NO se puede modificar
- Ambos jugadores deben entregar para completar match

**Tests:** 30+ tests (validaciones, edge cases, bloqueos)

---

### Sprint 5 (Semana 6-7): Leaderboards

#### **5.1 Leaderboard Global de Competición**
- [ ] Application: GetCompetitionLeaderboardUseCase
- [ ] Infrastructure: Endpoint `/api/v1/competitions/{id}/leaderboard`
- [ ] Presentation: Vista pública con team standings y matches activos
- [ ] Components: TeamStandingsBar, MatchSummaryCard, RoundAccordion
- [ ] Hooks: useLeaderboardPolling (actualización cada 30s)
- [ ] Optimizations: React Query caching con staleTime 30s

**Rutas nuevas:**
- `/competitions/:id/leaderboard` - Vista pública (sin auth si competición es pública)

**Features:**
- Barra de progreso visual (Team A vs Team B)
- Puntos actuales (ej: 12.5 - 9.5)
- Matches en progreso con estado actual ("2 UP (14)")
- Acordeón con jornadas anteriores
- Polling automático cada 30s cuando hay matches IN_PROGRESS

**Tests:** 35+ tests (cálculo de puntos, polling, estados)

---

## 📊 Métricas Objetivo v2.1.0

| Métrica | v1.11.4 | v2.1.0 Objetivo | Incremento |
|---------|---------|-----------------|------------|
| **Tests** | 540 | 800-900 | +48-67% |
| **Rutas** | 11 | 20-25 | +80-130% |
| **Cobertura Lines** | 80% | 83-85% | +3-5% |
| **Bundle Size** | 47 KB | 120-150 KB | +73-103 KB (con code splitting) |
| **Security Score** | 8.75/10 | 8.9-9.0/10 | +0.15-0.25 |
| **API Endpoints** | 15 | 35-45 | +130-200% |

---

## 🗓️ Timeline Detallado

| Sprint | Semanas | Features | Tests Estimados | PRs Estimados |
|--------|---------|----------|-----------------|---------------|
| Sprint 1 | 1-2 | Roles + Golf Courses CRUD | 100+ | 4-5 |
| Sprint 2 | 3 | Course Approval | 25+ | 2 |
| Sprint 3 | 4 | Schedule + Invitations | 90+ | 5-6 |
| Sprint 4 | 5 | Live Scoring UI (3 tabs) | 80+ | 3-4 |
| Sprint 5 | 6-7 | Validation + Leaderboards | 65+ | 3-4 |
| **Total** | **7** | **9 módulos** | **360+** | **17-21** |

---

## 🔄 Roadmap Post-v2.1.0

### v2.2.0 (Futuro) - Estimado: 3-4 meses
**Features de Seguridad (movidas desde v1.12.0):**
- [ ] 2FA/MFA (TOTP) - 8-12h
- [ ] reCAPTCHA v3 - 3-4h
- [ ] Device Fingerprinting - 6-8h
- [ ] Sistema de avatares - 4-6h

**Features Nuevas:**
- [ ] WebSocket para scoring (reemplazar polling)
- [ ] Notificaciones push (PWA)
- [ ] Chat entre jugadores en match
- [ ] Export de scorecards a PDF
- [ ] Estadísticas avanzadas por jugador

**Mejora esperada:** 9.0/10 → 9.5/10

### v3.0.0 (Futuro) - 6-8 meses
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

**Última revisión:** 4 Ene 2026
**Próxima revisión:** Post v1.12.0
