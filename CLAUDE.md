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

# Copiar .env de ejemplo (si existe)
cp .env.example .env

# Editar .env con configuración local
VITE_API_BASE_URL=http://localhost:8000
```

### Desarrollo
```bash
# Iniciar dev server (hot reload en http://localhost:5173)
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Lint (ESLint)
npm run lint
```

### Testing (Futuro)
```bash
# Tests unitarios (cuando se implementen)
npm run test

# Tests con coverage
npm run test:coverage
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

**CORS errors**:
- Verificar que backend tenga CORS configurado para `http://localhost:5173`
- Verificar que `VITE_API_BASE_URL` en `.env` sea correcto

**Token inválido**:
- Verificar que JWT no haya expirado (24h por defecto)
- Limpiar localStorage: `localStorage.clear()` en DevTools

**Página blanca después de build**:
- Verificar rutas en `vite.config.js`
- Verificar imports de componentes (case-sensitive)

**Estilos no aplican**:
- Verificar que clases Tailwind estén en el contenido escaneado por `tailwind.config.js`
- Reiniciar dev server después de cambios en tailwind.config.js

**Dropdown desaparece antes de hacer click**:
- Ya corregido: HeaderAuth usa click-based toggle en lugar de hover
- Dropdown permanece abierto hasta click outside o selección

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

**Backend API**:
- Documentación: `http://localhost:8000/docs`
- Repository: `RyderCupAm`

**Design**:
- Stitch AI-generated designs (originales en HTML)
- Color palette: Verde golf (#2d7b3e) como primario

---

## 🎓 Notas para Claude Code

**Al empezar una sesión**:
1. Frontend consume API REST del backend (`RyderCupAm`)
2. Auth via JWT en localStorage
3. CORS configurado en backend para localhost:5173
4. Fase 1 completa (8 páginas), Fase 2 en desarrollo
5. Tailwind CSS para todos los estilos (no CSS custom)

**Cuando agregues features**:
1. Seguir estructura de páginas existente
2. Siempre incluir auth check en páginas protegidas
3. Usar componentes de layout (HeaderAuth, Footer)
4. Mantener consistency con design system (colores, spacing)
5. Responsive mobile-first

**Testing** (cuando se implemente):
1. Jest + React Testing Library
2. Tests unitarios para componentes
3. Tests de integración para flujos completos

**No hacer**:
- ❌ CSS inline (usar Tailwind classes)
- ❌ Hardcodear URLs de API (usar .env)
- ❌ Ignorar auth checks en páginas protegidas
- ❌ Commits sin probar en dev server
- ❌ Modificar backend desde este repo (separación de responsabilidades)

**Estado actual**:
- MVP funcional con autenticación completa
- Gestión de handicaps (manual + RFEG)
- Navegación fluida entre páginas
- Dropdown estable con click-based toggle
- Páginas de competiciones en "Coming Soon"
- UserResponseDTO incluye handicap_updated_at
