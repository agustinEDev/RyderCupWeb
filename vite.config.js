import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import sri from 'vite-plugin-sri'
import { VitePWA } from 'vite-plugin-pwa'
import { readdirSync, existsSync, rmSync, readFileSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'
import { execSync } from 'node:child_process'

/**
 * Los ficheros CLAUDE.md son contexto para el asistente, no assets. Las
 * herramientas que los generan los dejan junto al código que documentan, y
 * cualquiera que caiga bajo `public/` lo copia Vite tal cual a `dist/`, con lo
 * que acabaría servido en producción. Este plugin los retira del directorio de
 * salida después del build; los del árbol de fuentes no se tocan.
 */
/**
 * Sella cada build con lo que se está publicando de verdad: una marca `app-build`
 * en el HTML y un `version.json` junto a él.
 *
 * Hace dos cosas, y la segunda es la que importa:
 *
 * 1. Dice qué versión sirve producción. Antes había un `public/version.json`
 *    escrito a mano que llevaba desde diciembre de 2025 anunciando "1.8.0-debug":
 *    nadie lo leía y engañaba a quien fuera a comprobar un despliegue. Ese JSON
 *    se queda deliberadamente FUERA del precache —ver `globPatterns` más abajo—,
 *    porque precacheado respondería la versión de la publicación anterior.
 *
 * 2. **Hace que cada despliegue mueva el service worker.** El `sw.js` de Workbox
 *    solo cambia si cambia su manifiesto de precache, que es la lista de ficheros
 *    con el hash de su contenido. Un despliegue que no toque el build —arreglar
 *    una cabecera en el panel de Render, sin ir más lejos— deja un `sw.js`
 *    idéntico, así que el `update()` de `serviceWorkerRegistration.js` no
 *    encuentra nada, no hay `controllerchange` y nadie recarga: la aplicación
 *    instalada se queda con lo viejo indefinidamente. La marca va en el
 *    `index.html`, que sí está precacheado: cada publicación cambia su hash y la
 *    cadena entera arranca sola. El porqué de sellar el HTML y no un fichero
 *    aparte está en `transformIndexHtml`, más abajo.
 *
 * Por eso lleva `builtAt` además del commit: garantiza que dos publicaciones del
 * mismo commit —que es justo el caso de "he redesplegado y no ha llegado"—
 * también se propaguen.
 */
function emitVersionFile() {
  let info

  /** Se calcula una vez por build: el HTML y el JSON tienen que decir lo mismo. */
  const buildInfo = () => {
    if (info) return info

    // Render expone el commit en el entorno de build; fuera de ahí se pregunta
    // a git. `cwd` fijo al proyecto porque el build puede lanzarse desde otro
    // sitio (`npm --prefix`), y ahí git respondería por otro repositorio; su
    // stderr se descarta para que un "not a git repository" no parezca un fallo
    // del build cuando simplemente no hay repositorio
    let commit = process.env.RENDER_GIT_COMMIT || process.env.GITHUB_SHA || ''
    if (!commit) {
      try {
        commit = execSync('git rev-parse HEAD', {
          encoding: 'utf8',
          cwd: __dirname,
          stdio: ['ignore', 'pipe', 'ignore'],
        }).trim()
      } catch {
        commit = 'unknown'
      }
    }

    const { version } = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'))
    info = { version, commit: commit.slice(0, 7), builtAt: new Date().toISOString() }
    return info
  }

  return {
    name: 'emit-version-file',
    apply: 'build',

    /**
     * La marca va **dentro del HTML**, y ahí está el fondo del asunto.
     *
     * Workbox no vuelve a pedir una entrada del precache cuya revisión no ha
     * cambiado, y la revisión es el hash del contenido. Marcar un fichero
     * aparte movía el `sw.js` y disparaba la recarga, pero esa recarga la
     * contestaba `navigateFallback` con el `index.html` guardado, que es el
     * viejo — y las cabeceras viajan con la respuesta guardada, de modo que la
     * política antigua seguía aplicándose. Cambiando el propio HTML, su hash se
     * mueve, Workbox lo vuelve a descargar y la recarga entrega el documento
     * nuevo con sus cabeceras nuevas.
     */
    transformIndexHtml() {
      const { version, commit, builtAt } = buildInfo()
      return [
        {
          tag: 'meta',
          attrs: { name: 'app-build', content: `${version} ${commit} ${builtAt}` },
          injectTo: 'head',
        },
      ]
    },

    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: `${JSON.stringify(buildInfo(), null, 2)}\n`,
      })
    },
  }
}

function stripAssistantDocs() {
  let outDir

  return {
    name: 'strip-assistant-docs',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      if (!outDir || !existsSync(outDir)) return

      const removed = []
      const walk = (dir) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const full = join(dir, entry.name)
          if (entry.isDirectory()) walk(full)
          else if (entry.name === 'CLAUDE.md') {
            rmSync(full)
            removed.push(relative(outDir, full))
          }
        }
      }
      walk(outDir)

      if (removed.length) {
        console.log(`strip-assistant-docs: retirados de dist -> ${removed.join(', ')}`)
      }
    },
  }
}

// Security headers for the LOCAL dev and preview servers only.
// Production is a Render Static Site and serves its headers from Render's own
// configuration — see docs/SECURITY_HEADERS.md. It does not read this file.
// Updated: 04 Aug 2026 - style-src needs 'unsafe-inline' (see #295)
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(self), microphone=(), camera=()',
  // style-src requires 'unsafe-inline': React sets inline styles and framer-motion
  // animates by writing the style attribute at runtime. Without it the whole UI is
  // unstyled — this was verified against production in #295, where the policy had
  // been strict since Dec 2025 without anyone noticing, because it never applied.
  // script-src stays strict, which is what actually stops an XSS.
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' https: data: http://localhost:8000; connect-src 'self' https://api.rydercupfriends.com http://localhost:8000 https://o4510427294662656.ingest.de.sentry.io https://*.ingest.sentry.io; worker-src 'self' blob:; child-src 'self' blob:; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none';"
}

// https://vitejs.dev/config/
export default defineConfig(() => ({
  // Ensure environment variables are properly loaded
  // Vite automatically loads .env files and exposes VITE_* variables
  // In Render, VITE_API_BASE_URL is set as environment variable
  plugins: [
    react(),
    // Antes de VitePWA: su service worker se genera en el mismo hook y no debe
    // llegar a ver estos ficheros
    stripAssistantDocs(),
    // También antes de VitePWA: el fichero tiene que existir cuando Workbox
    // construye el manifiesto, que es de lo que se trata
    emitVersionFile(),
    VitePWA({
      registerType: 'autoUpdate',
      // El registro que inyecta el plugin solo llama a `register()`: no se
      // entera de que ha entrado una versión nueva ni vuelve a preguntar. En la
      // aplicación instalada eso significaba quedarse con el paquete viejo hasta
      // desinstalarla. El nuestro está en `utils/serviceWorkerRegistration.js`
      injectRegister: null,
      // sw.js must be excluded from SRI — browsers reject SW with integrity attribute
      filename: 'sw.js',
      manifest: {
        name: 'RyderCupFriends',
        short_name: 'RCF',
        description: 'Amateur golf tournament management platform',
        theme_color: '#15803d',
        // El mismo verde que la pantalla de espera: Android pinta este color en
        // su arranque, ANTES de que cargue el documento, asi que en blanco metia
        // un salto justo delante. Instalaciones existentes: lo adoptan cuando el
        // sistema refresque el manifiesto.
        background_color: '#3e8642',
        display: 'standalone',
        // La aplicacion instalada arranca en su propia pantalla, no en la
        // portada (FE #465): asi `/` deja de hacer dos papeles y no hay que
        // adivinar, mirando el tipo de navegacion, si una visita es un arranque.
        //
        // `id` FIJO y distinto de `start_url`. Sin el, la identidad de la
        // aplicacion ES su `start_url`: cambiarlo la convertiria en otra
        // aplicacion distinta a ojos del navegador, las instalaciones que ya
        // existen no adoptarian nunca la ruta nueva y el sitio volveria a ser
        // instalable, apareciendo un SEGUNDO icono. Con `id` la identidad no se
        // mueve y el manifiesto se refresca sobre la instalacion de siempre.
        id: '/',
        // Las instalaciones existentes tardan en adoptarlo —y en iOS, donde el
        // acceso directo guarda la URL al añadirlo, no lo adoptan—, asi que la
        // deteccion antigua sigue en `Landing` una release mas.
        start_url: '/start',
        scope: '/',
        icons: [
          { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // El maskable es un fichero aparte: Android recorta un 40 % y el icono
          // 'any' perderia el anillo del monograma y sus esquinas redondeadas
          { src: '/icons/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cache static assets (JS, CSS, fonts, images)
        // `version.json` se queda deliberadamente FUERA: precacheado se
        // respondería desde la caché y diría la versión de la publicación
        // anterior, que es justo la mentira que venía a quitar. Y no hace falta
        // para mover el service worker, de eso se encarga la marca del HTML
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Explicit cap so oversized assets fail the SW build loudly instead of silently
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
        runtimeCaching: [
          {
            // API calls: always fetch from network, never serve stale data
            urlPattern: /^https?:\/\/.*\/api\//,
            handler: 'NetworkOnly',
          },
          {
            // config.js NO entra en el precache: lo escribe entrypoint.sh al
            // arrancar el contenedor, cuando el manifiesto ya esta hecho. Y sin
            // el la aplicacion no arranca —`window.APP_CONFIG` se lee una vez
            // al cargar el modulo, y sin el la URL de la API cae a '' y todas
            // las peticiones se vuelven relativas—. Como ademas se sirve con
            // `no-cache`, que NO permite reutilizar la copia cuando no se puede
            // revalidar, sin esta regla la aplicacion instalada no levantaba
            // sin cobertura.
            //
            // `NetworkFirst` y no `StaleWhileRevalidate`: este fichero DICE
            // contra que API habla la aplicacion, y servir el guardado primero
            // dejaba una carga entera hablando con el host viejo tras un
            // cambio de configuracion —justo lo que la regla de nginx arregla—.
            // Con red se pide red; sin ella, o si tarda mas de la cuenta —una
            // conexion colgada, no una caida limpia, que falla al instante—,
            // se arranca con la ultima que se vio. Ojo: eso exige haberla visto
            // antes, asi que la primera apertura sin cobertura tras instalar
            // sigue sin levantar; para entonces el service worker todavia no
            // controlaba la pagina cuando se pidio este fichero.
            urlPattern: ({ url }) => url.pathname === '/config.js',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'runtime-config-v2',
              // Corto a proposito: este fichero es un `<script>` que bloquea
              // el pintado, asi que el timeout se paga en CADA arranque en
              // frio, no solo tras cambiar la configuracion. Con mala cobertura
              // pero viva —un campo de golf— tres segundos eran tres segundos
              // de pantalla en blanco. La respuesta de red se guarda aunque
              // gane el timeout, asi que la carga siguiente ya trae lo nuevo.
              networkTimeoutSeconds: 1.5,
              plugins: [
                {
                  // Una sola clave, sin el `?v=` del sello. Leer ignorando la
                  // query y escribir con ella no valia: son claves distintas,
                  // y la copia buena acababa borrada por la caducidad al
                  // cambiar el sello, que es cuando mas falta hace.
                  // Por `globalThis` porque esta funcion se serializa dentro
                  // del service worker: aqui, en la configuracion de Vite, no
                  // hay ni `Request` ni `URL` que valgan
                  cacheKeyWillBeUsed: async ({ request }) =>
                    new globalThis.Request(
                      new globalThis.URL('/config.js', request.url).href
                    ),
                  // Aqui solo vale JavaScript, y se comprueba en
                  // POSITIVO. Rechazar «lo que parezca HTML» dejaba pasar los
                  // dos casos que mas duelen: una respuesta opaca —un portal
                  // cautivo que redirige a otro origen— no trae cabeceras, y
                  // Workbox la guarda, porque su filtro por defecto acepta 200
                  // O opaca; y un HTML servido sin `content-type` tampoco
                  // parece HTML. El `!response.ok` cubre ademas el 502 o el
                  // 503 de un ingress con cuerpo JSON, que no es HTML y
                  // llegaria igual al `<script>`.
                  //
                  // El regex va sin distinguir mayusculas: los tipos MIME no
                  // las distinguen, y un proxy que normalizara
                  // «Application/JavaScript» habria hecho fallar TODAS las
                  // respuestas buenas —con copia guardada, la aplicacion se
                  // quedaria pegada al host viejo para siempre, que es justo
                  // lo que esto viene a arreglar—.
                  //
                  // Se rechaza en el fetch y no al guardar: `NetworkFirst` cae
                  // entonces a la copia guardada, asi que ni se envenena la
                  // cache ni se le entrega basura a un `<script>`. Solo mira
                  // hacia la red: lo que ya estuviera guardado no se
                  // revalida, y por eso el nombre de la cache cambia —una
                  // instalacion que hubiera guardado basura con la regla
                  // anterior arrancaria con ella para siempre, porque sin
                  // caducidad la red es el unico escritor—.
                  fetchDidSucceed: async ({ response }) => {
                    const tipo = response.headers.get('content-type') || '';
                    if (!response.ok || !/javascript|ecmascript/i.test(tipo)) {
                      throw new Error('config.js no ha llegado como JavaScript');
                    }
                    return response;
                  },
                },
              ],
            },
          },
          {
            // Google Fonts
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/offline\.html$/],
      },
    }),
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
            'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' https: data: http://localhost:8000; connect-src 'self' ws://localhost:* https://api.rydercupfriends.com http://localhost:8000 https://o4510427294662656.ingest.de.sentry.io https://*.ingest.sentry.io; worker-src 'self' blob:; child-src 'self' blob:; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none';"
          }
          for (const [key, value] of Object.entries(devHeaders)) {
            res.setHeader(key, value)
          }
          next()
        })
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          // En preview usamos el CSP estricto (sin las concesiones que necesita el HMR)
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
    // El de vitest son 5 s, y el a11y de GolfCourseForm renderiza un formulario
    // de 18 hoyos: ya rozaba ese límite y cualquier fichero de test nuevo lo
    // empuja por encima al competir por CPU. El test no es lento por estar mal,
    // es que monta mucho; 15 s le dejan margen sin ocultar un cuelgue de verdad.
    testTimeout: 15000,
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
        // Vite 8 (Rolldown) requires manualChunks as a function, not an object
        manualChunks: (id) => {
          if (['react', 'react-dom', 'react-router'].some(p => id.includes(`/node_modules/${p}/`))) {
            return 'react-vendor'
          }
          if (id.includes('/node_modules/@sentry/react/')) {
            return 'sentry'
          }
          if (id.includes('/node_modules/react-hot-toast/')) {
            return 'ui-vendor'
          }
        }
      }
    }
  }
}))
