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
import * as cerrojo from '../utils/scoringSessionLock';
import { PARO, vaciaAnotaciones } from './vaciaAnotaciones';

// Un solo vaciado a la vez, ENTRE PESTAÑAS. El evento de vuelta de la red
// puede llegar dos veces, y dos pestañas de la misma cuenta leen la misma
// cola: sin esto, la misma anotación se enviaría dos veces.
//
// El cerrojo es el de la pantalla de anotación, con ámbito propio: ya tiene
// dueño, señal de vida y plazo para dar por colgado al que no la da (dos
// minutos). Hubo aquí uno propio, por pestaña, con las mismas reglas
// reescritas; no servía contra la segunda pestaña, y dos plazos iguales en dos
// ficheros se desajustan en cuanto alguien toca uno (FE #551)
//
// Tiene un precio, asumido: si el sistema mata la aplicación a mitad de un
// vaciado, el cerrojo queda escrito y el siguiente arranque se lo encuentra
// puesto hasta que caduque. Son como mucho dos minutos y medio de retraso del
// vaciado de fondo —el reintento cae a los 30 s y a los 150 s—, y la pantalla
// de anotación vacía lo suyo sin pasar por aquí. La alternativa, un cerrojo
// que muera con la pestaña, es la que no servía contra la segunda pestaña
const AMBITO = 'vaciado';

/** Se emite cuando el vaciado ha enviado o descartado algo. */
export const COLA_VACIADA = 'rydercup:cola-vaciada';

const nada = (pendientes, paroPor) => ({
  enviadas: 0,
  llegaron: 0,
  descartadas: 0,
  pendientes,
  paroPor,
});

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
 * @returns {Promise<{enviadas: number, llegaron: number, descartadas: number,
 *   pendientes: number, paroPor: string|null}>} `paroPor` dice por qué se
 *   salió antes de tiempo, o `PARO.YA_HAY_OTRO` si ni llegó a empezar. Quien
 *   llama lo necesita para saber si reintentar
 */
export const vaciaLaColaEntera = async ({ saltaPartida = null, userId = null } = {}) => {
  const cualSalta = () => (typeof saltaPartida === 'function' ? saltaPartida() : saltaPartida);
  // Solo lo de esta persona: `deQuien` deja fuera lo huérfano a propósito, y
  // explica el precio de no hacerlo. Lo huérfano se rescata desde la pantalla
  // de su partida, donde hay alguien mirando
  const mias = userId ? cola.deQuien(userId) : [];
  if (mias.length === 0) return nada(0, null);

  const miTurno = `${AMBITO}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  if (!cerrojo.acquire(null, miTurno, userId, AMBITO)) {
    // Se dice POR QUÉ no se hizo nada: quien llama tiene un reintento
    // programado, y confundir esto con «ha ido bien» se lo desarmaba. Es real:
    // el reintento salta mientras otro vaciado está en vuelo, se encuentra el
    // cerrojo puesto, y sin este dato daba por buena una vuelta que ni empezó
    return nada(mias.length, PARO.YA_HAY_OTRO);
  }
  // Sigue siendo mío mientras nadie lo haya tomado dándome por colgado. Con
  // el cerrojo sin escribir NO se da por mío: es lo que ve el que se quedó
  // dormido cuando el relevo ya terminó y lo soltó, y seguir era mandar su
  // copia vieja de la cola detrás de la del relevo. La excepción es un
  // almacenamiento que no admite escrituras: ahí el cerrojo falla abierto y
  // no se leerá nunca nada, así que se decide UNA vez al tomarlo, no en cada
  // vuelta
  const sinAlmacen = cerrojo.getSession(userId, AMBITO)?.sessionId !== miTurno;
  const sigueSiendoMio = () =>
    sinAlmacen || cerrojo.getSession(userId, AMBITO)?.sessionId === miTurno;

  let resultado;
  try {
    resultado = await vaciaAnotaciones({
      entradas: mias,
      sigoVivo: () => {
        // Si me lo quitaron por colgado, refrescarlo echaría al que entró en
        // mi lugar; se contesta que no, y el bucle para
        if (!sigueSiendoMio()) return false;
        cerrojo.refresh(miTurno, userId, AMBITO);
        return true;
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
    // Solo lo suelta quien lo tiene: `release` ya lo comprueba
    cerrojo.release(miTurno, userId, AMBITO);
  }

  if (resultado.enviadas > 0 || resultado.descartadas > 0) {
    globalThis.dispatchEvent?.(new globalThis.CustomEvent(COLA_VACIADA));
  }

  return { ...resultado, pendientes: cola.deQuien(userId).length };
};
