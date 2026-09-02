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
// El cerrojo lleva DUEÑO y SEÑAL DE VIDA, y las dos cosas hicieron falta:
//
// - Dueño, porque `apiRequest` no tiene tope de tiempo y una petición que no
//   resuelve nunca dejaba la bandera puesta el resto de la vida de la página.
//   Se puede tomar el relevo, pero solo lo suelta quien lo tiene: sin esto, el
//   vaciado viejo al terminar liberaba el hueco del que ya le había sustituido
//   y acababa habiendo dos a la vez enviando el mismo hoyo.
// - Señal de vida, porque un vaciado LENTO no es un vaciado colgado. Dieciocho
//   hoyos a siete segundos pasan de dos minutos, y con un plazo fijo desde el
//   principio se daba por muerto uno que iba perfectamente (FE #551)
let cerrojo = null;
const SE_DA_POR_COLGADO_MS = 2 * 60 * 1000;

const hayOtroVaciadoVivo = () =>
  cerrojo !== null && Date.now() - cerrojo.ultimaSenal < SE_DA_POR_COLGADO_MS;

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
 * @returns {Promise<{enviadas: number, descartadas: number, pendientes: number,
 *   paroPor: string|null}>} `paroPor` dice por qué se salió antes de tiempo, o
 *   `'ya-hay-otro'` si ni llegó a empezar. Quien llama lo necesita para saber
 *   si reintentar
 */
export const vaciaLaColaEntera = async ({ saltaPartida = null, userId = null } = {}) => {
  const cualSalta = () => (typeof saltaPartida === 'function' ? saltaPartida() : saltaPartida);
  // Solo lo de esta persona: `deQuien` deja fuera lo huérfano a propósito, y
  // explica el precio de no hacerlo. Lo huérfano se rescata desde la pantalla
  // de su partida, donde hay alguien mirando
  const mias = userId ? cola.deQuien(userId) : [];
  if (hayOtroVaciadoVivo()) {
    // Se dice POR QUÉ no se hizo nada: quien llama tiene un reintento
    // programado, y confundir esto con «ha ido bien» se lo desarmaba. Es real:
    // el reintento salta mientras otro vaciado está en vuelo, se encuentra el
    // cerrojo puesto, y sin este dato daba por buena una vuelta que ni empezó
    return { enviadas: 0, descartadas: 0, pendientes: mias.length, paroPor: 'ya-hay-otro' };
  }
  if (mias.length === 0) {
    return { enviadas: 0, descartadas: 0, pendientes: 0, paroPor: null };
  }

  const miTurno = Symbol('vaciado');
  cerrojo = { quien: miTurno, ultimaSenal: Date.now() };
  let resultado;
  try {
    resultado = await vaciaAnotaciones({
      entradas: mias,
      sigoVivo: () => {
        // Solo mientras el cerrojo siga siendo mío: si me lo quitaron por
        // colgado, refrescarlo echaría al que entró en mi lugar
        if (cerrojo?.quien === miTurno) cerrojo.ultimaSenal = Date.now();
      },
      manda: (entrada) =>
        submitHoleScoreUseCase.execute(entrada.matchId, entrada.holeNumber, entrada.scoreData),
      // La partida abierta la vacía su propia pantalla; y una anotación con
      // participante que no sea de partida rápida en solitario se deja para
      // ella, que sabe preguntar cuando otro anotador puso otra cosa
      seSalta: (entrada) =>
        entrada.matchId === cualSalta() || entrada.participantId != null,
    });
  } finally {
    // Solo lo suelta quien lo tiene
    if (cerrojo?.quien === miTurno) cerrojo = null;
  }

  if (resultado.enviadas > 0 || resultado.descartadas > 0) {
    globalThis.dispatchEvent?.(new globalThis.CustomEvent(COLA_VACIADA));
  }

  return { ...resultado, pendientes: cola.deQuien(userId).length };
};
