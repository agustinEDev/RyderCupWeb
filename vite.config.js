import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import sri from 'vite-plugin-sri'

// Security headers configuration
// Updated: 22 Dec 2025 - Added CSP without 'unsafe-inline' (v1.8.0)
// Note: HSTS is configured in production via _headers, nginx.conf and vercel.json
// to avoid forcing HTTPS in local development
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  // Content Security Policy without 'unsafe-inline' (v1.8.0)
  // Updated: 03 Feb 2026 - Added api.rydercupfriends.com for subdomain architecture
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' https: data:; connect-src 'self' https://api.rydercupfriends.com http://localhost:8000 https://o4510427294662656.ingest.de.sentry.io https://*.ingest.sentry.io; worker-src 'self' blob:; child-src 'self' blob:; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none';"
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Ensure environment variables are properly loaded
  // Vite automatically loads .env files and exposes VITE_* variables
  // In Render, VITE_API_BASE_URL is set as environment variable
  plugins: [
    react(),
    // Subresource Integrity (SRI) plugin - adds integrity hashes to assets (v1.15.0)
    // v0.0.2 uses hardcoded sha384, no config needed
    sri(),
    // Plugin to inject security headers in dev and preview
    {
      name: 'security-headers',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // CSP más permisivo en desarrollo para soportar HMR de Vite
          const devHeaders = {
            ...securityHeaders,
            'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' https: data:; connect-src 'self' ws://localhost:* https://api.rydercupfriends.com http://localhost:8000 https://o4510427294662656.ingest.de.sentry.io https://*.ingest.sentry.io; worker-src 'self' blob:; child-src 'self' blob:; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none';"
          }
          for (const [key, value] of Object.entries(devHeaders)) {
            res.setHeader(key, value)
          }
          next()
        })
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          // En preview usamos el CSP estricto de producción
          for (const [key, value] of Object.entries(securityHeaders)) {
            res.setHeader(key, value)
          }
          next()
        })
      }
    }
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js', // Se podría crear más tarde si es necesario.
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/tests/**'], // Excluir directorios comunes de build, e2e y playwright
    env: {
      // Configure empty API_BASE_URL in tests (uses localhost:8000 proxy in dev)
      VITE_API_BASE_URL: ''
    }
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  preview: {
    port: 4173,
    open: true,
  },
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000, // 1000 KB (default is 500 KB)

    // Manual chunk splitting for better caching and performance
    rollupOptions: {
      output: {
        manualChunks: {
          // React core and router in separate chunk
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // Sentry in separate chunk (large library)
          'sentry': ['@sentry/react'],

          // UI libraries in separate chunk
          'ui-vendor': ['react-hot-toast'],
        }
      }
    }
  }
}))
