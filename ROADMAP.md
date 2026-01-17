# 🗺️ Roadmap - RyderCupFriends Frontend

> **Versión:** 1.13.0 → 1.14.0 → 2.1.0
> **Última actualización:** 16 Ene 2026
> **Estado:** 🚀 Próxima versión: v1.14.0 (Device Fingerprinting Improvements)
> **Stack:** React 18 + Vite 7 + Tailwind CSS 3.4 + TanStack Query + Zustand

---

## 🎯 Roadmap v1.14.0 - Device Fingerprinting Improvements

> **Objetivo:** Resolver bugs críticos y mejorar robustez del sistema de device fingerprinting
> **Duración:** 3-5 días (3 sprints: Críticos, Medios, UX)
> **Tipo:** Bug fixes + Mejoras de arquitectura + UX improvements
> **Análisis completado:** 16 Ene 2026

---

### 📊 Resumen del Análisis

**Archivos analizados:** 12 archivos (6 producción + 6 tests)
**Errores encontrados:** 17 (3 críticos, 7 medios, 7 bajos)
**Impacto OWASP:** +0.10 (8.75 → 8.85)
**Tests nuevos estimados:** +25-30 tests

---

### ✅ Sprint 1: Fixes Críticos - COMPLETADO (16 Ene 2026)

**Estado:** ✅ 3/3 fixes completados | **Tiempo:** 7.5h (estimado 7-11h)

#### **✅ Fix #7: iOS Safari Device Detection** - COMPLETADO
**Commit:** `7fea6ee` | **Tests:** 16/16 passing | **Tiempo:** 4.5h

**Problema resuelto:**
- iPadOS 13+ se identifica como macOS en User-Agent
- iOS Safari detectaba dispositivos macOS como "Dispositivo Actual"

**Solución implementada:**
- ✅ Detección de iPadOS 13+ usando `navigator.maxTouchPoints > 1`
- ✅ Reordenamiento de checks: iOS primero, luego macOS (excluye iOS)
- ✅ Archivo nuevo: `src/hooks/useDeviceManagement.test.js` (16 tests)

**Tests cubiertos:**
- ✅ iPadOS 13+ detection (touch + Macintosh UA)
- ✅ macOS Safari NOT detected as iPad device
- ✅ iPadOS NOT detected as macOS device
- ✅ iPhone, old iPad, Chrome, Firefox, Edge detection
- ✅ Edge cases: null device, mismatched browser

**Archivos modificados:**
- `src/hooks/useDeviceManagement.js` (líneas 127-165)
- `src/hooks/useDeviceManagement.test.js` (nuevo, 434 líneas)

---

#### **✅ Fix #5: API Response Validation** - COMPLETADO
**Commit:** `a6aceca` | **Tests:** 16/16 passing (+6 nuevos) | **Tiempo:** 2h

**Problema resuelto:**
- NO validación de respuesta API antes de `.map()`
- Crash potencial: `TypeError: Cannot read properties of null (reading 'map')`

**Solución implementada:**
- ✅ Validación de 3 capas: object, array, number
- ✅ Errores descriptivos para debugging
- ✅ 6 tests nuevos de edge cases

**Tests cubiertos:**
- ✅ API returns null → throws error
- ✅ API returns non-object → throws error
- ✅ devices is not array/null → throws error
- ✅ total_count is not number/null → throws error

**Archivos modificados:**
- `src/infrastructure/repositories/ApiDeviceRepository.js` (+13 líneas validación)
- `src/infrastructure/repositories/ApiDeviceRepository.test.js` (+68 líneas tests)

---

#### **✅ Fix #13: Race Condition Prevention** - COMPLETADO
**Commit:** `9cf8bd5` | **Tests:** Manual | **Tiempo:** 1h

**Problema resuelto:**
- Timeout NO se limpiaba al revocar múltiples dispositivos
- Logout inesperado si usuario revocaba otro dispositivo después del actual

**Solución implementada:**
- ✅ ClearTimeout ANTES de cualquier operación de revocación
- ✅ Set timeoutRef.current = null para estado limpio
- ✅ Solo un timer activo a la vez

**Scenarios validados:**
- ✅ Revoke current device → logout after 2s
- ✅ Revoke current → revoke other → NO logout
- ✅ Multiple rapid revocations → only last current triggers logout

**Archivos modificados:**
- `src/pages/DeviceManagement.jsx` (handleRevokeClick: líneas 25-53)

---

### 🟠 Sprint 2: Fixes Medios (Prioridad Media) - 1-2 días

#### **✅ Fix #4: Validación Inconsistente en RevokeDeviceUseCase** - COMPLETADO
**Commit:** `7f9c163` | **Tests:** 23/23 passing (+13 nuevos) | **Tiempo:** 1.5h

**Archivo:** `src/application/use_cases/device/RevokeDeviceUseCase.js:28-42`
**Problema resuelto:** NO validaba respuesta (inconsistente con GetActiveDevicesUseCase)

**Solución implementada:**
- ✅ Validación de 3 capas: object (no array), message (string), device_id (string)
- ✅ 13 tests nuevos de edge cases
- ✅ Consistencia con GetActiveDevicesUseCase

**Tests cubiertos:**
- ✅ Repository returns null/undefined → throws error
- ✅ Repository returns non-object (string, number, array) → throws error
- ✅ message is missing/null/non-string → throws error
- ✅ device_id is missing/null/non-string → throws error
- ✅ Valid response with all required fields → success
- ✅ Edge case: empty string message (valid) → success

**Archivos modificados:**
- `src/application/use_cases/device/RevokeDeviceUseCase.js` (+11 líneas validación)
- `src/application/use_cases/device/RevokeDeviceUseCase.test.js` (+135 líneas tests)

**Estimación:** 2h | **Real:** 1.5h

---

#### **✅ Fix #6: Violación de Clean Architecture + i18n Error Handling** - COMPLETADO
**Commit:** `9984c0e` | **Tests:** 69/69 passing (+8 nuevos) | **Tiempo:** 3.5h

**Archivos:** `ApiDeviceRepository.js` (refactorizado), `useDeviceManagement.js` (i18n), `devices.json` (ES/EN)
**Problema resuelto:** Hook interpretaba códigos HTTP (responsabilidad del Repository) + errores sin i18n

**Solución implementada (Clean Architecture + i18n):**
- ✅ Repository transforma HTTP → domain error codes (Infrastructure layer)
- ✅ Hook traduce error codes usando `useTranslation` (Presentation layer)
- ✅ 5 nuevas traducciones de errores (ES/EN) en `devices.json`
- ✅ 8 tests actualizados para verificar error codes en vez de mensajes
- ✅ Cumple Clean Architecture: Repository NO conoce i18n

**Transformaciones HTTP → Error Codes:**
- ✅ HTTP 403 → `CSRF_VALIDATION_FAILED`
- ✅ HTTP 404 → `DEVICE_NOT_FOUND`
- ✅ HTTP 409 → `DEVICE_ALREADY_REVOKED`
- ✅ HTTP 401 → Propagate original (token refresh interceptor)
- ✅ HTTP 500+ → `FAILED_TO_REVOKE_DEVICE` (+ originalMessage)

**Traducciones agregadas (ES/EN):**
- `errors.CSRF_VALIDATION_FAILED` - "Validación CSRF fallida..." / "CSRF validation failed..."
- `errors.DEVICE_NOT_FOUND` - "Dispositivo no encontrado" / "Device not found"
- `errors.DEVICE_ALREADY_REVOKED` - "Dispositivo ya revocado" / "Device already revoked"
- `errors.FAILED_TO_REVOKE_DEVICE` - "Error al revocar..." / "Failed to revoke..."
- `errors.FAILED_TO_LOAD_DEVICES` - "Error al cargar..." / "Failed to load..."

**Archivos modificados:**
- `src/infrastructure/repositories/ApiDeviceRepository.js` (+35 líneas error codes)
- `src/infrastructure/repositories/ApiDeviceRepository.test.js` (tests actualizados)
- `src/hooks/useDeviceManagement.js` (+useTranslation, error code translation)
- `src/i18n/locales/es/devices.json` (+7 líneas errors)
- `src/i18n/locales/en/devices.json` (+7 líneas errors)

**Estimación:** 3-4h | **Real:** 3.5h

---

#### **✅ Fix #11: i18n Language Priority in Device Revocation Logout** - COMPLETADO
**Commit:** `ce49a38` | **Tests:** 21/21 passing (+8 nuevos) | **Tiempo:** 45min

**Archivo:** `src/utils/deviceRevocationLogout.js:90-91` (refactorizado)
**Problema resuelto:** Usaba `navigator.language` ignorando preferencia i18n del usuario

**Solución implementada:**
- ✅ Leer `i18nextLng` de localStorage PRIMERO (idioma configurado por usuario)
- ✅ Fallback a `navigator.language` si no hay configuración
- ✅ 8 tests nuevos para verificar prioridad de detección de idioma
- ✅ Respeta preferencia del usuario sobre idioma del navegador

**Lógica de detección (prioridad):**
1. `localStorage.getItem('i18nextLng')` → Preferencia del usuario (ES/EN)
2. `navigator.language` → Idioma del navegador (fallback)
3. `'en'` → Inglés por defecto (ultimate fallback)

**Tests cubiertos (8 nuevos):**
- ✅ i18nextLng='es' → Mensaje en español (ignora navigator)
- ✅ i18nextLng='en' → Mensaje en inglés (ignora navigator)
- ✅ Sin i18nextLng + navigator='es-ES' → Español
- ✅ Sin i18nextLng + navigator='fr-FR' → Inglés (fallback)
- ✅ Manejo de códigos de región (es-ES, en-GB)
- ✅ Prioridad correcta: i18nextLng > navigator.language
- ✅ Fallback a inglés si ambos son null

**Archivos modificados:**
- `src/utils/deviceRevocationLogout.js` (+2 líneas, refactor lógica)
- `src/utils/deviceRevocationLogout.test.js` (+129 líneas, 8 tests nuevos)

**Estimación:** 1h | **Real:** 45min

---

#### **✅ Fix #8: Regex Matching with Word Boundaries** - COMPLETADO
**Commit:** `fba5c90` | **Tests:** 23/23 passing (+7 nuevos) | **Tiempo:** 2h

**Archivo:** `src/hooks/useDeviceManagement.js:111-178` (refactorizado)
**Problema resuelto:** `.includes()` causaba falsos positivos (chromatic→Chrome, SafariCom→Safari, operator→Opera)

**Solución implementada:**
- ✅ Reemplazado `.includes()` por regex con **word boundaries** (`\b`)
- ✅ 6 regex patterns: edge, opera, chrome/chromium, firefox, safari, ios, macos
- ✅ 7 tests nuevos para verificar prevención de falsos positivos
- ✅ Mantiene compatibilidad con casos válidos (Chrome, Safari, Opera, etc.)

**Regex patterns implementados:**
```javascript
const edgeRegex = /\bedge\b/i;
const operaRegex = /\bopera\b/i;
const chromeRegex = /\bchrome\b|\bchromium\b/i;
const firefoxRegex = /\bfirefox\b/i;
const safariRegex = /\bsafari\b/i;
const iosRegex = /\b(ios|iphone|ipad|ipod)\b/i;
const macOSRegex = /\b(macos|mac\s*os|macintosh|mac)\b/i;
```

**Tests de falsos positivos (7 nuevos):**
- ✅ "Chromatic Testing Tool" NO se detecta como Chrome
- ✅ "SafariCom Mobile Network" NO se detecta como Safari
- ✅ "System Operator Dashboard" NO se detecta como Opera
- ✅ "Safari on stomach" NO se detecta como macOS
- ✅ "Chrome Browser" SÍ se detecta correctamente
- ✅ "Safari 17.0 on macOS" SÍ se detecta correctamente
- ✅ "Opera 106.0" SÍ se detecta correctamente

**Archivos modificados:**
- `src/hooks/useDeviceManagement.js` (+6 regex patterns, refactor matching logic)
- `src/hooks/useDeviceManagement.test.js` (+149 líneas, 7 tests nuevos)

**Estimación:** 2-3h | **Real:** 2h

---

### 🟡 Sprint 3: Mejoras de UX y Calidad (Prioridad Baja) - 1 día

#### **Fix #1: Validación Débil en Device Entity** ✅
- [x] Agregar validación de tipos en constructor
- [x] Tests: Casos con tipos incorrectos (23 nuevos tests)

**Implementación:**
- ✅ Validación de tipos para `id`, `device_name`, `ip_address` (strings requeridos)
- ✅ Validación de tipos para `last_used_at`, `created_at` (string, null, o undefined)
- ✅ Validación de tipos para `is_active` (boolean estricto)
- ✅ 23 nuevos tests de validación (18 → 41 tests totales)

**Tests:** 18 → 41 (+23) - 100% passing
**Archivos:** `Device.js`, `Device.test.js`
**Tiempo real:** 1.5h
**Commit:** `b978e74`

**Estimación:** 1-2h

---

#### **Fix #1b: Migrar a Backend `is_current_device`** ✅
- [x] Agregar campo `is_current_device` a Device Entity (con validación boolean)
- [x] Eliminar método `isCurrentDevice()` complejo de useDeviceManagement
- [x] Eliminar 19 tests de regex y User-Agent detection
- [x] Actualizar DeviceManagement.jsx para usar `device.isCurrentDevice`
- [x] Mejorar UX: borde verde para dispositivo actual

**Motivación:**
- Backend ahora incluye `is_current_device` en `GET /api/v1/users/me/devices`
- Detección 100% precisa (usa `device_id` del token JWT)
- Elimina lógica compleja de User-Agent parsing y regex word boundaries

**Implementación:**
- ✅ Device Entity: Agregado campo `is_current_device` (boolean, default: false)
- ✅ Device.test.js: +7 tests para nuevo campo (41 → 48 tests)
- ✅ useDeviceManagement.js: ELIMINADO método `isCurrentDevice()` (~84 líneas)
- ✅ useDeviceManagement.test.js: ELIMINADOS 19 tests de regex (23 → 4 tests)
- ✅ DeviceManagement.jsx: Usa `device.isCurrentDevice` + UX mejorada
- ✅ ApiDeviceRepository: Campo mapeado automáticamente (sin cambios)

**Código eliminado:**
- ~84 líneas: método `isCurrentDevice()` (regex, User-Agent parsing, iOS/iPadOS detection)
- ~420 líneas: 19 tests de regex y User-Agent detection
- **Total:** ~504 líneas eliminadas

**Código agregado:**
- Device Entity: +3 líneas (validación + campo)
- Device.test.js: +77 líneas (7 tests)
- DeviceManagement.jsx: +7 líneas (borde verde condicional)
- **Total:** ~87 líneas agregadas

**Neto:** -417 líneas (82% reducción)

**Beneficios:**
- ✅ Precisión 100% (backend usa device_id del token)
- ✅ Eliminados bugs de Safari iOS vs macOS, iPadOS 13+, etc.
- ✅ Código más simple y mantenible (-417 líneas)
- ✅ UX mejorada (borde verde, fondo verde claro para dispositivo actual)
- ✅ Clean Architecture: Detección movida de Presentation a Domain (backend)

**Tests:** 711 → 699 (-12) - 76/76 passing ✅
**Archivos:** `Device.js`, `Device.test.js`, `useDeviceManagement.js`, `useDeviceManagement.test.js`, `DeviceManagement.jsx`, `ApiDeviceRepository.test.js`
**Tiempo real:** 1h
**Commit:** `c837bfb`

**Estimación:** 1h

---

#### **Fix #2: Métodos Deprecados Sin Warning**
- [ ] Agregar `console.warn()` en desarrollo para métodos deprecados

**Estimación:** 30min

---

#### **Fix #10: Logout Inmediato para Dispositivo Actual**
- [ ] Cambiar timeout de 2000ms a logout inmediato (backend ya invalidó tokens)

**Estimación:** 30min

---

#### **Fix #14: Reemplazar window.confirm() por Modal React**
- [ ] Crear `ConfirmModal` component con i18n completo
- [ ] Reemplazar `window.confirm()` en DeviceManagement.jsx

**Estimación:** 2-3h

---

#### **Fix #15: Trackear Errores por Dispositivo**
- [ ] Agregar `deviceErrors` state para mostrar errores inline
- [ ] UI: Mostrar mensaje de error debajo de cada dispositivo fallido

**Estimación:** 2h

---

#### **Fix #16: Accesibilidad - aria-label**
- [ ] Agregar `aria-label` en botones con iconos
- [ ] Tests a11y con Playwright

**Estimación:** 1h

---

#### **Fix #17: Loading State Bloquea Header**
- [ ] Cambiar a skeleton loader sin bloquear navegación

**Estimación:** 1-2h

---

### 📊 Métricas Objetivo v1.14.0

| Métrica | v1.13.0 | Sprint 1 | Sprint 2 | Sprint 3 (Actual) | v1.14.0 Objetivo | Delta Total |
|---------|---------|----------|----------|-------------------|------------------|-------------|
| **Tests** | 540 | 562 | 688 | **699** | 565-570 | **+159** ✅ |
| **Bugs Críticos** | 3 | 0 | 0 | 0 | 0 | **-3** ✅ |
| **Bugs Medios** | 7 | 7 | 3 | **3** | 0-2 | **-4** ✅ |
| **Bugs UX/Bajos** | 7 | 7 | 7 | **5** | 0-2 | **-2** 🔄 |
| **Security Score** | 8.75/10 | 8.80/10 | 8.83/10 | **8.87/10** | 8.85/10 | **+0.12** ✅ |
| **A01: Access Control** | 8.0/10 | 8.2/10 | 8.3/10 | **8.5/10** | 8.5/10 | **+0.5** ✅ |
| **Cobertura Device Module** | ~85% | ~92% | ~95% | **~97%** | 95%+ | **+12%** ✅ |
| **Traducciones i18n** | 0 errors | 0 errors | 5 errors (ES/EN) | **5 errors (ES/EN)** | - | **+10 strings** ✅ |
| **Líneas de código** | - | - | - | **-417** | - | **-417** ✅ |

---

### 🗓️ Timeline v1.14.0

| Sprint | Días | Fixes | Tests Nuevos | Commits | Estado |
|--------|------|-------|--------------|---------|--------|
| Sprint 1 (Críticos) | 0.5 | #5, #7, #13 | +22 | 4 | ✅ Completado |
| Sprint 2 (Medios) | 1 | #4, #6, #8, #11 | +126 | 8 | ✅ Completado |
| Sprint 3 (UX) | 1-2 | #1, #1b, #2, #10, #14, #15, #16, #17 | -12 | 8-11 | 🔄 En Progreso (2/8) |
| **Total** | **2.5-3.5** | **18 fixes** | **~136** | **20-23** | **67% Completado** |

**Progreso actual:** Sprint 1 ✅ | Sprint 2 ✅ | Sprint 3 🔄 (Fix #1 ✅, Fix #1b ✅)

**Tiempo Sprint 2:** 7.75h (de 8-10h estimadas) - Precisión 97%
**Tiempo Sprint 3 (parcial):** 2.5h (Fix #1 + Fix #1b)

---

### 🔗 Referencias del Análisis

**Commits relacionados:**
- `c05ce9f` - fix(devices): IMPROVE Safari device detection to distinguish macOS vs iOS
- PR #92 - Safari device detection and logout fixes
- PR #93 - Responsive improvements + flexible patterns

**Archivos del módulo:**
- Domain: `Device.js`, `IDeviceRepository.js`
- Application: `GetActiveDevicesUseCase.js`, `RevokeDeviceUseCase.js`
- Infrastructure: `ApiDeviceRepository.js`
- Presentation: `DeviceManagement.jsx`, `useDeviceManagement.js`
- Utils: `deviceRevocationLogout.js`

---

## 📊 Estado Actual (v1.13.0)

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
- 🚧 Device Fingerprinting (v1.14.0 - En proceso)
- ❌ 2FA/MFA (TOTP)
- ❌ reCAPTCHA v3

---

## 🚀 Historial de Versiones

### v1.13.0 (Actual) - Device Fingerprinting
**Cambios:**
- ✅ Sistema completo de Device Fingerprinting
- ✅ Gestión de dispositivos activos (vista + revocación)
- ✅ Detección de dispositivo actual por User-Agent
- ✅ Logout automático al revocar dispositivo actual
- ✅ Device Revocation Logout (manejo 401)
- ⚠️ Bug conocido: iOS Safari detection (documentado en ROADMAP)

**Archivos nuevos:**
- Domain: `Device.js` (entity)
- Application: `GetActiveDevicesUseCase.js`, `RevokeDeviceUseCase.js`
- Infrastructure: `ApiDeviceRepository.js`
- Presentation: `DeviceManagement.jsx`, `useDeviceManagement.js`
- Utils: `deviceRevocationLogout.js`

**Tests:** 540 tests (incluye 30+ tests de device fingerprinting)
**PRs:** #91, #92, #93
**Estado:** ✅ En producción con bug menor documentado

---

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

| Métrica | v1.14.0 (Post-Fixes) | v2.1.0 Objetivo | Incremento |
|---------|----------------------|-----------------|------------|
| **Tests** | 565-570 | 800-900 | +41-58% |
| **Rutas** | 11 | 20-25 | +80-130% |
| **Cobertura Lines** | 82-83% | 85-87% | +3-4% |
| **Bundle Size** | 47 KB | 120-150 KB | +73-103 KB (con code splitting) |
| **Security Score** | 8.85/10 | 9.0-9.2/10 | +0.15-0.35 |
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

**Última revisión:** 16 Ene 2026 (Sprint 1 completado)
**Próxima revisión:** Post Sprint 2 o Post v1.14.0
