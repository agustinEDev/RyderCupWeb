# CLAUDE.md

Este archivo proporciona contexto a Claude Code (claude.ai/code) para trabajar en este repositorio.

---

## 🎯 Contexto del Proyecto

**Ryder Cup Amateur Manager - Frontend Web** - Aplicación web React para gestión de torneos de golf amateur formato Ryder Cup.

### 🏗️ Arquitectura del Sistema

Este repositorio contiene **SOLO el Frontend Web**. La aplicación completa está dividida en repositorios separados:

- **Frontend Web (este repo)**: Aplicación React SPA
  - Repository: `RyderCupWeb`
  - Stack: React 18, Vite 5, Tailwind CSS 3
  - Comunicación: Consume API REST del backend

- **Backend API** (repositorio separado): API REST con Clean Architecture
  - Repository: `RyderCupAm`
  - Stack: Python, FastAPI, PostgreSQL
  - Comunicación: Expone API REST (JSON)

**Razón de separación**: Deploy independiente, ciclos de vida separados, escalabilidad futura.

### Stack Tecnológico
- **Framework**: React 18.2.0
- **Build Tool**: Vite 5.0.8
- **Styling**: Tailwind CSS 3.3.6
- **Routing**: React Router DOM 6.21.1
- **HTTP Client**: Fetch API (built-in)
- **State Management**: React Hooks (useState, useEffect)

### Estado de Implementación

**Fase 1: Foundation** ✅ COMPLETADO
- **Páginas Públicas**:
  - Landing Page (Hero, Features, Footer)
  - Register (Formulario con validación)
  - Login (JWT authentication)

- **Páginas Protegidas** (requieren autenticación):
  - Dashboard (Welcome, Quick Actions)
  - Profile (User info, handicap details)
  - Edit Profile (Update handicap, email/password pendiente backend)
  - My Competitions (Coming Soon)
  - Create Competition (Coming Soon)

- **Componentes Reutilizables**:
  - Header (navegación pública)
  - HeaderAuth (navegación autenticada con dropdown click-based)
  - Footer
  - ProfileCard

**Fase 2: Competition Management** 🚧 PRÓXIMAMENTE
- Competition creation wizard
- Team management
- Live scoring
- Match tracking

### Páginas Activas (8 páginas)
```
Públicas:
/                     # Landing page
/login                # Login con JWT
/register             # Registro de usuario

Protegidas:
/dashboard            # Dashboard principal
/profile              # Ver perfil
/profile/edit         # Editar perfil + handicap
/competitions         # Mis competiciones (Coming Soon)
/competitions/create  # Crear competición (Coming Soon)
```

### API Integration

**Base URL**: `http://localhost:8000` (configurable en `.env`)

**Endpoints Consumidos**:
```
POST   /api/v1/auth/register           # Registro de usuario
POST   /api/v1/auth/login              # Login (recibe JWT)
POST   /api/v1/auth/logout             # Logout (en desarrollo)
POST   /api/v1/handicaps/update        # Actualizar desde RFEG
POST   /api/v1/handicaps/update-manual # Actualizar manualmente
```

**Autenticación**:
- JWT almacenado en `localStorage` como `access_token`
- User data almacenado en `localStorage` como `user` (JSON)
- Header: `Authorization: Bearer {token}`
- Validación en cada página protegida (redirect a `/login` si no hay token)

---

## 🚀 Deployment en Render (Producción)

### URLs de Producción

**Frontend**: https://www.rydercupfriends.com
**Backend API**: https://rydercup-api.onrender.com

**Repositorios**:
- Frontend: `github.com/agustinEDev/RyderCupWeb` (rama `develop`)
- Backend: `github.com/agustinEDev/RyderCupAm` (rama `develop`)

### Configuración de Render

**Frontend - Static Site**:
- **Service Name**: `rydercup-web`
- **Runtime**: Static Site
- **Branch**: `develop`
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Region**: Frankfurt (eu-central)
- **Plan**: Free
- **Auto-Deploy**: Activado (git push → deploy automático)

**Backend - Web Service**:
- **Service Name**: `rydercup-api`
- **Runtime**: Docker
- **Branch**: `develop`
- **Region**: Frankfurt (eu-central)
- **Plan**: Free
- **Auto-Deploy**: Activado

### Variables de Entorno en Render

**Frontend (Environment Variables)**:
```env
VITE_API_BASE_URL=https://rydercup-api.onrender.com
VITE_APP_NAME="Ryder Cup Manager"
VITE_APP_VERSION=1.0.0
```

**Backend (Environment Variables)**:
```env
# Frontend origin para CORS
FRONTEND_ORIGINS=https://www.rydercupfriends.com

# Base de Datos (Internal Database URL de Render PostgreSQL)
DATABASE_URL=postgresql+asyncpg://user:pass@host.frankfurt-postgres.render.com/db_name

# JWT Security
SECRET_KEY=<generated-key>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# API Docs Protection
DOCS_USERNAME=admin
DOCS_PASSWORD=<secure-password>

# App Config
PORT=8000
ENVIRONMENT=production
```

### CORS Configuration

El backend en `main.py:100-130` configura CORS dinámicamente:

1. **Producción** (ENVIRONMENT=production):
   - Lee orígenes desde variable `FRONTEND_ORIGINS`
   - Solo permite: `https://www.rydercupfriends.com`
   - No incluye localhost

2. **Desarrollo** (ENVIRONMENT=development):
   - Permite: `http://localhost:5173`, `http://127.0.0.1:5173`
   - Más permisivo para dev local

**Headers permitidos**:
- Credentials: `true`
- Methods: `GET, POST, PUT, PATCH, DELETE, OPTIONS`
- Headers: `*` (incluye Authorization)
- Max-Age: `3600` (1 hora)

### Proceso de Deploy

**Automático** (recomendado):
```bash
# Hacer cambios en código
git add .
git commit -m "feat: nueva funcionalidad"
git push origin develop

# Render detecta el push y redeploya automáticamente
# Frontend: ~2-3 minutos
# Backend: ~3-5 minutos (incluye migraciones DB)
```

**Manual** (desde Render Dashboard):
1. Ir al servicio (`rydercup-web` o `rydercup-api`)
2. Click en `Manual Deploy`
3. Seleccionar `Deploy latest commit`

### Verificar Deployment

**Frontend**:
```bash
# Verificar que la app carga
curl -I https://www.rydercupfriends.com

# Debería retornar: 200 OK
```

**Backend**:
```bash
# Health check
curl https://rydercup-api.onrender.com/

# Respuesta esperada:
{
  "message": "Ryder Cup Manager API",
  "version": "1.0.0",
  "status": "running",
  "docs": "Visita /docs para la documentacion interactiva",
  "description": "API para gestion de torneos tipo Ryder Cup entre amigos"
}
```

**API Docs** (protegida con HTTP Basic Auth):
- URL: https://rydercup-api.onrender.com/docs
- Username: (ver variable `DOCS_USERNAME`)
- Password: (ver variable `DOCS_PASSWORD`)

### Logs y Monitoreo

**Ver logs en tiempo real**:
1. Render Dashboard → Servicio → Pestaña `Logs`
2. Útil para debugging de errores de producción

**Métricas**:
- Dashboard → `Metrics` → CPU, Memoria, Requests

**Eventos**:
- Dashboard → `Events` → Historial de deploys

### Limitaciones del Plan Free

**Cold Starts**:
- Servicios se "duermen" tras 15 minutos de inactividad
- Primera petición después de sleep: **30-60 segundos**
- Peticiones siguientes: respuesta normal

**Storage**:
- PostgreSQL: 1GB, expira tras 90 días sin uso
- Static Site: Sin límite

**Build minutes**:
- 750 horas/mes de runtime
- Suficiente para desarrollo/testing

### Troubleshooting en Producción

**❌ CORS Error al hacer login/register**:

**Causa**: Backend no permite origen del frontend

**Solución**:
1. Verificar `FRONTEND_ORIGINS` en backend incluye: `https://www.rydercupfriends.com`
2. Verificar `ENVIRONMENT=production` en backend
3. Ver logs del backend: debería mostrar `🔒 CORS allowed_origins: ['https://www.rydercupfriends.com']`
4. Re-deploy backend si se cambió variable

**❌ 404 en rutas React Router (ej: /dashboard)**:

**Causa**: SPA necesita redirect de todas las rutas a `index.html`

**Solución**:
1. En Render Dashboard → Static Site → `Redirects/Rewrites`
2. Agregar regla:
   ```
   Source: /*
   Destination: /index.html
   Status: 200 (Rewrite)
   ```

**❌ API devuelve 500 Internal Server Error**:

**Causa**: Error en backend (DB connection, migrations, etc.)

**Solución**:
1. Ver logs del backend en Render
2. Verificar `DATABASE_URL` correcta (debe usar `postgresql+asyncpg://`)
3. Verificar que migraciones se ejecutaron: buscar `✅ Migraciones completadas` en logs
4. Si falla, ejecutar manualmente desde Shell del servicio:
   ```bash
   alembic upgrade head
   ```

**❌ Token JWT inválido en producción**:

**Causa**: `SECRET_KEY` cambió o no está configurada

**Solución**:
1. Verificar `SECRET_KEY` en variables de entorno del backend
2. Debe ser la misma que generó los tokens
3. Si se cambió: usuarios deben hacer login nuevamente

**❌ Cold start muy lento (>60s)**:

**Causa**: Plan Free duerme servicios

**Solución temporal**:
- Hacer peticiones periódicas cada 10-15 min (keep-alive)

**Solución permanente**:
- Upgrade a plan Starter ($7/mes) → sin sleep

### Dominio Personalizado

El frontend usa dominio custom: **www.rydercupfriends.com**

**Configuración en Render**:
1. Static Site → `Settings` → `Custom Domain`
2. Agregar: `www.rydercupfriends.com`
3. Render provee CNAME/ALIAS records
4. Configurar DNS en registrar de dominio:
   ```
   Type: CNAME
   Name: www
   Value: rydercup-web.onrender.com
   TTL: 3600
   ```
5. Esperar propagación DNS (5-60 minutos)
6. Render automáticamente provisiona certificado SSL (Let's Encrypt)

---

## 🏗️ Arquitectura Frontend

### Estructura de Directorios

```
src/
├── pages/                  # Páginas principales
│   ├── Landing.jsx         # Página de inicio
│   ├── Login.jsx           # Autenticación
│   ├── Register.jsx        # Registro
│   ├── Dashboard.jsx       # Dashboard principal
│   ├── Profile.jsx         # Ver perfil
│   ├── EditProfile.jsx     # Editar perfil
│   ├── Competitions.jsx    # Lista competiciones
│   └── CreateCompetition.jsx  # Crear competición
├── components/
│   ├── layout/
│   │   ├── Header.jsx      # Header público
│   │   ├── HeaderAuth.jsx  # Header autenticado (dropdown click-based)
│   │   └── Footer.jsx      # Footer reutilizable
│   └── profile/
│       └── ProfileCard.jsx # Tarjeta de perfil
├── App.jsx                 # Router principal
├── main.jsx                # Entry point
└── index.css               # Estilos globales + Tailwind

public/                     # Assets estáticos
.env                        # Variables de entorno
```

### Patrones y Convenciones

**1. Component Structure**:
```javascript
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const MyComponent = () => {
  const navigate = useNavigate();
  const [state, setState] = useState(initialValue);

  useEffect(() => {
    // Side effects (auth check, API calls)
  }, [dependencies]);

  return (/* JSX */);
};

export default MyComponent;
```

**2. Authentication Pattern** (en todas las páginas protegidas):
```javascript
useEffect(() => {
  const token = localStorage.getItem('access_token');
  const userData = localStorage.getItem('user');

  if (!token || !userData) {
    navigate('/login');
    return;
  }

  try {
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
  } catch (error) {
    console.error('Error parsing user data:', error);
    navigate('/login');
  } finally {
    setIsLoading(false);
  }
}, [navigate]);
```

**3. API Call Pattern**:
```javascript
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

try {
  const token = localStorage.getItem('access_token');
  const response = await fetch(`${API_URL}/api/v1/endpoint`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Request failed');
  }

  const result = await response.json();
  // Handle success
} catch (error) {
  console.error('Error:', error);
  // Handle error
}
```

**4. Logout Pattern**:
```javascript
const handleLogout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
  navigate('/');
};
```

---

## 💻 Comandos de Desarrollo

### Instalación y Setup
```bash
# Instalar dependencias
npm install

# Copiar .env de ejemplo
cp .env.example .env

# Editar .env con configuración local (desarrollo)
VITE_API_BASE_URL=http://localhost:8000
```

### Desarrollo Local
```bash
# Iniciar dev server (hot reload en http://localhost:5173)
npm run dev

# Build para producción (simula build de Render)
npm run build

# Preview del build local
npm run preview

# Lint (ESLint)
npm run lint
```

### Deployment a Producción

**Automático** (recomendado):
```bash
# 1. Probar cambios localmente
npm run dev  # verificar funcionamiento

# 2. Build local (opcional, para verificar)
npm run build

# 3. Commit y push a develop → auto-deploy
git add .
git commit -m "feat: descripción del cambio"
git push origin develop

# Render detecta el push y redeploya automáticamente
# Ver progreso en: https://dashboard.render.com
# Deploy tarda: ~2-3 minutos
```

**Verificar deployment**:
```bash
# Verificar que el sitio cargó correctamente
curl -I https://www.rydercupfriends.com
# Esperado: HTTP/2 200

# Verificar API health
curl https://rydercup-api.onrender.com/
# Esperado: {"message": "Ryder Cup Manager API", ...}
```

**Rollback** (si algo sale mal):
```bash
# Opción 1: Revertir commit localmente y push
git revert HEAD
git push origin develop

# Opción 2: Desde Render Dashboard
# → Service → Events → "Redeploy" de commit anterior
```

### Testing (Futuro)
```bash
# Tests unitarios (cuando se implementen)
npm run test

# Tests con coverage
npm run test:coverage

# Tests antes de deployment
npm run test && npm run build
```

---

## 🎨 Estilos y Diseño

### Tailwind Configuration

**Colores Principales** (`tailwind.config.js`):
```javascript
colors: {
  primary: '#2d7b3e',      // Verde golf (Stitch design)
  secondary: '#1E3A5F',    // Azul oscuro
  accent: '#D4AF37',       // Dorado
  gray: {
    50: '#f8f9fa',
    100: '#f1f3f2',
    200: '#dee3df',
    500: '#6b806f',
    600: '#131613',
    900: '#131613',
  },
}
```

**Fonts**:
- Primary: Inter (Google Fonts)
- Headings: Poppins (Google Fonts)

**Custom Classes** (`index.css`):
```css
.btn-primary { /* Botón principal */ }
.card { /* Tarjeta contenedor */ }
.input-field { /* Input de formulario */ }
```

### Design System

**Spacing**: Tailwind default (4px base)
**Breakpoints**:
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px

**Components Pattern**:
- Responsive: Mobile-first approach
- Layout: px-4 md:px-40 (padding adaptativo)
- Max-width: max-w-[960px] (contenido centrado)

---

## 🔧 Workflow: Agregar Nueva Página

### 1. Crear Componente de Página
```bash
# Crear archivo en src/pages/
touch src/pages/NewPage.jsx
```

```javascript
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderAuth from '../components/layout/HeaderAuth';

const NewPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      navigate('/login');
      return;
    }
    try {
      setUser(JSON.parse(userData));
    } catch (error) {
      navigate('/login');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  if (isLoading) return <div>Loading...</div>;
  if (!user) return null;

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-white">
      <div className="layout-container flex h-full grow flex-col">
        <HeaderAuth user={user} />
        <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            {/* Content here */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewPage;
```

### 2. Agregar Ruta en App.jsx
```javascript
import NewPage from './pages/NewPage';

// En el Routes:
<Route path="/new-page" element={<NewPage />} />
```

### 3. Agregar Navegación (si aplica)
En `HeaderAuth.jsx`:
```javascript
<Link to="/new-page" className="text-gray-900 text-sm font-medium leading-normal hover:text-primary transition-colors">
  New Page
</Link>
```

---

## 🐛 Troubleshooting Común

### Desarrollo Local

**CORS errors**:
- Verificar que backend tenga CORS configurado para `http://localhost:5173`
- Verificar que `VITE_API_BASE_URL` en `.env` sea correcto (`http://localhost:8000`)
- Verificar que backend esté corriendo en puerto 8000
- Verificar `ENVIRONMENT=development` en backend (permite localhost)

**Token inválido**:
- Verificar que JWT no haya expirado (60 minutos por defecto)
- Limpiar localStorage: `localStorage.clear()` en DevTools
- Hacer login nuevamente

**Página blanca después de build**:
- Verificar rutas en `vite.config.js`
- Verificar imports de componentes (case-sensitive)

**Estilos no aplican**:
- Verificar que clases Tailwind estén en el contenido escaneado por `tailwind.config.js`
- Reiniciar dev server después de cambios en tailwind.config.js

**Dropdown desaparece antes de hacer click**:
- Ya corregido: HeaderAuth usa click-based toggle en lugar de hover
- Dropdown permanece abierto hasta click outside o selección

### Producción (Render)

**Ver sección completa**: [🚀 Deployment en Render (Producción)](#-deployment-en-render-producción) → Troubleshooting en Producción

**Problemas comunes**:
- **CORS errors**: Verificar `FRONTEND_ORIGINS` en backend y `ENVIRONMENT=production`
- **404 en rutas**: Configurar Redirects/Rewrites en Render (`/* → /index.html`)
- **Cold starts lentos**: Plan Free duerme tras 15min (primera petición: 30-60s)
- **API 500 errors**: Revisar logs del backend, verificar DATABASE_URL y migraciones
- **Token JWT inválido**: Verificar SECRET_KEY no haya cambiado en backend

---

## 📋 Convenciones Importantes

### Naming
- **Componentes**: PascalCase (`UserProfile.jsx`, `HeaderAuth.jsx`)
- **Páginas**: PascalCase (`Dashboard.jsx`, `EditProfile.jsx`)
- **Variables/Functions**: camelCase (`handleLogin`, `isLoading`)
- **CSS Classes**: kebab-case (`btn-primary`, `input-field`)

### File Organization
- **Páginas completas**: `src/pages/`
- **Componentes reutilizables**: `src/components/`
- **Layouts**: `src/components/layout/`
- **Feature components**: `src/components/{feature}/`

### Component Best Practices
- Un componente por archivo
- Export default al final
- Props destructuring
- PropTypes o TypeScript (futuro)
- Hooks en orden: useState → useEffect → custom hooks

### State Management
- Local state: `useState` para estado de componente
- Shared state: Props drilling o Context API (cuando sea necesario)
- Server state: Fetch en useEffect + localStorage

---

## 📚 Referencias Rápidas

**Documentación**:
- [React 18 Docs](https://react.dev/)
- [Vite Docs](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Router](https://reactrouter.com/)
- [Render Docs](https://render.com/docs)

**Backend API**:
- **Desarrollo**: `http://localhost:8000/docs`
- **Producción**: `https://rydercup-api.onrender.com/docs` (requiere HTTP Basic Auth)
- **Repository**: `RyderCupAm` (repositorio separado)
- **Health Check**: GET `/` (público)

**URLs del Proyecto**:
- **Frontend Dev**: http://localhost:5173
- **Frontend Prod**: https://www.rydercupfriends.com
- **Backend Dev**: http://localhost:8000
- **Backend Prod**: https://rydercup-api.onrender.com
- **GitHub Frontend**: https://github.com/agustinEDev/RyderCupWeb
- **GitHub Backend**: https://github.com/agustinEDev/RyderCupAm
- **Render Dashboard**: https://dashboard.render.com

**Design**:
- Stitch AI-generated designs (originales en HTML)
- Color palette: Verde golf (#2d7b3e) como primario

---

## 🎓 Notas para Claude Code

**Al empezar una sesión**:
1. Frontend consume API REST del backend (`RyderCupAm`)
2. Auth via JWT en localStorage
3. CORS configurado en backend para localhost:5173 (dev) y www.rydercupfriends.com (prod)
4. Fase 1 completa (8 páginas), Fase 2 en desarrollo
5. Tailwind CSS para todos los estilos (no CSS custom)
6. **Deployment**: Frontend y backend en Render (Frankfurt), rama `develop`, auto-deploy activado

**Cuando agregues features**:
1. Seguir estructura de páginas existente
2. Siempre incluir auth check en páginas protegidas
3. Usar componentes de layout (HeaderAuth, Footer)
4. Mantener consistency con design system (colores, spacing)
5. Responsive mobile-first
6. Probar localmente antes de push (auto-deploy a producción)

**Testing** (cuando se implemente):
1. Jest + React Testing Library
2. Tests unitarios para componentes
3. Tests de integración para flujos completos

**No hacer**:
- ❌ CSS inline (usar Tailwind classes)
- ❌ Hardcodear URLs de API (usar .env y variables de entorno)
- ❌ Ignorar auth checks en páginas protegidas
- ❌ Commits sin probar en dev server (se despliega automáticamente a producción)
- ❌ Modificar backend desde este repo (separación de responsabilidades)
- ❌ Push a `develop` sin testing local (auto-deploy directo a prod)

**Estado actual**:
- MVP funcional con autenticación completa
- Gestión de handicaps (manual + RFEG)
- Navegación fluida entre páginas
- Dropdown estable con click-based toggle
- Páginas de competiciones en "Coming Soon"
- UserResponseDTO incluye handicap_updated_at
- **Producción**: Desplegado en www.rydercupfriends.com
- **Backend API**: Desplegado en rydercup-api.onrender.com

**Entornos**:

| Entorno | Frontend | Backend | Branch | CORS |
|---------|----------|---------|--------|------|
| **Desarrollo** | http://localhost:5173 | http://localhost:8000 | local | localhost:5173 |
| **Producción** | https://www.rydercupfriends.com | https://rydercup-api.onrender.com | develop | www.rydercupfriends.com |

**Variables de entorno críticas**:
- **Frontend**: `VITE_API_BASE_URL` (apunta al backend correcto según entorno)
- **Backend**: `FRONTEND_ORIGINS` (permite peticiones desde frontend correcto)
- **Backend**: `ENVIRONMENT` (controla comportamiento de CORS y otros settings)
