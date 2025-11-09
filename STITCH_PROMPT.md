# Prompt para Stitch - Ryder Cup Amateur Manager Frontend

## 🎯 Objetivo del Proyecto

Crear una **landing page moderna y atractiva** para Ryder Cup Amateur Manager, un sistema de gestión de torneos de golf amateur formato Ryder Cup. La aplicación debe incluir autenticación completa, gestión de perfil de usuario y preparación para funcionalidad de torneos.

---

## 🏗️ Stack Tecnológico Backend (Ya Implementado)

**API REST** ya funcional:
- **Base URL**: `http://localhost:8000`
- **Framework**: FastAPI + PostgreSQL
- **Autenticación**: JWT (Bearer token)
- **Documentación**: `/docs` (Swagger UI)

### 📡 Endpoints API Disponibles

#### **Authentication**
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response: 201 Created
{
  "id": "uuid",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "handicap": null,
  "handicap_updated_at": null,
  "created_at": "2025-11-09T10:00:00Z",
  "updated_at": "2025-11-09T10:00:00Z"
}
```

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response: 200 OK
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "handicap": 15.5,
    "handicap_updated_at": "2025-11-08T10:00:00Z",
    "created_at": "2025-11-09T10:00:00Z",
    "updated_at": "2025-11-09T10:00:00Z"
  }
}
```

```http
POST /api/v1/auth/logout
Authorization: Bearer {token}

Response: 200 OK
{
  "message": "Logout exitoso",
  "logged_out_at": "2025-11-09T10:00:00Z"
}
```

#### **User Management**
```http
GET /api/v1/users/search?email=john@example.com
Authorization: Bearer {token}

Response: 200 OK
{
  "id": "uuid",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "handicap": 15.5,
  "handicap_updated_at": "2025-11-08T10:00:00Z",
  "created_at": "2025-11-09T10:00:00Z",
  "updated_at": "2025-11-09T10:00:00Z"
}
```

---

## 🎨 Diseño y Estructura de la Aplicación

### **1. Landing Page (Pública - No autenticado)**

#### **Hero Section (Parte Superior - Visual)**
- **Diseño moderno y atractivo** con imagen de fondo relacionada con golf
- **Título principal**: "Gestiona tu Torneo Ryder Cup Amateur"
- **Subtítulo**: Breve descripción del valor del producto
- **CTA Principal**: Botón grande "Crear tu Competición"
  - Si **NO está autenticado**: Redirige a `/login`
  - Si **está autenticado**: Redirige a `/competitions/create`
- **Botones secundarios** en header:
  - "Iniciar Sesión"
  - "Registrarse"

#### **Features Section (Parte Inferior - Tarjetas)**
Grid de **3-4 tarjetas** explicando las funcionalidades:

**Tarjeta 1: Gestión de Hándicaps**
- Icono: ⛳
- Título: "Hándicaps Oficiales"
- Descripción: "Integración automática con RFEG para obtener hándicaps oficiales de todos los jugadores"

**Tarjeta 2: Formato Ryder Cup**
- Icono: 🏆
- Título: "Formato Profesional"
- Descripción: "Sistema de puntuación Ryder Cup con formatos individuales, parejas y fourball"

**Tarjeta 3: Gestión de Equipos**
- Icono: 👥
- Título: "Equipos Balanceados"
- Descripción: "Crea equipos equilibrados automáticamente basándote en hándicaps"

**Tarjeta 4: Seguimiento en Tiempo Real**
- Icono: 📊
- Título: "Marcador en Vivo"
- Descripción: "Seguimiento en tiempo real del marcador y estadísticas del torneo"

**Diseño de tarjetas**: Moderno, con bordes sutiles, sombras suaves, hover effects

---

### **2. Página de Login (`/login`)**

**Diseño**:
- Layout centrado con card elegante
- Logo/Título del proyecto arriba
- Formulario limpio y minimalista

**Formulario**:
```
┌─────────────────────────────────┐
│   Ryder Cup Manager             │
│   Iniciar Sesión                │
│                                 │
│   Email                         │
│   [____________________]        │
│                                 │
│   Contraseña                    │
│   [____________________]        │
│                                 │
│   [  Iniciar Sesión  ]          │
│                                 │
│   ¿No tienes cuenta? Regístrate │
└─────────────────────────────────┘
```

**Campos**:
- **Email**: input type="email", required
- **Password**: input type="password", required
- **Botón**: "Iniciar Sesión"
- **Link**: "¿No tienes cuenta? Regístrate" → Redirige a `/register`

**Validaciones**:
- Email válido (formato)
- Password no vacío
- Mostrar errores del backend: "Credenciales inválidas"

**Flujo exitoso**:
1. Llamar a `POST /api/v1/auth/login`
2. Guardar token en `localStorage` o `sessionStorage`
3. Guardar datos de usuario
4. Redirigir a `/dashboard`

---

### **3. Página de Register (`/register`)**

**Diseño**: Similar a login pero con más campos

**Formulario**:
```
┌─────────────────────────────────┐
│   Ryder Cup Manager             │
│   Crear Cuenta                  │
│                                 │
│   Nombre                        │
│   [____________________]        │
│                                 │
│   Apellidos                     │
│   [____________________]        │
│                                 │
│   Email                         │
│   [____________________]        │
│                                 │
│   Contraseña                    │
│   [____________________]        │
│                                 │
│   [   Crear Cuenta   ]          │
│                                 │
│   ¿Ya tienes cuenta? Inicia Sesión │
└─────────────────────────────────┘
```

**Campos**:
- **Nombre**: input type="text", required, maxlength=50
- **Apellidos**: input type="text", required, maxlength=50
- **Email**: input type="email", required
- **Password**: input type="password", required, minlength=8
- **Botón**: "Crear Cuenta"
- **Link**: "¿Ya tienes cuenta? Inicia Sesión" → Redirige a `/login`

**Validaciones**:
- Nombre y Apellidos no vacíos
- Email válido y único
- Password: mínimo 8 caracteres
- Mostrar errores del backend

**Flujo exitoso**:
1. Llamar a `POST /api/v1/auth/register`
2. Redirigir a `/login` con mensaje: "Cuenta creada, inicia sesión"

---

### **4. Dashboard (Autenticado - `/dashboard`)**

**Layout**:
- **Header** con navegación:
  - Logo + Título
  - Menú: "Mis Competiciones" | "Crear Competición"
  - Perfil de usuario con dropdown
- **Sidebar** (opcional): Navegación secundaria
- **Main Content**: Contenido dinámico

#### **Tarjeta de Perfil de Jugador** (En header o sidebar)

```
┌──────────────────────────────────┐
│  👤 John Doe                     │
│  📧 john@example.com             │
│  ⛳ Hándicap: 15.5               │
│                                  │
│  [Ver Perfil Completo]           │
└──────────────────────────────────┘
```

**Contenido**:
- Avatar o icono de usuario
- Nombre completo
- Email
- **Hándicap destacado** (si existe, si no: "Sin hándicap")
- Botón "Ver Perfil Completo" → Redirige a `/profile`

---

### **5. Página de Perfil (`/profile`)**

**Diseño**: Card centrado con toda la información del usuario

```
┌─────────────────────────────────────┐
│   Mi Perfil                         │
│                                     │
│   👤 Avatar                         │
│                                     │
│   Nombre: John                      │
│   Apellidos: Doe                    │
│   Email: john@example.com           │
│                                     │
│   ⛳ Hándicap                        │
│   ┌───────────────────────────┐   │
│   │ 15.5                      │   │
│   │ Actualizado: 08/11/2025   │   │
│   └───────────────────────────┘   │
│                                     │
│   Miembro desde: 09/11/2025         │
│                                     │
│   [ Editar Perfil ]  [ Cerrar Sesión ] │
└─────────────────────────────────────┘
```

**Campos mostrados**:
- **ID** (oculto o en tooltip para debug)
- **Nombre** (`first_name`)
- **Apellidos** (`last_name`)
- **Email**
- **Hándicap** (destacado con badge/card especial)
- **Fecha actualización hándicap** (si existe)
- **Fecha de creación** ("Miembro desde")
- **Fecha última actualización**

**Acciones**:
- **Editar Perfil**: Modal o página para editar datos (futuro)
- **Cerrar Sesión**:
  1. Llamar a `POST /api/v1/auth/logout`
  2. Limpiar localStorage/sessionStorage
  3. Redirigir a `/`

---

### **6. Crear Competición (`/competitions/create`)**

**Estado**: Página preparada para futuro (Tournament module pendiente)

**Por ahora**: Mostrar mensaje temporal

```
┌─────────────────────────────────────┐
│   Crear tu Competición              │
│                                     │
│   🚧 Próximamente disponible        │
│                                     │
│   Estamos trabajando en esta        │
│   funcionalidad. Pronto podrás      │
│   crear y gestionar tus torneos     │
│   Ryder Cup Amateur.                │
│                                     │
│   [ Volver al Dashboard ]           │
└─────────────────────────────────────┘
```

**Futuro** (cuando esté el backend):
- Formulario para crear competición
- Nombre, fecha, tipo de torneo
- Seleccionar jugadores
- Configuración de equipos

---

### **7. Mis Competiciones (`/competitions`)**

**Estado**: Página preparada para futuro

**Por ahora**: Lista vacía con CTA

```
┌─────────────────────────────────────┐
│   Mis Competiciones                 │
│                                     │
│   📋 No tienes competiciones        │
│                                     │
│   Crea tu primera competición       │
│   y empieza a gestionar tu          │
│   torneo Ryder Cup Amateur.         │
│                                     │
│   [ + Crear Competición ]           │
└─────────────────────────────────────┘
```

**Futuro**:
- Grid/Lista de competiciones creadas
- Tarjetas con: Nombre, Fecha, Estado, # Jugadores
- Acciones: Ver, Editar, Eliminar

---

## 🎨 Guía de Estilo

### **Paleta de Colores Sugerida**
- **Primario**: Verde golf (#2D7A3E o similar) - CTAs, links activos
- **Secundario**: Azul oscuro (#1E3A5F) - Headers, textos importantes
- **Acento**: Dorado/Amarillo (#D4AF37) - Detalles premium, badges
- **Fondo**: Blanco/Gris claro (#F8F9FA)
- **Texto**: Gris oscuro (#333333)

### **Tipografía**
- **Headings**: Sans-serif moderna (Inter, Poppins, Montserrat)
- **Body**: Sans-serif legible (Open Sans, Roboto)
- **Tamaños**: h1: 48px, h2: 36px, h3: 24px, body: 16px

### **Componentes**
- **Botones**: Bordes redondeados (8px), sombras sutiles, hover effects
- **Cards**: Fondo blanco, sombra suave, hover: elevar
- **Inputs**: Borde sutil, focus: borde coloreado, padding generoso
- **Iconos**: Usar biblioteca moderna (Heroicons, Lucide, Font Awesome)

### **Responsividad**
- **Mobile-first**: Diseño optimizado para móvil primero
- **Breakpoints**: Mobile (<768px), Tablet (768-1024px), Desktop (>1024px)
- **Grid**: Tarjetas 1 columna (mobile), 2 columnas (tablet), 3-4 columnas (desktop)

---

## 🔐 Gestión de Autenticación

### **Token Management**
```javascript
// Guardar token después de login
localStorage.setItem('access_token', response.access_token);
localStorage.setItem('user', JSON.stringify(response.user));

// Obtener token para requests
const token = localStorage.getItem('access_token');

// Headers para requests autenticados
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}

// Limpiar al logout
localStorage.removeItem('access_token');
localStorage.removeItem('user');
```

### **Protected Routes**
- Verificar token en `localStorage` antes de acceder a rutas protegidas
- Si no hay token: redirigir a `/login`
- Rutas protegidas: `/dashboard`, `/profile`, `/competitions/*`

### **Token Expiration**
- Los tokens expiran en **24 horas**
- Si el backend devuelve `401 Unauthorized`: Redirigir a `/login`
- Mostrar mensaje: "Tu sesión ha expirado, inicia sesión nuevamente"

---

## 📋 Requisitos Funcionales

### **Must Have (MVP)**
- ✅ Landing page con hero section y tarjetas de features
- ✅ Página de Login funcional
- ✅ Página de Register funcional
- ✅ Dashboard con tarjeta de perfil de usuario
- ✅ Página de perfil completo
- ✅ Logout funcional
- ✅ Navegación entre páginas
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Gestión de estados de autenticación
- ✅ Validación de formularios
- ✅ Manejo de errores del backend

### **Nice to Have (Fase 2)**
- Animaciones y transiciones suaves
- Loading states durante requests
- Toast notifications para feedback
- Avatar personalizable
- Edición de perfil
- Dark mode
- Internacionalización (ES/EN)

---

## 🛠️ Stack Tecnológico Frontend Recomendado

### **Opción 1: React + Vite** (Recomendado)
```bash
npm create vite@latest ryder-cup-frontend -- --template react
cd ryder-cup-frontend
npm install
npm install react-router-dom axios
npm install -D tailwindcss postcss autoprefixer
```

**Librerías**:
- **React Router**: Navegación
- **Axios**: HTTP requests
- **Tailwind CSS**: Styling
- **React Hook Form**: Formularios (opcional)
- **Zustand/Context API**: Estado global

### **Opción 2: Next.js** (Si quieres SSR)
```bash
npx create-next-app@latest ryder-cup-frontend
cd ryder-cup-frontend
npm install axios
```

### **Opción 3: Vue.js + Vite**
```bash
npm create vite@latest ryder-cup-frontend -- --template vue
cd ryder-cup-frontend
npm install
npm install vue-router axios
```

---

## 📁 Estructura de Proyecto Sugerida (React)

```
ryder-cup-frontend/
├── public/
│   └── golf-images/          # Imágenes para hero section
├── src/
│   ├── assets/               # Imágenes, iconos
│   ├── components/           # Componentes reutilizables
│   │   ├── common/
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Input.jsx
│   │   │   └── Navbar.jsx
│   │   ├── auth/
│   │   │   ├── LoginForm.jsx
│   │   │   └── RegisterForm.jsx
│   │   └── profile/
│   │       ├── ProfileCard.jsx
│   │       └── ProfileDetails.jsx
│   ├── pages/                # Páginas principales
│   │   ├── Landing.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Profile.jsx
│   │   ├── Competitions.jsx
│   │   └── CreateCompetition.jsx
│   ├── services/             # API calls
│   │   ├── api.js           # Axios config
│   │   ├── authService.js   # Login, Register, Logout
│   │   └── userService.js   # User operations
│   ├── hooks/                # Custom hooks
│   │   ├── useAuth.js       # Hook de autenticación
│   │   └── useUser.js       # Hook de usuario
│   ├── context/              # Context API
│   │   └── AuthContext.jsx  # Estado global de auth
│   ├── utils/                # Utilidades
│   │   ├── validators.js    # Validaciones
│   │   └── constants.js     # Constantes
│   ├── App.jsx               # Rutas principales
│   └── main.jsx              # Entry point
├── .env                      # Variables de entorno
├── tailwind.config.js
└── package.json
```

---

## 🔗 Variables de Entorno

Crear archivo `.env`:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_API_TIMEOUT=10000
```

---

## 🎯 Criterios de Éxito

1. ✅ Usuario puede registrarse correctamente
2. ✅ Usuario puede iniciar sesión y ver su dashboard
3. ✅ Usuario ve su hándicap destacado en su perfil
4. ✅ Usuario puede acceder a su perfil completo
5. ✅ Usuario puede cerrar sesión correctamente
6. ✅ Rutas protegidas redirigen a login si no está autenticado
7. ✅ Click en "Crear Competición" sin login redirige a login
8. ✅ Landing page es atractiva y moderna
9. ✅ Responsive en mobile, tablet y desktop
10. ✅ Errores del backend se muestran claramente

---

## 🚀 Próximos Pasos (Fase 2 - Futuro)

Una vez completado el MVP, se implementarán:
- CRUD completo de competiciones (cuando backend esté listo)
- Gestión de equipos
- Sistema de puntuación en tiempo real
- Estadísticas y gráficos
- Chat/comentarios en competiciones
- Notificaciones en tiempo real

---

## 📞 Notas Adicionales

- El backend ya está **100% funcional** con los endpoints especificados
- El backend corre en `http://localhost:8000`
- Documentación Swagger disponible en `http://localhost:8000/docs`
- Los tokens JWT expiran en 24 horas
- El hándicap puede ser `null` si el usuario no lo ha configurado
- Las competiciones son funcionalidad futura (backend pendiente)

---

¡Crea una aplicación moderna, intuitiva y lista para escalar! 🏌️‍♂️⛳🏆
