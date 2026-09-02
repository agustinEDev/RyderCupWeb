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
import * as golpesPerdidos from '../utils/golpesPerdidos';
import {
  esFalloDeTodaLaSesion,
  esRechazoDefinitivo,
  noLlegoAlServidor,
} from '../utils/politicaDeLaCola';
import * as cola from '../utils/scoringOfflineQueue';

// Un solo vaciado a la vez. El evento de vuelta de la red puede llegar dos
// veces, y la pantalla de anotación tiene el suyo: sin esto, la misma
// anotación se enviaría dos veces
let vaciando = false;

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
  if (mias.length === 0 || vaciando) {
    return { enviadas: 0, descartadas: 0, pendientes: mias.length };
  }

  vaciando = true;
  let enviadas = 0;
  let descartadas = 0;

  try {
    for (const entrada of mias) {
      if (entrada.matchId === cualSalta()) continue;
      // Las de partida rápida se dejan para su pantalla, que sabe preguntar
      if (entrada.participantId != null) continue;

      try {
        await submitHoleScoreUseCase.execute(
          entrada.matchId,
          entrada.holeNumber,
          entrada.scoreData
        );
        if (!siguesiendoLaMisma(entrada)) {
          // Se reanotó mientras iba en camino: lo que hay guardado es más
          // nuevo que lo que se acaba de enviar, y se queda para enviarse él
          continue;
        }
        if (
          !cola.remove(entrada.matchId, entrada.holeNumber, entrada.participantId, entrada.userId)
        ) {
          // El golpe llegó pero no se pudo sacar de la cola: sin espacio, o en
          // una ventana privada. Contarlo como enviado lo dejaría reenviándose
          // en cada reconexión para siempre, así que se para: si el
          // almacenamiento no admite una escritura, tampoco admitirá las
          // siguientes, y cada una repetiría el mismo envío duplicado
          break;
        }
        enviadas += 1;
      } catch (err) {
        if (esRechazoDefinitivo(err)) {
          descartadas += apartaLaRechazada(entrada) ? 1 : 0;
          continue;
        }
        // El fallo no es de esta anotación sino de la sesión o del servidor:
        // mientras siga así, las demás fallarían igual. Seguir el bucle es lo
        // que convertía un 403 de CSRF en un cierre de sesión por cada golpe
        // guardado, y un 503 en la cola entera reintentada a cada rato
        if (esFalloDeTodaLaSesion(err) || noLlegoAlServidor(err)) break;
        // Ni rechazo ni red ni sesión: esta entrada no se puede enviar por lo
        // que trae dentro —el caso de uso valida antes de enviar—. Se deja
        // donde está —no se pierde— y se sigue con las demás, para que una
        // sola no bloquee la cola de todo el mundo
        continue;
      }
    }
  } finally {
    vaciando = false;
  }

  if (enviadas > 0 || descartadas > 0) {
    globalThis.dispatchEvent?.(new globalThis.CustomEvent(COLA_VACIADA));
  }

  return { enviadas, descartadas, pendientes: cola.deQuien(userId).length };
};

/**
 * Si lo que hay guardado ahora es exactamente lo que se acaba de enviar.
 *
 * Mientras la petición estaba en vuelo, el jugador ha podido abrir esa partida
 * y reanotar ese hoyo. Borrar «el hoyo 5» a secas se lleva la corrección, el
 * servidor se queda con lo viejo, y nadie se entera. Se compara lo ANOTADO y
 * no solo el momento: `enqueue` sella con `Date.now()`, y una corrección hecha
 * en el mismo milisegundo lleva el mismo sello.
 */
const siguesiendoLaMisma = (entrada) => {
  const ahora = cola
    .getByMatch(entrada.matchId, entrada.userId)
    .find(
      (e) =>
        e.holeNumber === entrada.holeNumber
        && (e.participantId ?? null) === (entrada.participantId ?? null)
        && (e.userId ?? null) === (entrada.userId ?? null)
    );
  return Boolean(
    ahora
      && ahora.timestamp === entrada.timestamp
      && JSON.stringify(ahora.scoreData) === JSON.stringify(entrada.scoreData)
  );
};

/**
 * Saca de la cola una anotación que el servidor ha rechazado, dejando aviso.
 *
 * **Se exporta**: la pantalla de competición vacía su propia cola y tiene que
 * hacer exactamente esto mismo. Cuando cada una tenía su versión, el mismo 409
 * dejaba aviso desde el vaciado de fondo y borraba el golpe en silencio desde
 * la pantalla.
 *
 * **Solo se borra si el aviso ha quedado escrito.** Si el móvil no tiene sitio
 * para el aviso, la anotación se queda en la cola: es preferible que se
 * reintente mil veces a que desaparezca sin que nadie lo sepa, que es
 * exactamente lo que esta issue existe para impedir.
 *
 * @returns {boolean} Si de verdad se apartó
 */
export const apartaLaRechazada = (entrada) => {
  const apuntado = golpesPerdidos.apunta({
    matchId: entrada.matchId,
    matchName: entrada.matchName ?? null,
    matchNumber: entrada.matchNumber ?? null,
    holeNumber: entrada.holeNumber,
    userId: entrada.userId ?? null,
  });
  if (!apuntado) return false;

  return cola.remove(
    entrada.matchId,
    entrada.holeNumber,
    entrada.participantId,
    entrada.userId
  );
};
