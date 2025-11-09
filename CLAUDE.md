# CLAUDE.md

Este archivo proporciona contexto a Claude Code (claude.ai/code) para trabajar en este repositorio.

---

## 🎯 Contexto del Proyecto

**Ryder Cup Amateur Manager - Frontend Web** - Aplicación web React para gestión de torneos de golf amateur formato Ryder Cup.

### 🏗️ Arquitectura del Sistema

Este repositorio contiene **SOLO el Frontend Web**. La aplicación completa está dividida en repositorios separados:

- **Frontend Web (este repo)**: Aplicación web React
  - Repository: `RyderCupWeb`
  - Stack: React, Vite, Tailwind CSS, Axios
  - Comunicación: Consume API REST del backend

- **Backend API** (repositorio separado): API REST con Clean Architecture
  - Repository: `RyderCupAm`
  - Stack: Python, FastAPI, PostgreSQL
  - Comunicación: API REST (JSON)
  - URL: `http://localhost:8000`

**Razón de separación**: Deploy independiente, ciclos de vida separados, frontend puede cambiar sin afectar backend.

---

## 🛠️ Stack Tecnológico Frontend

- **Framework**: React 18+ con Vite
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **State Management**: Context API
- **Forms**: React Hook Form (opcional)
- **Icons**: Heroicons / Lucide React

---

## 📁 Estructura de Proyecto

```
src/
├── assets/              # Imágenes, iconos, recursos
├── components/          # Componentes reutilizables
│   ├── common/         # Button, Card, Input, Modal
│   ├── auth/           # LoginForm, RegisterForm
│   ├── profile/        # ProfileCard, ProfileDetails
│   └── layout/         # Header, Footer, Navbar
├── pages/              # Páginas/Rutas
│   ├── Landing.jsx     # Página pública inicial
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── Dashboard.jsx   # Página principal autenticada
│   ├── Profile.jsx
│   └── Competitions.jsx
├── services/           # API calls
│   ├── api.js         # Axios config + interceptors
│   ├── authService.js # Login, Register, Logout
│   └── userService.js # User operations
├── hooks/              # Custom hooks
│   ├── useAuth.js     # Autenticación
│   └── useUser.js     # Usuario actual
├── context/            # Estado global
│   └── AuthContext.jsx
├── utils/              # Utilidades
│   ├── validators.js  # Validaciones
│   └── constants.js   # Constantes
├── App.jsx             # Rutas principales
└── main.jsx            # Entry point
```

---

## 🌐 Integración con Backend

### Base URL
```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
```

### Endpoints Disponibles

**Authentication**:
- `POST /api/v1/auth/register` - Crear cuenta
- `POST /api/v1/auth/login` - Iniciar sesión (devuelve JWT)
- `POST /api/v1/auth/logout` - Cerrar sesión

**Users**:
- `GET /api/v1/users/search?email={email}` - Buscar por email
- `GET /api/v1/users/search?full_name={name}` - Buscar por nombre

**Handicaps**:
- `POST /api/v1/handicaps/update` - Actualizar desde RFEG
- `POST /api/v1/handicaps/update-manual` - Actualización manual
- `POST /api/v1/handicaps/update-multiple` - Batch update

**Documentación**: `http://localhost:8000/docs`

---

## 🔐 Autenticación JWT

### Flujo de Login
1. Usuario envía credenciales → `POST /api/v1/auth/login`
2. Backend devuelve: `{ access_token, token_type, user }`
3. Frontend guarda en `localStorage`:
   - `access_token`: Token JWT
   - `user`: Datos del usuario
4. Requests autenticadas incluyen header:
   ```javascript
   Authorization: Bearer {access_token}
   ```

### Protected Routes
Rutas que requieren autenticación:
- `/dashboard`
- `/profile`
- `/competitions/*`

**Implementación**: Usar `ProtectedRoute` component que verifica token antes de renderizar.

---

## 🎨 Guía de Estilo

### Paleta de Colores (Tailwind)
```javascript
// tailwind.config.js
colors: {
  primary: '#2D7A3E',    // Verde golf
  secondary: '#1E3A5F',  // Azul oscuro
  accent: '#D4AF37',     // Dorado
  gray: {
    50: '#F8F9FA',
    900: '#333333'
  }
}
```

### Componentes UI
- **Bordes**: `rounded-lg` (8px)
- **Sombras**: `shadow-md` para cards
- **Transiciones**: `transition-all duration-200`
- **Hover**: Elevar cards, cambiar color de botones

### Tipografía
- **Headings**: `font-poppins` (importar de Google Fonts)
- **Body**: `font-inter`

---

## 💻 Comandos de Desarrollo

### Setup Inicial
```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
```

### Desarrollo
```bash
npm run dev              # Dev server (port 5173)
npm run build            # Production build
npm run preview          # Preview production build
```

### Code Quality
```bash
npm run lint             # ESLint
npm run format           # Prettier
```

---

## 📋 Convenciones de Código

### Naming
- **Componentes**: PascalCase (`LoginForm.jsx`)
- **Funciones**: camelCase (`handleSubmit`)
- **Constantes**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **CSS**: Preferir Tailwind utilities

### Estructura de Componentes
```jsx
// 1. Imports
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Component
export const LoginForm = () => {
  // 3. Hooks
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  // 4. Handlers
  const handleSubmit = async (e) => {
    // ...
  };

  // 5. Render
  return (
    <form onSubmit={handleSubmit}>
      {/* JSX */}
    </form>
  );
};
```

### API Calls
```javascript
// services/authService.js
import api from './api';

export const login = async (email, password) => {
  const response = await api.post('/api/v1/auth/login', {
    email,
    password
  });
  return response.data;
};
```

---

## 🧪 Testing (Futuro)

```bash
npm run test              # Unit tests (Vitest)
npm run test:coverage     # Con cobertura
npm run test:e2e          # E2E (Playwright)
```

---

## 🚀 Deploy

### Vercel (Recomendado)
1. Push a GitHub
2. Conectar repo en Vercel dashboard
3. Configurar variables de entorno
4. Deploy automático en cada push

### Variables de Entorno en Producción
```env
VITE_API_BASE_URL=https://api.rydercupmanager.com
```

---

## 🎓 Notas para Claude Code

**Al empezar una sesión**:
1. Este es el **frontend**, el backend está en otro repo
2. Backend corre en `http://localhost:8000`
3. Usar Tailwind CSS para styling
4. Componentes reutilizables y modulares
5. Mobile-first responsive design

**Cuando agregues features**:
1. Crear componente en carpeta apropiada
2. Usar hooks personalizados para lógica compleja
3. Manejar loading states y errores
4. Validar formularios antes de enviar al backend
5. Responsive design siempre

**API Integration**:
1. Todas las llamadas API van a través de `services/`
2. Usar `api.js` (Axios) con interceptors configurados
3. Manejar errores 401 (redirigir a login)
4. Mostrar feedback al usuario (loading, success, error)

**No hacer**:
- ❌ Hardcodear URLs de API (usar env vars)
- ❌ Guardar datos sensibles en localStorage sin encriptar
- ❌ Componentes gigantes (dividir en componentes pequeños)
- ❌ Lógica de negocio en componentes (usar hooks/services)
- ❌ Inline styles (usar Tailwind)

---

## 📚 Referencias

- **Backend API**: [RyderCupAm](https://github.com/agustinEDev/RyderCupAm)
- **API Docs**: `http://localhost:8000/docs`
- **Design System**: Ver `STITCH_PROMPT.md` para mockups y diseño
- **React Docs**: https://react.dev
- **Vite Docs**: https://vitejs.dev
- **Tailwind Docs**: https://tailwindcss.com

---

Este frontend consume la API REST documentada en el backend. Siempre verificar que el backend esté corriendo antes de desarrollar en el frontend.
