# ADR-002: React + Vite as Frontend Technology Stack

**Date**: November 10, 2025
**Status**: Accepted
**Decision Makers**: Frontend development team

## Context and Problem

We need to choose the technology stack for the RyderCupFriends frontend. Requirements:

- Fast development build (<1s HMR)
- Optimized production build
- Modern JavaScript/ES6+ support
- Mature and maintained ecosystem
- Good tooling (DevTools, debugging)
- Simple deployment (static files)

## Options Considered

1. **Create React App (CRA)**: Webpack + official React
2. **Vite + React**: Modern build tool with ESM
3. **Next.js**: React framework with SSR
4. **Vue.js + Vite**: Alternative to React

## Decision

**We adopt React 18 + Vite 5** as the main stack:

- **UI Library**: React 18 (library, not framework)
- **Build Tool**: Vite 5 (ESM-based, ultra fast)
- **Routing**: React Router v6
- **Styling**: Tailwind CSS 3
- **State**: useState + Context API (no Redux)
- **HTTP**: Native Fetch API (no Axios)

## Rationale

### Why React:

1. **Mature Ecosystem**
   - Abundant third-party libraries
   - Active community and extensive documentation
   - Easy to find experienced developers

2. **Flexibility**
   - Library, not framework (architectural freedom)
   - Compatible with Clean Architecture
   - Does not impose folder structure

3. **Performance**
   - Optimized Virtual DOM
   - Concurrent Mode (React 18)
   - Native lazy loading with React.lazy()

### Why Vite (vs CRA):

| Feature | Vite 5 | Create React App |
|---------|--------|------------------|
| **HMR** | <50ms | ~1-3s |
| **Build time** | 3.8s | ~15-20s |
| **Bundle size** | 47 KB (optimized) | ~200+ KB (unoptimized) |
| **Code splitting** | Manual and automatic | Automatic only |
| **Maintenance** | Active (2024) | Deprecated (2023) |

**CRA is officially deprecated** (React docs recommend Vite/Next)

### Why NOT Next.js:

- We don't need SSR (not SEO-critical)
- Separate backend (FastAPI)
- Simpler deployment (static files vs Node server)
- Unnecessary overhead for SPA

## Consequences

### Positive:
- ✅ **Instant HMR**: <50ms in development
- ✅ **Fast build**: 3.8s for production
- ✅ **Optimized bundle**: 47 KB initial (with code splitting)
- ✅ **Excellent DX (Developer Experience)**
- ✅ **Simple deploy**: Render.com (static site)
- ✅ **Modern tooling**: Native ES Modules

### Negative:
- ❌ Manual configuration of some features (vs preconfigured CRA)
- ❌ Fewer resources/tutorials than CRA (historically)
- ❌ No SSR out-of-the-box (not a problem for SPA)

### Real Metrics (v1.7.0):
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

## Validation

The decision is considered successful if:
- [x] HMR < 100ms (✅ ~50ms average)
- [x] Production build < 10s (✅ 3.8s)
- [x] Bundle size < 500 KB (✅ 47 KB initial, separate chunks)
- [x] Automatic deploy works (✅ Render.com without issues)

## Key Configuration

### vite.config.js (Optimizations):
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

### Installed Plugins:
- `@vitejs/plugin-react` - Fast Refresh, JSX transform
- `vite-plugin-...` (security headers in dev)

## References

- [Vite Official Docs](https://vitejs.dev)
- [React Docs - Start a New React Project](https://react.dev/learn/start-a-new-react-project)
- [CRA Deprecation Discussion](https://github.com/reactjs/react.dev/pull/5487)
- [Vite vs CRA Benchmark](https://github.com/yyx990803/vite-vs-webpack)

## Migration Notes

### If migration is required in the future:

**To Next.js (if we need SSR):**
- Keep Clean Architecture (portable)
- Migrate React components (no changes)
- Adjust routing to Next.js App Router
- Configure API routes if necessary

**To another build tool (Turbopack, esbuild):**
- Only change vite.config.js
- Application code unchanged
- Verify compatible plugins

## Related

- ADR-001: Clean Architecture Frontend
- ADR-006: Code Splitting and Lazy Loading
