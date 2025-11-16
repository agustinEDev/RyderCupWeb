import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Security headers configuration
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
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
          Object.entries(securityHeaders).forEach(([key, value]) => {
            res.setHeader(key, value)
          })
          next()
        })
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          Object.entries(securityHeaders).forEach(([key, value]) => {
            res.setHeader(key, value)
          })
          next()
        })
      }
    }
  ],
  server: {
    port: 5173,
    open: true,
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
    }
  }
})
