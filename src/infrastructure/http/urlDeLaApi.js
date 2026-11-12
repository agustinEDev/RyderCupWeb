// Prioridad: 1. Runtime config (globalThis.APP_CONFIG) 2. Build-time env 3. Empty string (relative URLs for proxy)
// Si no hay API_URL configurado, usar '' para que las URLs sean relativas (/api/...)
const API_URL = globalThis.APP_CONFIG?.API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';

/**
 * Get the configured API base URL (for building direct <img>/<a> URLs that
 * don't go through apiRequest, e.g. avatar images).
 *
 * Va en su módulo y no en api.js: la interfaz lo usa a través de
 * `urlDeImagenDeLaApi` (composition/http), y si lo sacara de api.js, el cliente
 * de la API saldría de su trozo para quedar compartido con ella (un trozo más
 * en el arranque).
 * @returns {string}
 */
export const getApiBaseUrl = () => API_URL;
