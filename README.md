# 🏆 Ryder Cup Amateur Manager - Web Frontend

> Aplicación web moderna para gestión de torneos de golf amateur formato Ryder Cup

[![CI Pipeline](https://github.com/agustinEDev/RyderCupWeb/actions/workflows/ci.yml/badge.svg)](https://github.com/agustinEDev/RyderCupWeb/actions/workflows/ci.yml)
[![Security Audit](https://github.com/agustinEDev/RyderCupWeb/actions/workflows/security.yml/badge.svg)](https://github.com/agustinEDev/RyderCupWeb/actions/workflows/security.yml)
[![Security Tests](https://github.com/agustinEDev/RyderCupWeb/actions/workflows/security-tests.yml/badge.svg)](https://github.com/agustinEDev/RyderCupWeb/actions/workflows/security-tests.yml)

[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)](.)
[![Vite](https://img.shields.io/badge/Vite-7+-646CFF?logo=vite)](.)
[![Tailwind](https://img.shields.io/badge/Tailwind-3+-38B2AC?logo=tailwind-css)](.)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?logo=typescript)](.)

## 🔗 Backend API

# 🏆 Ryder Cup Amateur Manager — Frontend (resumen)

Aplicación web (React + Vite + Tailwind) para gestión de torneos de golf amateur.

Breve, útil y orientado a desarrolladores: cómo ejecutar, construir y desplegar.

## Rápido — Desarrollo

1. Instalar dependencias:

```bash
npm install
```

2. Ejecutar en desarrollo:

```bash
npm run dev
# Abre: http://localhost:5173
```

3. Variables de entorno

- Copiar `.env.example` → `.env` y ajustar:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Nota: Vite inyecta las variables en build; asegura que `VITE_API_BASE_URL` apunte al backend correcto antes de `npm run build`.

## Build & Deploy

```bash
npm run build   # genera carpeta dist/
npm run preview # previsualizar el build
```

Deploy: subir `dist/` a cualquier hosting estático (Netlify, Vercel, Cloudflare Pages). Si el backend está en Render, usar la URL pública del servicio como `VITE_API_BASE_URL` antes de construir.

Importante: Render puede hibernar (503). Si ves 503 en producción, revisa estado del servicio y retries.

## 🔐 CI/CD & Seguridad

Este proyecto implementa un pipeline profesional de CI/CD que garantiza la calidad y seguridad del código:

### Pipeline de Integración Continua
- ✅ **Linting automático** (ESLint + Prettier) en cada commit
- ✅ **Tests unitarios** (Vitest) con coverage enforcement (≥80%)
- ✅ **Build verification** con bundle size budget (≤1 MB)
- ✅ **Type checking** - validación de tipos TypeScript
- ✅ **PR size check** - bloquea PRs >1000 cambios
- ✅ **Conventional commits** - valida formato de commits

### Seguridad Automatizada
- 🔒 **npm audit** - auditoría de vulnerabilidades en dependencias
- 📦 **Dependency scanning** - detección de paquetes desactualizados
- ⚖️ **License compliance** - verificación de licencias
- 🛡️ **Security scanning** - detección de secrets y código inseguro
- 🔐 **CSP validation** - validación de Content Security Policy headers

### Testing Strategy
- 🧪 **Unit Tests** (Vitest) - lógica de componentes y utilidades
- 🔗 **Integration Tests** - interacción con backend API (autenticación, cookies httpOnly)
- 🎭 **E2E Tests** (Playwright) - flujos completos en múltiples navegadores

#### Ejecutar Tests de Integración

⚠️ **Configuración de Credenciales de Prueba**

Los tests de integración requieren credenciales de prueba configuradas como variables de entorno:

```bash
# 1. Copiar archivo de ejemplo
cp .env.example .env

# 2. Editar .env y configurar credenciales dedicadas para testing:
TEST_EMAIL=tu-usuario-prueba@example.com
TEST_PASSWORD=TuPasswordDePrueba123

# 3. Ejecutar tests
npm run test:integration
```

**🔒 Seguridad:** Las credenciales NUNCA deben estar hardcodeadas en el código. Usa credenciales dedicadas para testing (NO personales ni de producción).

**Comandos de Testing:**

```bash
# Tests de integración (requiere backend real en localhost:8000)
npm run test:integration

# Tests unitarios con coverage
npm test

# Tests E2E completos
npm run test:e2e

# Tests de seguridad (OWASP validations)
npm run test:security
```

**Nota**: Los tests de integración se ejecutan contra el backend real en `http://localhost:8000`. Para más detalles ver [`docs/INTEGRATION_TESTS.md`](docs/INTEGRATION_TESTS.md)

### Branch Protection
La rama `main` está protegida con:
- ✅ Requiere PR y aprobación antes de merge
- ✅ Todos los checks de CI deben pasar
- ✅ No permite force push ni eliminación
- 📋 Ver [docs/BRANCH_PROTECTION.md](docs/BRANCH_PROTECTION.md) para detalles

## 🔐 Mejores Prácticas de Seguridad

### Variables de Entorno y Credenciales

**🚫 NUNCA hacer:**
- Hardcodear credenciales en el código fuente
- Commit de archivos `.env` con datos sensibles
- Usar credenciales personales/producción para testing
- Compartir credenciales en canales públicos (issues, PRs, chat)

**✅ SIEMPRE hacer:**
- Usar variables de entorno para credenciales (`process.env.*`)
- Mantener `.env` en `.gitignore`
- Usar credenciales dedicadas para cada entorno (dev/test/prod)
- Rotar credenciales regularmente
- Validar presencia de variables de entorno con fail-fast

**Ejemplo de implementación correcta:**

```javascript
// ✅ CORRECTO: Validación con fail-fast
const getTestCredentials = () => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    throw new Error('Missing TEST_EMAIL or TEST_PASSWORD environment variables');
  }

  return { email, password };
};

// ❌ INCORRECTO: Credenciales hardcodeadas
const credentials = {
  email: 'user@example.com',  // ¡NO HACER ESTO!
  password: 'MyPassword123'   // ¡NO HACER ESTO!
};
```

### Gestión de Secrets en CI/CD

Para configurar credenciales en GitHub Actions:

1. **Settings → Secrets and variables → Actions**
2. **New repository secret:**
   - `TEST_EMAIL` = credencial de prueba
   - `TEST_PASSWORD` = credencial de prueba
3. Los secrets se inyectan automáticamente como variables de entorno en workflows

### Rotación de Credenciales

Si las credenciales fueron comprometidas:

1. **Inmediato:** Cambiar contraseña en el backend
2. Rotar credenciales en todos los entornos (dev/test/prod)
3. Actualizar secrets en CI/CD
4. Revisar logs de acceso sospechoso
5. Considerar limpiar historial de Git con `git-filter-repo` si fueron commiteadas

## Notas clave de integración

- Backend: FastAPI (repositorio `RyderCupAm`). Endpoints principales: auth, users, handicaps.
- Cuando pidas actualización desde RFEG, NO enviar `manual_handicap` — dejar que el backend consulte RFEG y devuelva el resultado o un error claro (ej.: "User not found in RFEG"). Esto evita resultados falsos-positivos.
- `localStorage` contiene `access_token` y `user` (objeto usado por componentes protegidos).

## Problemas y correcciones relevantes (breve)

- Fix: dropdown de usuario (HeaderAuth) — se separaron refs para móvil/escritorio y se mejoró el manejo de clic fuera.
- Fix: `EditProfile` — manejo seguro cuando `handicap` es null; ahora el formulario muestra cadena vacía y no lanza errores.
- Se añadieron validaciones y ajustes para Sonar/ESLint (uso de Number.parseFloat, htmlFor en labels, PropTypes añadidos donde aplica).

## Estructura (resumida)

- `src/pages/` — rutas: Landing, Login, Register, VerifyEmail, Dashboard, Profile, EditProfile, Competitions, CreateCompetition
- `src/components/layout` — Header, HeaderAuth, Footer
- `src/services/` — llamadas al API

## Comandos útiles

```bash
npm run dev     # desarrollo
npm run build   # producción
npm run preview # probar build
```

## Dónde mirar primero

- `src/pages/EditProfile.jsx` — lógica de actualización de hándicap (manual + RFEG) y refresco de usuario
- `src/components/layout/HeaderAuth.jsx` — menú de usuario y logout

---

Contacto: [Agustín Estévez](https://github.com/agustinEDev)

- **Frontend Repository**: [RyderCupWeb](https://github.com/agustinEDev/RyderCupWeb)

---

⭐ Si te resulta útil, dale una estrella en GitHub

🏌️‍♂️ ¡Feliz desarrollo!
