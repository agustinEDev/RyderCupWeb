# ADR-004: Migración a httpOnly Cookies

**Fecha**: 27 de noviembre de 2025
**Fecha Implementación**: 21 de diciembre de 2025
**Estado**: ✅ Implementado (v1.8.0)
**Decisores**: Equipo de desarrollo frontend + backend
**Supersede**: ADR-003 (sessionStorage Authentication)

## Contexto y Problema

ADR-003 implementó sessionStorage como solución temporal para JWT tokens, pero presenta vulnerabilidades críticas:

- **XSS Vulnerability**: JavaScript puede acceder y robar tokens
- **No CSRF Protection**: Tokens accesibles desde cualquier script
- **Manual Header Management**: Requiere `Authorization: Bearer ${token}` en cada request

**Requisitos para migración:**
- Eliminar acceso a tokens desde JavaScript
- Protección automática contra XSS
- Simplificar autenticación (cookies automáticas)
- Coordinar cambios frontend + backend

## Opciones Consideradas

1. **httpOnly Cookies + CSRF Tokens**: Cookies manejadas por navegador + token anti-CSRF
2. **httpOnly Cookies + SameSite**: Cookies con flag `samesite=lax` (sin CSRF token)
3. **Mantener sessionStorage + CSP estricto**: Mejorar CSP pero mantener vulnerabilidad

## Decisión

**Adoptamos httpOnly Cookies + SameSite=lax** para v1.8.0:

### Backend Changes (FastAPI):
```python
# src/modules/auth/infrastructure/api/auth_routes.py
from fastapi import Response

@app.post("/api/v1/auth/login")
async def login(credentials: LoginRequest, response: Response):
    token = create_access_token(user.id)

    # Set httpOnly cookie
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,   # ✅ No accesible desde JavaScript
        secure=True,     # ✅ Solo HTTPS en producción
        samesite="lax",  # ✅ Protección CSRF básica
        max_age=3600,    # 1 hora
        path="/",
        domain=None      # Automático
    )

    # NO enviar token en response body
    return {"user": user_dto}  # Sin access_token
```

### Middleware de Autenticación:
```python
# src/shared/infrastructure/middleware/auth_middleware.py
from fastapi import Request, HTTPException

def extract_token_from_cookies(request: Request) -> str:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return token

# Reemplazar lectura desde Authorization header
```

### Frontend Changes (React):
```javascript
// src/utils/secureAuth.js - ELIMINAR este archivo completamente
// Ya no se necesita setAuthToken/getAuthToken

// src/infrastructure/*/Api*Repository.js
fetch(url, {
    method: 'POST',
    credentials: 'include',  // ✅ Envía cookies automáticamente
    headers: {
        'Content-Type': 'application/json'
        // NO incluir Authorization header
    },
    body: JSON.stringify(data)
})
```

## Justificación

### Ventajas de httpOnly Cookies:

| Aspecto | httpOnly Cookies | sessionStorage (actual) |
|---------|------------------|------------------------|
| **XSS Protection** | ✅ Inmune | ❌ Vulnerable |
| **CSRF Protection** | ✅ SameSite=lax | ❌ No |
| **Manejo automático** | ✅ Navegador | ❌ Manual |
| **Complejidad** | ✅ Menor | ⚠️ Mayor |
| **Logout** | ✅ Server-side | ⚠️ Client-side |

### Por qué NO CSRF Tokens (inicialmente):

- `samesite=lax` provee protección básica CSRF
- Simplifica implementación inicial
- CSRF tokens se pueden agregar después si es necesario (ADR futuro)

### Compatibilidad:

- ✅ Todos los navegadores modernos soportan httpOnly
- ✅ Compatible con fetch API con `credentials: 'include'`
- ✅ Funciona en desarrollo (localhost) y producción (HTTPS)

## Consecuencias

### Positivas:
- ✅ **Elimina XSS token theft**: JavaScript no puede leer cookies
- ✅ **CSRF básico**: SameSite=lax previene ataques cross-site
- ✅ **Código más simple**: No manejo manual de tokens
- ✅ **Logout server-side**: Backend puede invalidar cookies
- ✅ **HTTPS enforcement**: `secure=true` fuerza HTTPS

### Negativas:
- ❌ **Requiere cambios coordinados**: Frontend + Backend simultáneamente
- ❌ **CORS más estricto**: Requiere `credentials: 'include'` en todas las requests
- ❌ **Testing más complejo**: Cookies en tests requiere configuración
- ❌ **No persiste en tabs**: Similar a sessionStorage actual

### Riesgos Mitigados:

1. **XSS Attacks**: Tokens inaccesibles desde JavaScript
2. **CSRF Attacks**: SameSite=lax previene ataques básicos
3. **Token Leakage**: Cookies no se exponen en logs/console

## Plan de Migración

### Fase 1: Backend (Semana 1)
1. Implementar `set_cookie` en login/register/verify-email
2. Modificar auth middleware para leer desde cookies
3. Mantener compatibilidad temporal con headers `Authorization`
4. Deploy a staging
5. Testing exhaustivo

### Fase 2: Frontend (Semana 2)
1. Agregar `credentials: 'include'` en todos los repositories
2. Eliminar `src/utils/secureAuth.js`
3. Remover lectura/escritura de sessionStorage
4. Actualizar tests
5. Deploy a staging
6. Testing conjunto con backend

### Fase 3: Cleanup (Semana 3)
1. Eliminar soporte de headers `Authorization` en backend
2. Verificar no hay código legacy
3. Deploy coordinado a producción
4. Monitorear errores con Sentry

### Archivos a Modificar:

**Backend:**
- `src/modules/auth/infrastructure/api/auth_routes.py` (login, register, verify)
- `src/shared/infrastructure/middleware/auth_middleware.py`
- `src/shared/infrastructure/security/jwt_handler.py`
- Tests de autenticación

**Frontend:**
- `src/infrastructure/auth/ApiAuthRepository.js`
- `src/infrastructure/user/ApiUserRepository.js`
- `src/infrastructure/competition/ApiCompetitionRepository.js`
- `src/infrastructure/enrollment/ApiEnrollmentRepository.js`
- `src/pages/Login.jsx` (no guardar token)
- `src/pages/Register.jsx` (no guardar token)
- `src/utils/secureAuth.js` (ELIMINAR)

## Validación

Criterios de éxito:

- [x] Token no accesible desde JavaScript (DevTools → Application → Cookies)
- [x] Login funcional sin sessionStorage
- [x] Requests API incluyen cookies automáticamente
- [x] Hook useAuth() reemplaza lógica de sessionStorage
- [x] Todos los repositorios usan `credentials: 'include'`
- [x] Tests de autenticación actualizados
- [x] No errores CORS en desarrollo

### Estado de Implementación:

**✅ Completado (21 de diciembre de 2025):**
- Creado hook `src/hooks/useAuth.js` que llama `/api/v1/auth/current-user`
- Actualizado `src/services/api.js` con `credentials: 'include'`
- Migrados todos los repositorios (Auth, User, Competition, Enrollment, Handicap)
- Actualizados casos de uso (Login, Competition lifecycle)
- Eliminadas referencias a `secureAuth.js` en código de producción
- Actualizado `src/App.jsx` para usar `useAuth()`
- Actualizado `src/components/layout/HeaderAuth.jsx`
- Login funcional con cookies httpOnly

### Testing Checklist:

```javascript
// ❌ Esto debe FALLAR (token inaccesible)
console.log(sessionStorage.getItem('auth_token')); // null

// ✅ Esto debe FUNCIONAR (cookie automática)
fetch('http://localhost:8000/api/v1/auth/current-user', {
    credentials: 'include'
}).then(res => res.json());
```

## Referencias

- [OWASP: JWT Storage Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [MDN: Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [FastAPI Cookies](https://fastapi.tiangolo.com/advanced/response-cookies/)
- [SameSite Cookies Explained](https://web.dev/samesite-cookies-explained/)
- ADR-003: sessionStorage Authentication (superseded)
- Backend ROADMAP: Sección "httpOnly Cookies"

## Notas de Implementación

### Configuración CORS (Backend):

```python
# main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://rydercup.com"],
    allow_credentials=True,  # ✅ REQUERIDO para cookies
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Desarrollo Local (HTTP):

- `secure=False` en desarrollo (localhost HTTP)
- `secure=True` en producción (HTTPS)
- Usar variable de entorno: `COOKIE_SECURE=os.getenv("ENV") == "production"`

### Logout Implementation:

```python
@app.post("/api/v1/auth/logout")
async def logout(response: Response):
    response.delete_cookie(
        key="access_token",
        path="/",
        domain=None
    )
    return {"message": "Logged out successfully"}
```

### Frontend Logout:

```javascript
// src/pages/Dashboard.jsx
const handleLogout = async () => {
    await fetch(`${API_URL}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include'
    });

    // Limpiar localStorage (user data)
    localStorage.removeItem('user');
    navigate('/');
};
```

## Relacionado

- ADR-003: sessionStorage Authentication (superseded por este ADR)
- ADR-005: Sentry Error Tracking (monitoreo post-migración)
- SECURITY_MIGRATION.md: Guía detallada de migración
- ROADMAP.md: v1.8.0 Security Release
