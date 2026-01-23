# 🗺️ Roadmap - RyderCupFriends Frontend

> **Versión:** 1.13.0 → 1.14.2 → 1.15.0 → 2.1.0
> **Última actualización:** 23 Ene 2026
> **Estado:** ✅ v1.15.0 Completada | 📋 v2.1.0 Planificada (Competition Module)
> **Stack:** React 18 + Vite 7 + Tailwind CSS 3.4 + TanStack Query + Zustand

---

## 🎯 Roadmap v1.15.0 - Data Integrity Improvements (A08)

> **Objetivo:** Mejorar OWASP A08 (Data Integrity) de 7.0/10 a 8.7-9.0/10
> **Duración:** 3-4h (Sprint único: Quick Wins)
> **Tipo:** Security improvements + CI/CD enhancements
> **Inicio:** 19 Ene 2026

---

### 📊 Análisis de Seguridad Actual

**Score A08 actual:** 7.0/10
**Score A08 objetivo:** 8.7-9.0/10
**Mejoras propuestas:** 3 implementaciones

#### **✅ Ya Implementado:**
- ✅ Git commit signing (GPG local)
- ✅ Dependency lock file (`package-lock.json` + `npm ci`)
- ✅ CSP sin `unsafe-inline` (producción)
- ✅ Vulnerability scanning (npm audit + Snyk + TruffleHog)
- ✅ Build integrity verification
- ✅ Bundle size checks (max 1000 KB)

#### **❌ Pendiente de Implementar:**
- ❌ **SRI (Subresource Integrity)** - No hay hashes de integridad en assets
- ❌ **Commit signature verification en CI/CD** - CI no valida firmas GPG
- ❌ **Package-lock integrity validation** - CI no verifica modificaciones

---

### 🚀 Sprint Único: Data Integrity Hardening (3-4h)

#### **Tarea 1: Subresource Integrity (SRI) - 1.5h**
**Impacto:** +0.8 puntos | **Prioridad:** 🔴 Alta

**Implementación:**
```bash
# Instalar plugin
npm install -D vite-plugin-sri

# Configurar vite.config.js
import sri from 'vite-plugin-sri';

export default defineConfig({
  plugins: [
    react(),
    sri(),
  ],
})
```

**Resultado esperado:**
```html
<!-- Antes (sin SRI): -->
<script src="/assets/index-abc123.js"></script>

<!-- Después (con SRI): -->
<script src="/assets/index-abc123.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/ux..."
  crossorigin="anonymous">
</script>
```

**Tests:**
- Build y verificar `grep -r "integrity=" dist/index.html`
- Validar que assets no se pueden modificar sin romper integridad

---

#### **Tarea 2: CI/CD Commit Signature Verification - 1h**
**Impacto:** +0.3 puntos | **Prioridad:** 🟡 Media

**Archivo:** `.github/workflows/ci-cd.yml`

**Implementación:**
```yaml
commit-verification:
  name: 🔏 Verify Commit Signatures
  runs-on: ubuntu-latest
  steps:
    - name: Checkout code
      uses: actions/checkout@v4
      with:
        fetch-depth: 2

    - name: Import GPG public keys
      run: |
        echo "${{ secrets.GPG_PUBLIC_KEYS }}" | gpg --import

    - name: Verify commit signature
      run: |
        COMMIT=$(git rev-parse HEAD)

        if git verify-commit $COMMIT 2>&1 | grep -q "Good signature"; then
          echo "✅ Commit $COMMIT signature verified"
        else
          echo "❌ Commit $COMMIT is NOT signed"
          exit 1
        fi
```

**Configuración requerida:**
- Agregar secret `GPG_PUBLIC_KEYS` en GitHub con claves públicas del equipo
- Configurar job como dependency de otros jobs

---

#### **Tarea 3: Package-Lock Integrity Validation - 30min**
**Impacto:** +0.2 puntos | **Prioridad:** 🟡 Media

**Archivo:** `.github/workflows/ci-cd.yml`

**Implementación:**
```yaml
# En job dependency-audit, DESPUÉS de npm ci:
- name: Verify package-lock.json integrity
  run: |
    echo "🔒 Verifying package-lock.json was not modified..."

    git diff --exit-code package-lock.json || {
      echo "❌ package-lock.json was modified during npm ci!"
      echo "Run 'npm install' locally and commit the updated package-lock.json."
      exit 1
    }

    echo "✅ package-lock.json integrity verified"
```

**Beneficio:**
- Previene dependency confusion attacks
- Garantiza reproducibilidad de builds

---

### ✅ Tareas Adicionales: Actualización de Dependencias

Además de las mejoras de integridad de datos, se han actualizado dependencias clave para mantener el proyecto seguro y al día:

**NPM Dependencies (Merge de Dependabot):**
- [x] `framer-motion`: Updated to v12.27.0
- [x] `vite`: Updated to v7.3.0
- [x] `i18next`: Updated to v25.7.3
- [x] `react-i18next`: Updated to v16.5.0

**GitHub Actions (CI/CD):**
- [x] `snyk/actions/node`: Updated to v1.0.0 (Production Ready)
- [x] `trufflesecurity/trufflehog`: Updated to v3.92.5

---

### 📊 Métricas Esperadas v1.15.0

| Métrica | v1.14.2 | v1.15.0 Objetivo | Delta |
|---------|---------|------------------|-------|
| **A08: Data Integrity** | 7.0/10 | **8.7-9.0/10** | **+1.7-2.0** ✅ |
| **OWASP Score Global** | 8.75/10 | **9.0-9.2/10** | **+0.25-0.45** ✅ |
| **Tests** | 712 | 712-715 | +0-3 |
| **CI/CD Jobs** | 11 | 12 | +1 (commit verification) |
| **Bundle Size** | ~250 KB | ~250 KB | Sin cambio |

---

### ✅ Checklist de Implementación

**Sprint Único (3-4h):**
- [x] Instalar y configurar `vite-plugin-sri` ✅
- [x] Build y verificar hashes de integridad en dist/ ✅
- [x] Crear job `commit-verification` en CI/CD ✅
- [ ] Configurar secret `GPG_PUBLIC_KEYS` en GitHub (pendiente usuario)
- [x] Agregar validación de `package-lock.json` en dependency-audit ✅
- [ ] Testing: Verificar que CI falla con commits sin firmar
- [ ] Testing: Verificar que CI falla si package-lock.json cambia
- [x] Actualizar CHANGELOG.md con v1.15.0
- [x] Commit firmado: `feat(security): IMPLEMENT SRI and CI/CD integrity checks`
- [ ] Crear PR a develop

### 📝 Configuración Manual Requerida (Usuario)

Después de mergear este PR, el usuario debe:

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

### 🔗 Referencias

- **Análisis de seguridad:** Ver conversación del 19 Ene 2026
- **OWASP A08:** Software and Data Integrity Failures
- **Vite Plugin SRI:** [https://github.com/ElMassimo/vite-plugin-sri](https://github.com/ElMassimo/vite-plugin-sri)
- **Git Commit Signing:** [https://docs.github.com/en/authentication/managing-commit-signature-verification](https://docs.github.com/en/authentication/managing-commit-signature-verification)

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

### ✅ Sprint 3: Mejoras de UX y Calidad (Prioridad Baja) - COMPLETADO (16-17 Ene 2026)

**Estado:** ✅ 9/9 fixes completados | **Tiempo:** 14h (estimado 9-12h)

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

#### **Fix Crítico: Immediate Device Revocation Detection** ✅
- [x] Crear hook `useDeviceRevocationMonitor` con detección event-driven
- [x] Fix: Page blank crash cuando dispositivo es revocado
- [x] Integrar monitoring en App.jsx (solo cuando isAuthenticated)
- [x] Cleanup: Eliminar todos los console.log de debugging

**Problema resuelto:**
- Safari no se deslogueaba inmediatamente cuando Chrome revocaba su dispositivo
- Safari esperaba hasta que access_token expirara (0-15 min) para detectar revocación
- Al detectar, página se quedaba en blanco (crash por response body consumido)

**Solución implementada:**
- ✅ Hook event-driven con 3 triggers: navigation, tab visibility, fallback polling (5min)
- ✅ Throttling: max 1 check cada 5 segundos (prevenir spam)
- ✅ Latencia: 0-5s (usuario activo) vs 0-15min antes
- ✅ Fix crash: `await new Promise(() => {})` en lugar de retornar response consumido
- ✅ Solo activo cuando usuario autenticado
- ✅ Producción: Todos los console.log de debugging eliminados

**Archivos creados:**
- `src/hooks/useDeviceRevocationMonitor.js` (145 líneas)
- `src/hooks/useDeviceRevocationMonitor.test.jsx` (77 líneas, 3 tests)

**Archivos modificados:**
- `src/App.jsx` - Integrado hook con enabled: isAuthenticated
- `src/utils/tokenRefreshInterceptor.js` - Fix crash + cleanup logs
- `src/utils/deviceRevocationLogout.js` - Cleanup logs + remove unused parameter

**Detección triggers:**
1. **Navigation**: Check al cambiar de página (React Router location)
2. **Tab visibility**: Check cuando usuario regresa a la pestaña
3. **Fallback polling**: Check cada 5 minutos (edge cases: usuario leyendo sin moverse)

**Performance:**
- Requests/hora (usuario activo navegando): ~15-20 (vs 120 con polling 30s)
- Requests/hora (usuario leyendo sin moverse): 12
- Backend load (100 usuarios): ~1,500 req/h
- Impacto mínimo en servidor vs polling agresivo

**Tests:** 699 → 702 (+3) - 100% passing ✅
**Lint:** 0 warnings ✅
**Build:** 4.74s ✅
**Commits:** `a6bc42e` (implementation), `5524850` (test fix - reorder checks)
**Tiempo real:** 5h (incluye debugging K8s, cleanup producción, test fix)

**Estimación:** No estimado (fix emergente Sprint 3)

---

#### **Fix #2: Métodos Deprecados Sin Warning** ✅
- [x] Agregar `console.warn()` en desarrollo para métodos deprecados

**Problema:**
- `getFormattedLastUsed()` y `getFormattedCreatedAt()` están marcados como @deprecated
- Desarrolladores no reciben warnings al usarlos

**Solución implementada:**
- ✅ Agregar `console.warn()` en ambos métodos (solo en DEV mode)
- ✅ Mensajes claros indicando alternativa: `formatDateTime()` from utils/dateFormatters
- ✅ Production build elimina warnings automáticamente (Vite tree-shaking)
- ✅ 2 tests nuevos para verificar warnings en DEV mode

**Métodos deprecados (v1.13.0 → v2.0.0):**
- `Device.getFormattedLastUsed()` → Use `formatDateTime()`
- `Device.getFormattedCreatedAt()` → Use `formatDateTime()`

**Archivos modificados:**
- `src/domain/entities/Device.js` (+10 líneas warnings)
- `src/domain/entities/Device.test.js` (+49 líneas, 2 tests)

**Tests:** 48 → 50 (+2) - 100% passing ✅
**Commit:** `2e51bd1`
**Tiempo real:** 20min

**Estimación:** 30min

---

#### **Fix #10: Logout Inmediato para Dispositivo Actual** ✅
- [x] Cambiar timeout de 2000ms a 500ms (backend ya invalidó tokens)

**Problema:**
- Cuando usuario revoca su propio dispositivo actual, esperaba 2 segundos antes de logout
- Backend ya invalida tokens inmediatamente, timeout era innecesario

**Solución implementada:**
- ✅ Reducir timeout de 2000ms a 500ms
- ✅ Mantener delay mínimo solo para visibilidad del toast de éxito

**Archivos modificados:**
- `src/pages/DeviceManagement.jsx` (líneas 46-52)

**Tests:** Manual (comportamiento visual)
**Commit:** `913ed43`
**Tiempo real:** 15min

**Estimación:** 30min

---

#### **Fix #14: Reemplazar window.confirm() por Modal React** ✅
- [x] Crear `ConfirmModal` component con i18n completo
- [x] Reemplazar `window.confirm()` en DeviceManagement.jsx

**Problema:**
- Uso de `window.confirm()` nativo del navegador
- Sin i18n, sin accesibilidad, sin control de estilo
- UX inconsistente con el diseño de la aplicación

**Solución implementada:**
- ✅ Componente ConfirmModal reutilizable (174 líneas)
  * i18n completo con traducciones ES/EN
  * Accesibilidad: aria-labelledby, aria-describedby, role="dialog"
  * Soporte ESC key para cerrar
  * Body scroll lock cuando modal está abierto
  * Loading state con spinner
  * Destructive actions (botón rojo)
  * Responsive design (mobile-first)

- ✅ DeviceManagement.jsx actualizado
  * Modal state (isModalOpen, deviceToRevoke)
  * Títulos y mensajes dinámicos según dispositivo actual
  * Loading state durante revocación

- ✅ Traducciones agregadas (ES/EN)
  * common.json: modal.confirm, modal.ok, modal.cancel, modal.loading
  * devices.json: modals.revokeCurrentTitle, modals.revokeOtherTitle

**Features:**
- Click en overlay para cancelar (excepto si loading)
- ESC para cancelar (excepto si loading)
- Botones deshabilitados durante loading
- Estilos diferentes para acciones destructivas vs normales
- Navegación completa por teclado

**Mejoras UX:**
- Mejor feedback visual que window.confirm()
- Estilos consistentes con diseño de la app
- Mensajes más claros (título + cuerpo separados)
- Indicador de loading muestra progreso
- No se puede cerrar accidentalmente durante operación

**Archivos creados:**
- `src/components/modals/ConfirmModal.jsx` (174 líneas)

**Archivos modificados:**
- `src/pages/DeviceManagement.jsx` (+30 líneas estado y lógica)
- `src/i18n/locales/es/common.json` (+4 traducciones)
- `src/i18n/locales/en/common.json` (+4 traducciones)
- `src/i18n/locales/es/devices.json` (+2 traducciones)
- `src/i18n/locales/en/devices.json` (+2 traducciones)

**Tests:** Manual (UX testing)
**Lint:** Clean ✅
**Build:** 4.49s ✅
**Commit:** `d30a726`
**Tiempo real:** 2.5h

**Estimación:** 2-3h

---

#### **Fix #15: Trackear Errores por Dispositivo** ✅
- [x] Agregar `deviceErrors` state para mostrar errores inline
- [x] UI: Mostrar mensaje de error debajo de cada dispositivo fallido

**Problema:**
- Errores solo se muestran como toast global (desaparece después de timeout)
- No queda claro qué dispositivo específico falló
- Usuario no puede revisar el error después de que el toast desaparece

**Solución implementada:**
- ✅ `deviceErrors` Map state en useDeviceManagement hook
  * Trackea errores por device ID (deviceId → errorMessage)
  * Limpia error cuando se reintenta operación
  * Guarda error en Map al fallar (además del toast)
  * Función clearDeviceError() para dismiss errors

- ✅ UI inline debajo de cada dispositivo
  * Alert box roja con icono de error (X en círculo)
  * Mensaje de error en texto rojo
  * Botón dismiss (X) con aria-label
  * Error persiste hasta que usuario lo cierra o reintenta

**Features:**
- Error icon (red X circle)
- Red background (bg-red-50) + red border
- Texto del error en rojo
- Botón cerrar con accesibilidad
- Auto-clear al reintentar operación

**Flujo de error:**
1. Usuario intenta revocar dispositivo → falla
2. Toast muestra error (temporal, ~5s)
3. Error inline aparece debajo del dispositivo (persistente)
4. Usuario puede dismiss error o reintentar

**Mejoras UX:**
- Errores visibles directamente en dispositivo afectado
- Errores persisten (no desaparecen como toasts)
- Claro qué dispositivo falló y por qué
- Fácil dismiss individual
- Mejor para operaciones múltiples

**Archivos modificados:**
- `src/hooks/useDeviceManagement.js` (+31 líneas)
- `src/pages/DeviceManagement.jsx` (+26 líneas UI)

**Tests:** Manual (UX testing)
**Lint:** Clean ✅
**Build:** 5.22s ✅
**Commit:** `64ba68c`
**Tiempo real:** 1.5h

**Estimación:** 2h

---

#### **Fix #16: Accesibilidad - aria-label** ✅
- [x] Agregar `aria-hidden="true"` en SVG decorativos (9 iconos)
- [x] Convertir aria-label hardcodeado a i18n

**Problema:**
- SVG decorativos sin `aria-hidden="true"` confunden screen readers
- Botón de cerrar error tenía aria-label hardcodeado (sin i18n)
- Accesibilidad incompleta para usuarios de tecnologías asistivas

**Solución implementada:**
- ✅ Agregado `aria-hidden="true"` a 9 SVG decorativos en DeviceManagement.jsx
  * Back to Profile button icon
  * Info alert icon
  * Empty state icon
  * Device card icon
  * IP, Last Used, First Seen icons (3)
  * Revoke button icon
  * Error alert icon
  * Error close button icon
  * Security warning icon

- ✅ Convertido aria-label del botón cerrar error a i18n
  * `aria-label="Close error message"` → `aria-label={t('aria.closeErrorMessage')}`
  * Traducciones agregadas en ES/EN

**Mejoras de accesibilidad:**
- Screen readers ahora omiten iconos decorativos
- Todos los elementos interactivos tienen labels apropiados
- Labels completamente internacionalizados
- Mejor experiencia para usuarios con tecnologías asistivas

**Archivos modificados:**
- `src/pages/DeviceManagement.jsx` (+9 aria-hidden, +1 i18n aria-label)
- `src/i18n/locales/en/devices.json` (+1 clave aria.closeErrorMessage)
- `src/i18n/locales/es/devices.json` (+1 clave aria.closeErrorMessage)

**Tests:** 712/712 passing ✅
**Lint:** Clean ✅
**Build:** 4.43s ✅
**Commit:** `fb00f64`
**Tiempo real:** 1h

**Estimación:** 1h

---

#### **Fix #17: Loading State Bloquea Header** ✅
- [x] Eliminar spinner bloqueante de página completa
- [x] Implementar skeleton loader sin bloquear navegación

**Problema:**
- Loading spinner bloquea toda la página (incluyendo header)
- Usuarios no pueden navegar mientras se cargan dispositivos
- UX pobre durante carga inicial

**Solución implementada:**
- ✅ Eliminado return early con spinner bloqueante (líneas 78-87)
- ✅ HeaderAuth siempre visible (navegación disponible durante carga)
- ✅ Skeleton loader con 3 tarjetas animadas (Tailwind `animate-pulse`)
  * Estructura idéntica a tarjetas reales de dispositivos
  * Placeholders animados para icono, nombre, metadatos, botón
  * Responsive design (mobile-first)

**Estructura del skeleton:**
- 3 tarjetas de dispositivos simuladas
- Iconos: placeholders grises (w-5 h-5, w-4 h-4)
- Nombre: placeholder gris (w-48)
- Metadatos: 3 placeholders (IP, Last Used, First Seen)
- Botón Revoke: placeholder gris (w-24)

**Renderizado condicional:**
```jsx
{isLoading ? (
  <Skeleton />
) : devices.length === 0 ? (
  <EmptyState />
) : (
  <DeviceList />
)}
```

**Mejoras UX:**
- Header siempre accesible (navegación durante carga)
- Feedback visual elegante (no bloqueante)
- Layout shift mínimo (estructura idéntica)
- Performance: no blocking render

**Archivos modificados:**
- `src/pages/DeviceManagement.jsx` (+34 líneas skeleton, -13 spinner)

**Tests:** 712/712 passing ✅
**Lint:** Clean ✅
**Build:** 3.97s ✅
**Commit:** `dae6bf4`
**Tiempo real:** 1h

**Estimación:** 1-2h

---

#### **Fix #18: Blank Page on Expired Session Navigation** ✅
- [x] Fix race condition en tokenRefreshInterceptor.js (redirect + return response)
- [x] Mejorar manejo de 401 en useAuth.js (setLoading false inmediato)

**Problema:**
- Cuando sesión expira (access + refresh tokens), navegar a otra página causa página en blanco
- Race condition: redirect a `/login` mientras React Router intenta renderizar
- ProtectedRoute queda en estado loading indefinidamente

**Solución implementada:**
- ✅ tokenRefreshInterceptor.js: Pausar ejecución después de redirect (await Promise indefinido)
  * Evita retornar response consumido o en estado inconsistente
  * Mismo patrón usado en device revocation (líneas 155, 223)
  * Redirect interrumpe la promesa antes de que resuelva
- ✅ useAuth.js: setLoading(false) inmediato en 401
  * Previene que ProtectedRoute quede colgado en loading state
  * Early exit sin intentar parsear response
  * Aplicado en useAuth hook Y getUserData function

**Root cause:**
- `globalThis.location.href = '/login'` es asíncrono
- Código continuaba y retornaba `response` (posiblemente consumido)
- React Router intentaba renderizar mientras navegación en progreso
- ProtectedRoute.loading=true → pantalla blanca

**Mejoras UX:**
- Redirect inmediato y limpio a login
- No más pantalla en blanco intermedia
- Experiencia consistente con device revocation flow

**Archivos modificados:**
- `src/utils/tokenRefreshInterceptor.js` (+2 líneas, pausa indefinida)
- `src/hooks/useAuth.js` (+5 líneas, early exit + setLoading)

**Tests:** Manual (flujo de expiración de sesión)
**Lint:** Clean ✅
**Build:** Pendiente
**Commit:** Pendiente
**Tiempo real:** 1h

**Estimación:** 1h

---

### 📊 Métricas Objetivo v1.14.0

| Métrica | v1.13.0 | Sprint 1 | Sprint 2 | Sprint 3 (Actual) | v1.14.0 Objetivo | Delta Total |
|---------|---------|----------|----------|-------------------|------------------|-------------|
| **Tests** | 540 | 562 | 688 | **712** | 565-570 | **+172** ✅ |
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
| Sprint 3 (UX) | 2 | #1, #1b, Critical, #2, #10, #14, #15, #16, #17 | -7 | 11 | ✅ Completado (9/9) |
| **Post v1.14.0** | **0.5** | **#18 (Blank Page Fix)** | **0** | **1** | **🔄 En progreso** |
| **Total** | **4** | **20 fixes** | **+141** | **24** | **🔄 99% Completado** |

**Progreso actual:** Sprint 1 ✅ | Sprint 2 ✅ | Sprint 3 ✅ (9/9 fixes completados)

**Tiempo Sprint 2:** 7.75h (de 8-10h estimadas) - Precisión 97%
**Tiempo Sprint 3:** 14h (de 9-12h estimadas) - Precisión 86%
- Fix #1: 1.5h + Fix #1b: 1h + Fix Crítico: 5h + Fix #2: 20min
- Fix #10: 15min + Fix #14: 2.5h + Fix #15: 1.5h
- Fix #16: 1h + Fix #17: 1h

---

## 🎯 Roadmap v1.15.0 - Major Dependencies Update

> **Objetivo:** Actualizar dependencias con breaking changes (React 19, Sentry 10, Router 7, etc.)
> **Duración:** 2-3 semanas (4 sprints técnicos)
> **Tipo:** Major version upgrades + Modernización del stack
> **Estado:** 📋 Planificado (pendiente aprobación)

---

### 📊 Resumen Ejecutivo

**Versión actual:** v1.14.1
**Próxima versión:** v1.15.0
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

---

### 📦 Dependencias a Actualizar (Agrupadas)

#### **Grupo 1: React 19 Ecosystem (6 paquetes) - Sprint 1**

| Paquete | Actual | Target | Breaking Changes |
|---------|--------|--------|------------------|
| react | 18.3.1 | **19.2.3** | New APIs, Suspense changes |
| react-dom | 18.3.1 | **19.2.3** | createRoot required |
| @types/react | 18.3.27 | **19.2.8** | Type definitions |
| @types/react-dom | 18.3.7 | **19.2.3** | Type definitions |
| @vitejs/plugin-react | 4.7.0 | **5.1.2** | React 19 support |
| eslint-plugin-react-hooks | 4.6.2 | **7.0.1** | New hook rules |

**Impacto estimado:** ALTO
**Tests afectados:** 50-70 (componentes, hooks, contexts)
**Tiempo estimado:** 2-3 días

**Breaking changes clave:**
1. ❌ `ReactDOM.render()` removido → usar `createRoot()`
2. ⚠️ Suspense behavior cambios (auto-suspending)
3. ⚠️ Hook rules más estrictas
4. ✅ New: `use()` hook para promises
5. ✅ New: `<form>` actions soporte nativo
6. ✅ Performance: React Compiler automático

---

#### **Grupo 2: Monitoring & Routing (2 paquetes) - Sprint 2**

| Paquete | Actual | Target | Breaking Changes |
|---------|--------|--------|------------------|
| @sentry/react | 7.120.4 | **10.34.0** | 3 major versions! API changes |
| react-router-dom | 6.30.3 | **7.12.0** | Data loading, type safety |

**Impacto estimado:** MEDIO
**Tests afectados:** 30-40 (routing, error tracking)
**Tiempo estimado:** 1.5-2 días

**Breaking changes @sentry/react (7 → 10):**
1. ❌ `Sentry.init()` config cambios
2. ⚠️ Error boundary API actualizada
3. ⚠️ Performance monitoring configuración
4. ✅ Better React 19 integration
5. ✅ Session Replay improvements

**Breaking changes react-router-dom (6 → 7):**
1. ⚠️ Data loading API (`loader`, `action`)
2. ⚠️ Type safety improvements (TypeScript)
3. ✅ Better error handling
4. ✅ Improved nested routing

---

#### **Grupo 3: Build Tools & Styling (2 paquetes) - Sprint 3**

| Paquete | Actual | Target | Breaking Changes |
|---------|--------|--------|------------------|
| tailwindcss | 3.4.19 | **4.1.18** | Config format, utilities |
| eslint | 8.57.1 | **9.39.2** | Flat config required |

**Impacto estimado:** MEDIO
**Tests afectados:** 20-30 (styling, linting)
**Tiempo estimado:** 1-1.5 días

**Breaking changes Tailwind 4:**
1. ❌ `tailwind.config.js` → nueva sintaxis
2. ⚠️ Algunas utilidades renombradas
3. ⚠️ JIT mode por defecto (siempre)
4. ✅ Smaller bundle (~20% reduction)
5. ✅ Better CSS variables support

**Breaking changes ESLint 9:**
1. ❌ `.eslintrc.js` → `eslint.config.js` (flat config)
2. ⚠️ Algunas reglas deprecadas removidas
3. ✅ Better performance
4. ✅ Simplified configuration

---

#### **Grupo 4: Verificación Final (1 paquete) - Sprint 4**

| Paquete | Actual | Target | Tipo |
|---------|--------|--------|------|
| @sentry/replay | 7.120.4 | **7.116.0** | Downgrade (peer dep fix) |

**Impacto estimado:** BAJO
**Tests afectados:** 0-5
**Tiempo estimado:** 0.5 día

---

### 🗓️ Timeline v1.15.0 (Planificado)

| Sprint | Duración | Grupo | Paquetes | Tests Est. | Riesgo |
|--------|----------|-------|----------|------------|--------|
| Sprint 1 | 2-3 días | React 19 | 6 | 50-70 | 🔴 Alto |
| Sprint 2 | 1.5-2 días | Sentry + Router | 2 | 30-40 | 🟡 Medio |
| Sprint 3 | 1-1.5 días | Tailwind + ESLint | 2 | 20-30 | 🟡 Medio |
| Sprint 4 | 0.5 día | Verificación | 1 | 0-5 | 🟢 Bajo |
| **Total** | **5-7 días** | **4 sprints** | **11** | **100-145** | 🟡 Medio |

**Nota:** Días de trabajo efectivo (no calendario). Incluye buffer para testing exhaustivo.

---

### ✅ Sprint 1: React 19 Ecosystem

**Objetivo:** Migrar a React 19 con todas sus dependencias

#### **Tareas preparatorias (0.5 día):**
- [ ] Leer changelog oficial de React 19 (blog.react.dev)
- [ ] Revisar breaking changes en react-dom
- [ ] Backup branch: `git checkout -b backup/v1.14.1`
- [ ] Crear feature branch: `git checkout -b feature/react-19-upgrade`
- [ ] Documentar componentes que usan Suspense (afectados)

#### **Actualización de paquetes (0.5 día):**
- [ ] `npm install react@19.2.3 react-dom@19.2.3`
- [ ] `npm install -D @types/react@19.2.8 @types/react-dom@19.2.3`
- [ ] `npm install -D @vitejs/plugin-react@5.1.2`
- [ ] `npm install -D eslint-plugin-react-hooks@7.0.1`
- [ ] Verificar package.json y package-lock.json

#### **Migración de código (1-1.5 días):**
- [ ] Buscar y reemplazar `ReactDOM.render` → `createRoot`
  * Archivos: `src/main.jsx` (probablemente ya usa createRoot)
  * Verificar tests que usen render directo
- [ ] Actualizar componentes con Suspense
  * Revisar `ErrorBoundary.jsx` si existe
  * Actualizar lazy loading patterns
- [ ] Actualizar hooks personalizados (nuevas reglas)
  * `useAuth`, `useDeviceManagement`, etc.
  * Verificar warnings de ESLint
- [ ] Revisar context providers (behavior changes)
  * `AuthContext`, `CompetitionContext`, etc.

#### **Testing (0.5-1 día):**
- [ ] Ejecutar tests: `npm test -- --run`
- [ ] Fix tests fallidos relacionados con React 19
- [ ] Testing manual de flujos críticos:
  * Login/Logout
  * Device Management
  * Competition CRUD
  * Enrollment flow
- [ ] Verificar Suspense boundaries (loading states)
- [ ] Verificar error boundaries (error handling)

#### **Validación (0.5 día):**
- [ ] `npm run lint` (0 warnings)
- [ ] `npm run build` (exitoso)
- [ ] Bundle analysis (comparar tamaño)
- [ ] Performance testing (comparar render times)
- [ ] Commit: `feat(deps): UPGRADE to React 19 ecosystem`

---

### ✅ Sprint 2: Sentry 10 + React Router 7

**Objetivo:** Actualizar monitoring y routing

#### **Sentry 10.x Migration (1 día):**
- [ ] Leer migration guide: Sentry 7 → 10
- [ ] `npm install @sentry/react@10.34.0`
- [ ] Actualizar `src/utils/sentry.js`:
  * Revisar `Sentry.init()` config
  * Actualizar error boundary integration
  * Verificar performance monitoring
- [ ] Actualizar `ErrorBoundary` component (si aplica)
- [ ] Testing:
  * Provocar errores intencionalmente
  * Verificar que lleguen a Sentry dashboard
  * Verificar session replay funciona

#### **React Router 7 Migration (0.5-1 día):**
- [ ] Leer changelog Router 6 → 7
- [ ] `npm install react-router-dom@7.12.0`
- [ ] Revisar breaking changes en:
  * `src/App.jsx` (Routes config)
  * Route guards (`RoleGuard.jsx`)
  * Navigation hooks (`useNavigate`)
- [ ] Actualizar data loading (si usamos loaders)
- [ ] Testing:
  * Navegación entre rutas
  * Guards (ADMIN, CREATOR, PLAYER)
  * 404 handling
  * Nested routes

#### **Validación Sprint 2:**
- [ ] Tests: 712/712 passing
- [ ] Lint: 0 warnings
- [ ] Build: exitoso
- [ ] Manual testing de rutas críticas
- [ ] Commit: `feat(deps): UPGRADE Sentry 10 + Router 7`

---

### ✅ Sprint 3: Tailwind 4 + ESLint 9

**Objetivo:** Modernizar build tools y styling

#### **Tailwind 4 Migration (0.5-1 día):**
- [ ] Leer upgrade guide Tailwind 3 → 4
- [ ] Backup: `cp tailwind.config.js tailwind.config.v3.backup.js`
- [ ] `npm install -D tailwindcss@4.1.18`
- [ ] Actualizar `tailwind.config.js` (nueva sintaxis)
- [ ] Revisar utilidades deprecadas/renombradas
- [ ] Testing visual:
  * Landing page
  * Dashboard
  * Device Management
  * Forms (Login, Register)
  * Modals (ConfirmModal)
- [ ] Bundle analysis (verificar reducción de tamaño)

#### **ESLint 9 Migration (0.5 día):**
- [ ] Leer flat config guide
- [ ] Backup: `cp .eslintrc.cjs eslint.config.backup.cjs`
- [ ] `npm install -D eslint@9.39.2`
- [ ] Crear `eslint.config.js` (flat config)
- [ ] Migrar reglas de `.eslintrc.cjs`
- [ ] Eliminar `.eslintrc.cjs` (deprecated)
- [ ] `npm run lint` (verificar 0 warnings)

#### **Validación Sprint 3:**
- [ ] Tests: 712/712 passing
- [ ] Lint: 0 warnings (nuevo ESLint 9)
- [ ] Build: exitoso (nuevo Tailwind 4)
- [ ] Visual regression testing
- [ ] Bundle size: verificar reducción
- [ ] Commit: `feat(deps): UPGRADE Tailwind 4 + ESLint 9`

---

### ✅ Sprint 4: Verificación y Ajustes Finales

**Objetivo:** Testing exhaustivo y corrección de edge cases

#### **Regression Testing (0.25 día):**
- [ ] Ejecutar suite completa: `npm test -- --run`
- [ ] Verificar coverage no bajó:
  * Lines: ≥85%
  * Functions: ≥75%
  * Branches: ≥70%
- [ ] Testing manual de todos los flujos:
  * ✅ Auth flow (login, logout, register, reset password)
  * ✅ Device management (list, revoke, monitoring)
  * ✅ Competition CRUD
  * ✅ Enrollment flow
  * ✅ Profile management
  * ✅ i18n (ES/EN switching)

#### **Downgrade @sentry/replay (0.25 día):**
- [ ] `npm install @sentry/replay@7.116.0`
- [ ] Verificar peer dependency warnings resueltos
- [ ] Testing de Session Replay en Sentry

#### **Documentation & Cleanup (0.25 día):**
- [ ] Actualizar ROADMAP.md con resultados
- [ ] Actualizar CHANGELOG.md (v1.15.0)
- [ ] Eliminar archivos backup:
  * `tailwind.config.v3.backup.js`
  * `eslint.config.backup.cjs`
- [ ] Revisar TODOs añadidos durante migración
- [ ] Screenshots/videos de features funcionando

#### **Final Validation (0.25 día):**
- [ ] Build production: `npm run build`
- [ ] Bundle analysis final
- [ ] Performance benchmarks
- [ ] Security audit: `npm audit`
- [ ] Commit final: `docs(v1.15.0): UPDATE roadmap and changelog`

---

### 📊 Métricas Objetivo v1.15.0

| Métrica | v1.14.1 | v1.15.0 Objetivo | Delta |
|---------|---------|------------------|-------|
| **Tests** | 712 | 712-720 | 0-8 nuevos |
| **Bundle size (gzip)** | ~250 KB | ~210-225 KB | **-10-15%** ✅ |
| **Render time** | baseline | baseline -15-20% | **+Performance** ✅ |
| **Dependencies major** | 0 | 10 actualizados | **+Modernización** ✅ |
| **ESLint warnings** | 0 | 0 | Mantener ✅ |
| **Security Score** | 8.87/10 | 9.0/10 | **+0.13** ✅ |
| **React version** | 18.3.1 | 19.2.3 | **Major upgrade** ✅ |

---

### ⚠️ Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Tests masivos fallando | Media | Alto | Sprints graduales, backup branch |
| Bundle size aumenta | Baja | Medio | Bundle analysis post-update |
| Performance regresión | Baja | Alto | Benchmarks pre/post, rollback plan |
| Breaking changes no documentados | Media | Medio | Testing exhaustivo, logs detallados |
| Conflictos de peer dependencies | Alta | Bajo | Actualización gradual por grupos |

**Plan de rollback:**
1. Backup branch `backup/v1.14.1` disponible
2. Git tags en cada sprint: `v1.15.0-sprint1`, `v1.15.0-sprint2`, etc.
3. Rollback inmediato si tests < 95% passing
4. Rollback si bundle > 300 KB (límite crítico)

---

### 🚀 Criterios de Éxito

**Mínimos (Must Have):**
- ✅ Tests: 95%+ passing (675/712 mínimo)
- ✅ Lint: 0 warnings
- ✅ Build: exitoso
- ✅ Bundle: ≤ 300 KB total
- ✅ Security: 0 vulnerabilities críticas

**Deseables (Nice to Have):**
- ✅ Tests: 100% passing (712/712)
- ✅ Bundle: -10% size reduction
- ✅ Performance: +15% faster rendering
- ✅ Type coverage: +5%

**Bloqueantes (Must NOT Have):**
- ❌ Regresión de features existentes
- ❌ Errores en producción post-deploy
- ❌ Performance degradation > 5%
- ❌ Bundle size > 300 KB

---

### 📅 Fechas Tentativas

**Inicio estimado:** Por definir (post v1.14.1 release)
**Duración:** 2-3 semanas (5-7 días efectivos)
**Release estimado:** v1.15.0 - Febrero 2026

**Prerrequisitos:**
1. v1.14.1 deployed y estable en producción
2. Monitoreo Sentry sin errores críticos (7 días)
3. Aprobación de stakeholders para upgrade
4. Tiempo disponible para testing exhaustivo

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
- ✅ Device Fingerprinting (v1.14.0 - Completado)

### Pendientes (Alta Prioridad)
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

**Última revisión:** 23 Ene 2026 (v1.15.0 Data Integrity Completada)
**Próxima revisión:** Inicio v2.1.0 o próximo sprint
