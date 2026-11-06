/**
 * El aviso a Sentry de cada cierre de sesión que hace la app por su cuenta (FE #1042).
 *
 * El 4 nov un 403 CSRF echaba a la gente y nadie se enteró: el backend solo
 * informa de los 5xx, y estos cierres no informaban de nada. Cada uno es ahora un
 * `warning`:
 * - título en inglés y castellano, para leerlo en el correo de la alerta;
 * - etiquetas en inglés, con un solo valor para filtrar (`logout.reason`,
 *   `logout.route`, `logout.status`, y `logout.code`, el `error_code` del backend);
 * - agrupado por motivo: una causa es un solo issue, venga de la ruta que venga.
 *
 * La caducidad normal (`session_expired`) va con su propio motivo para poder
 * silenciarla sin perder las demás. Sin datos personales: ni el cuerpo del error
 * ni ids en la ruta.
 */
import { captureError } from './sentryHelpers';

export const MOTIVO_DEL_CIERRE = Object.freeze({
  REFRESCO_RECHAZADO: 'refresh_rejected',
  DISPOSITIVO_REVOCADO: 'device_revoked',
  CSRF_SIN_RECUPERAR: 'csrf_unrecovered',
  SESION_CADUCADA: 'session_expired',
  // El refresco fue bien y la petición repetida volvió con 401: la cookie nueva
  // no se guardó o no se mandó. Es la clase de fallo que echaba a la gente
  SESION_PERDIDA: 'session_lost',
});

// Los `error_code` del 401 del refresco que son el final normal de una sesión. Desde
// RyderCupAm #733 el backend solo manda SESSION_ENDED o SESSION_REJECTED (el motivo
// exacto decía el estado de la cuenta). Los de antes siguen aquí mientras el backend
// no se despliega: este front sale primero. Se pueden quitar después
const FINAL_NORMAL = new Set([
  'SESSION_ENDED',
  'REFRESH_TOKEN_MISSING',
  'REFRESH_TOKEN_EXPIRED',
  'SESSION_IDLE',
]);

/**
 * El motivo de un 401 del refresco según su `error_code`: el final normal de la
 * sesión, o un rechazo de verdad. Sin código, un rechazo: que se vea.
 *
 * @param {{error_code?: string}|undefined} errorData
 */
/** Si el `error_code` del refresco es el final normal de una sesión. */
export const esFinalNormalDelRefresco = (errorData) => FINAL_NORMAL.has(errorData?.error_code);

export const motivoDelRefrescoRechazado = (errorData) =>
  esFinalNormalDelRefresco(errorData) ? MOTIVO_DEL_CIERRE.SESION_CADUCADA : MOTIVO_DEL_CIERRE.REFRESCO_RECHAZADO;

// Los 401 de `get_current_user` cuando falla el token de acceso (RyderCupAm
// src/config/dependencies.py). Otro 401 —una contraseña actual mal escrita— no
// dice nada de la sesión
const DE_TOKEN = new Set([
  'credenciales de autenticación no proporcionadas',
  'token inválido o expirado',
  'token inválido: falta subject',
]);

/** Si un 401 es porque el token de acceso no llegó o no vale. */
export const esUn401DeToken = (errorData) => DE_TOKEN.has(String(errorData?.detail ?? '').trim().toLowerCase());

const TITULO = Object.freeze({
  refresh_rejected: 'Forced logout: refresh rejected / Cierre de sesión forzado: refresco rechazado',
  device_revoked: 'Forced logout: device revoked / Cierre de sesión forzado: dispositivo revocado',
  csrf_unrecovered:
    'Forced logout: unrecovered CSRF 403 / Cierre de sesión forzado: 403 CSRF sin recuperar',
  session_expired: 'Forced logout: session expired / Cierre de sesión forzado: sesión caducada',
  session_lost:
    'Forced logout: session lost after a good refresh / Cierre de sesión forzado: sesión perdida tras refrescar bien',
});

// Tras pedir el usuario cerrar la sesión, su POST /auth/logout y lo que esté en
// vuelo pueden acabar en un refresco que ya no vale: no es un cierre forzado
const SILENCIO_TRAS_EL_LOGOUT_MS = 30_000;
// También en sessionStorage: useLogout sale recargando, y la sonda de /login
// puede tropezar con el refresh ya revocado (/code-review, 5 nov)
const CLAVE_DEL_SILENCIO = 'avisos-de-cierre-callados-hasta';
let silencioHasta = 0;

const silenciadoAhora = () => {
  let guardado = 0;
  try {
    guardado = Number(globalThis.sessionStorage?.getItem(CLAVE_DEL_SILENCIO)) || 0;
  } catch {
    // Sin almacenamiento, vale el de memoria
  }
  return Date.now() < Math.max(silencioHasta, guardado);
};

/** El usuario pidió cerrar la sesión: nada de avisos durante un rato. */
export const noAvisesDeCierres = () => {
  silencioHasta = Date.now() + SILENCIO_TRAS_EL_LOGOUT_MS;
  try {
    globalThis.sessionStorage?.setItem(CLAVE_DEL_SILENCIO, String(silencioHasta));
  } catch {
    // Sin almacenamiento, vale el de memoria
  }
};

// Un tramo que es un id: un UUID, un número o un hexadecimal largo
// Los tramos fijos de las rutas de la API que usa el front: todo lo demás es un id
// o un token y sale como `{id}`. Una lista cerrada y no una forma (CodeRabbit,
// 5 nov 2026): un id en minúsculas habría pasado por palabra. Si falta un tramo,
// la ruta sale con un `{id}` de más, nunca con un dato. La vigila un test
const TRAMOS_FIJOS = new Set([
  'accept-terms',
  'acknowledge',
  'activate',
  'active',
  'activity-sharing',
  'adjacent',
  'admin',
  'api',
  'approve',
  'approve-update',
  'assigned-places',
  'auth',
  'avatar',
  'avatar-presets',
  'block',
  'breakdown',
  'by-email',
  'cancel',
  'captain',
  'captains',
  'close-enrollments',
  'competitions',
  'complete',
  'concede',
  'configure',
  'countries',
  'current-user',
  'devices',
  'direct',
  'draft',
  'enrollments',
  'envelope',
  'envelopes',
  'feed',
  'forgot-password',
  'friends',
  'generate',
  'golf-courses',
  'google',
  'groups',
  'handicap',
  'handicap-updates',
  'handicaps',
  'hide',
  'hole-lines',
  'hole-map',
  'hole-reports',
  'hole-reviews',
  'hole-samples',
  'holes',
  'invitations',
  'leaderboard',
  'link',
  'login',
  'logout',
  'markers',
  'matches',
  'me',
  'name-preference',
  'order',
  'participants',
  'pending',
  'pending-envelopes',
  'picks',
  'places',
  'players',
  'preset',
  'profile',
  'quick-matches',
  'refresh-mine',
  'refresh-token',
  'register',
  'reject',
  'reject-update',
  'remove',
  'reopen-enrollments',
  'reorder',
  'reports',
  'request',
  'requests',
  'resend-verification',
  'reset',
  'reset-password',
  'respond',
  'reveal',
  'revert-status',
  'revert-to-in-progress',
  'roles',
  'rounds',
  'samples',
  'schedule',
  'score',
  'scorecard',
  'scores',
  'scoring-view',
  'search-autocomplete',
  'security',
  'seen',
  'sessions-without-matches',
  'shared',
  'social',
  'start',
  'stats',
  'stats-exclusion',
  'status',
  'stroke-play',
  'submit',
  'summary',
  'teams',
  'unlink',
  'unseen-count',
  'update',
  'update-manual',
  'upload',
  'uploads',
  'users',
  'v1',
  'validate-reset-token',
  'verify-email',
  'waiting-list',
  'walkover',
]);
const ES_UN_ID = (tramo) => tramo !== '' && !TRAMOS_FIJOS.has(tramo);

/**
 * La ruta sin nada que identifique a nadie: sin origen, sin query ni fragmento,
 * y con cada id cambiado por `{id}`.
 */
const rutaSinDatos = (endpoint) => {
  if (!endpoint) return null;
  const sinOrigen = String(endpoint).replace(/^[a-z]+:\/\/[^/]+/i, '');
  const sinQuery = sinOrigen.split(/[?#]/)[0];
  return sinQuery
    .split('/')
    .map((tramo) => (ES_UN_ID(tramo) ? '{id}' : tramo))
    .join('/');
};

/**
 * Si un evento sube su grabación de Replay (`beforeErrorSampling`). Cada aviso es
 * un evento de error para Replay: sin esto, cada caducidad normal de sesión subía la
 * suya, gastando cupo y tapando los errores de verdad (auditoría OWASP, 5 nov 2026).
 * Los cierres raros sí la conservan: ahí es donde sirve para depurar.
 */
export const grabaSoloLoQueNoEsNormal = (evento) =>
  evento?.tags?.['logout.reason'] !== MOTIVO_DEL_CIERRE.SESION_CADUCADA;

// Un aviso por motivo y carga de página: tras el cierre la página se va, y
// varias peticiones a la vez no deben dar varios avisos de lo mismo
const yaAvisados = new Set();

/**
 * Avisa a Sentry de un cierre de sesión forzado. No lanza nunca: quien llama
 * está cerrando la sesión, y eso tiene que pasar aunque Sentry no esté.
 *
 * @param {{motivo: string, metodo?: string, endpoint?: string, estado?: number, codigo?: string}} aviso
 */
export const avisaDelCierreForzado = ({ motivo, metodo, endpoint, estado, codigo } = {}) => {
  const titulo = TITULO[motivo];
  if (!titulo || yaAvisados.has(motivo) || silenciadoAhora()) return;
  yaAvisados.add(motivo);
  try {
    const ruta = rutaSinDatos(endpoint);
    captureError(titulo, {
      level: 'warning',
      tags: {
        'logout.reason': motivo,
        'logout.route': ruta ? `${String(metodo ?? 'GET').toUpperCase()} ${ruta}` : 'unknown',
        'logout.status': estado == null ? 'none' : String(estado),
        'logout.code': codigo ? String(codigo) : 'none',
      },
      fingerprint: ['forced-logout', motivo],
    });
  } catch {
    // Sin Sentry no hay aviso; el cierre de sesión sigue
  }
};
