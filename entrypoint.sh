#!/bin/sh
# ==========================================
# ENTRYPOINT SCRIPT - Inyección de Variables en Runtime
# ==========================================
# Este script reemplaza las variables de entorno en los archivos
# JavaScript compilados ANTES de arrancar nginx.
# Esto permite configurar la app SIN recompilar la imagen Docker.
# ==========================================

set -e  # Salir si algún comando falla

echo "🚀 Iniciando entrypoint script..."

# ==========================================
# PASO 1: Definir variables de entorno por defecto
# ==========================================
# Si no están definidas, usar valores por defecto
export VITE_API_BASE_URL=${VITE_API_BASE_URL:-"http://localhost:8000"}
export VITE_APP_NAME=${VITE_APP_NAME:-"Ryder Cup Friends"}
export VITE_ENVIRONMENT=${VITE_ENVIRONMENT:-"production"}

echo "📝 Variables de entorno detectadas:"
echo "   VITE_API_BASE_URL: $VITE_API_BASE_URL"
echo "   VITE_APP_NAME: $VITE_APP_NAME"
echo "   VITE_ENVIRONMENT: $VITE_ENVIRONMENT"

# ==========================================
# PASO 2: Crear archivo de configuración runtime
# ==========================================
# Generamos un archivo config.js que será cargado por index.html
BUILD_TIME_ISO="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

cat > /usr/share/nginx/html/config.js <<EOF
// ==========================================
// RUNTIME CONFIGURATION - Generado por entrypoint.sh
// ==========================================
// Este archivo es generado dinámicamente al arrancar el contenedor
// No editar manualmente - usa variables de entorno en Kubernetes
// ==========================================

window.APP_CONFIG = {
  API_BASE_URL: "${VITE_API_BASE_URL}",
  APP_NAME: "${VITE_APP_NAME}",
  ENVIRONMENT: "${VITE_ENVIRONMENT}",
  VERSION: "1.0.0",
  BUILD_TIME: "${BUILD_TIME_ISO}"
};

console.log("✅ Runtime configuration loaded:", window.APP_CONFIG);
EOF

echo "✅ Archivo config.js creado exitosamente"

# ==========================================
# PASO 3: Inyectar script en index.html
# ==========================================
# Añadir <script src="/config.js?v=..."></script> antes de </head>.
#
# El sello sale del CONTENIDO del fichero, no del reloj: con dos replicas, una
# marca de tiempo daba un index.html distinto por replica, y un navegador que
# revalidara contra otra recibia 200 con bytes nuevos en cada salto en vez de
# un 304. Con el hash, dos replicas con la misma configuracion sirven lo mismo
# y la URL solo cambia cuando cambia la configuracion, que es lo que dice.
#
# Ojo con lo que este `?v=` NO hace: a un cliente que ya tenga el service
# worker instalado no le llega, porque index.html esta precacheado y su
# revision es el hash del build, que no se mueve al cambiar una variable de
# entorno. A esos les llega por la cabecera `no-cache` de config.js. El sello
# sirve para el resto: navegador sin SW, o primera carga.
#
# Se REESCRIBE la etiqueta si ya estaba, en vez de saltarsela: un contenedor
# reiniciado en sitio conserva su index.html y se quedaba con la etiqueta
# vieja.
# Del contenido de la CONFIGURACION, no del fichero: dentro va tambien
# BUILD_TIME, que es la hora de arranque, y hashear eso devolveria un sello
# distinto por replica —justo lo que se quiere evitar—.
CONFIG_STAMP="$(printf '%s|%s|%s' "${VITE_API_BASE_URL}" "${VITE_APP_NAME}" "${VITE_ENVIRONMENT}" | md5sum | cut -c1-12)"
ETIQUETA="<script src=\"/config.js?v=${CONFIG_STAMP}\"></script>"

if grep -qE '<script src="/config\.js[^"]*"></script>' /usr/share/nginx/html/index.html; then
  echo "📝 Actualizando la etiqueta de config.js en index.html..."
  sed -i -E "s|<script src=\"/config\.js[^\"]*\"></script>|${ETIQUETA}|" /usr/share/nginx/html/index.html
else
  echo "📝 Inyectando script config.js en index.html..."
  sed -i "s|</head>|  ${ETIQUETA}\n  </head>|" /usr/share/nginx/html/index.html
fi

# El `grep` y el `sed` de arriba miran el mismo patron, pero si alguna vez
# dejan de coincidir —una etiqueta con `defer`, pongamos— `sed` no sustituiria
# nada, saldria con 0 y `set -e` no se enteraria: el index se quedaria sin
# sello y sin una sola linea que lo dijera.
if ! grep -q "config.js?v=${CONFIG_STAMP}" /usr/share/nginx/html/index.html; then
  echo "❌ ERROR: index.html no ha quedado apuntando a config.js?v=${CONFIG_STAMP}"
  exit 1
fi
echo "✅ index.html pide config.js?v=${CONFIG_STAMP}"

# ==========================================
# PASO 4: Verificar archivos críticos
# ==========================================
if [ ! -f "/usr/share/nginx/html/index.html" ]; then
  echo "❌ ERROR: index.html no encontrado"
  exit 1
fi

if [ ! -f "/etc/nginx/conf.d/default.conf" ]; then
  echo "❌ ERROR: nginx.conf no encontrado"
  exit 1
fi

echo "✅ Archivos críticos verificados"

# ==========================================
# PASO 5: Iniciar nginx
# ==========================================
echo "🚀 Iniciando nginx..."
echo "================================================"
exec nginx -g 'daemon off;'
