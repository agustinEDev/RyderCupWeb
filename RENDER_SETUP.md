# 🚀 Guía de Configuración de Variables de Entorno en Render

> Guía paso a paso para configurar las variables de entorno de Sentry en Render.com

---

## 📋 Pre-requisitos

Antes de empezar, asegúrate de tener:

✅ Cuenta activa en [Render.com](https://render.com)
✅ Proyecto frontend desplegado en Render (Static Site o Web Service)
✅ Cuenta de Sentry.io con proyecto creado
✅ DSN de Sentry disponible

---

## 🔑 Paso 1: Obtener el DSN de Sentry

### 1.1 Acceder a Sentry.io

1. Ve a [https://sentry.io/](https://sentry.io/)
2. Inicia sesión en tu cuenta
3. Selecciona tu proyecto o crea uno nuevo

### 1.2 Obtener el DSN

1. En el panel izquierdo, ve a **Settings** (⚙️)
2. Selecciona **Projects**
3. Haz clic en tu proyecto (ej: **rydercup-web**)
4. En el menú izquierdo, ve a **Client Keys (DSN)**
5. Copia el **DSN** que aparece (formato: `https://...@o...ingest.sentry.io/...`)

**Ejemplo de DSN:**
```
https://5548cda036a3fedd1f50791b66a93354@o4510427294662656.ingest.de.sentry.io/4510427296825424
```

---

## 🌐 Paso 2: Configurar Variables en Render

### 2.1 Acceder al Dashboard de Render

1. Ve a [https://dashboard.render.com/](https://dashboard.render.com/)
2. Inicia sesión en tu cuenta
3. Selecciona tu servicio de frontend (ej: **rydercup-web**)

### 2.2 Navegar a Environment Variables

1. En el panel izquierdo, haz clic en **Environment**
2. Verás una sección llamada **Environment Variables**
3. Haz clic en **Add Environment Variable** para cada variable

### 2.3 Agregar Variables de Sentry

Agrega las siguientes variables una por una:

#### Variable 1: VITE_SENTRY_DSN
```
Key:   VITE_SENTRY_DSN
Value: https://5548cda036a3fedd1f50791b66a93354@o4510427294662656.ingest.de.sentry.io/4510427296825424
```
*(Reemplaza con tu DSN real)*

#### Variable 2: VITE_SENTRY_ENVIRONMENT
```
Key:   VITE_SENTRY_ENVIRONMENT
Value: production
```

#### Variable 3: VITE_SENTRY_DEBUG
```
Key:   VITE_SENTRY_DEBUG
Value: false
```

#### Variable 4: VITE_SENTRY_TRACES_SAMPLE_RATE
```
Key:   VITE_SENTRY_TRACES_SAMPLE_RATE
Value: 0.1
```
*(10% de transacciones monitoreadas)*

#### Variable 5: VITE_SENTRY_PROFILES_SAMPLE_RATE
```
Key:   VITE_SENTRY_PROFILES_SAMPLE_RATE
Value: 0.1
```
*(10% de perfiles de rendimiento)*

#### Variable 6: VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE
```
Key:   VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE
Value: 0.05
```
*(5% de sesiones normales grabadas)*

#### Variable 7: VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE
```
Key:   VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE
Value: 1.0
```
*(100% de sesiones con error grabadas)*

#### Variable 8: VITE_SENTRY_AUTO_SESSION_TRACKING
```
Key:   VITE_SENTRY_AUTO_SESSION_TRACKING
Value: true
```

#### Variable 9: VITE_SENTRY_ATTACH_STACKTRACE
```
Key:   VITE_SENTRY_ATTACH_STACKTRACE
Value: true
```

#### Variable 10: VITE_SENTRY_ENABLE_FEEDBACK
```
Key:   VITE_SENTRY_ENABLE_FEEDBACK
Value: false
```
*(Cambiar a `true` si quieres habilitar el widget de feedback)*

---

## 📸 Captura de Pantalla de Ejemplo

Tu configuración en Render debería verse así:

```
Environment Variables
─────────────────────────────────────────────────────────
VITE_SENTRY_DSN                          https://...ingest.sentry.io/...
VITE_SENTRY_ENVIRONMENT                  production
VITE_SENTRY_DEBUG                        false
VITE_SENTRY_TRACES_SAMPLE_RATE           0.1
VITE_SENTRY_PROFILES_SAMPLE_RATE         0.1
VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE  0.05
VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE 1.0
VITE_SENTRY_AUTO_SESSION_TRACKING        true
VITE_SENTRY_ATTACH_STACKTRACE            true
VITE_SENTRY_ENABLE_FEEDBACK              false
─────────────────────────────────────────────────────────
```

---

## 🔄 Paso 3: Desplegar los Cambios

### 3.1 Trigger Manual Deploy (Recomendado)

1. En Render, ve a tu servicio
2. Haz clic en **Manual Deploy** en la parte superior derecha
3. Selecciona **Deploy latest commit**
4. Espera a que el deploy complete (verás el progreso en tiempo real)

### 3.2 Deploy Automático (Alternativa)

Si tienes **Auto-Deploy** habilitado:

1. Render desplegará automáticamente en el próximo push a tu rama principal
2. Las nuevas variables estarán disponibles en el nuevo deploy

---

## ✅ Paso 4: Verificar la Configuración

### 4.1 Verificar en Consola del Navegador

1. Abre tu aplicación en producción (ej: `https://rydercupweb.onrender.com`)
2. Abre las DevTools (F12 o Cmd+Option+I)
3. Ve a la pestaña **Console**
4. Busca el mensaje de inicialización de Sentry:

```
┌─────────────────────────────────────────────────────────┐
│ 🚀 Sentry Initialized                                   │
├─────────────────────────────────────────────────────────┤
│ Environment:       production                           │
│ Release:           rydercup-web@1.6.0                  │
│ Debug:             false                                │
│ Traces Sample:     10%                                  │
│ Profiles Sample:   10%                                  │
│ Replays Session:   5%                                   │
│ Replays On Error:  100%                                 │
│ Feedback Widget:   false                                │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Verificar en Sentry Dashboard

1. Ve a [https://sentry.io/](https://sentry.io/)
2. Selecciona tu proyecto
3. En el panel izquierdo, ve a **Issues**
4. Deberías ver eventos llegando (si hay errores)
5. Ve a **Performance** para ver métricas de rendimiento
6. Ve a **Replays** para ver sesiones grabadas (cuando ocurran errores)

### 4.3 Probar con Error Intencional (Opcional)

Para verificar que Sentry está capturando errores:

1. Abre la consola del navegador en tu app de producción
2. Ejecuta: `throw new Error('Test Sentry Integration');`
3. Ve a tu Dashboard de Sentry
4. Deberías ver el error aparecer en **Issues** en pocos segundos

---

## 🎛️ Ajustar Sample Rates según Necesidad

### Escenario 1: Debugging Intensivo (Problema Crítico en Producción)

Si tienes un problema crítico y necesitas más datos:

```bash
VITE_SENTRY_TRACES_SAMPLE_RATE=1.0          # 100% temporalmente
VITE_SENTRY_PROFILES_SAMPLE_RATE=1.0        # 100% temporalmente
VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.5 # 50% temporalmente
```

**⚠️ Importante:** Vuelve a valores bajos (0.1, 0.05) después de resolver el problema para evitar costos altos.

### Escenario 2: Optimización de Costos (Bajo Tráfico)

Si tu aplicación tiene poco tráfico y quieres más datos:

```bash
VITE_SENTRY_TRACES_SAMPLE_RATE=0.2          # 20%
VITE_SENTRY_PROFILES_SAMPLE_RATE=0.2        # 20%
VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.1 # 10%
```

### Escenario 3: Alto Tráfico (Reducir Costos)

Si tu aplicación tiene mucho tráfico y quieres reducir costos:

```bash
VITE_SENTRY_TRACES_SAMPLE_RATE=0.05         # 5%
VITE_SENTRY_PROFILES_SAMPLE_RATE=0.05       # 5%
VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.01 # 1%
```

---

## 🔒 Seguridad: Variables Secretas

### ¿El DSN es sensible?

**Parcialmente.** El DSN de Sentry es necesario en el frontend (cliente), por lo que NO es un secreto total. Sin embargo:

✅ **Buena práctica:** No lo commitees en el código fuente (usa variables de entorno)
✅ **Protección en Sentry:** Configura **Rate Limiting** y **IP Allowlisting** en Sentry
✅ **Filtrado de datos:** Sentry ya está configurado para NO enviar passwords, tokens, etc.

### Rate Limiting en Sentry (Recomendado)

Para evitar abuso del DSN:

1. Ve a Sentry.io → Settings → Projects → [Tu Proyecto]
2. Ve a **Client Keys (DSN)**
3. Haz clic en **Configure**
4. Habilita **Rate Limiting** (ej: 1000 eventos/minuto)

---

## 🆘 Solución de Problemas

### Problema 1: Sentry no inicializa en producción

**Síntomas:**
- No aparece el log de inicialización en consola
- No se envían errores a Sentry

**Soluciones:**
1. Verifica que las variables estén configuradas correctamente en Render
2. Verifica que el DSN sea correcto (copia de Sentry.io)
3. Asegúrate de hacer un nuevo deploy después de agregar variables
4. Revisa los logs de build en Render para ver si hay errores

### Problema 2: Sample rates no se aplican

**Síntomas:**
- Sentry captura 100% de eventos en producción

**Soluciones:**
1. Verifica que `VITE_SENTRY_ENVIRONMENT=production` esté configurado
2. Asegúrate que los sample rates sean números (0.1, no "0.1" con comillas)
3. Verifica en consola que los sample rates se muestren correctamente

### Problema 3: Errores CORS en peticiones a Sentry

**Síntomas:**
- Errores de CORS en consola relacionados con `ingest.sentry.io`

**Soluciones:**
1. Esto es raro, pero verifica tu CSP (Content Security Policy) en `index.html`
2. Asegúrate que `connect-src` incluya `https://*.ingest.sentry.io`
3. Limpia caché del navegador

### Problema 4: Variables no se aplican después de deploy

**Síntomas:**
- Después de agregar variables, siguen apareciendo valores antiguos

**Soluciones:**
1. Haz un **Clear Cache & Deploy** en Render:
   - Ve a tu servicio → Settings → Clear Build Cache
   - Luego haz Manual Deploy
2. Verifica que las variables estén en la sección correcta (Environment, no Secrets)

---

## 📊 Monitoreo de Cuotas de Sentry

Sentry tiene planes con límites de eventos. Monitorea tu uso:

1. Ve a Sentry.io → Settings → Subscription
2. Revisa tu **Usage** (eventos consumidos este mes)
3. Configura **Alerts** para recibir notificaciones cuando te acerques al límite

**Recomendaciones:**
- **Plan Free:** 5,000 errores/mes → Sample rates bajos (0.05-0.1)
- **Plan Developer:** 50,000 errores/mes → Sample rates medios (0.1-0.2)
- **Plan Team:** 100,000+ errores/mes → Sample rates más altos (0.2-0.5)

---

## 🎓 Recursos Adicionales

- **Render Docs - Environment Variables:** https://render.com/docs/environment-variables
- **Sentry Docs - React:** https://docs.sentry.io/platforms/javascript/guides/react/
- **Sentry Sample Rates Guide:** https://docs.sentry.io/platforms/javascript/configuration/sampling/
- **Sentry Pricing:** https://sentry.io/pricing/

---

## ✅ Checklist Final

Antes de dar por completada la configuración, verifica:

- [ ] DSN copiado correctamente de Sentry.io
- [ ] Todas las 10 variables agregadas en Render
- [ ] Deploy realizado después de agregar variables
- [ ] Log de inicialización visible en consola de producción
- [ ] Evento de prueba visible en Sentry Dashboard
- [ ] Sample rates ajustados según tu plan de Sentry
- [ ] Rate Limiting configurado en Sentry (opcional pero recomendado)

---

**¡Listo!** Tu aplicación en Render ahora está monitoreada con Sentry. 🎉

Si tienes problemas, revisa la sección de **Solución de Problemas** o consulta los logs de Render.
