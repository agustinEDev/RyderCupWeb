/**
 * Token Refresh Interceptor
 *
 * Automatically handles token refresh when access tokens expire (401 responses).
 * Uses httpOnly cookies for secure token management.
 *
 * Security Features:
 * - Prevents multiple simultaneous refresh attempts by sharing one refresh promise
 * - Automatically retries failed requests after refreshing
 * - Handles refresh token expiration with automatic logout
 * - Uses httpOnly cookies (XSS protection)
 * - v1.13.0: Updates CSRF token after refresh
 *
 * @module tokenRefreshInterceptor
 */

// Si una ruta es pública, y el aviso a Sentry de un cierre: de la interfaz, que la
// composition root registra (la infraestructura no llega al router ni a Sentry)
import { interfaz } from './interfazDelTransporte';


import { setCsrfTokenGlobal, getCsrfToken } from './csrfTokenSync'; // v1.13.0: CSRF Protection

import {
  isDeviceRevoked,
  isSessionExpired,
  handleDeviceRevocationLogout,
  handleSessionExpiredLogout
} from './deviceRevocationLogout'; // v1.13.1: Device Revocation, v2.0.4: Separated expiration
import { esUn401DeToken, MOTIVO_DEL_CIERRE, motivoDelRefrescoRechazado } from '../../utils/motivosDelCierre';

import { RUTA_DEL_REFRESCO } from '../../utils/rutasDeLaSesion';
import { cabeceraDelModoDeLaApp } from '../../utils/modoDeLaApp';
import { usuarioDeLaPestana } from '../../utils/usuarioDeLaPestana';

/**
 * Si queda sesion guardada. Va envuelto porque `localStorage` LANZA en varios
 * sitios reales —Safari bloqueando cookies, un WebView incrustado, politicas de
 * empresa— y esto vive dentro de una funcion cuyo `catch` relanza: sin la
 * envoltura, cualquier 401 dejaria de ser una respuesta y pasaria a ser una
 * excepcion, que acaba echando al usuario a `/login`.
 */
const hayUsuarioGuardado = () => {
  try {
    return Boolean(localStorage.getItem('user'));
  } catch {
    return false;
  }
};

const API_URL = globalThis.APP_CONFIG?.API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';

// El refresco que hay en vuelo ahora mismo, o null si no hay ninguno.
//
// Una PROMESA y no un booleano con su cola aparte (FE #518). Con el booleano,
// «se ha terminado el refresco» y «se ha vaciado la cola» eran dos momentos
// distintos, y entre ellos cabia una peticion: la que daba 401 mientras el que
// refresco reintentaba su peticion original se encolaba en una cola ya vaciada
// y su promesa no se resolvia NUNCA. En `submitScore` eso era un `await`
// eterno y un hoyo que ni se enviaba ni se guardaba para luego.
//
// Con la promesa, esperar al refresco y saber que ha terminado son lo mismo,
// asi que no hay hueco donde caerse. Y se sigue cumpliendo lo que el booleano
// protegia: mientras haya una en vuelo, quien llega se engancha a ella en vez
// de pedir otro refresco.
let refrescoEnCurso = null;

// Cuanto se espera a que el servidor conteste al refresco antes de darlo por
// perdido. Generoso a proposito: una red lenta no es una sesion invalida, y
// abortar demasiado pronto echaria a alguien de la aplicacion en mitad de una
// vuelta (FE #514). Lo que no puede es esperar para siempre
const TOPE_DEL_REFRESCO_MS = 15000;

// Las rutas que piden la contraseña actual y contestan 401 si está mal: ese 401 no es
// de la sesión, y no se refresca ni se repite (RyderCupAm #753)
const RUTAS_CON_CONTRASENA_ACTUAL = ['/api/v1/users/security', '/api/v1/auth/reauthenticate'];

// Momento del ultimo refresco con exito en esta carga de la pagina, o null si
// todavia no ha habido ninguno. Lo consulta el refresco proactivo, que de otro
// modo solo puede suponer la edad del token: la cookie es httpOnly y no se
// puede consultar desde JavaScript (FE #392).
let lastRefreshAt = null;

// Cuantos refrescos con exito van en esta carga de la pagina. Un CONTADOR y no
// la marca de tiempo de arriba: `Date.now()` va en milisegundos, y un refresco
// rapido puede caer en el mismo milisegundo en que salio la peticion, con lo
// que «ya se refresco despues» daba falso justo cuando era cierto
let refrescosCompletados = 0;

/**
 * @returns {number|null} Timestamp del ultimo refresco con exito, o null si no
 * ha habido ninguno desde que se cargo la pagina.
 */
export const getLastRefreshAt = () => lastRefreshAt;

// Lo que se espera antes de repetir un refresco con `SESSION_REPLACED`: si el que
// ganó ya está en la BD pero su `Set-Cookie` aún no ha llegado al navegador, repetir
// en el acto volvería a mandar la cookie vieja
const ESPERA_TRAS_SUSTITUIDA_MS = 500;

const esDeOtraCuenta = (data) => {
  const dePestana = usuarioDeLaPestana()?.id;
  const delRefresco = data?.user?.id;
  return Boolean(dePestana && delRefresco && dePestana !== delRefresco);
};

const anotaElRefresco = () => {
  lastRefreshAt = Date.now();
  refrescosCompletados += 1;
};

const esSesionSustituida = (error) => error?.errorData?.error_code === 'SESSION_REPLACED';

/**
 * Un POST al refresco, con su tope de tiempo.
 * @returns {Promise<object>} Lo que contestó el servidor
 * @throws {Error} - Si falla; con `.response` y `.errorData` si contestó el servidor
 */
const pideElRefresco = async () => {
  // Con tope de tiempo, y no es un adorno: desde FE #518 TODA peticion que
  // reciba un 401 espera a este refresco. Un `fetch` que se queda colgado
  // —lo normal en un movil con mala cobertura, donde la conexion no falla,
  // simplemente no contesta— dejaria esperando indefinidamente a todas. Que
  // es exactamente el fallo que aquella issue vino a cerrar, alcanzado por
  // otro camino. Cubre tambien la lectura del cuerpo, que puede pararse igual
  // con las cabeceras ya recibidas
  const corte = new AbortController();
  const temporizador = setTimeout(() => corte.abort(), TOPE_DEL_REFRESCO_MS);

  try {
    console.log('🔄 [TokenRefresh] Attempting to refresh access token...');

    const response = await fetch(`${API_URL}/api/v1/auth/refresh-token`, {
      method: 'POST',
      credentials: 'include', // Critical: sends httpOnly cookies
      headers: {
        'Content-Type': 'application/json',
        // El refresco también registra el dispositivo (FE #1046)
        ...cabeceraDelModoDeLaApp(),
      },
      signal: corte.signal,
    });

    if (!response.ok) {
      console.error('❌ [TokenRefresh] Refresh failed:', response.status, response.statusText);

      // Parse error response to get detail message
      let errorData = {};
      try {
        errorData = await response.json();
      } catch (errorDelCuerpo) {
        // Un cuerpo que no es JSON se ignora. Uno cortado, por la red o por el tope,
        // no es una respuesta: sin saber el código, no se cierra la sesión por él
        if (!(errorDelCuerpo instanceof SyntaxError)) throw errorDelCuerpo;
      }

      // Refresh token expired or invalid
      if (response.status === 401) {
        const error = new Error(errorData.detail || 'Refresh token expired. Please login again.');
        error.response = response;
        error.errorData = errorData;
        throw error;
      }

      const error = new Error('Failed to refresh token');
      error.response = response;
      error.errorData = errorData;
      throw error;
    }

    // v1.13.0: Backend now returns new csrf_token on refresh
    const data = await response.json();
    if (data.csrf_token) {
      setCsrfTokenGlobal(data.csrf_token);
      console.log('✅ [TokenRefresh] CSRF token updated');
    }

    console.log('✅ [TokenRefresh] Access token refreshed successfully');

    // Backend sets new access_token cookie automatically (httpOnly)
    // No need to handle token manually

    return data;
  } catch (error) {
    console.error('❌ [TokenRefresh] Error refreshing token:', error);
    throw error;
  } finally {
    clearTimeout(temporizador);
  }
};

/**
 * El POST al refresco, y uno más si contesta `SESSION_REPLACED`.
 *
 * Con `SESSION_REPLACED` (BE #734) el navegador ya tiene una sesión más nueva y el
 * servidor no ha borrado la cookie: se repite UNA vez con la cookie nueva. Si vuelve a
 * contestar lo mismo, no es un «no» a la sesión: sube como un fallo sin respuesta —un
 * `TypeError` sin `.response`, igual que el de `fetch` sin red—, que todos los que
 * esperan un refresco ya saben tratar conservando la sesión. La ventana del backend
 * dura 5 minutos: pasados, contesta un rechazo normal y ahí sí se cierra.
 *
 * @returns {Promise<object>} Lo que contestó el servidor
 */
const pideConUnReintento = async () => {
  try {
    return await pideElRefresco();
  } catch (error) {
    if (!esSesionSustituida(error)) throw error;
  }

  await new Promise((resolve) => setTimeout(resolve, ESPERA_TRAS_SUSTITUIDA_MS));

  try {
    return await pideElRefresco();
  } catch (error) {
    if (!esSesionSustituida(error)) throw error;
    throw new TypeError('The session was replaced and the new cookie has not arrived yet', { cause: error });
  }
};

/**
 * Refresh the access token using the refresh token cookie
 *
 * @returns {Promise<boolean>} - True if refresh was successful
 * @throws {Error} - If refresh fails
 */
export const refreshAccessToken = async () => {
  const data = await pideConUnReintento();

  // La cookie es de otra cuenta que entró en este navegador. Lo que estaba en vuelo era
  // de la cuenta de esta pestaña: repetirlo lo haría a nombre de la otra. No se anota el
  // refresco, para que nada lo repita, y la pestaña recarga con la nueva. Sin bucle: al
  // recargar, la sesión compartida aún no sabe quién es y no compara
  if (esDeOtraCuenta(data)) {
    globalThis.location.reload();
    throw new TypeError('The session now belongs to another account');
  }

  anotaElRefresco();
  return true;
};

/**
 * El refresco compartido: el que hay en vuelo si lo hay, o uno nuevo que queda
 * guardado para quien llegue mientras tanto. Lo usan el interceptor y la sonda
 * de sesión (`services/sondaDeSesion`), que refresca sin el interceptor: así
 * dos refrescos a la vez son UN POST, y no dos con la misma cookie.
 *
 * Se suelta en cuanto termina, bien o mal: el siguiente pide el suyo.
 *
 * @returns {Promise<boolean>}
 */
export const refrescoCompartido = () => {
  if (!refrescoEnCurso) {
    refrescoEnCurso = refreshAccessToken().finally(() => {
      refrescoEnCurso = null;
    });
  }
  return refrescoEnCurso;
};

const CABECERA_CSRF = 'X-CSRF-Token';

/**
 * Las opciones de un reintento, con el token CSRF de AHORA: el refresco rota la
 * cookie, y repetir con el de la petición original volvía con un 403 CSRF
 * (hotfix 2.63.1). Solo si la petición lo llevaba —un GET sigue sin él—, salvo
 * con `siempre`. El nombre de la cabecera no distingue mayúsculas: se quitan
 * todas sus formas y queda una. Sin token, la cabecera se quita.
 *
 * La usan los reintentos de aquí y el de `apiRequest` tras un 403 CSRF.
 */
export const conElTokenAlDia = (opciones, { siempre = false } = {}) => {
  const { headers } = opciones;
  if (headers instanceof globalThis.Headers) {
    if (!siempre && !headers.has(CABECERA_CSRF)) return opciones;
    const token = getCsrfToken();
    const nuevas = new globalThis.Headers(headers);
    if (token) nuevas.set(CABECERA_CSRF, token);
    else nuevas.delete(CABECERA_CSRF);
    return { ...opciones, headers: nuevas };
  }
  const nombres = Object.keys(headers ?? {}).filter((k) => k.toLowerCase() === CABECERA_CSRF.toLowerCase());
  if (!siempre && nombres.length === 0) return opciones;
  const token = getCsrfToken();
  const nuevas = { ...headers };
  for (const nombre of nombres) delete nuevas[nombre];
  if (token) nuevas[CABECERA_CSRF] = token;
  return { ...opciones, headers: nuevas };
};

/**
 * Lo que se hace cuando falla un refresco que alguien arrancó para seguir
 * trabajando: con el «no» del servidor, cerrar sesión con su aviso (revocado o
 * caducada, sin duplicados); sin respuesta, conservarla (FE #514). No lanza:
 * quien llama decide qué error sube.
 *
 * La usan el interceptor, el refresco proactivo —quien espera a un refresco en
 * vuelo da por hecho que el que lo arrancó ya lo trató (`/code-review`)— y el
 * reintento de `apiRequest` tras un 403 CSRF. La sonda de sesión no: en una
 * página pública no se cierra ni se redirige.
 *
 * @param {Error & {response?: Response, errorData?: object}} refreshError
 */
export const trataElFalloDelRefresco = (refreshError) => {
  // «No lanza» también cuando el cierre falla (sin la interfaz registrada, que ya
  // borra lo de la cuenta y falla cerrado, o una limpieza que falla): se anota y
  // quien llama sigue con su error, como siempre
  try {
    cierraSiElServidorDijoQueNo(refreshError);
  } catch (error) {
    console.error('[TokenRefresh] Forced logout failed:', error);
  }
};

const cierraSiElServidorDijoQueNo = (refreshError) => {
  // Solo el servidor puede decir que una sesión ya no vale. Un fallo de red
  // o un 5xx significan que no se ha podido preguntar, no que la respuesta
  // sea que no, y tratarlos igual echaba al jugador de la aplicación en
  // mitad de una vuelta cada vez que el campo se quedaba sin cobertura
  // (FE #514). El token de acceso dura 15 minutos y el marcador pregunta
  // cada 10 segundos, así que la ocasión se presentaba muchas veces.
  const respuestaDelServidor = refreshError?.response ?? null;
  const credencialesRechazadas = respuestaDelServidor?.status === 401;
  // Para el aviso a Sentry (FE #1042): lo que contestó el refresco
  const delRefresco = {
    metodo: 'POST',
    endpoint: respuestaDelServidor?.url || RUTA_DEL_REFRESCO,
    estado: respuestaDelServidor?.status,
    codigo: refreshError?.errorData?.error_code,
  };
  // Por el `error_code`: el final normal de la sesión o un rechazo de verdad
  const motivo = motivoDelRefrescoRechazado(refreshError?.errorData);

  // v2.0.4: Properly differentiate between device revocation and session expiration
  if (respuestaDelServidor && refreshError.errorData) {
    // Check if refresh failed due to EXPLICIT device revocation
    if (isDeviceRevoked(respuestaDelServidor, refreshError.errorData)) {
      console.log('🔒 [TokenRefresh] Device was revoked - logging out with revocation message');
      handleDeviceRevocationLogout(refreshError.errorData, delRefresco);
      return;
    }

    // Check if refresh failed due to session expiration (refresh token expired)
    if (isSessionExpired(respuestaDelServidor, refreshError.errorData)) {
      console.log('⏱️ [TokenRefresh] Session expired - logging out with expiration message');
      handleSessionExpiredLogout(refreshError.errorData, { ...delRefresco, motivo });
      return;
    }
  }

  // Un 401 del propio refresco es la única respuesta que significa "estas
  // credenciales ya no sirven". Se comprueba el estado y no solo el texto
  // porque `isSessionExpired` exige además que el `detail` hable del
  // refresh token, y un 401 con otro mensaje también cierra la sesión
  if (credencialesRechazadas) {
    console.log('⏱️ [TokenRefresh] Refresh rejected with 401 - logging out');
    handleSessionExpiredLogout(refreshError.errorData || null, { ...delRefresco, motivo });
  } else {
    // Nadie ha dicho que la sesión no valga: se conserva. El marcador
    // vuelve a preguntar en su siguiente vuelta y lo anotado sin conexión
    // sigue donde estaba
    console.log('📡 [TokenRefresh] Refresh unreachable - keeping the session');
  }
};

/**
 * Lo que dice una petición repetida tras un refresco que fue bien (FE #1042).
 *
 * - «Dispositivo revocado»: se trata como la revocación que es, igual que si
 *   hubiera llegado a la primera, y sube su error.
 * - Un 401 de token (no llegó o no vale): la cookie nueva no llegó. Es la clase de
 *   fallo que echaba a la gente sin dejar rastro, y se avisa como sesión perdida.
 * - Cualquier otro 401 (una contraseña actual mal escrita) no dice nada de la sesión.
 *
 * La usan las tres esperas a un refresco: la que lo arranca, la que se engancha al
 * de otra y la que llega cuando otra ya refrescó.
 */
const vigilaLaRepetida = async (url, opciones, repetida) => {
  if (repetida?.status !== 401) return repetida;
  let datos = {};
  try {
    datos = (await repetida.clone().json()) ?? {};
  } catch {
    return repetida;
  }
  const contexto = { metodo: opciones?.method, endpoint: url, estado: 401 };
  if (isDeviceRevoked(repetida, datos)) {
    handleDeviceRevocationLogout(datos, contexto);
    throw Object.assign(new Error('Device revoked'), { response: repetida, errorData: datos });
  }
  if (esUn401DeToken(datos)) {
    interfaz().avisaASentryDelCierre({ motivo: MOTIVO_DEL_CIERRE.SESION_PERDIDA, ...contexto });
  }
  return repetida;
};

/**
 * Interceptor for fetch requests that handles 401 responses with automatic token refresh
 *
 * Flow:
 * 1. Execute original request
 * 2. If 401 response:
 *    a. If a refresh is already in flight, await that same one
 *    b. Otherwise start it (only one at a time, however many 401s arrive)
 *    c. If refresh succeeds: retry the request
 *    d. If refresh fails: logout and redirect
 *
 * @param {string} url - Request URL
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>} - Fetch response
 */
export const fetchWithTokenRefresh = async (url, options = {}) => {
  // Ensure credentials are always included for httpOnly cookies
  const fetchOptions = {
    ...options,
    credentials: 'include',
  };

  // Cuantos refrescos habia cuando sale esta peticion. Si al volver con un 401
  // hay mas, es que el token que uso ya esta sustituido y basta con reintentar
  const refrescosAlSalir = refrescosCompletados;

  try {
    // Execute original request
    const response = await fetch(url, fetchOptions);

    // If not 401, return response immediately
    if (response.status !== 401) {
      return response;
    }

    // Special case: Don't retry refresh token endpoint itself
    // Must check BEFORE device revocation to avoid infinite promise
    if (url.includes('/auth/refresh-token')) {
      console.log('🚫 [TokenRefresh] Refresh endpoint itself returned 401. Session expired.');
      return response;
    }

    // Special case: Device Revocation (v1.13.1)
    // Check if 401 is due to device revocation (before attempting refresh)
    // Clone response to avoid consuming the body
    const responseClone = response.clone();
    let errorData = {};
    let revocado = false;

    try {
      errorData = await responseClone.json();
      const isRevoked = isDeviceRevoked(response, errorData);

      if (isRevoked) {
        handleDeviceRevocationLogout(errorData, {
          metodo: options?.method,
          endpoint: url,
          estado: response.status,
        });
        revocado = true;
      }
    } catch {
      // If JSON parsing fails, continue with normal refresh flow
    }

    // Fuera del `try`: aquí había una espera de cinco segundos a que la
    // redirección interrumpiera, y su rechazo lo tragaba el `catch` de arriba,
    // así que un dispositivo ya revocado acababa siguiendo el flujo normal de
    // refresco como si nada. Es el mismo patrón que se quitó de las otras dos
    // ramas; esta se había quedado
    if (revocado) {
      const revocacion = new Error('Device revoked');
      revocacion.response = response;
      revocacion.errorData = errorData;
      throw revocacion;
    }

    // La contraseña actual mal escrita no es una sesión caducada (RyderCupAm #753):
    // repetirla gastaba dos intentos del límite por usuario de esas dos rutas. Solo
    // un 401 de token se refresca allí
    if (RUTAS_CON_CONTRASENA_ACTUAL.some((ruta) => url.includes(ruta)) && !esUn401DeToken(errorData)) {
      return response;
    }

    // Special case: Don't retry login endpoint - let it fail naturally
    if (url.includes('/auth/login')) {
      console.log('🚫 [TokenRefresh] Login endpoint returned 401. Invalid credentials - not retrying.');
      return response;
    }

    // Special case: If we're on public pages (login, register, etc), don't attempt refresh
    const currentPath = globalThis.location?.pathname || '';
    // La lista vive en un solo sitio: esta copia iba dos entradas por detras.
    // Y se mira tambien si hay sesion guardada: en una clasificacion compartida
    // —que es publica— un usuario con sesion SI tiene que refrescar.
    const isPublicPage = interfaz().sinSesionEnRutaPublica(currentPath, hayUsuarioGuardado());
    if (isPublicPage && url.includes('/current-user')) {
      console.log('🚫 [TokenRefresh] On public page, not attempting refresh for current-user check');
      return response;
    }

    console.log('⚠️ [TokenRefresh] Received 401 Unauthorized. Attempting token refresh...');

    // Si alguien ya refresco DESPUES de que esta peticion saliera, su 401 es de
    // un token que ya esta sustituido: se reintenta y punto, sin pedir otro
    // refresco. Sin esto, quien sale con el token viejo justo antes de que
    // termine el refresco arranca uno nuevo e innecesario — y si ese segundo
    // falla por red, tumba tambien a quien se hubiera enganchado a el, aunque
    // la cookie que consiguio el primero fuera perfectamente valida
    const yaSeRefrescoDespues = refrescosCompletados > refrescosAlSalir;
    if (!refrescoEnCurso && yaSeRefrescoDespues) {
      console.log('🔄 [TokenRefresh] A refresh already happened after this request left. Retrying...');
      return await vigilaLaRepetida(url, fetchOptions, await fetch(url, conElTokenAlDia(fetchOptions)));
    }

    // Si ya hay un refresco en vuelo, esta peticion se engancha a el en vez de
    // pedir otro. Al terminar, reintenta lo suyo. Si el refresco falla, el
    // error sube por aqui: ya lo ha tratado quien lo arranco
    if (refrescoEnCurso) {
      console.log('⏳ [TokenRefresh] Refresh already in progress. Waiting for it...');
      await refrescoEnCurso;
      console.log('🔄 [TokenRefresh] Retrying queued request...');
      // `return await` y no `return` a secas: sin esperar aqui, un fallo de red
      // en este reintento se escapa del catch de abajo y el mismo suceso deja
      // dos rastros distintos segun quien lo sufra
      return await vigilaLaRepetida(url, fetchOptions, await fetch(url, conElTokenAlDia(fetchOptions)));
    }

    try {
      // El refresco se guarda ANTES de esperarlo, para que quien llegue
      // mientras tanto lo encuentre. Y se suelta en cuanto termina —no cuando
      // termina el reintento de abajo—: una peticion que de 401 durante ese
      // reintento salio con el token viejo y necesita su propio refresco, que
      // es exactamente lo que antes se quedaba colgado para siempre
      await refrescoCompartido();

      // Retry the original request
      console.log('🔄 [TokenRefresh] Retrying original request...');
      const retryResponse = await fetch(url, conElTokenAlDia(fetchOptions));

      return await vigilaLaRepetida(url, fetchOptions, retryResponse);

    } catch (refreshError) {
      trataElFalloDelRefresco(refreshError);

      // Todas las salidas de aquí terminan igual: el error sube a quien llamó.
      // Antes cada rama esperaba a que la redirección interrumpiera, con un
      // tope de cinco segundos. Eso dejaba el refresco bloqueado ese rato, y
      // cualquier petición que diera 401 mientras tanto se quedaba esperándolo
      // sin que nadie lo terminara. Peor aún,
      // si el cierre de sesión no llegaba a redirigir —ya estaba marcado como
      // atendido— nadie interrumpía nada y quien llamó recibía a los cinco
      // segundos un 'Redirect timeout' en vez del error de verdad
      throw refreshError;
    }

  } catch (error) {
    console.error('❌ [TokenRefresh] Error in fetch interceptor:', error);
    // Re-throw to let the caller handle the error appropriately
    throw error;
  }
};

export default fetchWithTokenRefresh;
