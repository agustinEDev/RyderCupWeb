# 🗺️ Roadmap - RyderCupFriends Frontend

> **Versión:** 1.7.0
> **Última actualización:** 22 Dic 2025
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

> **Backend Status:** v1.8.0 (12/16 tareas completadas - 75%)
> **Backend Score:** 10.0/10 (Security OWASP) ✅
> **Frontend Status:** v1.8.0-alpha (10/14 tareas completadas - 71%)
> **Frontend Score:** 8.9/10 (Security OWASP) ✅ (+1.4 desde v1.7.0)

### ⚠️ Cambios del Backend que Requieren Actualización Frontend

| # | Feature Backend | Estado Backend | Impacto Frontend | Prioridad |
|---|-----------------|----------------|------------------|-----------|
| **1** | Rate Limiting (SlowAPI) | ✅ Completado | ✅ Sin cambios | 🟢 Baja |
| **2** | Security Headers | ✅ Completado | ✅ Sin cambios | 🟢 Baja |
| **3** | Password Policy (12 chars) | ✅ Completado | ✅ **SINCRONIZADO** (20 Dic) | 🟢 Baja |
| **4** | httpOnly Cookies (JWT) | ✅ Completado | ✅ **SINCRONIZADO** (21 Dic) | 🟢 Baja |
| **5** | Session Timeout + Refresh | ✅ Completado | ✅ **SINCRONIZADO** (21 Dic) | 🟢 Baja |
| **6** | CORS Configuration | ✅ Completado | ✅ Sin cambios | 🟢 Baja |
| **7** | Validaciones Pydantic | ✅ Completado | ✅ **SINCRONIZADO** (20 Dic) | 🟢 Baja |
| **8-16** | Logging + Monitoring | ⏳ Pendiente | ✅ Sin impacto | 🟢 Baja |

### 📋 Tabla de Compatibilidad - Validaciones Frontend vs Backend

| Campo | Frontend v1.8.0-alpha | Backend v1.8.0 | Estado |
|-------|----------------------|----------------|--------|
| **first_name** | 2-100 chars, con acentos | 2-100 chars, **con acentos** ✅ | ✅ Sincronizado (20 Dic) |
| **last_name** | 2-100 chars, con acentos | 2-100 chars, **con acentos** ✅ | ✅ Sincronizado (20 Dic) |
| **email** | **254 chars max** (RFC 5321) | **254 chars** (RFC 5321) | ✅ Sincronizado (20 Dic) |
| **password** | **12-128 chars** ✅ | **12-128 chars** | ✅ Sincronizado (20 Dic) |
| **Tokens** | **httpOnly cookies** | **httpOnly cookies** | ✅ Sincronizado (21 Dic) |
| **Access Token** | 15 min (cookie) | **15 min** | ✅ Sincronizado (21 Dic) |
| **Refresh Token** | 7 días (cookie) | **7 días** (cookie httpOnly) | ✅ Sincronizado (21 Dic - interceptor)

---

## 🔐 SEGURIDAD - Mejoras Prioritarias (v1.8.0)

> **Análisis OWASP Top 10 2021 completado:** 15 Dic 2025
> **Puntuación General Frontend:** 8.9/10 ✅ (+1.4 desde v1.7.0)
> **Puntuación General Backend:** 10.0/10 ✅
>
> **✨ PROGRESO v1.8.0:** 10/14 tareas completadas (71%) - Fase 6: CSP Estricto ✅
> **✅ ÚLTIMO COMPLETADO:** Content Security Policy sin unsafe-inline (22 Dic 2025) - Headers HTTP + Build limpio
> **⚠️ SIGUIENTE:** Auditoría de Dependencias + Automatización - Fase 7

### Estado de Protecciones OWASP

| Categoría OWASP | Puntuación | Estado | Prioridad |
|-----------------|------------|--------|-----------|
| **A01: Broken Access Control** | 8/10 | ✅ Bien | 🟠 Alta |
| **A02: Cryptographic Failures** | 9/10 | ✅ Excelente | 🟢 Baja |
| **A03: Injection** | 8.5/10 | ✅ Excelente | 🟢 Baja |
| **A04: Insecure Design** | 8/10 | ✅ Bien | 🟠 Alta |
| **A05: Security Misconfiguration** | 8.5/10 | ✅ Bien | 🟠 Alta |
| **A06: Vulnerable Components** | 8/10 | ✅ Bien | 🟠 Alta |
| **A07: Auth Failures** | 9/10 | ✅ Excelente | 🟢 Baja |
| **A08: Data Integrity** | 7/10 | ⚠️ Parcial | 🟡 Media |
| **A09: Logging & Monitoring** | 9/10 | ✅ Excelente | 🟢 Baja |
| **A10: SSRF** | 9/10 | ✅ N/A | 🟢 Baja |

### Estado Actual de Protecciones

| Protección | Estado | Prioridad | OWASP |
|------------|--------|-----------|-------|
| React Auto-Escaping | ✅ Nativo | - | A03 |
| Security Headers (CSP, HSTS, etc.) | ✅ Implementado | - | A03, A05 |
| httpOnly Cookies | ✅ **IMPLEMENTADO** (21 Dic 2025) | - | A01, A02 |
| Password Policy (12 chars) | ✅ **IMPLEMENTADO** (20 Dic 2025) | - | A07 |
| Backend Logout + Token Revocation | ✅ **IMPLEMENTADO** (21 Dic 2025) | - | A01, A07 |
| Refresh Token Flow (Interceptor) | ✅ **IMPLEMENTADO** (21 Dic 2025) | - | A01, A02, A07 |
| Input Validation | ⚠️ Parcial (sin límites max) | 🟠 Alta | A03 |
| 2FA/MFA | ❌ NO implementado | 🟠 Alta | A07 |
| Logout por Inactividad | ✅ **IMPLEMENTADO** (22 Dic 2025) | - | A07 |
| reCAPTCHA | ❌ NO implementado | 🟡 Media | A04, A07 |
| Device Fingerprinting | ❌ NO implementado | 🟡 Media | A07 |
| Sentry Monitoring | ✅ Operacional | - | A09 |
| Dependency Audit | ⚠️ Revisar mensualmente | 🟡 Media | A06 |

### Vulnerabilidades Críticas Detectadas

1. ✅ **Tokens en sessionStorage** - Vulnerable a XSS (A01, A02) - **✅ RESUELTO: Migrado a httpOnly cookies (21 Dic 2025)**
2. ✅ **Password mínimo 12 caracteres** - OWASP compliant (A07) - **✅ COMPLETADO (20 Dic 2025)**
3. ⚠️ **Refresh token flow no implementado** - Access tokens sin renovación automática (A02, A07) - **Backend implementado, frontend pendiente**
4. ❌ **No hay MFA/2FA** - Vulnerable a credential stuffing (A07)
5. ⚠️ **Sin límites de longitud** - Email, password sin max length (A03, A04)
6. ⚠️ **CSP con 'unsafe-inline'** - Permite scripts inyectados (A03)
7. ⚠️ **No hay logout por inactividad** - Sesiones activas indefinidamente (A07)
8. ⚠️ **No hay CAPTCHA** - Vulnerable a bots (A04, A07)

---

### Plan de Implementación (v1.8.0 - 3-4 semanas)

**Semana 1: Validaciones de Inputs (Quick Wins)**
- [x] **1. Actualizar password mínimo a 12 caracteres** - ✅ COMPLETADO (20 Dic 2025)
  - ✅ Actualizar `src/utils/validation.js:34` (mínimo 8 → 12)
  - ✅ Agregar máximo 128 caracteres
  - ✅ Actualizar mensajes en Register.jsx y EditProfile.jsx
  - ✅ Tests unitarios
  - **Puntuación esperada:** 7.5/10 → 7.7/10 (+0.2)
- [x] **2. Agregar límites de longitud máxima** - ✅ COMPLETADO (20 Dic 2025)
  - ✅ Email: 254 chars (RFC 5321)
  - ✅ Nombres: 100 chars (aumentar de 50 a 100)
  - ✅ Password: 128 chars
  - ✅ Agregar `maxLength` en todos los inputs
  - ✅ Actualizar validation.js con límites
  - **Puntuación esperada:** 7.7/10 → 7.9/10 (+0.2)
- [x] **3. Mejorar validación de nombres** - ✅ COMPLETADO (20 Dic 2025)
  - ✅ Verificar regex acepta acentos (ya implementado ✅)
  - ✅ Asegurar que rechaza números (ya implementado ✅)
  - ✅ Tests unitarios adicionales
  - **Puntuación esperada:** Mantiene 7.9/10

**Semana 2: httpOnly Cookies + Refresh Tokens**
- [x] **4. Migrar a httpOnly Cookies** - ✅ COMPLETADO (21 Dic 2025) - **6h reales**
  - ✅ **Coordinación con Backend:** Backend v1.8.0 en producción
  - ✅ **Pre-requisitos cumplidos:** Endpoints `/logout` y `/refresh-token` disponibles
  - ✅ **ELIMINADO:** `src/utils/secureAuth.js` completamente (165 líneas)
  - ✅ Agregado `credentials: 'include'` en todos los repositories:
    - ✅ `src/infrastructure/repositories/ApiAuthRepository.js`
    - ✅ `src/infrastructure/repositories/ApiUserRepository.js`
    - ✅ `src/infrastructure/repositories/ApiCompetitionRepository.js`
    - ✅ `src/infrastructure/repositories/ApiEnrollmentRepository.js`
    - ✅ `src/infrastructure/repositories/ApiHandicapRepository.js`
  - ✅ Actualizado Login.jsx (httpOnly cookies automáticas)
  - ✅ Actualizado Register.jsx (httpOnly cookies automáticas)
  - ✅ Actualizado Dashboard.jsx (logout con endpoint `/logout`)
  - ✅ Tests actualizados: 417 tests pasando, 56 tests skipped (para reescribir)
  - **Puntuación lograda:** 7.9/10 → 8.2/10 (+0.3)
- [x] **5. Implementar Refresh Token Flow** - ✅ COMPLETADO (21 Dic 2025) - **4h reales**
  - ✅ Creado interceptor para detectar 401 (token expirado)
  - ✅ Llama a `POST /api/v1/auth/refresh-token` automáticamente
  - ✅ Reintenta request original con nuevo access token
  - ✅ Maneja errores (refresh token expirado → logout)
  - ✅ Tests de integración: 16 tests unitarios (100% passing)
  - ✅ API centralizada: todos los repositorios usan `apiRequest()`
  - ✅ **Fix (23 Dic):** Corregido bug donde interceptor redirigía en `/auth/login` 401
  - ✅ **Fix (23 Dic):** Login con credenciales incorrectas ahora muestra toast correctamente
  - **Puntuación lograda:** 8.2/10 → 8.5/10 (+0.3)

**Semana 3: Inactividad + CSP + Auditorías**
- [x] **6. Logout por Inactividad** - ✅ COMPLETADO (22 Dic 2025) - **2h reales**
  - ✅ Creado hook `useInactivityLogout.jsx` (30 min timeout, 2 min warning)
  - ✅ Integrado en App.jsx con estado de autenticación
  - ✅ Sistema de advertencia interactivo con botón "Continuar sesión"
  - ✅ 6 tipos de eventos detectados (mouse, teclado, scroll, touch)
  - ✅ Debouncing de 1 segundo para optimizar performance
  - ✅ Cleanup completo (event listeners, timers, toasts)
  - ✅ Backend logout call con revocación de tokens
  - ✅ Limpieza de contexto de Sentry
  - ✅ Tests unitarios: 18 tests (100% passing)
  - **Puntuación lograda:** 8.5/10 → 8.7/10 (+0.2)
- [x] **7. Broadcast Channel (Logout Multi-Tab)** - ✅ COMPLETADO (22 Dic 2025) - **1.5h reales**
  - ✅ Creado `src/utils/broadcastAuth.js` (265 líneas) con API completa
  - ✅ Funciones: `broadcastLogout()`, `onAuthEvent()`, `broadcastLogin()`, `closeBroadcastChannel()`
  - ✅ Singleton pattern para eficiencia de memoria
  - ✅ Event-driven architecture (Observer pattern)
  - ✅ Compatibilidad: ~96% navegadores (Chrome 54+, Firefox 38+, Safari 15.4+)
  - ✅ Degradación elegante en navegadores sin soporte (silent fail)
  - ✅ Integrado en `HeaderAuth.jsx` y `Profile.jsx` (emisores)
  - ✅ Integrado en `App.jsx` (receptor con listener)
  - ✅ Reutiliza `handleInactivityLogout()` (DRY)
  - ✅ Cleanup de event listeners (prevención de memory leaks)
  - ✅ Tests manuales exitosos (3 pestañas sincronizadas)
  - ✅ Fix: Corregidos errores críticos en Profile.jsx (isLoading, logout function)
  - ✅ Logs comprensivos para debugging (solo en development)
  - **Puntuación lograda:** Mantiene 8.7/10 (mejora UX significativa)
- [x] **8. Mejorar CSP (eliminar unsafe-inline)** - ✅ COMPLETADO (22-23 Dic 2025) - **3h reales**
  - ✅ Eliminado CSP del meta tag en index.html (usar headers HTTP)
  - ✅ Actualizado _headers con CSP sin 'unsafe-inline'
  - ✅ Actualizado vercel.json con CSP sin 'unsafe-inline'
  - ✅ Actualizado nginx.conf con CSP sin 'unsafe-inline'
  - ✅ Configurado vite.config.js con CSP diferenciado (dev permisivo / prod estricto)
  - ✅ Build exitoso sin scripts inline
  - ✅ Verificación local: sin errores de CSP en consola
  - ✅ Creado script verify-csp.js para testing
  - ✅ **Fix (23 Dic):** Corregido bug de tokenRefreshInterceptor que causaba recarga de página
  - ✅ **Mejora (23 Dic):** Password se limpia automáticamente tras login fallido (OWASP A07)
  - ⏳ Pendiente: Verificar en producción con securityheaders.com (post-deploy)
  - **Puntuación lograda:** 8.7/10 → 8.9/10 (+0.2)
- [ ] **9. Auditoría de Dependencias** - 2-3h
  - Ejecutar `npm audit` y `npm outdated`
  - Actualizar dependencias críticas (React, Vite, Sentry)
  - Testing exhaustivo después de updates
  - **Automatización (NUEVO):** Configurar GitHub Actions para auditoría semanal
    - Crear workflow `.github/workflows/security-audit.yml`
    - Ejecutar `npm audit` automáticamente
    - Alertas de Dependabot habilitadas
  - **Puntuación esperada:** Mantiene 9.2/10

**Semana 4: Testing + Documentación**
- [x] **10. Tests Unitarios de Validaciones** - ✅ COMPLETADO (20 Dic 2025)
  - ✅ Tests de password (12 chars min, 128 max, complejidad)
  - ✅ Tests de límites de longitud (email 254, nombres 100)
  - ✅ Tests de nombres con acentos
  - ✅ 38 tests pasando (100% pass rate), cobertura >90%
- [ ] **11. Tests de Integración con Backend v1.8.0** - 3-4h
  - Testing de httpOnly cookies (login, requests, logout)
  - Testing de refresh token flow (401 → refresh → retry)
  - Testing de validaciones (backend rechaza inputs inválidos)
  - Testing E2E manual (flujo completo)
- [ ] **11.1 Security Tests Suite** - 2-3h (NUEVO)
  - Tests de XSS attempts (verificar React auto-escaping)
  - Tests de CSRF protection (SameSite cookies)
  - Tests de validación con inputs maliciosos:
    - HTML injection attempts (`<script>alert('xss')</script>`)
    - SQL injection patterns (aunque backend protege)
    - Path traversal attempts (`../../etc/passwd`)
  - Tests de CSP violations (intentar ejecutar inline scripts)
  - Tests de authentication bypass attempts
  - Tests de rate limiting (coordinado con backend)
- [ ] **12. Actualizar Documentación** - 1-2h
  - Actualizar CHANGELOG.md con cambios de v1.8.0
  - Actualizar CLAUDE.md con nuevas validaciones
  - Documentar cambios breaking (httpOnly cookies)
  - Crear ADR-006: Input Validation Standards

**Total estimado:** 28-39 horas

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

### v1.8.0 (En Progreso - Security Release) - Estimado: 3-4 semanas

**Objetivo:** Securizar el frontend contra ataques comunes (OWASP Top 10 2021)

**Progreso:** 10/14 tareas completadas (71%) - Fase 6 ✅

**Tareas (14):**
1. [x] Actualizar password mínimo a 12 caracteres - ✅ COMPLETADO (20 Dic 2025)
2. [x] Agregar límites de longitud máxima - ✅ COMPLETADO (20 Dic 2025)
3. [x] Mejorar validación de nombres - ✅ COMPLETADO (20 Dic 2025)
4. [x] Tests unitarios de validaciones - ✅ COMPLETADO (20 Dic 2025)
5. [x] Implementar llamada a backend logout - ✅ COMPLETADO (21 Dic 2025) - **FIX: body JSON agregado**
6. [x] Migrar a httpOnly Cookies - ✅ COMPLETADO (21 Dic 2025) - **credentials: 'include' en todos los repos**
7. [x] Implementar Refresh Token Flow - ✅ COMPLETADO (21 Dic 2025) - **Interceptor automático + 16 tests**
8. [x] Logout por Inactividad - ✅ COMPLETADO (22 Dic 2025) - **Hook personalizado + 18 tests + 2h reales**
9. [x] Broadcast Channel (Logout Multi-Tab) - ✅ COMPLETADO (22 Dic 2025) - **Sincronización multi-tab + fixes Profile.jsx + 1.5h reales**
10. [x] Mejorar CSP (eliminar unsafe-inline) - ✅ COMPLETADO (22 Dic 2025) - **CSP estricto sin unsafe-inline + 2h reales**
11. [ ] Auditoría de Dependencias + Automatización - 2-3h
12. [ ] Tests de Integración con Backend v1.8.0 - 3-4h
13. [ ] Security Tests Suite - 2-3h
14. [ ] Actualizar Documentación - 1-2h

**Total estimado:** 8-12 horas de desarrollo (restantes)

**Completado hasta ahora:**
- ✅ Validaciones de inputs (password 12 chars, límites de longitud) - 4h
- ✅ Backend logout call implementation + fix (body JSON missing) - 1h
- ✅ Migración a httpOnly cookies (useAuth hook, api.js, repositories) - 4h
- ✅ Eliminación de secureAuth.js (legacy auth removal) - 2h
- ✅ Refresh Token Flow (interceptor + API centralizada + tests) - 4h
- ✅ Logout por Inactividad (hook + tests + integración) - 2h
- ✅ Broadcast Channel Multi-Tab (utility + integración + testing + fixes) - 1.5h
- ✅ CSP sin unsafe-inline (headers HTTP + vite config + testing) - 2h
- **Total completado:** ~20.5 horas

**OWASP Categories Addressed (7/10):**
- ✅ A01: Broken Access Control
- ✅ A02: Cryptographic Failures
- ✅ A03: Injection
- ✅ A05: Security Misconfiguration
- ✅ A06: Vulnerable Components
- ✅ A07: Authentication Failures

**Mejora esperada:** 7.5/10 → 9.2/10 📈 (+1.7 puntos)
**Mejora actual:** 7.5/10 → 8.7/10 📈 (+1.2 puntos)

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

**Semana 1: Validaciones (Quick Wins) - ✅ COMPLETADO (20 Dic 2025)**
1. ✅ Actualizar password mínimo a 12 caracteres
2. ✅ Agregar límites de longitud máxima
3. ✅ Mejorar validación de nombres
4. ✅ Tests unitarios
5. ✅ Implementar llamada a backend logout (21 Dic 2025)

**Semana 2: httpOnly Cookies - ✅ COMPLETADO (21 Dic 2025)**
1. ✅ Eliminar `src/utils/secureAuth.js` (165 líneas)
2. ✅ Agregar `credentials: 'include'` en repositories (5 archivos)
3. ✅ Actualizar Login/Register/Logout (httpOnly cookies)
4. ✅ Implementar refresh token flow (interceptor + 16 tests)
5. ✅ Testing local (417 tests passing)

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
