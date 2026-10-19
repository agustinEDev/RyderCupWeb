# Cabeceras de seguridad

## Dónde se configuran

| Entorno | Fuente de las cabeceras | Fichero / lugar |
|---|---|---|
| **Producción** (`www.rydercupfriends.com`) | Dashboard de Render → Static Site `RyderCupWeb` → **Headers** | No está en el repo |
| **Docker / k8s local** | nginx dentro de la imagen | `nginx.conf` |
| **Vite dev** (`localhost:5173`) | Cabeceras del dev server | `vite.config.js` |

Producción es un **Render Static Site**, y Render sirve las cabeceras desde su propia
configuración. **No lee `vercel.json`, ni `public/_headers`, ni `nginx.conf`.** Ambos
ficheros existieron en este repo hasta agosto de 2026 aparentando ser configuración
activa sin serlo; se eliminaron para que nadie los vuelva a confundir con la realidad
(ver #295).

`nginx.conf` **sí** es real, pero solo para la imagen Docker (k8s local), no para producción.

## Valor aplicado en producción

Con `Request Path` = `/*`, para que cubra también `/assets/`:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' https: data:; connect-src 'self' https://www.ign.es https://geoserveis.icgc.cat https://www.geo.euskadi.eus https://idena.navarra.es https://api.rydercupfriends.com https://o4510427294662656.ingest.de.sentry.io https://*.ingest.sentry.io; worker-src 'self' blob:; child-src 'self' blob:; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests;
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(self), microphone=(), camera=()
```

## Por qué `connect-src` lleva `https://www.ign.es` y las ortofotos de comunidad

El mapa del hoyo (BE #532) pinta la ortofoto del PNOA, y MapLibre pide sus teselas
con `fetch`, no con `<img>`: sin el IGN en `connect-src` el mapa sale gris. Al
desplegarlo hay que **añadirlo también en el dashboard de Render**, que no lee este
repositorio.

Desde el 19 oct 2026, en Cataluña, País Vasco y Navarra va encima la ortofoto de la
comunidad, más reciente (2025): `geoserveis.icgc.cat`, `www.geo.euskadi.eus` e
`idena.navarra.es`. Madrid se quedó con la PNOA: su 2025 se veía peor. Sin ellos en `connect-src` (también en
Render) no se rompe nada: se sigue viendo la PNOA de debajo. `geolocation=(self)` en `Permissions-Policy` es lo que deja usar el GPS.

## Por qué `style-src` lleva `'unsafe-inline'`

Porque sin él la CSP **rompe la apariencia entera de la aplicación**: React aplica estilos
inline y **framer-motion** anima escribiendo el atributo `style` en tiempo de ejecución.
Comprobado en producción con el evento `securitypolicyviolation`: se disparaban
`style-src-attr` y `style-src-elem`.

Entre diciembre de 2025 y agosto de 2026 la política declaraba `style-src 'self'` a secas
y nadie lo notó, sencillamente porque **la CSP no llegaba a aplicarse en ningún sitio**.

`'unsafe-inline'` en *estilos* tiene un riesgo muy inferior al de scripts. **`script-src`
se mantiene estricto** y la aplicación no tiene ni un solo script inline, así que un XSS
inyectado no se ejecuta. Verificado: un `<script>` inline inyectado a mano es bloqueado.

## Cómo verificar

```bash
curl -sI https://www.rydercupfriends.com/ | grep -iE \
  'content-security-policy|strict-transport|x-frame|referrer-policy|permissions-policy'
```

⚠️ **El service worker cachea el HTML con sus cabeceras.** Tras cambiar una cabecera, el
navegador puede seguir aplicando la anterior aunque `curl` ya devuelva la nueva. Para
comprobarlo de verdad hay que desregistrar el service worker, borrar `caches` y recargar.
Por lo mismo, un cambio de cabeceras tarda en llegar a los usuarios recurrentes.

## Notas sobre la arquitectura

`www` y `api` son registros **"Solo DNS"** (nube gris) en Cloudflare, apuntando a Render.
El tráfico **no** pasa por el proxy de Cloudflare de la cuenta, así que las *Transform
Rules* de Cloudflare no se aplican y no sirven para inyectar cabeceras aquí.

Las respuestas incluyen `cf-ray` y `server: cloudflare` porque **Render sirve sus Static
Sites a través de su propio Cloudflare**. No confundir eso con que el dominio esté
proxied: comprobar siempre el registro DNS.
