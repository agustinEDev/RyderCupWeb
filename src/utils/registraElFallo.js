import { captureError } from './sentryHelpers';

/**
 * Lo que falla dentro de un catch (re-auditoría Q-FE-07).
 *
 * En producción `drop_console` (vite.config.js) quita los `console.error`, así
 * que lo que se registraba así no lo veía nadie. Con esto:
 *
 *   - En desarrollo (y en los tests), el mismo `console.error` de antes, con
 *     los mismos argumentos.
 *   - En producción, un aviso a Sentry (`warning`) con una huella fija por
 *     sitio, y como mucho uno por sitio y minuto en cada carga de la página.
 *     No se informa de lo que no es un fallo: un 4xx es el servidor diciendo
 *     que no (con su aviso en pantalla), y la falta de cobertura no es nuestra.
 *
 * Sin datos de la persona: solo el error y, como etiquetas, el sitio, el
 * estado HTTP y el código del servidor. El resto de argumentos (textos que
 * pueden llevar un correo o un nombre) se quedan en la consola de desarrollo.
 *
 * @param {string} sitio - Fijo por sitio: agrupa en Sentry y limita el ritmo
 * @param {...unknown} argumentos - Los del `console.error` de antes
 */
export const registraElFallo = (sitio, ...argumentos) => {
  if (import.meta.env.DEV) {
    console.error(...argumentos);
    return;
  }
  const error = argumentos.find((a) => a instanceof Error);
  if (!merecePorAviso(error)) return;
  if (!tocaAvisar(sitio)) return;
  try {
    captureError(error ?? `Fallo en ${sitio}`, {
      level: 'warning',
      tags: etiquetas(sitio, error),
      fingerprint: ['registraElFallo', sitio],
    });
  } catch {
    // Sentry caído no rompe el catch de quien llama
  }
};

const UN_MINUTO = 60_000;
const ultimoAviso = new Map();

const tocaAvisar = (sitio) => {
  const ahora = Date.now();
  const ultimo = ultimoAviso.get(sitio);
  if (ultimo !== undefined && ahora - ultimo < UN_MINUTO) return false;
  ultimoAviso.set(sitio, ahora);
  return true;
};

const merecePorAviso = (error) => {
  if (!error) return true;
  if (error.sinConexion === true || globalThis.navigator?.onLine === false)
    return false;
  const status = error.status;
  return !(typeof status === 'number' && status >= 400 && status < 500);
};

const etiquetas = (sitio, error) => {
  const tags = { fallo: sitio };
  if (typeof error?.status === 'number') tags.status = String(error.status);
  if (typeof error?.errorCode === 'string') tags.errorCode = error.errorCode;
  return tags;
};
