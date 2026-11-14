/**
 * Lo que el transporte (api.js, el refresco, los cierres forzados) necesita de la
 * interfaz, sin conocerla: traducir un texto, avisar al usuario, informar a
 * Sentry, guardar la página para volver tras entrar y saber si una ruta es
 * pública. La infraestructura no llega a React, al router, a i18n ni a Sentry
 * para React (regla `infrastructure-only-reaches-allowed-packages`): la composition
 * root registra aquí la implementación (`composition/interfazDelTransporte`), que
 * cargan main.jsx el primero, `composition/index` y `composition/http`.
 *
 * Sin registrar, cada uso falla en voz alta, como el registro de limpiezas: un
 * cierre forzado o un error de la API sin su respuesta de interfaz no pueden
 * pasar en silencio.
 */

/** Lo que tiene que traer la implementación, todo funciones. */
const LO_QUE_HACE_FALTA = Object.freeze([
  // Cierres forzados
  'avisaASentryDelCierre',
  'olvidaElUsuarioDeSentry',
  'avisaAlUsuarioDelCierre',
  'ultimaCuentaDeEstaPestana',
  // La redirección dura a /login guardando (o no) la página; cuándo y con qué
  // espera lo decide el transporte
  'redirigeAlLogin',
  // El interceptor del refresco
  'sinSesionEnRutaPublica',
  // api.js
  'traduce',
  'informaDelError',
  'llevaAAceptarLosTerminos',
  'silenciaElAviso',
]);

const SIN_INTERFAZ =
  'No hay interfaz del transporte registrada: falta importar composition/interfazDelTransporte';

let registrada = null;

/**
 * La composition root dice cómo responde la interfaz. Una sola vez: otra
 * registración después lanza (nadie puede cambiar en marcha a quién se avisa
 * de un cierre), y lo registrado queda congelado.
 * @param {Record<string, Function>} implementacion
 */
export const registraLaInterfazDelTransporte = (implementacion) => {
  if (registrada)
    throw new Error('La interfaz del transporte ya está registrada');
  const faltan = LO_QUE_HACE_FALTA.filter(
    (nombre) => typeof implementacion?.[nombre] !== 'function',
  );
  if (faltan.length > 0) {
    throw new Error(`La interfaz del transporte no trae: ${faltan.join(', ')}`);
  }
  registrada = Object.freeze(implementacion);
};

/** Si hay interfaz registrada. */
export const hayInterfazDelTransporte = () => registrada !== null;

/**
 * La implementación registrada; sin ella, lanza.
 * @returns {Record<string, Function>}
 */
export const interfaz = () => {
  if (!registrada) throw new Error(SIN_INTERFAZ);
  return registrada;
};
