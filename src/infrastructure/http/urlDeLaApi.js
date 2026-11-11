import { esRutaDeLaApiSegura } from './rutaDeLaApi';

// Prioridad: 1. Runtime config (globalThis.APP_CONFIG) 2. Build-time env 3. Empty string (relative URLs for proxy)
// Si no hay API_URL configurado, usar '' para que las URLs sean relativas (/api/...)
const API_URL = globalThis.APP_CONFIG?.API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';

/**
 * Get the configured API base URL (for building direct <img>/<a> URLs that
 * don't go through apiRequest, e.g. avatar images).
 *
 * Va en su módulo y no en api.js: la interfaz lo pide por composition/http, y si
 * lo sacara de api.js, el cliente de la API saldría de su trozo para quedar
 * compartido con ella (un trozo más en el arranque).
 * @returns {string}
 */
export const getApiBaseUrl = () => API_URL;

/**
 * La dirección de una imagen cuya ruta manda el servidor (el `image_url` de los avatares),
 * o `null` si no es una ruta de la propia API (FE-11, fase 4 del plan a 9): pegada a la
 * base sin comprobar, `@evil.example/x` se pedía a otro servidor, con credenciales en las
 * fotos subidas. Lo mismo que exige `apiRequest`: `/api/…`, sin `..` ni otro servidor.
 * @param {unknown} ruta
 * @returns {string|null}
 */
export const urlDeImagenDeLaApi = (ruta) => (esRutaDeLaApiSegura(ruta) ? `${API_URL}${ruta}` : null);
