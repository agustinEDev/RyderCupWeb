# GUÍA RÁPIDA DE SEGURIDAD - RyderCupWeb

## Distribución de Vulnerabilidades

```
CRÍTICA (3)     ███████████ 18%
ALTA (5)        ███████████████████ 31%
MEDIA (5)       ███████████████████ 31%
BAJA (3)        ██████████ 20%
```

**Total: 16 vulnerabilidades identificadas**

---

## Top 3 Prioridades AHORA MISMO

### 1. 🔴 ALMACENAMIENTO INSEGURO DE TOKENS
**Archivo:** `/src/utils/secureAuth.js:30`, `/src/utils/auth.js:59`  
**Riesgo:** Account Takeover via XSS  
**Acción:** Cambiar a httpOnly cookies (requiere backend)

```javascript
// MALO (actual):
sessionStorage.setItem(TOKEN_KEY, token);

// BUENO:
// Dejar que backend maneje cookies
// Frontend: usar credentials: 'include'
```

---

### 2. 🔴 FALTA DE CSRF PROTECTION
**Archivo:** `/src/pages/Login.jsx:71-80`, `/src/pages/Register.jsx:71-82`  
**Riesgo:** Acciones no autorizadas desde otros sitios  
**Acción:** Agregar CSRF token en todos los POSTs

```javascript
// AGREGAR en todos los requests POST/PUT/PATCH:
headers: {
  'X-CSRF-Token': csrfToken  // ← AGREGAR ESTO
}
```

---

### 3. 🔴 VULNERABILIDADES EN NPM
**Comando:** `npm audit`  
**Vulnerabilidades:** esbuild, js-yaml  
**Acción Inmediata:**
```bash
npm audit fix --force
npm audit fix
```

---

## Top 5 Vulnerabilidades por Impacto

| Rank | Vuln | Impacto | Esfuerzo | Plazo |
|---|---|---|---|---|
| 1 | Token Storage | Account Takeover | 6h | Crítico |
| 2 | CSRF | Password/Email Change | 4h | Crítico |
| 3 | npm deps | Server Compromise | 2h | Hoy |
| 4 | XSS Validation | Account Access | 3h | Semana |
| 5 | Rate Limiting | Brute Force | 2h | Semana |

---

## Checklist de Acción (Esta Semana)

```
LUNES:
[ ] npm audit fix --force
[ ] npm audit fix
[ ] Verificar que no hay vulnerabilidades

MARTES-MIÉRCOLES:
[ ] Coordinar con backend para httpOnly cookies
[ ] Actualizar Login para credentials: 'include'
[ ] Actualizar authenticatedFetch()

JUEVES-VIERNES:
[ ] Agregar CSRF token generation en backend
[ ] Incluir X-CSRF-Token en headers frontend
[ ] Testing básico de CSRF

PRÓXIMA SEMANA:
[ ] Implementar CSP meta tag
[ ] Mejorar validación de entrada
[ ] Agregar rate limiting a todos los forms
```

---

## Archivos Clave a REVISAR

### CRÍTICOS
- `/src/utils/secureAuth.js` - Manejo de tokens
- `/src/pages/Login.jsx` - Autenticación
- `/src/pages/Register.jsx` - Registro
- `package.json` - Dependencias

### IMPORTANTES
- `/src/utils/validation.js` - Validación de entrada
- `/src/pages/EditProfile.jsx` - Cambio de datos
- `/src/pages/VerifyEmail.jsx` - Verificación
- `/index.html` - Headers de seguridad
- `/vite.config.js` - Configuración

---

## Comandos Útiles

```bash
# Auditar dependencias
npm audit

# Ver vulnerabilidades detalladas
npm audit --json

# Intentar arreglar automáticamente
npm audit fix

# Arreglar incluyendo cambios breaking
npm audit fix --force

# Actualizar todas las dependencias
npm update

# Ver qué paquetes están desactualizados
npm outdated
```

---

## Testing de Seguridad Manual

### Test 1: XSS en Inputs
```
Campo: Email en Login
Probar: <script>alert('XSS')</script>
Esperado: Se muestra como texto, NO se ejecuta
```

### Test 2: CSRF
```
Desde DevTools console en otro sitio:
fetch('https://yoursite.com/api/v1/auth/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({email: 'hack@test.com', password: 'x'})
})
Esperado: Error de CSRF / 403 Forbidden
```

### Test 3: Rate Limiting
```
Click en Login 10 veces rápido
Esperado: Se bloquea después de 5 intentos
```

### Test 4: Token Expiration
```
Esperar 1 hora (o cambiar sistema time)
Probar hacer request autenticado
Esperado: Redirige a login
```

---

## Recursos Rápidos

**OWASP Top 10:**
https://owasp.org/www-project-top-ten/

**MD Seguridad Web:**
https://developer.mozilla.org/en-US/docs/Web/Security

**CSP Guía:**
https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP

**JWT Seguridad:**
https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html

---

## Preguntas Frecuentes

**P: ¿Es crítico para lanzar a producción?**
R: SÍ. No debe ir a producción sin:
- Tokens en httpOnly cookies
- CSRF protection
- npm audit limpio

**P: ¿Cuánto tiempo toma arreglarlo?**
R: Críticas = 1-2 semanas (requiere backend)
   Altas = 1-2 semanas adicionales

**P: ¿Qué es lo más urgente?**
R: 1. npm audit fix (hoy)
   2. Token storage (esta semana)
   3. CSRF (esta semana)

**P: ¿Qué requiere cambios en backend?**
R: - httpOnly cookies en login
   - CSRF token generation
   - Rate limiting en API
   - Validación de respuestas

---

## Links a Documentación Completa

- **Reporte Detallado:** `/SECURITY_AUDIT_REPORT.md`
- **Resumen Ejecutivo:** `/SECURITY_SUMMARY.md`
- **Migración a httpOnly:** `/SECURITY_MIGRATION.md`

---

**PUNTUACIÓN ACTUAL:** 4/10  
**PUNTUACIÓN OBJETIVO:** 8.5/10

---

*Reporte generado: 2025-11-16*
*Branch: claude/security-review-01TPWq9bU8HUbkNLHDVP6TFP*
