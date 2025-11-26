import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Security headers configuration
// Note: HSTS is configured in production via Netlify (_headers) and Vercel (vercel.json)
// to avoid forcing HTTPS in local development
// Note: X-XSS-Protection is deprecated and removed (CSP in index.html provides XSS protection)
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Plugin to inject security headers in dev and preview
    {
      name: 'security-headers',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          for (const [key, value] of Object.entries(securityHeaders)) {
            res.setHeader(key, value)
          }
          next()
        })
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
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
        drop_console: true, // Remove console.* statements in production
        drop_debugger: true // Remove debugger statements
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
})
