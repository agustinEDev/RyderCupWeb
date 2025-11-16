# Auditoría de Seguridad - Ryder Cup Amateur Manager

**Fecha**: 2025-11-16
**Revisor**: Claude AI Security Review
**Proyecto**: RyderCupWeb Frontend

---

## Resumen Ejecutivo

Este documento presenta los hallazgos de seguridad identificados en la aplicación web Ryder Cup Amateur Manager (Frontend React). Se han identificado **12 problemas de seguridad** que van desde críticos hasta informativos, junto con recomendaciones específicas para cada uno.

**Nivel de Riesgo General**: MEDIO-ALTO

---

## Hallazgos de Seguridad

### 🔴 CRÍTICO

#### 1. Exposición de Datos Sensibles en Logs de Consola

**Ubicación**:
- `src/pages/Login.jsx:77`
- `src/pages/VerifyEmail.jsx:40,55,60,69,82,88`

**Descripción**:
Los datos de autenticación (incluyendo tokens y datos de usuario) se registran en la consola del navegador, lo que puede exponer información sensible en producción.

```javascript
// Login.jsx línea 77
console.log('Login successful:', data); // Expone access_token y user data
```

**Impacto**:
- Exposición de tokens de acceso
- Filtración de información de usuario
- Facilita ataques de robo de sesión

**Recomendación**:
```javascript
// Eliminar todos los console.log en producción
// O usar una biblioteca de logging que los deshabilite automáticamente
if (import.meta.env.DEV) {
  console.log('Login successful:', { email: data.user.email }); // Solo info no sensible
}
```

---

#### 2. Almacenamiento de Tokens en LocalStorage

**Ubicación**:
- `src/pages/Login.jsx:80`
- `src/pages/EditProfile.jsx` (múltiples líneas)
- `src/components/layout/HeaderAuth.jsx:18-19`

**Descripción**:
Los tokens de acceso se almacenan en `localStorage`, lo que los hace vulnerables a ataques XSS.

```javascript
localStorage.setItem('access_token', data.access_token);
localStorage.setItem('user', JSON.stringify(data.user));
```

**Impacto**:
- Vulnerable a Cross-Site Scripting (XSS)
- Los tokens persisten incluso después de cerrar el navegador
- No hay mecanismo de expiración automática

**Recomendación**:
1. **Opción A (Preferida)**: Usar cookies HttpOnly + SameSite
2. **Opción B**: Implementar tokens de corta duración + refresh tokens
3. **Opción C (Mínimo)**: Añadir expiración y validación de tokens

---

### 🟠 ALTO

#### 3. Ausencia de Protección de Rutas Centralizada

**Ubicación**:
- `src/App.jsx`
- Cada componente protegido (Dashboard, Profile, EditProfile, etc.)

**Descripción**:
Cada componente verifica la autenticación individualmente en lugar de usar un componente de ruta protegida centralizado.

```javascript
// Patrón repetido en cada componente
useEffect(() => {
  const token = localStorage.getItem('access_token');
  if (!token) navigate('/login');
}, [navigate]);
```

**Impacto**:
- Código duplicado y difícil de mantener
- Riesgo de inconsistencias en la validación
- No hay verificación de expiración de token

**Recomendación**:
Crear un componente `ProtectedRoute`:

```javascript
// src/components/auth/ProtectedRoute.jsx
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('access_token');
  const isValid = validateToken(token);

  if (!isValid) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// En App.jsx
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

---

#### 4. Validación de Contraseña Débil

**Ubicación**:
- `src/pages/Register.jsx:48-49`
- `src/pages/EditProfile.jsx:335-336`

**Descripción**:
Solo se requieren 8 caracteres mínimos sin validación de complejidad.

```javascript
if (formData.password.length < 8) {
  newErrors.password = 'Password must be at least 8 characters';
}
```

**Impacto**:
- Contraseñas débiles permitidas
- Mayor riesgo de ataques de fuerza bruta
- No cumple con estándares de seguridad modernos

**Recomendación**:
```javascript
const validatePassword = (password) => {
  const minLength = 12; // NIST recomienda 12+ caracteres
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    return 'Password must be at least 12 characters';
  }
  if (!(hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar)) {
    return 'Password must contain uppercase, lowercase, numbers, and special characters';
  }
  return null;
};
```

---

#### 5. Sin Validación de Expiración de Token

**Ubicación**:
- Todo el proyecto

**Descripción**:
No hay validación de expiración de tokens JWT en el frontend.

**Impacto**:
- Tokens expirados pueden usarse indefinidamente
- No hay cierre de sesión automático
- Sesiones potencialmente comprometidas permanecen activas

**Recomendación**:
```javascript
// src/utils/auth.js
export const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

export const validateToken = (token) => {
  if (!token) return false;
  if (isTokenExpired(token)) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    return false;
  }
  return true;
};
```

---

### 🟡 MEDIO

#### 6. Ausencia de Content Security Policy (CSP)

**Ubicación**:
- `index.html`

**Descripción**:
No hay headers de Content Security Policy configurados.

**Impacto**:
- Mayor riesgo de ataques XSS
- Sin protección contra inyección de scripts maliciosos
- Vulnerable a clickjacking

**Recomendación**:
Añadir en `index.html`:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' https://lh3.googleusercontent.com data:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' ${VITE_API_BASE_URL};
  frame-ancestors 'none';
">
<meta http-equiv="X-Frame-Options" content="DENY">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin">
```

---

#### 7. Sin Sanitización Explícita de Inputs

**Ubicación**:
- Todos los formularios

**Descripción**:
No hay sanitización explícita de inputs del usuario antes de procesarlos.

**Impacto**:
- Posible inyección de código
- Riesgo de XSS almacenado si el backend no valida

**Recomendación**:
```javascript
import DOMPurify from 'dompurify';

const sanitizeInput = (input) => {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
};

// Al procesar inputs
const cleanFirstName = sanitizeInput(formData.firstName.trim());
```

---

#### 8. Sin Rate Limiting Visual

**Ubicación**:
- `src/pages/Login.jsx`
- `src/pages/Register.jsx`

**Descripción**:
No hay protección contra intentos repetidos de login/registro.

**Impacto**:
- Facilita ataques de fuerza bruta
- Permite spam de registros

**Recomendación**:
```javascript
// Implementar rate limiting simple en el frontend
const [loginAttempts, setLoginAttempts] = useState(0);
const [lockoutTime, setLockoutTime] = useState(null);

const handleSubmit = async (e) => {
  e.preventDefault();

  if (lockoutTime && Date.now() < lockoutTime) {
    const remainingSeconds = Math.ceil((lockoutTime - Date.now()) / 1000);
    setServerError(`Too many attempts. Please wait ${remainingSeconds}s`);
    return;
  }

  try {
    // ... login logic
  } catch (error) {
    const newAttempts = loginAttempts + 1;
    setLoginAttempts(newAttempts);

    if (newAttempts >= 5) {
      setLockoutTime(Date.now() + 60000); // 1 minuto
      setLoginAttempts(0);
    }
  }
};
```

---

### 🔵 BAJO / INFORMATIVO

#### 9. Sin Timeout de Sesión

**Ubicación**:
- Todo el proyecto

**Descripción**:
No hay cierre automático de sesión por inactividad.

**Recomendación**:
Implementar un hook de inactividad:

```javascript
// src/hooks/useIdleTimer.js
export const useIdleTimer = (timeout = 900000) => { // 15 minutos
  useEffect(() => {
    let timer;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        window.location.href = '/login?reason=timeout';
      }, timeout);
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [timeout]);
};
```

---

#### 10. Logs de Consola en Producción

**Ubicación**:
- Múltiples archivos

**Descripción**:
Hay múltiples `console.log`, `console.error` que deberían eliminarse en producción.

**Recomendación**:
```javascript
// vite.config.js
export default defineConfig({
  plugins: [react()],
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Elimina todos los console.* en producción
        drop_debugger: true
      }
    }
  }
})
```

---

#### 11. Sin Manejo de CORS Visible

**Ubicación**:
- Configuración del proyecto

**Descripción**:
No hay configuración explícita de CORS en el frontend.

**Recomendación**:
Documentar la configuración esperada del backend y validar los headers CORS.

---

#### 12. URLs Externas No Verificadas

**Ubicación**:
- `src/pages/Login.jsx:115` (Googleusercontent)
- `src/pages/CreateCompetition.jsx:71`

**Descripción**:
Se usan URLs de Google sin verificación de integridad.

**Recomendación**:
1. Alojar imágenes localmente
2. Usar Subresource Integrity (SRI) si es posible
3. Usar CDN de confianza con HTTPS

---

## Resumen de Prioridades

### Implementar Inmediatamente (1-2 días):
1. ✅ Eliminar console.log de datos sensibles
2. ✅ Implementar validación de contraseña robusta
3. ✅ Añadir headers de seguridad (CSP, X-Frame-Options, etc.)

### Implementar a Corto Plazo (1 semana):
4. ✅ Crear componente ProtectedRoute centralizado
5. ✅ Implementar validación de expiración de tokens
6. ✅ Añadir rate limiting en formularios

### Implementar a Medio Plazo (2-4 semanas):
7. ⏳ Migrar de localStorage a cookies HttpOnly
8. ⏳ Implementar refresh tokens
9. ⏳ Añadir timeout de sesión por inactividad

### Mejoras Adicionales:
10. 📝 Sanitización de inputs con DOMPurify
11. 📝 Eliminar console.log en build de producción
12. 📝 Alojar imágenes localmente

---

## Conclusión

La aplicación tiene una base sólida pero requiere mejoras de seguridad significativas antes de lanzarse a producción. Los problemas críticos relacionados con el manejo de tokens y la exposición de datos sensibles deben resolverse con prioridad máxima.

**Próximos Pasos Recomendados**:
1. Implementar las mejoras críticas listadas
2. Realizar pruebas de penetración
3. Configurar monitoreo de seguridad
4. Establecer proceso de revisión de código con enfoque en seguridad
