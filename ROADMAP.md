# 🗺️ Roadmap - RyderCupFriends Frontend

> **Versión:** 1.7.0
> **Última actualización:** 17 Dic 2025
> **Estado general:** ✅ Producción
> **Framework:** React 18 + Vite 7
> **Arquitectura:** Clean Architecture + DDD

---

## 📊 Resumen Ejecutivo

### ✅ Completado (v1.0.0 - v1.7.0)

| Componente | Estado | Descripción |
|-----------|--------|-------------|
| **Clean Architecture** | ✅ 100% | Domain, Application, Infrastructure, Presentation |
| **Testing** | ✅ 419 tests | 35 archivos, ~5s ejecución, cobertura 90%+ |
| **Autenticación** | ✅ Completo | Login, Register, Email Verification, JWT |
| **Competiciones** | ✅ Completo | CRUD, Estados, Transiciones, Browse |
| **Enrollments** | ✅ 90% | Domain + Application completo, UI pendiente |
| **Handicaps** | ✅ Completo | Manual + RFEG (validación por país) |
| **Sentry** | ✅ Operacional | Error tracking, Performance, Session Replay |
| **Performance** | ✅ Optimizado | Code splitting, Lazy loading (-95% bundle) |
| **React Auto-Escaping** | ✅ Nativo | XSS protection por defecto |

### 📈 Métricas Clave

- **Tests:** 419 tests pasando (100% pass rate)
- **Bundle inicial:** 47 KB (reducido de 978 KB)
- **Páginas:** 11 rutas (5 públicas, 6 protegidas)
- **Cobertura:** Domain 100%, Application 90%, Utils 100%
- **Deployment:** Render.com (Static Site)

---

## 🔄 Sincronización con Backend v1.8.0

> **Backend Status:** v1.8.0 (8/16 tareas completadas - 50%)
> **Backend Score:** 9.6/10 (Security OWASP)
> **Frontend Status:** v1.7.0 (requiere actualización)
> **Frontend Score:** 7.5/10 (Security OWASP)

### ⚠️ Cambios del Backend que Requieren Actualización Frontend

| # | Feature Backend | Estado Backend | Impacto Frontend | Prioridad |
|---|-----------------|----------------|------------------|-----------|
| **1** | Rate Limiting (SlowAPI) | ✅ Completado | ✅ Sin cambios | 🟢 Baja |
| **2** | Security Headers | ✅ Completado | ✅ Sin cambios | 🟢 Baja |
| **3** | Password Policy (12 chars) | ✅ Completado | ⚠️ **REQUIERE UPDATE** | 🔴 Crítica |
| **4** | httpOnly Cookies (JWT) | ✅ Completado | ⚠️ **REQUIERE UPDATE** | 🔴 Crítica |
| **5** | Session Timeout + Refresh | ✅ Completado | ⚠️ **REQUIERE UPDATE** | 🔴 Crítica |
| **6** | CORS Configuration | ✅ Completado | ✅ Sin cambios | 🟢 Baja |
| **7** | Validaciones Pydantic | ✅ Completado | ⚠️ **REQUIERE UPDATE** | 🟠 Alta |
| **8-16** | Logging + Monitoring | ⏳ Pendiente | ✅ Sin impacto | 🟢 Baja |

### 📋 Tabla de Compatibilidad - Validaciones Frontend vs Backend

| Campo | Frontend Actual (v1.7.0) | Backend v1.8.0 | Acción Requerida |
|-------|---------------------------|----------------|-------------------|
| **first_name** | 2-50 chars, con acentos | 2-100 chars, **con acentos** ✅ | ⚠️ Cambiar límite max de 50 a 100 |
| **last_name** | 2-50 chars, con acentos | 2-100 chars, **con acentos** ✅ | ⚠️ Cambiar límite max de 50 a 100 |
| **email** | Sin límite max | **254 chars** (RFC 5321) | ⚠️ Agregar `maxLength={254}` |
| **password** | **8-sin límite** | **12-128 chars** | ⚠️ Cambiar min a 12, max a 128 |
| **Tokens** | sessionStorage | **httpOnly cookies** | ⚠️ Migrar a cookies + `credentials: 'include'` |
| **Access Token** | 60 min | **15 min** | ⚠️ Implementar refresh token flow |
| **Refresh Token** | ❌ No existe | **7 días** (cookie httpOnly) | ⚠️ Nuevo endpoint `/refresh-token` |

---

## 🔐 SEGURIDAD - Mejoras Prioritarias (v1.8.0)

> **Análisis OWASP Top 10 2021 completado:** 15 Dic 2025
> **Puntuación General Frontend:** 7.5/10 ✅
> **Puntuación General Backend:** 9.6/10 ✅
>
> **✨ PROGRESO v1.8.0:** 0/12 tareas completadas (pendiente sincronización con backend)
> **⚠️ SIGUIENTE:** Validaciones de inputs (password 12 chars + límites longitud)

### Estado de Protecciones OWASP

| Categoría OWASP | Puntuación | Estado | Prioridad |
|-----------------|------------|--------|-----------|
| **A01: Broken Access Control** | 6/10 | ⚠️ Parcial | 🔴 Crítica |
| **A02: Cryptographic Failures** | 7/10 | ⚠️ Parcial | 🔴 Crítica |
| **A03: Injection** | 8/10 | ✅ Bien | 🟠 Alta |
| **A04: Insecure Design** | 8/10 | ✅ Bien | 🟠 Alta |
| **A05: Security Misconfiguration** | 8.5/10 | ✅ Bien | 🟠 Alta |
| **A06: Vulnerable Components** | 8/10 | ✅ Bien | 🟠 Alta |
| **A07: Auth Failures** | 6.5/10 | ⚠️ Parcial | 🔴 Crítica |
| **A08: Data Integrity** | 7/10 | ⚠️ Parcial | 🟡 Media |
| **A09: Logging & Monitoring** | 9/10 | ✅ Excelente | 🟢 Baja |
| **A10: SSRF** | 9/10 | ✅ N/A | 🟢 Baja |

### Estado Actual de Protecciones

| Protección | Estado | Prioridad | OWASP |
|------------|--------|-----------|-------|
| React Auto-Escaping | ✅ Nativo | - | A03 |
| Security Headers (CSP, HSTS, etc.) | ✅ Implementado | - | A03, A05 |
| Tokens en sessionStorage | ❌ **VULNERABLE** | 🔴 Crítica | A01, A02 |
| Password Policy (8 chars) | ⚠️ Mínimo 8 (debe ser 12) | 🔴 Crítica | A07 |
| httpOnly Cookies | ❌ NO implementado | 🔴 Crítica | A01, A02 |
| Refresh Tokens | ❌ NO implementado | 🔴 Crítica | A01, A02, A07 |
| Input Validation | ⚠️ Parcial (sin límites max) | 🟠 Alta | A03 |
| 2FA/MFA | ❌ NO implementado | 🟠 Alta | A07 |
| Logout por Inactividad | ❌ NO implementado | 🟠 Alta | A07 |
| reCAPTCHA | ❌ NO implementado | 🟡 Media | A04, A07 |
| Device Fingerprinting | ❌ NO implementado | 🟡 Media | A07 |
| Sentry Monitoring | ✅ Operacional | - | A09 |
| Dependency Audit | ⚠️ Revisar mensualmente | 🟡 Media | A06 |

### Vulnerabilidades Críticas Detectadas

1. ❌ **Tokens en sessionStorage** - Vulnerable a XSS (A01, A02) - **Backend resuelto con httpOnly cookies**
2. ⚠️ **Password mínimo 8 caracteres** - OWASP recomienda 12 (A07) - **Backend implementado, frontend pendiente**
3. ❌ **No hay refresh tokens** - Sesiones largas (60 min) inseguras (A02, A07) - **Backend implementado (15min + refresh 7 días)**
4. ❌ **No hay MFA/2FA** - Vulnerable a credential stuffing (A07)
5. ⚠️ **Sin límites de longitud** - Email, password sin max length (A03, A04)
6. ⚠️ **CSP con 'unsafe-inline'** - Permite scripts inyectados (A03)
7. ⚠️ **No hay logout por inactividad** - Sesiones activas indefinidamente (A07)
8. ⚠️ **No hay CAPTCHA** - Vulnerable a bots (A04, A07)

---

### Plan de Implementación (v1.8.0 - 3-4 semanas)

**Semana 1: Validaciones de Inputs (Quick Wins)**
- [ ] **1. Actualizar password mínimo a 12 caracteres** - 30 min
  - Actualizar `src/utils/validation.js:34` (mínimo 8 → 12)
  - Agregar máximo 128 caracteres
  - Actualizar mensajes en Register.jsx y EditProfile.jsx
  - Tests unitarios
  - **Puntuación esperada:** 7.5/10 → 7.7/10 (+0.2)
- [ ] **2. Agregar límites de longitud máxima** - 1-2h
  - Email: 254 chars (RFC 5321)
  - Nombres: 100 chars (aumentar de 50 a 100)
  - Password: 128 chars
  - Agregar `maxLength` en todos los inputs
  - Actualizar validation.js con límites
  - **Puntuación esperada:** 7.7/10 → 7.9/10 (+0.2)
- [ ] **3. Mejorar validación de nombres** - 30 min
  - Verificar regex acepta acentos (ya implementado ✅)
  - Asegurar que rechaza números (ya implementado ✅)
  - Tests unitarios adicionales
  - **Puntuación esperada:** Mantiene 7.9/10

**Semana 2: httpOnly Cookies + Refresh Tokens**
- [ ] **4. Migrar a httpOnly Cookies** - 4-6h (CRÍTICO)
  - **ELIMINAR:** `src/utils/secureAuth.js` completamente
  - Agregar `credentials: 'include'` en todos los repositories:
    - `src/infrastructure/auth/ApiAuthRepository.js`
    - `src/infrastructure/user/ApiUserRepository.js`
    - `src/infrastructure/competition/ApiCompetitionRepository.js`
    - `src/infrastructure/enrollment/ApiEnrollmentRepository.js`
    - `src/infrastructure/handicap/ApiHandicapRepository.js`
  - Actualizar Login.jsx (no guardar token manualmente)
  - Actualizar Register.jsx (no guardar token manualmente)
  - Actualizar Dashboard.jsx (logout con endpoint `/logout`)
  - Tests de integración (6 tests)
  - **Puntuación esperada:** 7.9/10 → 8.5/10 (+0.6)
- [ ] **5. Implementar Refresh Token Flow** - 3-4h
  - Crear interceptor para detectar 401 (token expirado)
  - Llamar a `POST /api/v1/auth/refresh-token` automáticamente
  - Reintentar request original con nuevo access token
  - Manejar errores (refresh token expirado → logout)
  - Tests de integración
  - **Puntuación esperada:** 8.5/10 → 8.8/10 (+0.3)

**Semana 3: Inactividad + CSP + Auditorías**
- [ ] **6. Logout por Inactividad** - 2h
  - Crear hook `useInactivityLogout` (30 min timeout)
  - Integrar en App.jsx
  - Tests unitarios
  - **Puntuación esperada:** 8.8/10 → 9.0/10 (+0.2)
- [ ] **7. Broadcast Channel (Logout Multi-Tab)** - 1-2h
  - Crear `src/utils/broadcastAuth.js`
  - Sincronizar logout entre pestañas
  - Tests manuales
  - **Puntuación esperada:** Mantiene 9.0/10 (mejora UX)
- [ ] **8. Mejorar CSP (eliminar unsafe-inline)** - 2-3h
  - Migrar CSP de meta tag a HTTP headers
  - Eliminar `'unsafe-inline'` de script-src y style-src
  - Usar nonces o hashes para scripts inline
  - Verificar con securityheaders.com
  - **Puntuación esperada:** 9.0/10 → 9.2/10 (+0.2)
- [ ] **9. Auditoría de Dependencias** - 2h
  - Ejecutar `npm audit`
  - Ejecutar `npm outdated`
  - Actualizar dependencias críticas (React, Vite, Sentry)
  - Testing exhaustivo después de updates
  - **Puntuación esperada:** Mantiene 9.2/10

**Semana 4: Testing + Documentación**
- [ ] **10. Tests Unitarios de Validaciones** - 2-3h
  - Tests de password (12 chars, 128 max)
  - Tests de límites de longitud
  - Tests de nombres con acentos
  - Cobertura >95% en validation.js
- [ ] **11. Tests de Integración con Backend v1.8.0** - 3-4h
  - Testing de httpOnly cookies (login, requests, logout)
  - Testing de refresh token flow (401 → refresh → retry)
  - Testing de validaciones (backend rechaza inputs inválidos)
  - Testing E2E manual (flujo completo)
- [ ] **12. Actualizar Documentación** - 1-2h
  - Actualizar CHANGELOG.md con cambios de v1.8.0
  - Actualizar CLAUDE.md con nuevas validaciones
  - Documentar cambios breaking (httpOnly cookies)
  - Crear ADR-006: Input Validation Standards

**Total estimado:** 25-35 horas

**OWASP Categories Addressed:**
- ✅ A01: Broken Access Control (httpOnly cookies, refresh tokens)
- ✅ A02: Cryptographic Failures (httpOnly cookies)
- ✅ A03: Injection (validaciones mejoradas, CSP)
- ✅ A05: Security Misconfiguration (CSP, headers)
- ✅ A06: Vulnerable Components (npm audit)
- ✅ A07: Authentication Failures (password 12 chars, inactividad, refresh tokens)

---

### Tareas Adicionales (v1.9.0 - Security + Features)

**Security (Prioridad Alta):**
- [ ] **13. Implementar 2FA/MFA (TOTP)** - 8-12h (CRÍTICO)
  - Página de configuración de 2FA (QR code)
  - Integración con Google Authenticator
  - Verificación en login
  - Backup codes
  - Tests exhaustivos
- [ ] **14. Implementar reCAPTCHA v3** - 3-4h
  - Integración en Login/Register
  - Score validation (>= 0.5)
  - Fallback UI para scores bajos
- [ ] **15. Device Fingerprinting** - 6-8h
  - Integración con FingerprintJS
  - Notificación de nuevos dispositivos (email)
  - Página "Manage Devices"
  - Endpoint para revocar dispositivos
- [ ] **16. Account Lockout (Frontend)** - 1-2h
  - Mostrar mensaje de cuenta bloqueada
  - Contador de intentos restantes
  - Timer de desbloqueo automático

**Monitoring & UX:**
- [ ] **17. Error Boundaries Avanzados** - 2-3h
  - Error Boundaries por módulo
  - Páginas de error personalizadas
  - Retry mechanisms
  - Sentry integration mejorada

**Otras Mejoras:**
- [ ] **18. Dependency Audit Mensual** - 1h (recurrente)
  - npm audit + npm outdated
  - Actualización de dependencias críticas
  - Security advisories review

---

### 📖 Documentación Detallada

Ver coordinación con backend en: **Backend ROADMAP (`../RyderCupAm/ROADMAP.md`)**

Incluye:
- Endpoints nuevos de refresh tokens
- Configuración de httpOnly cookies
- Rate limits por endpoint
- Ejemplos de requests/responses

**🔗 Referencias Frontend:**
- ADR-004: httpOnly Cookies Migration
- ADR-005: Sentry Error Tracking
- ADR-006: Input Validation Standards (crear)

---

## 🛠️ DESARROLLO - Tareas Pendientes

### Módulo de Enrollments

#### Integrar Use Cases en UI
**Estado:** ⏳ Pendiente
**Prioridad:** 🟡 Media
**Estimación:** 2-3 horas

**Archivos a Modificar:**
- `src/pages/CompetitionDetail.jsx` - Usar use cases en lugar de servicios
- `src/pages/BrowseCompetitions.jsx` - Usar `requestEnrollmentUseCase`

---

### Módulo de Perfil

#### Sistema de Foto de Perfil
**Estado:** 🔒 Bloqueado por backend
**Estimación:** 4-6 horas
**Requiere:**
- Campo `avatar_url` en modelo User (backend)
- Endpoint `PUT /api/v1/users/avatar` (multipart/form-data)
- Almacenamiento (S3, Cloudinary, o local)

---

## 🧪 Testing

### Estado Actual
- ✅ **419 tests pasando** (100% success rate)
- ✅ Domain Layer: 100% cobertura
- ✅ Application Layer: 90% cobertura
- ⏳ Enrollment Use Cases: 0% (no prioritario)

### Próximos Tests
- Tests de validación de inputs (inputValidation.test.js)
- Tests E2E con Playwright (no iniciado)
- Tests de integración de Enrollments UI
- Tests de seguridad (CSP, XSS attempts)

---

## 📦 Optimización

### Completado
- ✅ Code splitting (manual chunks)
- ✅ Lazy loading de rutas
- ✅ Bundle reducido 95% (978 KB → 47 KB)
- ✅ Suspense con loading fallback

### Futuras Optimizaciones
- Preload de rutas críticas
- Service Worker para offline (PWA)
- Image optimization (AVIF/WebP)

---

## 🚀 Roadmap de Versiones

### v1.8.0 (Próxima - Security Release) - Estimado: 3-4 semanas

**Objetivo:** Securizar el frontend contra ataques comunes (OWASP Top 10 2021)

**Tareas (12):**
1. [ ] Actualizar password mínimo a 12 caracteres - 30 min
2. [ ] Agregar límites de longitud máxima - 1-2h
3. [ ] Mejorar validación de nombres - 30 min
4. [ ] Migrar a httpOnly Cookies - 4-6h (CRÍTICO)
5. [ ] Implementar Refresh Token Flow - 3-4h
6. [ ] Logout por Inactividad - 2h
7. [ ] Broadcast Channel (Logout Multi-Tab) - 1-2h
8. [ ] Mejorar CSP (eliminar unsafe-inline) - 2-3h
9. [ ] Auditoría de Dependencias - 2h
10. [ ] Tests Unitarios de Validaciones - 2-3h
11. [ ] Tests de Integración con Backend v1.8.0 - 3-4h
12. [ ] Actualizar Documentación - 1-2h

**Total estimado:** 25-35 horas de desarrollo

**OWASP Categories Addressed (6/10):**
- ✅ A01: Broken Access Control
- ✅ A02: Cryptographic Failures
- ✅ A03: Injection
- ✅ A05: Security Misconfiguration
- ✅ A06: Vulnerable Components
- ✅ A07: Authentication Failures

**Mejora esperada:** 7.5/10 → 9.2/10 📈 (+1.7 puntos)

Ver plan detallado en sección [🔐 SEGURIDAD](#-seguridad---mejoras-prioritarias-v180)

---

### v1.9.0 (Security + Features) - 1-2 meses después

**Objetivo:** Completar protecciones OWASP y funcionalidad core

**Security (Prioridad Alta):**
- 🔐 **2FA/MFA (TOTP)** - 8-12h (CRÍTICO)
- 🔐 reCAPTCHA v3 en Login/Register - 3-4h
- 🔐 Device Fingerprinting y notificación de logins - 6-8h
- 🔐 Gestión de dispositivos confiables - 4h

**Features:**
- 👤 Sistema de avatares - 4-6h
- 📝 Gestión de errores centralizada (Error Boundaries) - 2-3h
- 🎨 UI de enrollments refactorizada - 6-8h
- 🧪 Tests E2E con Playwright - 8-10h

**Total estimado:** 40-55 horas de desarrollo

**OWASP Categories Addressed (8/10):**
- ✅ Todas las categorías de v1.8.0
- ✅ A04: Insecure Design (reCAPTCHA, 2FA)
- ✅ A09: Logging & Monitoring (Error Boundaries mejorados)

**Mejora esperada:** 9.2/10 → 9.5/10 🚀 (+0.3 puntos)

---

### v2.0.0 (Mayor - Futuro) - 4-6 meses

**Objetivo:** Plataforma completa y escalable

**BREAKING CHANGES (Migration from v1.9.0):**
- [ ] **Eliminar soporte para localStorage tokens** - 2h
  - Remover código legacy de manejo manual de tokens
  - Solo httpOnly cookies (sin fallback)
  - Actualizar tests para reflejar cambios
  - **Requiere:** Todos los usuarios migrados a cookies

**Security:**
- 🔐 OAuth 2.0 / Social Login (Google, Apple)
- 🔐 Hardware Security Keys (WebAuthn)
- 🔐 Advanced Threat Detection (ML-based)
- 🔐 Políticas de contraseñas avanzadas (historial, expiración)
- 🔐 Audit logging completo (todas las acciones de usuario)

**Features:**
- 📱 Progressive Web App (PWA)
- 🌍 Internacionalización (i18n) - Español/Inglés
- 🎮 Sistema completo de equipos y torneos
- 📊 Analytics y métricas de uso
- 🔔 Sistema de notificaciones en tiempo real
- 💬 Chat entre jugadores

**Infrastructure:**
- 🚀 CI/CD completo con security scanning
- 🧪 Cobertura de tests > 95%
- 📈 Monitoreo avanzado con alertas
- 🔄 Backup y disaster recovery

**Total estimado:** 200+ horas de desarrollo

**Mejora esperada:** 9.5/10 → 10/10 🏆

---

## 📝 Notas de Implementación

### Orden Recomendado de Implementación (v1.8.0)

**Semana 1: Validaciones (Quick Wins)**
1. Actualizar password mínimo a 12 caracteres
2. Agregar límites de longitud máxima
3. Mejorar validación de nombres
4. Tests unitarios

**Semana 2: httpOnly Cookies**
1. Eliminar `src/utils/secureAuth.js`
2. Agregar `credentials: 'include'` en repositories
3. Actualizar Login/Register/Logout
4. Implementar refresh token flow
5. Testing local y staging

**Semana 3: Inactividad + CSP**
1. Logout por inactividad (hook)
2. Broadcast channel para multi-tab
3. Mejorar CSP (eliminar unsafe-inline)
4. Auditoría de dependencias

**Semana 4: Testing y Deploy**
1. Tests de integración con backend
2. Testing E2E manual
3. Documentación
4. Deploy a producción
5. Monitoreo con Sentry

---

### Coordinación Frontend-Backend

**Para cambios de seguridad (httpOnly cookies):**
1. ⚠️ **Backend implementa PRIMERO** (ya completado ✅)
2. Frontend adapta DESPUÉS (semana 2-3)
3. Testing exhaustivo en staging
4. Deploy coordinado
5. Monitoreo post-deploy (Sentry)

**Dependencias:**
- Backend v1.8.0 debe estar en producción antes de frontend v1.8.0
- Endpoints de refresh tokens deben estar disponibles
- CORS debe permitir `credentials: 'include'`

---

## 🔗 Referencias

- [React Security Best Practices](https://react.dev/learn/security)
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [CSP Guide](https://web.dev/csp/)
- [npm audit Documentation](https://docs.npmjs.com/cli/v9/commands/npm-audit)
- [httpOnly Cookies Guide](https://owasp.org/www-community/HttpOnly)
- Backend ROADMAP: `../RyderCupAm/ROADMAP.md`
- Frontend ADR-004: httpOnly Cookies Migration
- Frontend ADR-005: Sentry Error Tracking
- Frontend ADR-006: Input Validation Standards (pendiente)

---

**Última revisión:** 17 Dic 2025
**Próxima revisión:** Después de v1.8.0 (Security Release)
**Responsable:** Equipo de desarrollo frontend
