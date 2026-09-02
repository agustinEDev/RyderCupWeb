/**
 * Vaciar la cola ENTERA, no solo la partida que se tiene delante (FE #521).
 *
 * Hasta ahora cada pantalla de anotación vaciaba lo suyo: al recuperar la
 * cobertura buscaba las entradas de SU partida, las enviaba y las borraba. Las
 * de otras partidas no las tocaba nadie. Quien terminaba una vuelta con tres
 * hoyos en la cola y no volvía a abrir esa partida —se completaba desde otro
 * móvil, se cancelaba, o simplemente la dejaba— los perdía sin enterarse.
 *
 * Aquí se recorren las anotaciones de quien tiene la sesión abierta, **y solo
 * las suyas**: lo huérfano no se manda desde aquí, porque el servidor lo
 * escribiría en la tarjeta de quien resulte estar dentro. El porqué completo
 * está en `deQuien`. Entre las suyas se distingue:
 *
 * - **Competición** (sin `participantId`): se envía. No hay negociación
 *   posible; la anotación lleva dentro el golpe propio y el del marcado, y el
 *   servidor concilia con el marcador antes de aceptar la tarjeta.
 * - **Partida rápida** (con `participantId`): NO se envía desde aquí. Su
 *   vaciado compara con lo que hay en el servidor y **pregunta al jugador**
 *   cuando otro anotador puso otra cosa (FE #528). Mandarla a ciegas pisaría
 *   un desacuerdo que la aplicación decidió no resolver por su cuenta, y con
 *   la persona ni siquiera mirando esa pantalla. Se envían cuando abra esa
 *   partida.
 */

import { submitHoleScoreUseCase } from '../composition';
import * as cola from '../utils/scoringOfflineQueue';
import { vaciaAnotaciones } from './vaciaAnotaciones';

// Un solo vaciado a la vez. El evento de vuelta de la red puede llegar dos
// veces, y la pantalla de anotación tiene el suyo: sin esto, la misma
// anotación se enviaría dos veces.
//
// Se guarda CUÁNDO empezó, no un simple sí/no: `apiRequest` no tiene tope de
// tiempo, así que una petición que no resuelve nunca dejaba esta bandera
// puesta el resto de la vida de la página, y todos los intentos posteriores se
// volvían un no-op silencioso. Pasado el plazo se da por colgado y se vuelve a
// intentar: repetir un envío es recuperable —el servidor recibe el mismo
// resultado dos veces—, quedarse sin vaciar no lo es (FE #551)
let vaciandoDesde = null;
const SE_DA_POR_COLGADO_MS = 2 * 60 * 1000;

const hayOtroVaciadoVivo = () =>
  vaciandoDesde !== null && Date.now() - vaciandoDesde < SE_DA_POR_COLGADO_MS;

/** Se emite cuando el vaciado ha enviado o descartado algo. */
export const COLA_VACIADA = 'rydercup:cola-vaciada';


/**
 * Envía lo que se pueda de la cola de esta persona.
 *
 * @param {{saltaPartida?: string|null|(() => string|null), userId?: string|null}} [opciones] -
 *   `saltaPartida` deja fuera una partida concreta: la que el usuario tiene
 *   abierta la vacía su propia pantalla, que además sabe resolver desacuerdos.
 *   Admite una función porque el vaciado tarda, y durante ese rato el usuario
 *   puede ENTRAR en una de las partidas que se están enviando: con un valor
 *   congelado se seguiría vaciando por debajo de una pantalla ya montada.
 *   `userId` es de quién es la sesión.
 * @returns {Promise<{enviadas: number, descartadas: number, pendientes: number}>}
 */
export const vaciaLaColaEntera = async ({ saltaPartida = null, userId = null } = {}) => {
  const cualSalta = () => (typeof saltaPartida === 'function' ? saltaPartida() : saltaPartida);
  // Solo lo de esta persona: `deQuien` deja fuera lo huérfano a propósito, y
  // explica el precio de no hacerlo. Lo huérfano se rescata desde la pantalla
  // de su partida, donde hay alguien mirando
  const mias = userId ? cola.deQuien(userId) : [];
  if (mias.length === 0 || hayOtroVaciadoVivo()) {
    return { enviadas: 0, descartadas: 0, pendientes: mias.length };
  }

  vaciandoDesde = Date.now();
  let resultado;
  try {
    resultado = await vaciaAnotaciones({
      entradas: mias,
      manda: (entrada) =>
        submitHoleScoreUseCase.execute(entrada.matchId, entrada.holeNumber, entrada.scoreData),
      // La partida abierta la vacía su propia pantalla; y una anotación con
      // participante que no sea de partida rápida en solitario se deja para
      // ella, que sabe preguntar cuando otro anotador puso otra cosa
      seSalta: (entrada) =>
        entrada.matchId === cualSalta() || entrada.participantId != null,
    });
  } finally {
    vaciandoDesde = null;
  }

  if (resultado.enviadas > 0 || resultado.descartadas > 0) {
    globalThis.dispatchEvent?.(new globalThis.CustomEvent(COLA_VACIADA));
  }

  return { ...resultado, pendientes: cola.deQuien(userId).length };
};
