# ADR-005: Sentry para Error Tracking y Performance Monitoring

**Fecha**: 27 de noviembre de 2025
**Estado**: Aceptado (Implementado en v1.6.0)
**Decisores**: Equipo de desarrollo frontend

## Contexto y Problema

Necesitamos una solución para:

- **Detectar errores en producción** antes que los usuarios reporten
- **Monitorear performance** de la aplicación (page loads, API calls)
- **Replay de sesiones** para reproducir bugs
- **Alertas automáticas** cuando ocurren errores críticos
- **Análisis de errores** por versión, navegador, URL

**Requisitos:**
- Integración con React
- Tracking de errores de React (Error Boundaries)
- Performance monitoring (Web Vitals)
- Session replay para debugging
- Privacidad de usuarios (no capturar datos sensibles)

## Opciones Consideradas

1. **Sentry**: Plataforma completa de error tracking + performance
2. **LogRocket**: Session replay + analytics
3. **Rollbar**: Error tracking básico
4. **Bugsnag**: Error tracking + stability monitoring
5. **Console.log + manual reporting**: Sin herramienta externa

## Decisión

**Adoptamos Sentry** como plataforma de error tracking y performance monitoring:

- **SDK:** `@sentry/react` v8+
- **Integraciones:** React, React Router, Browser Tracing
- **Features habilitadas:**
  - Error tracking (captura automática)
  - Performance monitoring (10% sample rate)
  - Session replay (10% sample rate)
  - React Error Boundary
  - React Profiler
  - HTTP Breadcrumbs

## Justificación

### Por qué Sentry:

1. **Ecosistema React Maduro**
   - Integración oficial `@sentry/react`
   - Error Boundaries automáticas
   - React Profiler para performance
   - React Router integration

2. **Features Completas**
   - Error tracking con stack traces
   - Performance monitoring (Web Vitals)
   - Session replay (video de sesión)
   - Breadcrumbs (navegación, clicks, API calls)
   - Source maps para código minificado

3. **Pricing**
   - Free tier: 5,000 errors/mes, 10,000 performance events
   - Suficiente para MVP y early adopters
   - Escalable cuando crezca el tráfico

4. **DX (Developer Experience)**
   - Dashboards intuitivos
   - Alertas configurables (email, Slack)
   - Releases tracking (por versión)
   - Deploy notifications

### Comparación con Alternativas:

| Característica | Sentry | LogRocket | Rollbar | Console.log |
|----------------|--------|-----------|---------|-------------|
| **Error Tracking** | ✅ Excelente | ✅ Bueno | ✅ Bueno | ❌ Manual |
| **Performance** | ✅ Sí | ⚠️ Limitado | ❌ No | ❌ No |
| **Session Replay** | ✅ Sí | ✅ Excelente | ❌ No | ❌ No |
| **React Integration** | ✅ Oficial | ✅ Buena | ⚠️ Básica | ❌ N/A |
| **Free Tier** | ✅ 5K errors | ⚠️ 1K sessions | ✅ 5K errors | ✅ Gratis |
| **Pricing** | ✅ Razonable | ❌ Caro | ✅ Razonable | ✅ Gratis |
| **Community** | ✅ Grande | ⚠️ Media | ⚠️ Media | ❌ N/A |

## Consecuencias

### Positivas:
- ✅ **Detección proactiva de errores**: Alertas antes de reportes de usuarios
- ✅ **Reproducibilidad**: Session replay permite ver exactamente qué hizo el usuario
- ✅ **Performance insights**: Detectar páginas lentas, API calls problemáticas
- ✅ **Contexto rico**: Breadcrumbs, user data, device info, URL
- ✅ **Stack traces**: Source maps permiten ver código original (no minificado)
- ✅ **Integración CI/CD**: Releases tracking, deploy notifications

### Negativas:
- ❌ **Costo potencial**: Si tráfico crece, puede requerir plan pago
- ❌ **Overhead en bundle**: +244 KB (chunk separado con code splitting)
- ❌ **Privacidad**: Requiere configuración para no capturar datos sensibles
- ❌ **Performance impact**: Minimal, pero existe (~1-2% overhead)

### Riesgos Mitigados:

1. **Bundle size**: Chunk separado `sentry-H0cbkE6T.js` (244 KB)
2. **Privacy**: Configuración `beforeSend` para sanitizar datos
3. **False positives**: `ignoreErrors` para errores conocidos/irrelevantes
4. **Rate limiting**: Sample rates configurables (10% en producción)

## Implementación

### Instalación:
```bash
npm install @sentry/react
```

### Configuración (`src/main.jsx`):
```javascript
import * as Sentry from '@sentry/react';

// Inicializar Sentry antes de React
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_ENVIRONMENT || 'production',
  release: `rydercup-web@${import.meta.env.VITE_APP_VERSION}`,

  // Integraciones
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.reactRouterV6BrowserTracingIntegration({
      useEffect: React.useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
    Sentry.replayIntegration({
      maskAllText: true,          // Ocultar texto sensible
      blockAllMedia: true,        // No capturar imágenes/videos
      maskAllInputs: true,        // Ocultar inputs (passwords, emails)
    }),
  ],

  // Performance Monitoring
  tracesSampleRate: 0.1,  // 10% de transacciones
  tracePropagationTargets: [
    'localhost',
    /^https:\/\/rydercup-api\.onrender\.com/,
  ],

  // Session Replay
  replaysSessionSampleRate: 0.1,  // 10% de sesiones normales
  replaysOnErrorSampleRate: 1.0,  // 100% cuando hay error

  // Filtrado de errores
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
  ],

  // Sanitización de datos sensibles
  beforeSend(event, hint) {
    // No enviar errores en desarrollo
    if (import.meta.env.DEV) {
      return null;
    }

    // Sanitizar datos sensibles
    if (event.request) {
      delete event.request.cookies;

      if (event.request.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['Cookie'];
      }
    }

    return event;
  },
});

// Root component con ErrorBoundary
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
```

### Optimización de Bundle (`vite.config.js`):
```javascript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'sentry': ['@sentry/react'],  // Chunk separado
        }
      }
    }
  }
});
```

### Error Fallback Component:
```jsx
// src/components/ErrorFallback.jsx
const ErrorFallback = ({ error, resetError }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md p-8 bg-white border rounded-lg">
        <h1 className="text-2xl font-bold text-red-600 mb-4">
          Oops! Something went wrong
        </h1>
        <p className="text-gray-600 mb-4">
          We've been notified and are working on a fix.
        </p>
        <button
          onClick={resetError}
          className="px-4 py-2 bg-primary text-white rounded-lg"
        >
          Try again
        </button>
      </div>
    </div>
  );
};
```

### Variables de Entorno:
```bash
# .env
VITE_SENTRY_DSN=https://xxx@xxx.ingest.us.sentry.io/xxx
VITE_ENVIRONMENT=production
VITE_APP_VERSION=1.6.0
```

## Validación

Criterios de éxito:

- [x] Errores capturados automáticamente (✅ Verificado en producción)
- [x] Session replay funcional (✅ 10% sample rate)
- [x] Performance tracking (✅ Web Vitals en dashboard)
- [x] Source maps funcionando (✅ Stack traces legibles)
- [x] No data sensible en eventos (✅ beforeSend sanitiza)
- [x] Bundle size aceptable (✅ 244 KB en chunk separado)

### Métricas Reales (v1.6.0):

```bash
# Bundle impact
dist/assets/sentry-H0cbkE6T.js  244.11 kB │ gzip: 75.91 kB

# Sentry Dashboard (primeras 2 semanas)
- Errores capturados: 12 (todos resueltos)
- Performance events: 450 transacciones
- Session replays: 23 sesiones
- Avg page load: 1.2s
- Avg API response: 180ms
```

## Referencias

- [Sentry React Docs](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Sentry Session Replay](https://docs.sentry.io/product/session-replay/)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [SENTRY_IMPLEMENTATION_SUMMARY.md](../SENTRY_IMPLEMENTATION_SUMMARY.md)

## Notas de Implementación

### Ya Implementado (v1.6.0):

- ✅ Sentry SDK instalado y configurado
- ✅ Error Boundary global
- ✅ React Router integration
- ✅ Performance monitoring (10% sample)
- ✅ Session replay (10% normal, 100% errors)
- ✅ Source maps upload en CI/CD
- ✅ beforeSend sanitization
- ✅ Code splitting (chunk separado)

### Features Avanzadas (Futuro):

- **User Feedback**: Modal para que usuarios reporten bugs
  ```javascript
  Sentry.showReportDialog({
    eventId: lastEventId,
    user: { email: user.email, name: user.first_name }
  });
  ```

- **Custom Context**: Agregar contexto específico
  ```javascript
  Sentry.setContext('competition', {
    id: competitionId,
    status: competition.status
  });
  ```

- **Custom Tags**: Para filtrado avanzado
  ```javascript
  Sentry.setTag('user_type', user.role);
  Sentry.setTag('feature_flag', 'new_ui');
  ```

### Alertas Configuradas:

1. **Critical Errors**: Email inmediato si error en producción
2. **Performance Degradation**: Alerta si p95 > 3 segundos
3. **High Error Rate**: Alerta si >10 errores/minuto
4. **New Release Issues**: Alerta si nueva versión tiene errores

## Relacionado

- ADR-006: Code Splitting y Lazy Loading (optimización de bundle)
- ADR-004: httpOnly Cookies Migration (monitoreo post-migración)
- ROADMAP.md: v1.6.0 Sentry Integration
- Backend ADR: Sentry SDK para FastAPI (futuro)
