# 🗺️ Roadmap - RyderCupFriends Frontend

> **Versión:** 1.15.0 → 1.16.0 → 2.1.0
> **Última actualización:** 24 Ene 2026
> **Estado:** ✅ v1.16.0 Completada (24 Ene 2026) | 📋 v2.1.0 Planificada
> **Stack:** React 19 + Vite 7.3 + Tailwind CSS 4 + ESLint 9

---

## 🎯 Roadmap v2.1.0 - Sincronización Frontend & Backend

> **Objetivo:** Convertir la gestión básica de torneos en un sistema completo de planificación, scoring y leaderboards en tiempo real.
> **Duración:** 7 semanas (27 Ene 2026 - 17 Mar 2026)
> **Estado:** 🟢 **100% Sincronizado con Backend v2.1.0**
> **Backend compatible:** FastAPI v2.1.0 (RyderCupAm)

---

### 📝 Resumen de Sincronización con Backend (v2.1.0)

Tras la revisión del prompt del backend, hemos actualizado nuestro plan para reflejar una sincronización total.

- **Endpoints:** Confirmados **30 endpoints** (26 originales + 4 nuevos).
- **Tests:** Aceptada la estimación de **75+ tests** del backend, enfocados en cobertura pragmática.
- **Sprints:** Adoptada la estructura de **5 sprints** con fechas y sync points idénticos.
- **DTOs y Validación:** Se utilizarán los schemas Pydantic del backend como **fuente de la verdad**.
- **Lógica de Dominio:** Confirmados los 3 `Domain Services` que impulsarán la UI (Handicaps, Scoring, Leaderboards).
- **RBAC Foundation v2.0.0 (Backend):**
    - ✅ Endpoint `GET /api/v1/users/me/roles/{competition_id}` implementado.
    - ✅ Authorization helpers implementados.
- **Protocolo de Handoff:** Aceptado el proceso de entregas semanales.

---

### 🔑 RBAC Frontend Implementation Simplificada

Con la fundación RBAC v2.0.0 implementada en el backend, el trabajo en el frontend se simplifica enormemente. Ya **no es necesario** implementar un sistema complejo de roles, sino consumir el endpoint provisto para adaptar la UX.

#### 📝 Tareas Simplificadas de Frontend:

1.  **Crear `useUserRoles(competitionId)` hook:**
    *   Este hook custom consumirá el endpoint `GET /api/v1/users/me/roles/{competition_id}`.
    *   Retornará el estado de los roles (`isAdmin`, `isCreator`, `isPlayer`) y el `loading` state.
2.  **Implementar `<RoleBasedAccess>` componente:**
    *   Un componente wrapper que utilizará `useUserRoles` para renderizar condicionalmente su `children` basado en los roles requeridos.
3.  **Agregar condicionales en botones/vistas:**
    *   Utilizar el hook `useUserRoles` directamente en componentes o las props del `<RoleBasedAccess>` para controlar la visibilidad de elementos UI (botones, secciones, navegación).

#### 💡 Ejemplo de Implementación (Frontend):

```javascript
// Hook example (src/hooks/useUserRoles.js)
import { useQuery } from '@tanstack/react-query';
import { fetchUserRoles } from '../infrastructure/repositories/userRepository'; // Suponiendo una función de fetch

export const useUserRoles = (competitionId) => {
  const { data, isLoading, error } = useQuery(
    ['userRoles', competitionId],
    () => fetchUserRoles(competitionId),
    {
      enabled: !!competitionId, // Solo ejecutar si tenemos competitionId
    }
  );

  return {
    isAdmin: data?.is_admin || false,
    isCreator: data?.is_creator || false,
    isPlayer: data?.is_player || false,
    isLoading,
    error,
  };
};

// Component usage example
import { useUserRoles } from '../../hooks/useUserRoles';
import { Button } from '../../components/ui/Button'; // Suponiendo un componente Button

const CompetitionActions = ({ competitionId }) => {
  const { isAdmin, isCreator, isLoading } = useUserRoles(competitionId);

  if (isLoading) {
    return <p>Cargando roles...</p>;
  }

  return (
    <div>
      {(isCreator || isAdmin) && (
        <Button onClick={() => console.log('Editar Competición')}>
          Editar Competición
        </Button>
      )}
      {(isCreator || isAdmin) && (
        <Button onClick={() => console.log('Gestionar Inscripciones')}>
          Gestionar Inscripciones
        </Button>
      )}
      {/* ... otros botones con lógica de rol ... */}
    </div>
  );
};
```

#### ⚠️ Notas Importantes:

*   **NO implementar autorización en frontend:** El frontend solo se encargará de mejorar la experiencia de usuario (UX) mostrando u ocultando elementos.
*   **La autorización real se valida en backend:** Toda operación sensible debe ser validada por el backend, que es la única fuente de verdad para los permisos.
*   **El endpoint es solo para UX:** El `GET /api/v1/users/me/roles/{competition_id}` se utiliza exclusivamente para adaptar la interfaz de usuario, no para aplicar reglas de seguridad.

---

### 📅 Sprint Breakdown (Sincronizado con Backend)

> **Fechas:** 27 Ene 2026 - 17 Mar 2026
> **Equipo:** 1 Frontend Dev + 1 Backend Dev (paralelo)

| Sprint   | Fechas          | Esfuerzo BE | Endpoints | Sync Point        |
|----------|-----------------|-------------|-----------|-------------------|
| Sprint 1 | 27 Ene - 6 Feb  | 60h         | 10        | 🔄 Viernes 31 Ene |
| Sprint 2 | 7 Feb - 17 Feb  | 70h         | 10        | 🔄 Viernes 14 Feb |
| Sprint 3 | 18 Feb - 24 Feb | 48h         | 5         | 🔄 Viernes 21 Feb |
| Sprint 4 | 25 Feb - 10 Mar | 92h         | 4         | 🔄 Viernes 7 Mar  |
| Sprint 5 | 11 Mar - 17 Mar | 60h         | 2         | 🔄 Viernes 14 Mar |
| **TOTAL**| **7 semanas**   | **330h**    | **31**    |                   |

---

### 🔄 Plan de Handoffs por Sprint (Frontend/Backend)

| Sprint   | Backend Entrega                                                                                                         | Frontend Consume                                                                              | Sync Point     |
|----------|-------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|----------------|
| Sprint 1 | `POST /admin/users/{id}/roles`<br>`GET /golf-courses`<br>`GET /golf-courses/{id}` ⭐                                        | User Management page<br>Golf Course selector<br>Golf Course detail modal                              | Viernes 31 Ene |
| Sprint 2 | `POST /competitions/{id}/rounds`<br>`POST /rounds/{id}/matches`<br>`GET /matches/{id}` ⭐<br>`PUT /matches/{id}/status` ⭐<br>`POST /matches/{id}/walkover` ⭐ | Schedule drag-drop<br>Match creation wizard<br>Match detail modal<br>Manual status control<br>Walkover button | Viernes 14 Feb |
| Sprint 3 | `POST /invitations/{id}/respond`                                                                                        | Invitation cards<br>Email notifications                                                           | Viernes 21 Feb |
| Sprint 4 | `GET /matches/{id}/scoring-view`                                                                                        | Scoring 3 tabs<br>Real-time validation ✅/❌                                                        | Viernes 7 Mar  |
| Sprint 5 | `GET /competitions/{id}/leaderboard`                                                                                    | Public leaderboard<br>Polling (30s)                                                               | Viernes 14 Mar |

_⭐ = Endpoints nuevos añadidos por backend._

---

### ❓ Respuestas al Equipo Backend

Aquí están las confirmaciones y respuestas a vuestras preguntas:

1.  **Endpoints Adicionales:**
    -   **Confirmación:** ✅ Sí, los **4 nuevos endpoints** (`GET /golf-courses/{id}`, `GET /matches/{id}`, `PUT /matches/{id}/status`, `POST /matches/{id}/walkover`) cubren todas las necesidades de UX que habíamos identificado. No vemos necesidad de más endpoints por ahora.

2.  **Priorización de Testing:**
    -   **Confirmación:** ✅ De acuerdo con la estimación de **75+ tests**.
    -   **Casos Edge Críticos:** Nos gustaría asegurar que los siguientes casos estén cubiertos:
        -   **Expiración de Tokens:** ¿Qué sucede si el token de un usuario expira a mitad de una operación de scoring? ¿La UI lo gestiona sin pérdida de datos?
        -   **Eliminación de Entidades:** ¿Se puede eliminar un `match` que ya tiene scores? ¿O un `round` con `matches` ya jugados? Esperamos que el backend lo impida con un error 409 (Conflict).

3.  **Validaciones Pydantic:**
    -   **Confirmación:** ✅ Las validaciones parecen alineadas. Usaremos los DTOs del `ROADMAP.md` del backend como fuente de la verdad para nuestros formularios con `Zod`. Cualquier discrepancia la comunicaremos durante los *Sync Points*.

4.  **Canal de Comunicación:**
    -   **Preferencia:** ✅ **Slack**. Es el canal más ágil para notificaciones de despliegues y `curl` de ejemplo.

5.  **Fórmula WHS:**
    -   **Confirmación:** ✅ La fórmula `PH = (Handicap Index × Slope Rating / 113) + (Course Rating - Par)` es **correcta** según el estándar WHS. La hemos validado con calculadoras online y es la que esperamos.

---

### ✅ Acceptance Criteria Global (v2.1.0)

1.  **Funcionalidad:**
    -   ✅ Admin gestiona usuarios y aprueba campos de golf.
    -   ✅ Creator planifica torneos (rounds + matches) con drag & drop.
    -   ✅ Creator invita jugadores por email o user ID.
    -   ✅ Player anota scores en tiempo real con validación dual.
    -   ✅ Leaderboard público actualiza cada 30s (solo si hay matches activos).

2.  **Testing:**
    -   ✅ ≥85% test coverage (lines) en frontend.
    -   ✅ Backend mantiene ≥85% test coverage en su lógica de negocio.
    -   ✅ E2E tests cubren flujo completo.
    -   ✅ 0 tests failing en pipeline.

3.  **Performance:**
    -   ✅ Bundle size ≤1200 KB.
    -   ✅ Build time ≤6s.
    -   ✅ Polling optimizado (solo cuando necesario).

4.  **Security:**
    -   ✅ RoleGuard protege rutas por rol.
    -   ✅ 0 vulnerabilities (npm audit).
    -   ✅ OWASP Score ≥9.0/10.

5.  **Documentation:**
    -   ✅ ADRs actualizados (ADR-009, ADR-010).
    -   ✅ CHANGELOG.md con v2.1.0 completo.
    -   ✅ `ROADMAP.md` sincronizado entre frontend y backend.
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