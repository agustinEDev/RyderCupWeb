# Tests de Integración con Backend

> **Tarea #11 del ROADMAP**
> **Fecha:** 23-24 Dic 2025 (auth flows) | Pendiente: schedule flows (v2.1.0)
> **Estado:** ✅ DISPONIBLE - Solo para ejecucion local manual
> **Objetivo:** Verificar integracion completa Frontend-Backend

## ⚠️ IMPORTANTE

**Los tests de integración NO se ejecutan en CI/CD.**

Estos tests están disponibles solo para **ejecución local manual** cuando necesites validar la integración con el backend real.

**Motivo:** La complejidad de mantener un mock backend en CI no justifica el beneficio, ya que:
- Los tests unitarios cubren >90% del código
- El backend real debe estar corriendo (no podemos garantizarlo en CI)
- Los mocks agregan complejidad sin aportar confianza real en la integración

## ✅ Estado Actual

**Tests implementados:** 8 tests E2E
**Ejecución:** Solo local (con backend real corriendo)
**Tiempo de ejecución:** ~26 segundos

**Para ejecutar estos tests necesitas:**
1. ✅ Node.js 20+
2. ✅ Backend real corriendo en `http://localhost:8000`
3. ✅ Variables de entorno configuradas: `TEST_EMAIL` y `TEST_PASSWORD`
4. ✅ Usuario de prueba válido en el backend

**Configuración de credenciales:**
```bash
# Opción 1: Archivo .env (recomendado)
cp .env.example .env
# Editar .env y configurar TEST_EMAIL y TEST_PASSWORD

# Opción 2: Variables de entorno inline
TEST_EMAIL=your-test@example.com TEST_PASSWORD=YourTestPassword123 npm run test:integration
```

## 📋 Suite de Tests Implementada

Archivo: [`tests/integration.spec.js`](../tests/integration.spec.js)

### 1️⃣ httpOnly Cookies - Basic Login (2 tests)

Verifica autenticación y manejo de cookies httpOnly:

- ✅ **Login successfully and receive cookies**
  - Verifica login exitoso con credenciales válidas
  - Confirma que se reciben cookies: `access_token`, `refresh_token`
  - Valida redirección a `/dashboard`
  
- ✅ **Maintain authentication across navigation**
  - Navega a rutas protegidas (`/profile`) usando cookies
  - Verifica que los datos del usuario se muestran correctamente
  - Confirma persistencia de autenticación

### 2️⃣ Backend Validation - Login (1 test)

Verifica validaciones del backend en proceso de login:

- ✅ **Reject login with incorrect password**
  - Intenta login con contraseña incorrecta
  - Verifica que permanece en página de login
  - Confirma mensaje de error visible

### 3️⃣ Backend Validation - Registration (2 tests)

Verifica validaciones del formulario de registro:

- ✅ **Reject registration with short password**
  - Intenta registro con contraseña < 12 caracteres
  - Verifica mensaje de validación de longitud
  
- ✅ **Validate registration form fields**
  - Verifica presencia de todos los campos del formulario
  - Llena formulario con datos válidos
  - Confirma ausencia de errores de validación frontend

### 4️⃣ Complete E2E Flow (1 test)

Verifica el flujo completo de usuario autenticado:

- ✅ **Login → dashboard → profile → competitions flow**
  1. Login exitoso con credenciales válidas
  2. Redirección a `/dashboard`
  3. Navegación a `/profile` - datos de usuario visibles
  4. Navegación a `/competitions` - página carga correctamente
  5. Cookies mantienen sesión en todas las navegaciones

### 5️⃣ Session Persistence (1 test)

Verifica persistencia de sesión con cookies httpOnly:

- ✅ **Maintain session across page reload**
  - Login exitoso
  - Recarga la página (F5)
  - Sesión se mantiene (permanece en `/dashboard`)
  - Cookies persisten después del reload

## 🚀 Ejecución de Tests

### Comandos Disponibles

```bash
# Ejecutar todos los tests de integración
npm run test:integration

# Ejecutar todos los tests E2E (incluye otros tests)
npm run test:e2e

# Modo interactivo con UI
npm run test:e2e:ui

# Ver navegador durante ejecución
npm run test:e2e:headed
```

### Configuración Importante

**Playwright Config (`playwright.config.js`):**
```javascript
{
  workers: 1,              // ⚠️ CRÍTICO: Ejecutar en serie para evitar rate limiting
  fullyParallel: false,    // Deshabilitar paralelización
  baseURL: 'http://localhost:5173',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI
  }
}
  
- ✅ **Handle authentication throughout competitions flow**
  - `/competitions` accesible
  - `/competitions/browse` accesible
  - `/competitions/create` accesible

### 5️⃣ Session Timeout & Inactivity (2 tests)

Verifica persistencia de sesión:

- ✅ **Maintain session across page reloads**
  - Reload de página mantiene sesión activa
  - Dashboard sigue accesible sin re-login
  
- ✅ **Maintain session across tab/window close simulation**
  - Cookies persisten después de cerrar tab
  - Simula comportamiento real del navegador

## 🚀 Ejecutar Tests

### ⚠️ Requisitos Previos

**1. Instalar navegadores (solo primera vez):**

```bash
npx playwright install chromium
```

**2. Backend DEBE estar corriendo:**

⚠️ **CRÍTICO:** Los tests de integración requieren que el backend real esté activo.

```bash
# En el repositorio del backend (RyderCupAm)
cd ../RyderCupAm
source venv/bin/activate  # o el entorno que uses
uvicorn app.main:app --reload

# Verificar que responde
curl http://localhost:8000/api/v1/health
```

**Importante:** Si el backend no está corriendo, los tests fallarán.

**3. Configurar credenciales de prueba:**

⚠️ **IMPORTANTE:** Las credenciales se leen desde variables de entorno para mayor seguridad.

```bash
# Opción 1: Crear archivo .env (recomendado)
cp .env.example .env

# Editar .env y configurar:
TEST_EMAIL=tu-usuario-prueba@example.com
TEST_PASSWORD=TuPasswordDePrueba123

# Opción 2: Exportar variables inline
export TEST_EMAIL=tu-usuario-prueba@example.com
export TEST_PASSWORD=TuPasswordDePrueba123
npm run test:integration
```

**El usuario de prueba debe:**
- Existir en tu backend de desarrollo/testing
- Tener email verificado
- Usar credenciales dedicadas (NO personales/producción)

**Si no tienes usuario de prueba:**
1. Regístralo manualmente en el frontend local
2. Verifica el email
3. Configura esas credenciales en `.env`

### Todos los tests E2E

```bash
npm run test:e2e
```

### Solo tests de integración

```bash
npm run test:integration
```

### En modo UI (interactivo)

```bash
npm run test:e2e:ui
```

### Ver navegador (headed mode)

```bash
npm run test:e2e:headed
```

### Específico por describe block

```bash
npx playwright test -g "httpOnly Cookies"
npx playwright test -g "Refresh Token Flow"
npx playwright test -g "Backend Validation"
npx playwright test -g "Complete E2E Flow"
```

## ⚙️ Configuración

**Archivo:** `playwright.config.js`

```javascript
{
  baseURL: 'http://localhost:5174',
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
  }
}
```

## 📊 Cobertura de Tests

| Característica Backend v1.8.0 | Tests | Estado |
|-------------------------------|-------|--------|
| httpOnly Cookies | 3 | ✅ |
| Refresh Token Flow | 2 | ✅ |
| Password Policy (12 chars) | 1 | ✅ |
| Email Validation (RFC 5321) | 1 | ✅ |
| Name Validation (2-100 chars) | 2 | ✅ |
| Names with Accents | 1 | ✅ |
| Session Persistence | 2 | ✅ |
| Protected Routes | 3 | ✅ |
| **Total** | **15** | **✅ 100%** |

## 🎯 Checklist de Validación

- [x] httpOnly cookies se almacenan correctamente
- [x] Cookies se envían automáticamente con requests
- [x] Cookies se limpian después de logout
- [x] Refresh token flow funciona automáticamente
- [x] Redirección a login cuando refresh token es inválido
- [x] Backend rechaza passwords cortos (< 12 chars)
- [x] Backend rechaza emails inválidos
- [x] Backend rechaza nombres excesivamente largos (> 100 chars)
- [x] Backend acepta nombres con acentos y caracteres especiales
- [x] Flujo completo funciona: login → dashboard → profile → edit → logout
- [x] Sesión persiste después de page reload
- [x] Rutas protegidas redirigen a login sin autenticación

## 🔍 Notas Técnicas

### User Credentials para Tests

🔒 **Seguridad:** Las credenciales se cargan desde variables de entorno.

```javascript
// En tests/integration.spec.js
const { email, password } = getTestCredentials();

// getTestCredentials() lee de:
// - process.env.TEST_EMAIL
// - process.env.TEST_PASSWORD
```

**⚠️ Importante:**
- El usuario debe existir en el backend de pruebas y estar verificado
- Las credenciales NUNCA deben estar hardcodeadas en el código
- Usa credenciales dedicadas para testing (NO personales/producción)

### Timeout Considerations

- Login/Dashboard redirect: 10 segundos
- Page navigation: 5 segundos
- Element visibility: 3 segundos (validaciones)
- Reason: Backend puede estar en "cold start" (Render.com)

### Cookie Debugging

Los tests incluyen logging de cookies:

```javascript
console.log('🍪 Cookies after login:', cookies.map(c => ({ 
  name: c.name, 
  httpOnly: c.httpOnly,
  secure: c.secure,
  sameSite: c.sameSite 
})));
```

### Fallbacks en UI Testing

Algunos elementos pueden tener diferentes selectores según el estado de la UI:

```javascript
// Ejemplo: Logout button
await page.click('[data-testid="user-menu-button"]').catch(() => {
  return page.click('button:has-text("Settings")').catch(() => {
    return page.click('[aria-label*="user" i]');
  });
});
```

## 🐛 Troubleshooting

### Error: Login fails / Remains on /login page

**Problema:** Tests esperan llegar a `/dashboard` pero se quedan en `/login`.

**Causas posibles:**
1. Backend no está corriendo
2. Usuario de prueba no existe
3. Credenciales incorrectas
4. Backend en cold start (Render.com)

**Solución:**
```bash
# 1. Verificar backend
curl http://localhost:8000/health

# 2. Verificar credenciales en tu backend
# Registrar usuario manualmente si no existe

# 3. O actualizar credenciales en tests/integration.spec.js
# Buscar: panetetrinx@gmail.com
# Reemplazar con tu usuario de prueba
```

### Error: Timeout waiting for webServer

**Problema:** El servidor dev no inició a tiempo.

**Solución:**
```bash
# Iniciar servidor manualmente en otra terminal
npm run dev

# Ejecutar tests sin webServer
npx playwright test --config playwright.config.js
```

### Error: Missing test credentials

**Problema:** Variables de entorno `TEST_EMAIL` o `TEST_PASSWORD` no están configuradas.

**Error mostrado:**
```
Missing test credentials. Please set TEST_EMAIL and TEST_PASSWORD environment variables.
```

**Solución:**
```bash
# Crear archivo .env con credenciales
cp .env.example .env
# Editar .env y configurar TEST_EMAIL y TEST_PASSWORD
```

### Error: User not found / Invalid credentials

**Problema:** Usuario de prueba no existe en backend o credenciales incorrectas.

**Solución:**
1. Verificar que el usuario existe en el backend
2. Verificar que el email está verificado
3. Registrar nuevo usuario si es necesario
4. Actualizar credenciales en `.env`

### Tests fallan en CI pero pasan local

**Problema:** Diferencias en timing (backend cold start).

**Solución:**
- Aumentar timeouts en `playwright.config.js`
- Configurar retries: `retries: 2` en CI

## 📚 Referencias

- [Playwright Test API](https://playwright.dev/docs/api/class-test)
- [Backend API Spec](../BACKEND_API_SPEC.md)
- [Token Refresh Interceptor](../src/utils/tokenRefreshInterceptor.js)
- [ROADMAP Task #11](../ROADMAP.md#tarea-11)

## ✅ Resultado

**15 tests implementados** cubriendo:
- ✅ httpOnly cookies
- ✅ Refresh token flow automático
- ✅ Validaciones del backend
- ✅ Flujo E2E completo
- ✅ Persistencia de sesión

**Estado de ejecución:**
- ⚠️ **Requiere backend activo** en `http://localhost:8000`
- ⚠️ **Requiere variables de entorno** `TEST_EMAIL` y `TEST_PASSWORD` configuradas
- ⚠️ **Requiere usuario de prueba** verificado en el backend
- ✅ **Tests listos para CI/CD** una vez backend esté en producción
- ✅ **Integración Frontend-Backend: Auth flows 100% implementados**

**Próximos pasos sugeridos:**
1. ✅ ~~Configurar variables de entorno para credenciales de prueba~~ (Implementado)
2. Crear usuario de prueba automáticamente en setup
3. Considerar usar [MSW](https://mswjs.io/) para mock del backend en tests
4. Ejecutar tests contra backend en CI/CD
5. **v2.1.0 - Schedule Integration Tests (pendiente):**
   - Test crear ronda y verificar en schedule
   - Test generar partidos para una ronda
   - Test ciclo de vida de partido (SCHEDULED -> IN_PROGRESS -> COMPLETED)
   - Test declarar walkover y verificar resultado formateado (score, winner, reason)
   - Test asignar equipos (manual/automático)
   - Test reasignar jugadores en un partido
   - Test enrollment con tee category (EnrollmentRequestModal flow)
   - Test jugador inscrito accede a `/competitions/:id/schedule` (vista read-only, sin botones de gestión)
