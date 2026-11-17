# ==========================================
# DOCKERFILE - RyderCupWeb Frontend (React + Vite)
# ==========================================
# Multi-stage build: Build con Node + Serve con Nginx
# ==========================================

# ==========================================
# Stage 1: Build - Construir aplicación React
# ==========================================
# Actualizado a node:22-alpine (LTS) para resolver CVE de Type Confusion (HIGH) en node:20-alpine
# Fijada por digest (INF-12): Dependabot propone el nuevo cada semana; solo el Kind la usa
FROM node:22-alpine@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a AS build

# Directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Esta imagen solo se usa en el Kind local: sin DSN, no manda errores al
# Sentry de verdad. Sin esto se colaba el del .env de quien la construye
# (2.ª pasada del QA, 12 oct 2026). Vite da prioridad al entorno sobre el .env
ARG VITE_SENTRY_DSN=""
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN

# Build: Vite mete en el bundle las VITE_* del .env (el .env.local queda
# fuera, ver .dockerignore) y del entorno, que manda
RUN npm run build

# ==========================================
# Stage 2: Production - Servir con Nginx
# ==========================================
FROM nginx:alpine@sha256:fed7e14be83cbd2661a75cdc5b872d936cf155d46c327084d30b8df19ae88d72

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
