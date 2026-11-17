/**
 * El texto de un error para quien mira, siempre en su idioma o en el del
 * servidor cuando este explica el motivo (re-auditoría Q-FE-06).
 *
 * Antes cada pantalla hacía `error.message || t('…')`, y enseñaba lo que
 * llegara: el `TypeError` de un fallo del código, el «HTTP 500: …», la lista
 * de Pydantic de un 422 o un objeto en JSON. Por orden:
 *
 *   1. Un código conocido por quien llama (`codigos`), con su texto traducido.
 *   2. El texto que `api.js` ya puso en el idioma de la app (429, Términos).
 *   3. El motivo que da el servidor o el caso de uso, en texto: «ese jugador
 *      ya es participante» le dice al jugador qué cambiar (`sinCobertura.js`).
 *      No un 5xx, un fallo de red, lo que `api.js` marcó como técnico, un
 *      fallo del código (`TypeError` y compañía), algo que parece JSON ni un
 *      código suelto («FAILED_TO_REVOKE_DEVICE»).
 *   4. Si no, la alternativa traducida de quien llama.
 *
 * @param {unknown} error
 * @param {string} alternativa - Ya traducida
 * @param {Record<string, string>} [codigos] - `error_code` → texto traducido
 * @returns {string}
 */
export const mensajeDelError = (error, alternativa, codigos = {}) => {
  const codigo = error?.errorCode;
  if (codigo && Object.hasOwn(codigos, codigo)) return codigos[codigo];
  if (error?.mensajeTraducido === true && tieneTexto(error.message))
    return error.message;
  if (esElMotivoDelServidor(error)) return error.message;
  return alternativa;
};

// El refresco y el dispositivo revocado llevan el estado en `.response`
const estadoDe = (error) => error?.status ?? error?.response?.status;

const tieneTexto = (texto) => typeof texto === 'string' && texto.trim() !== '';

// Los errores del propio JavaScript: un fallo del código, o el `fetch` sin red
const FALLOS_DEL_CODIGO = [TypeError, ReferenceError, RangeError, SyntaxError];

const esElMotivoDelServidor = (error) =>
  error instanceof Error &&
  !FALLOS_DEL_CODIGO.some((clase) => error instanceof clase) &&
  !(estadoDe(error) >= 500) &&
  // Un 401 es la sesión, no un motivo que enseñar
  estadoDe(error) !== 401 &&
  error.sinConexion !== true &&
  error.mensajeTecnico !== true &&
  tieneTexto(error.message) &&
  !/^\s*[[{]/.test(error.message) &&
  !/^[A-Z][A-Z0-9_]+$/.test(error.message.trim());
