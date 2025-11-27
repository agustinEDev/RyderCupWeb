# ADR-002: React + Vite como Stack Tecnológico Frontend

**Fecha**: 10 de noviembre de 2025
**Estado**: Aceptado
**Decisores**: Equipo de desarrollo frontend

## Contexto y Problema

Necesitamos elegir el stack tecnológico para el frontend de RyderCupFriends. Requisitos:

- Build rápido en desarrollo (<1s HMR)
- Build optimizado para producción
- Soporte moderno de JavaScript/ES6+
- Ecosistema maduro y mantenido
- Buen tooling (DevTools, debugging)
- Deployment sencillo (static files)

## Opciones Consideradas

1. **Create React App (CRA)**: Webpack + React oficial
2. **Vite + React**: Build tool moderno con ESM
3. **Next.js**: Framework React con SSR
4. **Vue.js + Vite**: Alternativa a React

## Decisión

**Adoptamos React 18 + Vite 5** como stack principal:

- **Librería UI**: React 18 (library, no framework)
- **Build Tool**: Vite 5 (ESM-based, ultra rápido)
- **Routing**: React Router v6
- **Styling**: Tailwind CSS 3
- **State**: useState + Context API (no Redux)
- **HTTP**: Fetch API nativo (no Axios)

## Justificación

### Por qué React:

1. **Ecosistema Maduro**
   - Librerías de terceros abundantes
   - Comunidad activa y documentación extensa
   - Fácil encontrar desarrolladores con experiencia

2. **Flexibilidad**
   - Library, no framework (libertad arquitectónica)
   - Compatible con Clean Architecture
   - No impone estructura de carpetas

3. **Performance**
   - Virtual DOM optimizado
   - Concurrent Mode (React 18)
   - Lazy loading nativo con React.lazy()

### Por qué Vite (vs CRA):

| Característica | Vite 5 | Create React App |
|---------------|---------|------------------|
| **HMR** | <50ms | ~1-3s |
| **Build tiempo** | 3.8s | ~15-20s |
| **Bundle size** | 47 KB (optimizado) | ~200+ KB (sin optimizar) |
| **Code splitting** | Manual y automático | Solo automático |
| **Mantenimiento** | Activo (2024) | Deprecado (2023) |

**CRA está deprecado oficialmente** (React docs recomienda Vite/Next)

### Por qué NO Next.js:

- No necesitamos SSR (no es SEO-crítico)
- Backend separado (FastAPI)
- Deployment más simple (static files vs Node server)
- Overhead innecesario para SPA

## Consecuencias

### Positivas:
- ✅ **HMR instantáneo**: <50ms en desarrollo
- ✅ **Build rápido**: 3.8s para producción
- ✅ **Bundle optimizado**: 47 KB inicial (con code splitting)
- ✅ **DX (Developer Experience)** excelente
- ✅ **Deploy simple**: Render.com (static site)
- ✅ **Tooling moderno**: ES Modules nativos

### Negativas:
- ❌ Configuración manual de algunas features (vs CRA preconfigurado)
- ❌ Menos recursos/tutoriales que CRA (históricamente)
- ❌ No tiene SSR out-of-the-box (no es problema para SPA)

### Métricas Reales (v1.7.0):
```bash
# Build
$ npm run build
✓ 2395 modules transformed
✓ built in 3.88s

# Dev server startup
$ npm run dev
VITE ready in 423 ms
➜  Local:   http://localhost:5173/

# Bundle size (production)
dist/assets/index-BhwLQ60R.js        47.21 kB │ gzip: 10.44 kB
dist/assets/react-vendor-BXTqkeYX.js 159.86 kB │ gzip: 52.29 kB
dist/assets/sentry-H0cbkE6T.js       244.11 kB │ gzip: 75.91 kB
```

## Validación

La decisión se considera exitosa si:
- [x] HMR < 100ms (✅ ~50ms promedio)
- [x] Build production < 10s (✅ 3.8s)
- [x] Bundle size < 500 KB (✅ 47 KB inicial, chunks separados)
- [x] Deploy automático funciona (✅ Render.com sin problemas)

## Configuración Clave

### vite.config.js (Optimizaciones):
```javascript
export default defineConfig({
  plugins: [react()],
  build: {
    minify: 'terser',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'sentry': ['@sentry/react'],
          'ui-vendor': ['react-hot-toast'],
        }
      }
    }
  }
})
```

### Plugins Instalados:
- `@vitejs/plugin-react` - Fast Refresh, JSX transform
- `vite-plugin-...` (security headers en dev)

## Referencias

- [Vite Official Docs](https://vitejs.dev)
- [React Docs - Start a New React Project](https://react.dev/learn/start-a-new-react-project)
- [CRA Deprecation Discussion](https://github.com/reactjs/react.dev/pull/5487)
- [Vite vs CRA Benchmark](https://github.com/yyx990803/vite-vs-webpack)

## Notas de Migración

### Si se requiere migrar en el futuro:

**A Next.js (si necesitamos SSR):**
- Mantener arquitectura Clean (portable)
- Migrar componentes React (sin cambios)
- Ajustar routing a Next.js App Router
- Configurar API routes si es necesario

**A Otro build tool (Turbopack, esbuild):**
- Solo cambiar vite.config.js
- Código de aplicación sin cambios
- Verificar plugins compatibles

## Relacionado

- ADR-001: Clean Architecture Frontend
- ADR-006: Code Splitting y Lazy Loading
