# ==========================================
# DOCKERFILE - RyderCupWeb Frontend (React + Vite)
# ==========================================
# Multi-stage build: Build con Node + Serve con Nginx
# ==========================================

# ==========================================
# Stage 1: Build - Construir aplicación React
# ==========================================
# Actualizado a node:22-alpine (LTS) para resolver CVE de Type Confusion (HIGH) en node:20-alpine
FROM node:22-alpine AS build

# Directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Build para producción
# NOTA: Variables de entorno se inyectarán en runtime, no en build time
RUN npm run build

# ==========================================
# Stage 2: Production - Servir con Nginx
# ==========================================
FROM nginx:alpine

# Copiar archivos construidos desde stage 1
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuración personalizada de nginx
# El fragmento de cabeceras va a snippets/ y no a conf.d/, porque el nginx.conf
# principal hace include de conf.d/*.conf y lo cargaria por su cuenta.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-security-headers.conf /etc/nginx/snippets/security-headers.conf

# Copiar script de entrypoint para inyectar variables en runtime
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Exponer puerto 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Ejecutar entrypoint que inyecta variables y arranca nginx
ENTRYPOINT ["/entrypoint.sh"]
