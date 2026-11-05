/**
 * El aviso a Sentry de cada cierre de sesión que hace la app por su cuenta (FE #1042).
 *
 * El 4 nov un 403 CSRF echaba a la gente y nadie se enteró: el backend solo
 * informa de los 5xx, y estos cierres no informaban de nada. Cada uno es ahora un
 * `warning`:
 * - título en inglés y castellano, para leerlo en el correo de la alerta;
 * - etiquetas en inglés, con un solo valor para filtrar (`logout.reason`,
 *   `logout.route`, `logout.status`);
 * - agrupado por motivo: una causa es un solo issue, venga de la ruta que venga.
 *
 * La caducidad normal (`session_expired`) va con su propio motivo para poder
 * silenciarla sin perder las demás. Sin datos personales: ni el cuerpo del error
 * ni ids en la ruta.
 */
import * as Sentry from '@sentry/react';

export const MOTIVO_DEL_CIERRE = Object.freeze({
  REFRESCO_RECHAZADO: 'refresh_rejected',
  DISPOSITIVO_REVOCADO: 'device_revoked',
  CSRF_SIN_RECUPERAR: 'csrf_unrecovered',
  SESION_CADUCADA: 'session_expired',
});

const TITULO = Object.freeze({
  refresh_rejected: 'Forced logout: refresh rejected / Cierre de sesión forzado: refresco rechazado',
  device_revoked: 'Forced logout: device revoked / Cierre de sesión forzado: dispositivo revocado',
  csrf_unrecovered:
    'Forced logout: unrecovered CSRF 403 / Cierre de sesión forzado: 403 CSRF sin recuperar',
  session_expired: 'Forced logout: session expired / Cierre de sesión forzado: sesión caducada',
});

// Un tramo que es un id: un UUID, un número o un hexadecimal largo
const ES_UN_ID = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d+|[0-9a-f]{16,})$/i;

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
    .map((tramo) => (ES_UN_ID.test(tramo) ? '{id}' : tramo))
    .join('/');
};

// Un aviso por motivo y carga de página: tras el cierre la página se va, y
// varias peticiones a la vez no deben dar varios avisos de lo mismo
const yaAvisados = new Set();

/**
 * Avisa a Sentry de un cierre de sesión forzado. No lanza nunca: quien llama
 * está cerrando la sesión, y eso tiene que pasar aunque Sentry no esté.
 *
 * @param {{motivo: string, metodo?: string, endpoint?: string, estado?: number}} aviso
 */
export const avisaDelCierreForzado = ({ motivo, metodo, endpoint, estado } = {}) => {
  const titulo = TITULO[motivo];
  if (!titulo || yaAvisados.has(motivo)) return;
  yaAvisados.add(motivo);
  const ruta = rutaSinDatos(endpoint);
  try {
    Sentry.withScope((scope) => {
      scope.setLevel('warning');
      scope.setTag('logout.reason', motivo);
      scope.setTag('logout.route', ruta ? `${String(metodo ?? 'GET').toUpperCase()} ${ruta}` : 'unknown');
      scope.setTag('logout.status', estado == null ? 'none' : String(estado));
      scope.setFingerprint(['forced-logout', motivo]);
      Sentry.captureMessage(titulo, 'warning');
    });
  } catch {
    // Sin Sentry no hay aviso; el cierre de sesión sigue
  }
};
