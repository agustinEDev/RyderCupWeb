# 🏆 Ryder Cup Amateur Manager - Web Frontend

> Aplicación web moderna para gestión de torneos de golf amateur formato Ryder Cup

[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)](.)
[![Vite](https://img.shields.io/badge/Vite-5+-646CFF?logo=vite)](.)
[![Tailwind](https://img.shields.io/badge/Tailwind-3+-38B2AC?logo=tailwind-css)](.)

## 🔗 Backend API

Este es el **frontend web**. Para el backend API, visita:
👉 **[RyderCupAm - Backend](https://github.com/agustinEDev/RyderCupAm)**

---

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/agustinEDev/RyderCupWeb.git
cd RyderCupWeb

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your backend API URL

# Run development server
npm run dev

# Open browser
open http://localhost:5173
```

---

## 🛠️ Stack Tecnológico

- **Framework**: React 18+ con Vite
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **State Management**: Context API / Zustand
- **Forms**: React Hook Form (opcional)
- **Icons**: Heroicons / Lucide React

---

## 📱 Features

### ✅ Implementado (MVP)
- 🏠 **Landing Page** - Hero section moderna con features
- 🔐 **Autenticación** - Login y registro con JWT
- 👤 **Gestión de Perfil** - Ver y editar perfil de usuario
- ⛳ **Hándicap** - Visualización destacada del hándicap oficial
- 📊 **Dashboard** - Panel principal del usuario
- 🎯 **Responsive Design** - Mobile, tablet y desktop

### 🚧 En Desarrollo
- 🏆 **Gestión de Torneos** - CRUD completo de competiciones
- 👥 **Equipos** - Formación y gestión de equipos
- 📈 **Estadísticas** - Dashboard con métricas

### ⏳ Planeado
- 🔄 **Real-time Updates** - WebSockets para scoring en vivo
- 🌙 **Dark Mode** - Tema oscuro
- 🌍 **i18n** - Soporte multiidioma (ES/EN)
- 📱 **PWA** - Progressive Web App

---

## 📂 Estructura del Proyecto

```
src/
├── assets/              # Imágenes, iconos, recursos estáticos
├── components/          # Componentes reutilizables
│   ├── common/         # Componentes genéricos (Button, Card, Input)
│   ├── auth/           # LoginForm, RegisterForm
│   ├── profile/        # ProfileCard, ProfileDetails
│   └── layout/         # Header, Footer, Navbar
├── pages/              # Páginas principales (rutas)
│   ├── Landing.jsx     # Página de inicio pública
│   ├── Login.jsx       # Página de login
│   ├── Register.jsx    # Página de registro
│   ├── Dashboard.jsx   # Dashboard principal (autenticado)
│   ├── Profile.jsx     # Perfil de usuario completo
│   └── Competitions.jsx # Gestión de competiciones
├── services/           # API calls y servicios
│   ├── api.js         # Configuración de Axios
│   ├── authService.js # Login, Register, Logout
│   └── userService.js # User operations
├── hooks/              # Custom React hooks
│   ├── useAuth.js     # Hook de autenticación
│   └── useUser.js     # Hook de usuario
├── context/            # Context API para estado global
│   └── AuthContext.jsx # Estado de autenticación
├── utils/              # Utilidades y helpers
│   ├── validators.js  # Validaciones de formularios
│   └── constants.js   # Constantes de la app
├── App.jsx             # Componente principal con rutas
└── main.jsx            # Entry point
```

---

## 🎨 Guía de Diseño

### Paleta de Colores
- **Primary**: `#2D7A3E` (Verde golf) - CTAs, links activos
- **Secondary**: `#1E3A5F` (Azul oscuro) - Headers, textos
- **Accent**: `#D4AF37` (Dorado) - Badges, detalles premium
- **Background**: `#F8F9FA` (Gris claro)
- **Text**: `#333333` (Gris oscuro)

### Tipografía
- **Headings**: Poppins / Montserrat (sans-serif)
- **Body**: Inter / Open Sans (sans-serif)

### Componentes UI
- Bordes redondeados: `8px`
- Sombras sutiles: `shadow-md` (Tailwind)
- Hover effects en todos los elementos interactivos
- Transiciones suaves: `transition-all duration-200`

---

## 🔐 Autenticación

### Flujo de Login
1. Usuario ingresa email y contraseña
2. Frontend hace `POST /api/v1/auth/login`
3. Backend devuelve token JWT + datos de usuario
4. Frontend guarda token en `localStorage`
5. Token se incluye en todas las requests autenticadas

### Protected Routes
Las siguientes rutas requieren autenticación:
- `/dashboard`
- `/profile`
- `/competitions/*`

Si el usuario no está autenticado, se redirige a `/login`

### Token Management
```javascript
// Guardar después de login
localStorage.setItem('access_token', token);
localStorage.setItem('user', JSON.stringify(user));

// Incluir en requests
headers: {
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
  'Content-Type': 'application/json'
}

// Limpiar al logout
localStorage.removeItem('access_token');
localStorage.removeItem('user');
```

---

## 🌐 API Integration

### Base URL
```env
VITE_API_BASE_URL=http://localhost:8000
```

### Endpoints Disponibles

#### Authentication
```javascript
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
```

#### User Management
```javascript
GET /api/v1/users/search?email={email}
GET /api/v1/users/search?full_name={name}
```

#### Handicap Management
```javascript
POST /api/v1/handicaps/update
POST /api/v1/handicaps/update-manual
POST /api/v1/handicaps/update-multiple
```

**Documentación completa**: `http://localhost:8000/docs`

---

## 💻 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Servidor de desarrollo (port 5173)

# Build
npm run build            # Build para producción
npm run preview          # Preview del build

# Linting & Formatting
npm run lint             # ESLint
npm run format           # Prettier

# Tests (cuando se implementen)
npm run test             # Run tests
npm run test:coverage    # Con cobertura
```

---

## 🚀 Deploy

### Opción 1: Vercel (Recomendado)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deploy
vercel --prod
```

### Opción 2: Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy

# Production deploy
netlify deploy --prod
```

---

## 🔧 Variables de Entorno

Crear archivo `.env` en la raíz:

```env
# Backend API
VITE_API_BASE_URL=http://localhost:8000
VITE_API_TIMEOUT=10000

# App Config
VITE_APP_NAME="Ryder Cup Manager"
VITE_APP_VERSION=1.0.0
```

**Nota**: En Vite, las variables deben empezar con `VITE_`

---

## 📊 Estado del Proyecto

### Fase 1: MVP ✅ En Desarrollo
- Landing page moderna
- Sistema de autenticación completo
- Dashboard de usuario
- Gestión de perfil
- Integración con backend API

### Fase 2: Core Features 🚧 Planeado
- CRUD de competiciones
- Gestión de equipos
- Scoring system UI
- Estadísticas y gráficos

### Fase 3: Advanced ⏳ Futuro
- Real-time updates (WebSockets)
- Dark mode
- Internacionalización
- PWA features

---

## 🤝 Contribuir

```bash
# 1. Fork & clone
git checkout -b feature/amazing-feature

# 2. Desarrollar
# - Seguir guía de estilo
# - Componentes reutilizables
# - Responsive design

# 3. Tests (cuando estén disponibles)
npm run test

# 4. PR
git push origin feature/amazing-feature
```

### Convenciones
- **Componentes**: PascalCase (`LoginForm.jsx`)
- **Funciones**: camelCase (`handleLogin`)
- **Constantes**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **CSS**: Tailwind utility classes preferentemente

---

## 📄 Licencia

MIT License

---

## 👨‍💻 Contacto

- **Developer**: [Agustín Estévez](https://github.com/agustinEDev)
- **Backend Repository**: [RyderCupAm](https://github.com/agustinEDev/RyderCupAm)
- **Frontend Repository**: [RyderCupWeb](https://github.com/agustinEDev/RyderCupWeb)

---

⭐ Si te resulta útil, dale una estrella en GitHub

🏌️‍♂️ ¡Feliz desarrollo!
