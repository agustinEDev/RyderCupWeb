# 🏆 Ryder Cup Amateur Manager - Web Frontend

> Aplicación web moderna para gestión de torneos de golf amateur formato Ryder Cup

[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)](.)
[![Vite](https://img.shields.io/badge/Vite-5+-646CFF?logo=vite)](.)
[![Tailwind](https://img.shields.io/badge/Tailwind-3+-38B2AC?logo=tailwind-css)](.)

## 🔗 Backend API

# 🏆 Ryder Cup Amateur Manager — Frontend (resumen)

Aplicación web (React + Vite + Tailwind) para gestión de torneos de golf amateur.

Breve, útil y orientado a desarrolladores: cómo ejecutar, construir y desplegar.

## Rápido — Desarrollo

1. Instalar dependencias:

```bash
npm install
```

2. Ejecutar en desarrollo:

```bash
npm run dev
# Abre: http://localhost:5173
```

3. Variables de entorno

- Copiar `.env.example` → `.env` y ajustar:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Nota: Vite inyecta las variables en build; asegura que `VITE_API_BASE_URL` apunte al backend correcto antes de `npm run build`.

## Build & Deploy

```bash
npm run build   # genera carpeta dist/
npm run preview # previsualizar el build
```

Deploy: subir `dist/` a cualquier hosting estático (Netlify, Vercel, Cloudflare Pages). Si el backend está en Render, usar la URL pública del servicio como `VITE_API_BASE_URL` antes de construir.

Importante: Render puede hibernar (503). Si ves 503 en producción, revisa estado del servicio y retries.

## Notas clave de integración

- Backend: FastAPI (repositorio `RyderCupAm`). Endpoints principales: auth, users, handicaps.
- Cuando pidas actualización desde RFEG, NO enviar `manual_handicap` — dejar que el backend consulte RFEG y devuelva el resultado o un error claro (ej.: "User not found in RFEG"). Esto evita resultados falsos-positivos.
- `localStorage` contiene `access_token` y `user` (objeto usado por componentes protegidos).

## Problemas y correcciones relevantes (breve)

- Fix: dropdown de usuario (HeaderAuth) — se separaron refs para móvil/escritorio y se mejoró el manejo de clic fuera.
- Fix: `EditProfile` — manejo seguro cuando `handicap` es null; ahora el formulario muestra cadena vacía y no lanza errores.
- Se añadieron validaciones y ajustes para Sonar/ESLint (uso de Number.parseFloat, htmlFor en labels, PropTypes añadidos donde aplica).

## Estructura (resumida)

- `src/pages/` — rutas: Landing, Login, Register, VerifyEmail, Dashboard, Profile, EditProfile, Competitions, CreateCompetition
- `src/components/layout` — Header, HeaderAuth, Footer
- `src/services/` — llamadas al API

## Comandos útiles

```bash
npm run dev     # desarrollo
npm run build   # producción
npm run preview # probar build
```

## Commit policy

We follow Conventional Commits (in English). To enable hooks locally:

```bash
npm install
npm run prepare    # sets up husky hooks
```

Then commits should use verbs like `fix:`, `chore:`, `feat:` (e.g. `fix(header): raise logo 1px to align with text`).


## Dónde mirar primero

- `src/pages/EditProfile.jsx` — lógica de actualización de hándicap (manual + RFEG) y refresco de usuario
- `src/components/layout/HeaderAuth.jsx` — menú de usuario y logout

---

Contacto: [Agustín Estévez](https://github.com/agustinEDev)

- **Frontend Repository**: [RyderCupWeb](https://github.com/agustinEDev/RyderCupWeb)

---

⭐ Si te resulta útil, dale una estrella en GitHub

🏌️‍♂️ ¡Feliz desarrollo!
