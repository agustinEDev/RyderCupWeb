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
  BUILD_TIME: "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
};

console.log("✅ Runtime configuration loaded:", window.APP_CONFIG);
EOF

echo "✅ Archivo config.js creado exitosamente"

# ==========================================
# PASO 3: Inyectar script en index.html
# ==========================================
# Añadir <script src="/config.js"></script> antes de </head>
# Solo si no existe ya (para evitar duplicados en reinicios)
if ! grep -q "config.js" /usr/share/nginx/html/index.html; then
  echo "📝 Inyectando script config.js en index.html..."
  sed -i 's|</head>|  <script src="/config.js"></script>\n  </head>|' /usr/share/nginx/html/index.html
  echo "✅ Script inyectado exitosamente"
else
  echo "ℹ️  Script config.js ya existe en index.html, saltando inyección"
fi

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
