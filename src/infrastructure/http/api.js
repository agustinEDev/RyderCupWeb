/**
 * Base API configuration and utilities
 * v1.13.0: Added CSRF Protection for POST/PUT/PATCH/DELETE requests
 */

import {
  fetchWithTokenRefresh,
  refrescoCompartido,
  trataElFalloDelRefresco,
  conElTokenAlDia,
} from './tokenRefreshInterceptor.js';
import { getCsrfToken, getCsrfCookie } from './csrfTokenSync'; // v1.13.0: CSRF Protection
import { handleCsrfLogout } from './csrfLogout'; // v1.13.0: Centralized CSRF logout
import { cabeceraDelModoDeLaApp } from '../../utils/modoDeLaApp';
// Traducir, informar a Sentry y los Términos pendientes: de la interfaz, que la
// composition root registra (la infraestructura no llega a i18n, Sentry ni al router)
import { interfaz } from './interfazDelTransporte';
import { TERMINOS_NO_ACEPTADOS } from '../../domain/services/aceptacionDeTerminos';
import { getApiBaseUrl } from './urlDeLaApi';
import { esRutaDeLaApiSegura, rechazaLaRuta } from './rutaDeLaApi';

// Para que los repositorios construyan sus rutas (FE-03): llegan a http solo por aquí
export { segmento, RutaDeLaApiNoValida } from './rutaDeLaApi';

/**
 * La llamada de red, con el aviso de «sin conexión» ya traducido (FE #685).
 *
 * Sin red, `fetch` rechaza con un `TypeError` y el texto del navegador —«Failed
 * to fetch», «Load failed»…—, que 52 toasts enseñaban tal cual. Se cambia por el
 * texto de la app, pero SIGUE SIENDO un `TypeError`: `esFalloDeRed` reconoce así
 * la falta de cobertura, y todo lo que ya la trataba sigue igual. Solo se
 * envuelve la llamada de red, para no disfrazar de cobertura un fallo de otro tipo.
 */
const llamaAlBackend = async (url, config) => {
  try {
    return await fetchWithTokenRefresh(url, config);
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    throw sinConexion(error);
  }
};

/**
 * El error de falta de cobertura, con la marca explícita `sinConexion` que mira
 * `esFalloDeRedDeLaApi`: un `TypeError` del código no la lleva, y así no se
 * confunden. Lo crean el fallo de `fetch`, su tope y el cuerpo que se corta a
 * medias. El original queda en `cause`.
 */
const sinConexion = (causa) =>
  Object.assign(new TypeError(interfaz().traduce('common:sinConexion.mensaje'), { cause: causa }), {
    sinConexion: true,
  });

const esRechazoCsrf = (response, errorData) =>
  response.status === 403 && errorData?.error_code === 'CSRF_VALIDATION_FAILED';

/**
 * Cierra la sesión por CSRF y lanza el error MARCADO: quien vacía la cola de
 * anotaciones necesita distinguirlo de un error sin código cualquiera, porque
 * este vale para toda la sesión y no para una anotación. Sin la marca, cada
 * golpe de la cola disparaba su propio cierre de sesión (FE #521)
 */
const cierraPorCsrf = (errorData, contexto) => {
  handleCsrfLogout(errorData, contexto);
  throw errorDeCsrf();
};

/** El error de cierre de sesión por CSRF, marcado para la cola (FE #521) */
const errorDeCsrf = () =>
  Object.assign(new Error('CSRF validation failed. Please log in again.'), {
    errorCode: 'CSRF_VALIDATION_FAILED',
  });

/**
 * Tras un 403 CSRF, el refresco compartido: rota la cookie y el token a la vez
 * (hotfix 2.63.1). Si falla:
 * - el servidor dijo 401: la sesión está muerta. Lo trata el interceptor
 *   —aviso de caducada o de revocado, y sin cierres duplicados— y sube el
 *   error marcado, que la cola reconoce como de toda la sesión;
 * - el servidor contestó otra cosa (429, 5xx): ese estado, con su texto. La
 *   cola los guarda para después, y no es falta de cobertura;
 * - sin respuesta (red, tope del refresco): falta de cobertura.
 */
const renuevaTrasCsrf = async () => {
  try {
    await refrescoCompartido();
  } catch (error) {
    const respuesta = error?.response;
    if (!respuesta) throw sinConexion(error);
    if (respuesta.status === 401) {
      trataElFalloDelRefresco(error);
      throw errorDeCsrf();
    }
    const fallo = new Error(
      respuesta.status === 429
        ? interfaz().traduce('common:demasiadasPeticiones')
        : `HTTP ${respuesta.status}: ${respuesta.statusText}`
    );
    throw Object.assign(fallo, { status: respuesta.status, statusCode: respuesta.status, errorCode: null });
  }
};

const leeElError = async (response) => {
  try {
    return await response.json();
  } catch (jsonError) {
    // If parsing fails, errorData remains empty object
    console.warn('Failed to parse error response as JSON:', jsonError);
    return {};
  }
};

// La URL base, en su módulo (urlDeLaApi.js)
const API_URL = getApiBaseUrl();

/**
 * Make authenticated API request with httpOnly cookies and automatic token refresh
 * @param {string} endpoint - API endpoint (e.g., '/api/v1/competitions')
 * @param {object} options - Fetch options. Con `topeMs`, la petición se corta
 *   a ese tiempo y se trata como falta de cobertura (FE #624). Cubre la petición
 *   ENTERA: un refresco del token y su reintento, y el cuerpo, que puede
 *   colgarse después de las cabeceras. No se le pasa a `fetch`, y no se combina
 *   con una `signal` propia: si llegan las dos, manda la del tope. Hoy nadie
 *   pasa `signal` a `apiRequest`; quien la necesite tendrá que combinarlas
 * @returns {Promise<any>} - Response data
 *
 * SECURITY:
 * - Authentication uses httpOnly cookies instead of Authorization headers
 * - Browser automatically sends cookies with credentials: 'include'
 * - Protects against XSS attacks (JavaScript cannot access httpOnly cookies)
 * - Automatic token refresh on 401 responses (transparent to caller)
 *
 * AUTOMATIC TOKEN REFRESH:
 * - When access token expires (401), automatically calls /auth/refresh-token
 * - Retries the original request with the new token
 * - Only redirects to login if refresh token also expired
 * - Shares one refresh promise so multiple 401s do not each ask for a refresh
 */
export const apiRequest = async (endpoint, { topeMs, ...options } = {}) => {
  // Solo rutas propias de la API, sin «..» ni otro servidor (FE-03): ni las cookies ni el
  // token CSRF salen hacia una ruta que el navegador resolvería en otra
  if (!esRutaDeLaApiSegura(endpoint)) rechazaLaRuta((options.method || 'GET').toUpperCase());
  // Cuándo salió la petición: con los Términos pendientes, decide si su 403 es de la
  // pantalla a la que se navega o de la actual (utils/navegacionEnCurso)
  const inicio = globalThis.performance.now();
  // FormData (file uploads): the browser must set its own Content-Type header
  // with the multipart boundary — setting it manually here would break parsing.
  const isFormData = options.body instanceof FormData;
  const defaultHeaders = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    // La app instalada se distingue del navegador del mismo móvil (FE #1046),
    // también al subir ficheros
    ...cabeceraDelModoDeLaApp(),
  };

  // v1.13.0: CSRF Protection - Add X-CSRF-Token header for state-changing requests
  const method = (options.method || 'GET').toUpperCase();
  const requiresCsrf = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  if (requiresCsrf) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      defaultHeaders['X-CSRF-Token'] = csrfToken;
    } else {
      console.warn(`CSRF token missing for ${method} ${endpoint}`);
    }
  }

  // Solo quien lo pide: las demás llamadas esperan a servicios externos lentos
  // —la RFEG, el correo— y cortarlas las daría por fallidas cuando el servidor
  // sí las termina
  const corte = topeMs ? new AbortController() : null;
  const temporizador = corte && setTimeout(() => corte.abort(), topeMs);
  // Lo que se espera compite con el tope, en vez de fiarlo todo a la señal: el
  // interceptor espera al refresco compartido del token sin mirarla, y hay
  // motores —WebKit— que al abortar rechazan con otro error y no con su motivo.
  // Así, al vencer, se rechaza con el motivo pase lo que pase dentro
  const vence = corte && new Promise((_, rechaza) => {
    corte.signal.addEventListener('abort', () => rechaza(corte.signal.reason), { once: true });
  });
  // Si vence mientras se lee el cuerpo de un error, nadie la está esperando
  vence?.catch(() => {});
  const aTiempo = (promesa) => (vence ? Promise.race([promesa, vence]) : promesa);

  const config = {
    ...options,
    ...(corte && { signal: corte.signal }),
    // CRITICAL: credentials: 'include' tells the browser to send httpOnly cookies
    credentials: 'include',
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  // Siempre contra la API: una dirección absoluta ya no se acepta (esRutaDeLaApiSegura)
  const url = `${API_URL}${endpoint}`;

  try {
    // Lo que había en la cookie al salir: si no había, el rechazo es la
    // cookie caducada a los 15 minutos, lo normal tras un rato quieto
    const cookieAlSalir = requiresCsrf ? getCsrfCookie() : null;
    const enviado = config.headers['X-CSRF-Token'] ?? null;

    // Use interceptor that handles automatic token refresh on 401
    let response = await aTiempo(llamaAlBackend(url, config));
    let errorData = response.ok ? null : await leeElError(response);

    // Un 403 CSRF lo da el middleware ANTES de ejecutar nada: repetir es
    // seguro. Se refresca y se repite UNA vez con el token nuevo; el token de
    // memoria se quedaba atrás cuando otra pestaña rotaba la cookie, y eso
    // echaba de la aplicación (hotfix 2.63.1, pasada del iPhone del 4 nov)
    if (!response.ok && esRechazoCsrf(response, errorData)) {
      // Para el aviso a Sentry si no se recupera (FE #1042)
      const delAviso = { metodo: method, endpoint, estado: 403 };
      // Si la COOKIE ya no es la que se mandó —otra pestaña refrescó—, basta
      // con repetir: otro refresco solo la rotaría otra vez. La memoria no
      // vale para esto: sin cookie puede ser más vieja que lo enviado
      const cookie = getCsrfCookie();
      const yaRotada = cookie !== null && cookie !== enviado;
      if (!yaRotada) await aTiempo(renuevaTrasCsrf());
      const nuevo = getCsrfToken();
      // Sin token, o con el mismo que se rechazó, el reintento solo puede
      // fallar otra vez: se cierra sin mandarlo
      if (!nuevo || nuevo === enviado) cierraPorCsrf(errorData, delAviso);
      // Que se vea si pasa a menudo, pero solo lo raro: con cookie al salir y
      // aun así rechazada. Método y ruta, nunca el token
      if (cookieAlSalir !== null) {
        interfaz().informaDelError('CSRF token rejected with a cookie present: retried once', {
          level: 'warning',
          tags: { module: 'csrf' },
          extra: { method, ruta: endpoint.split('?')[0] },
        });
      }
      response = await aTiempo(llamaAlBackend(url, conElTokenAlDia(config, { siempre: true })));
      errorData = response.ok ? null : await leeElError(response);
      if (!response.ok && esRechazoCsrf(response, errorData)) cierraPorCsrf(errorData, delAviso);
    }

    if (!response.ok) {
      // Términos sin aceptar (F4): a la pantalla de aceptarlos, una sola vez y
      // recargando. La llamada NO se queda colgada (ese patrón se retiró del
      // interceptor): sigue abajo como un error marcado, que la cola guarda para
      // después. Si la página se va, su aviso se calla; si no se va —un
      // desacuerdo del servidor, o una ruta desde la que no se redirige—, se
      // enseña como «no disponible»
      const terminosPendientes = response.status === 403 && errorData.error_code === TERMINOS_NO_ACEPTADOS;
      const seVaAAceptar = terminosPendientes && interfaz().llevaAAceptarLosTerminos({ inicio });

      // Extract error message with proper fallback chain
      let errorMessage = '';

      if (seVaAAceptar) {
        errorMessage = interfaz().traduce('common:terminosPendientes');
        interfaz().silenciaElAviso(errorMessage);
      } else if (terminosPendientes) {
        errorMessage = interfaz().traduce('common:terminosNoDisponible');
      } else if (response.status === 429) {
        // El del backend es técnico y en inglés («Rate limit exceeded: 10 per
        // 1 minute»): se dice el de la app. El `status` sigue en el error, que
        // es por lo que lo reconocen la cola y las pantallas (4 oct 2026)
        errorMessage = interfaz().traduce('common:demasiadasPeticiones');
      } else if (errorData.detail) {
        // FastAPI returns errors in 'detail' field. On 422s it's a list of
        // Pydantic error objects ({ type, loc, msg, input, ctx }) rather than
        // a string — extract `msg` from each so the user sees readable text
        // instead of the raw JSON blob.
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail
            .map((err) => err?.msg || JSON.stringify(err))
            .join('; ');
        } else {
          errorMessage = JSON.stringify(errorData.detail);
        }
      } else if (errorData.message) {
        // Some APIs use 'message' field
        errorMessage = errorData.message;
      } else if (errorData.error) {
        // Some APIs use 'error' field
        errorMessage = errorData.error;
      } else {
        // Fallback to HTTP status text
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }

      // Create structured error with status code for better error handling
      const error = new Error(errorMessage);
      error.status = response.status;
      error.statusCode = response.status; // Alias for compatibility
      error.errorCode = errorData.error_code || null;
      // Lo que el servidor manda además del mensaje, para que la pantalla lo
      // diga en su idioma (claves siempre, BE #360)
      error.data = errorData;
      throw error;
    }

    // Handle no content responses (e.g., 204 from DELETE)
    if (response.status === 204) {
      return null;
    }

    // Return parsed JSON. Un `TypeError` al leer el cuerpo es la conexión que se
    // cortó a medias: falta de cobertura, como el de `fetch`. Un `SyntaxError`
    // (un 200 que no es JSON, el portal de una wifi) sí tuvo respuesta y sube tal cual
    try {
      return await aTiempo(response.json());
    } catch (error) {
      if (error instanceof TypeError) throw sinConexion(error);
      throw error;
    }
  } catch (error) {
    console.error('API Request Error:', error);
    // Se venció el tope: para quien juega, un servidor que no contesta y la
    // falta de cobertura son lo mismo, y así lo trata todo lo que ya la
    // reconoce —la cola guarda el golpe y suelta el cerrojo—. Solo el del
    // propio tope: un error que llegó antes —una sesión caducada en el refresco
    // que se esperaba, o un 409 cuyo cuerpo tardaba— es la respuesta
    if (corte && error === corte.signal.reason) {
      throw sinConexion(error);
    }
    throw error;
  } finally {
    clearTimeout(temporizador);
  }
};

export default apiRequest;
