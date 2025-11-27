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

### 📈 Métricas Clave

- **419 tests pasando** (100% pass rate)
- **Bundle inicial:** 47 KB (reducido de 978 KB)
- **Páginas:** 11 rutas (5 públicas, 6 protegidas)
- **Cobertura de tests:** Domain 100%, Application 90%, Utils 100%

---

## 🔐 SEGURIDAD - Mejoras Prioritarias

### 🔴 Prioridad CRÍTICA

#### 1. Migrar a httpOnly Cookies (Tokens)
**Problema Actual:**
```javascript
// ❌ VULNERABLE: Tokens en sessionStorage
sessionStorage.setItem(TOKEN_KEY, token);
```

**Solución:**
- Backend debe enviar tokens en `Set-Cookie` header
- Cookies con flags: `httponly`, `secure`, `samesite=lax`
- Frontend eliminar manejo de tokens (automático via cookies)

**Archivos a Modificar:**
- `src/utils/secureAuth.js` - Eliminar setAuthToken/getAuthToken
- `src/infrastructure/auth/ApiAuthRepository.js` - Cambiar a `credentials: 'include'`
- `src/infrastructure/user/ApiUserRepository.js` - Cambiar a `credentials: 'include'`

**Backend Requerido:**
```python
# FastAPI - Set httpOnly cookie
response.set_cookie(
    key="access_token",
    value=token,
    httponly=True,  # ✅ No accesible desde JavaScript
    secure=True,    # ✅ Solo HTTPS
    samesite="lax", # ✅ Protección CSRF básica
    max_age=3600
)
```

**Impacto:** Elimina riesgo XSS para robo de tokens

---

#### 2. Implementar CSRF Tokens
**Problema Actual:**
- No hay validación CSRF en endpoints críticos
- Solo CORS como protección parcial

**Solución:**
```python
# Backend - Generar token CSRF
from fastapi_csrf_protect import CsrfProtect

@app.post("/api/v1/competitions/")
async def create_competition(
    csrf_protect: CsrfProtect = Depends()
):
    csrf_protect.validate_csrf(request)
    # ...
```

```javascript
// Frontend - Incluir token en requests
fetch(url, {
    headers: {
        'X-CSRF-Token': getCsrfToken()  // Desde cookie o meta tag
    }
})
```

**Archivos a Crear/Modificar:**
- `src/utils/csrf.js` - Helper para obtener CSRF token
- Todos los repositories - Agregar header CSRF

**Impacto:** Protección contra ataques CSRF

---

### 🟡 Prioridad ALTA

#### 3. Mejorar Content Security Policy
**Problema Actual:**
```html
<!-- ⚠️ 'unsafe-inline' reduce protección XSS -->
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
```

**Solución:**
```html
<!-- ✅ Usar nonces en lugar de 'unsafe-inline' -->
<meta http-equiv="Content-Security-Policy"
      content="script-src 'self' 'nonce-{random}'; style-src 'self' 'nonce-{random}';" />
```

**Archivos a Modificar:**
- `index.html` - Actualizar CSP
- Backend - Generar nonces dinámicos

**Impacto:** Mejor protección contra XSS

---

#### 4. Rate Limiting en Backend
**Problema Actual:**
- Rate limiting solo en frontend (fácil de bypassear)
- Sin protección en backend

**Solución Backend:**
```python
from slowapi import Limiter

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/v1/auth/login")
@limiter.limit("5/minute")  # 5 intentos por minuto
async def login(...):
    # ...
```

**Endpoints Críticos a Proteger:**
- `/api/v1/auth/login` - 5/minute
- `/api/v1/auth/register` - 3/hour
- `/api/v1/competitions/` POST - 10/hour
- `/api/v1/enrollments/` POST - 20/hour

**Impacto:** Prevención de brute force y DoS

---

### 🟢 Prioridad MEDIA

#### 5. Configurar HSTS en Render
**Acción:**
- Configurar header `Strict-Transport-Security` en Render
- Valor recomendado: `max-age=31536000; includeSubDomains`

**Impacto:** Forzar HTTPS en todas las conexiones

---

#### 6. Implementar Sentry en Backend
**Acción:**
- Instalar `sentry-sdk[fastapi]`
- Configurar integraciones (FastAPI, SQLAlchemy)
- Capturar errores de RFEG, DB, API

**Impacto:** Monitoreo de ataques y errores server-side

---

#### 7. Input Sanitization Adicional
**Acción:**
- Validar longitudes máximas en frontend
- Agregar DOMPurify si se introduce rich text
- Validar formatos (email, URLs, etc.)

**Impacto:** Defensa en profundidad contra XSS

---

## 🛠️ Desarrollo - Tareas Pendientes

### Módulo de Enrollments

#### Integrar Use Cases en UI (2-3 horas)
**Estado:** ⏳ Pendiente
**Archivos a Modificar:**
- `src/pages/CompetitionDetail.jsx` - Reemplazar llamadas a servicios
- `src/pages/BrowseCompetitions.jsx` - Usar `requestEnrollmentUseCase`

**Use Cases Disponibles:**
- `RequestEnrollmentUseCase`
- `ApproveEnrollmentUseCase`
- `RejectEnrollmentUseCase`
- `CancelEnrollmentUseCase`
- `WithdrawEnrollmentUseCase`
- `SetCustomHandicapUseCase`

---

### Módulo de Perfil

#### Sistema de Foto de Perfil (Bloqueado)
**Estado:** 🔒 Bloqueado por backend
**Requiere:**
- Campo `avatar_url` en modelo User (backend)
- Endpoint `PUT /api/v1/users/avatar` (multipart/form-data)
- Almacenamiento (S3, Cloudinary, o local)

**Frontend Listo para:**
- Galería de avatares predefinidos
- Upload de archivos
- Preview y crop

---

### Cross-Cutting Concerns

#### Gestión de Errores Centralizada
**Estado:** ⏳ Pendiente
**Objetivo:** Estandarizar manejo de errores

**Pasos:**
1. Crear clases de error custom en `src/domain/errors/`
2. Wrapper global en `src/utils/errorHandler.js`
3. Traducción a mensajes user-friendly

---

## 🧪 Testing

### Estado Actual
- ✅ **419 tests pasando** (100% success rate)
- ✅ Domain Layer: 100% cobertura
- ✅ Application Layer: 90% cobertura
- ⏳ Enrollment Use Cases: 0% (no prioritario)

### Próximos Tests
- Tests E2E con Playwright (no iniciado)
- Tests de integración de Enrollments UI
- Tests de seguridad (CSRF, XSS)

---

## 📦 Optimización

### Completado
- ✅ Code splitting (manual chunks)
- ✅ Lazy loading de rutas
- ✅ Bundle reducido 95% (978 KB → 47 KB)
- ✅ Suspense con loading fallback

### Futuras Optimizaciones
- Preload de rutas críticas
- Service Worker para offline
- Image optimization (AVIF/WebP)

---

## 🚀 Roadmap de Versiones

### v1.8.0 (Próxima - Seguridad)
- 🔐 Migración a httpOnly cookies
- 🔐 CSRF tokens
- 🔐 Rate limiting backend
- 🔐 CSP mejorado

### v1.9.0 (Funcionalidad)
- 👤 Sistema de avatares
- 📝 Gestión de errores centralizada
- 🎨 UI de enrollments refactorizada

### v2.0.0 (Mayor - Futuro)
- 🔐 Autenticación de dos factores (2FA)
- 📱 Progressive Web App (PWA)
- 🌍 Internacionalización (i18n)
- 🎮 Sistema de equipos y torneos

---

## 📝 Notas de Migración

### Para Desarrolladores

**Antes de empezar cualquier tarea:**
1. Leer auditoría de seguridad completa
2. Revisar tests existentes
3. Seguir patrones establecidos (Use Cases + Repositories)

**Al implementar seguridad:**
1. Backend primero (httpOnly cookies, CSRF)
2. Frontend después (adaptar a nuevas APIs)
3. Testing exhaustivo (intentar bypassear protecciones)

**Al agregar features:**
1. Domain Layer → Application Layer → Infrastructure → Presentation
2. Tests unitarios primero
3. Integración en Composition Root

---

## 🔗 Referencias

- [CLAUDE.md](./CLAUDE.md) - Contexto del proyecto para Claude AI
- [SECURITY_MIGRATION.md](./SECURITY_MIGRATION.md) - Guía de migración a httpOnly cookies
- [SENTRY_IMPLEMENTATION_SUMMARY.md](./docs/SENTRY_IMPLEMENTATION_SUMMARY.md) - Documentación Sentry
- [RENDER_SETUP.md](./docs/RENDER_SETUP.md) - Configuración de producción

---

**Última revisión:** 27 Nov 2025
**Próxima revisión:** Después de v1.8.0 (Security Release)
