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
 *     que no (con su aviso en pantalla), la falta de cobertura no es nuestra,
 *     y los cierres de sesión (refresco rechazado, dispositivo revocado, CSRF)
 *     ya los avisa `avisaASentryDelCierre`.
 *
 * Sin datos de la persona: el texto del error no sale nunca (el `JSON.parse`
 * de lo guardado cita un trozo con el correo; un 5xx puede repetir lo
 * escrito). Se manda otro error, «Fallo en <sitio> (<clase>)», con los marcos
 * de la pila del original sin su texto (`soloLosMarcos`); y como
 * etiquetas, el sitio, el estado HTTP y el código del servidor. El resto de
 * argumentos se quedan en la consola de desarrollo.
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
    captureError(error ? sinSuTexto(sitio, error) : `Fallo en ${sitio}`, {
      level: 'warning',
      tags: etiquetas(sitio, error),
      fingerprint: ['registraElFallo', sitio],
    });
  } catch {
    // Sentry caído no rompe el catch de quien llama
  }
};

// El error que se manda: el sitio y la clase, nunca el texto del original
const sinSuTexto = (sitio, original) => {
  const clase = original.name || 'Error';
  const enviado = new Error(`Fallo en ${sitio} (${clase})`);
  enviado.name = clase;
  const marcos =
    typeof original.stack === 'string' ? soloLosMarcos(original) : '';
  enviado.stack = marcos
    ? `${clase}: ${enviado.message}\n${marcos}`
    : `${clase}: ${enviado.message}`;
  return enviado;
};

// La pila sin el texto del error. Safari y Firefox no lo ponen: su pila
// empieza ya por un marco («sitio@url:línea:col») y se manda entera. V8 la
// empieza con «Clase: texto», que puede ocupar varias líneas: se corta tras la
// línea donde acaba el texto, y luego se quita todo lo que no sea un marco
// hasta el primero (una cabecera cuyo texto cambió después de tomar la pila)
const soloLosMarcos = (original) => {
  const pila = original.stack.replace(/\n+$/, '');
  if (esUnMarco(pila.split('\n')[0])) return pila;
  const texto = typeof original.message === 'string' ? original.message : '';
  const donde = texto === '' ? -1 : pila.indexOf(texto);
  let resto = pila;
  if (donde !== -1) {
    const finDeLinea = pila.indexOf('\n', donde + texto.length);
    resto = finDeLinea === -1 ? '' : pila.slice(finDeLinea + 1);
  }
  const lineas = resto.split('\n');
  const primerMarco = lineas.findIndex(esUnMarco);
  return primerMarco === -1 ? '' : lineas.slice(primerMarco).join('\n');
};

// Un marco de verdad acaba en un sitio de código: una URL, una ruta o un
// fichero con «:línea:col», o código nativo. Un texto con un correo y una hora
// no lo es. Las líneas muy largas no son marcos (y no pasan por las regex)
const SITIO = String.raw`(?:(?:[a-z][\w+.-]*://|/)\S*|[\w.-]+\.\w+):\d+:\d+`;
const MARCO_DE_V8 = new RegExp(
  String.raw`^\s+at (?:async )?(?:[^()]*\((?:${SITIO}|native|<anonymous>)\)|${SITIO})$`,
);
const MARCO_DE_SAFARI_O_FIREFOX = new RegExp(
  String.raw`^[^@]*@(?:${SITIO}|\[native code\])$`,
);
const LARGO_MAXIMO_DE_UN_MARCO = 2000;

const esUnMarco = (linea) =>
  linea.length <= LARGO_MAXIMO_DE_UN_MARCO &&
  (MARCO_DE_V8.test(linea) || MARCO_DE_SAFARI_O_FIREFOX.test(linea));

const UN_MINUTO = 60_000;
const ultimoAviso = new Map();

const tocaAvisar = (sitio) => {
  const ahora = Date.now();
  const ultimo = ultimoAviso.get(sitio);
  if (ultimo !== undefined && ahora - ultimo < UN_MINUTO) return false;
  ultimoAviso.set(sitio, ahora);
  return true;
};

// Cierres de sesión de rutina: los cuenta ya `avisaASentryDelCierre` (revisión)
const CIERRES_DE_SESION = new Set([
  'CSRF_VALIDATION_FAILED',
  'SESSION_REPLACED',
]);

// El refresco y el dispositivo revocado llevan el estado en `.response`
const estadoDe = (error) => error?.status ?? error?.response?.status;

const codigoDe = (error) => error?.errorCode ?? error?.errorData?.error_code;

const merecePorAviso = (error) => {
  // Sin red, nada: tampoco un rechazo que no es un Error (revisión local)
  if (globalThis.navigator?.onLine === false) return false;
  if (!error) return true;
  if (error.sinConexion === true) return false;
  if (CIERRES_DE_SESION.has(codigoDe(error))) return false;
  const status = estadoDe(error);
  return !(typeof status === 'number' && status >= 400 && status < 500);
};

const etiquetas = (sitio, error) => {
  const tags = { fallo: sitio };
  const status = estadoDe(error);
  if (typeof status === 'number') tags.status = String(status);
  if (typeof error?.errorCode === 'string') tags.errorCode = error.errorCode;
  return tags;
};
