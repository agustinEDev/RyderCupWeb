/**
 * El bucle que vacía anotaciones guardadas. **Uno solo** (FE #551).
 *
 * Había tres —el de fondo, el de la pantalla de competición y el de partida
 * rápida—, cada uno con su copia de la misma política. Dos rondas de revisión
 * sobre la FE #521 dieron treinta hallazgos, y en las dos el patrón dominante
 * fue el mismo: una decisión tomada bien en un vaciado y no copiada a los
 * otros. Arreglar cada cosa en tres sitios es lo que generaba la ronda
 * siguiente, porque los propios arreglos creaban gemelos nuevos.
 *
 * Aquí vive la política; quien llama pone el CÓMO se manda una anotación y
 * qué anotaciones son suyas. Lo que no está aquí no forma parte de la
 * política: los disparadores y lo que se le enseña al usuario son de cada
 * pantalla.
 */

import * as golpesPerdidos from '../utils/golpesPerdidos';
import {
  esFalloDeTodaLaSesion,
  esRechazoDefinitivo,
  noLlegoAlServidor,
} from '../utils/politicaDeLaCola';
import * as cola from '../utils/scoringOfflineQueue';

/**
 * Si lo que hay guardado AHORA es lo mismo que se leyó.
 *
 * Se mira dos veces, y no es lo mismo:
 *
 * - **Antes de mandar**, porque el jugador puede haber corregido ese hoyo
 *   mientras el bucle iba por otros. Mandar la copia vieja escribe en el
 *   servidor un resultado que ya está corregido.
 * - **Antes de borrar**, porque puede haberlo corregido mientras esta misma
 *   petición estaba en vuelo. Borrar «el hoyo 5» a secas se lleva la
 *   corrección, el servidor se queda con lo viejo, y nadie se entera.
 *
 * Se compara lo ANOTADO y no solo el momento: `enqueue` sella con `Date.now()`
 * y una corrección hecha en el mismo milisegundo lleva el mismo sello.
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
 * **Solo se borra si el aviso ha quedado escrito.** Si el móvil no tiene sitio
 * para el aviso, la anotación se queda en la cola: es preferible que se
 * reintente mil veces a que desaparezca sin que nadie lo sepa, que es
 * exactamente lo que la FE #521 existe para impedir.
 *
 * @returns {boolean} Si de verdad se apartó
 */
export const apartaLaRechazada = (entrada) => {
  const apuntado = golpesPerdidos.apunta({
    matchId: entrada.matchId,
    matchName: entrada.matchName ?? null,
    matchNumber: entrada.matchNumber ?? null,
    holeNumber: entrada.holeNumber,
    participantId: entrada.participantId ?? null,
    userId: entrada.userId ?? null,
  });
  if (!apuntado) return false;

  return cola.remove(
    entrada.matchId,
    entrada.holeNumber,
    entrada.participantId,
    entrada.userId ?? null
  );
};

/**
 * Vacía las anotaciones que se le den, con la política de arriba.
 *
 * @param {object} opciones
 * @param {Array} opciones.entradas - Qué anotaciones, ya elegidas por quien llama
 * @param {(entrada: object) => Promise<void>} opciones.manda - Cómo se envía una.
 *   Lanza si no se pudo
 * @param {(entrada: object) => boolean} [opciones.seSalta] - Cuáles no toca
 *   este vaciado. Se consulta EN CADA VUELTA, no una vez al principio: el
 *   bucle tarda, y en ese rato el usuario puede entrar en una partida que se
 *   está enviando
 * @returns {Promise<{enviadas: number, descartadas: number, paroPor: string|null}>}
 */
export const vaciaAnotaciones = async ({ entradas, manda, seSalta = () => false }) => {
  let enviadas = 0;
  let descartadas = 0;
  let paroPor = null;

  for (const entrada of entradas) {
    if (seSalta(entrada)) continue;
    // Se relee justo antes de mandarla: entre la lista de arriba y este
    // momento hay envíos en vuelo, y el jugador puede haber corregido este
    // hoyo. Mandar la copia vieja pisa su corrección en el servidor
    if (!siguesiendoLaMisma(entrada)) continue;

    try {
      await manda(entrada);
    } catch (err) {
      if (esRechazoDefinitivo(err)) {
        descartadas += apartaLaRechazada(entrada) ? 1 : 0;
        continue;
      }
      // El fallo no es de esta anotación sino de la sesión, del servidor o de
      // la red: mientras siga así, las demás fallarían igual. Seguir el bucle
      // convertía un 403 de CSRF en un cierre de sesión por cada golpe
      // guardado, y un 503 en la cola entera reintentada a cada rato
      if (esFalloDeTodaLaSesion(err) || noLlegoAlServidor(err)) {
        paroPor = 'no-es-de-esta';
        break;
      }
      // Ni rechazo ni red ni sesión: esta anotación no se puede enviar por lo
      // que trae dentro —el caso de uso valida antes de enviar—. Se deja donde
      // está, no se pierde, y se sigue con las demás: si parara aquí, una sola
      // entrada mala a la cabeza dejaría sin enviar los golpes de todas las
      // demás partidas, en cada reconexión, para siempre
      continue;
    }

    // Llegó. Solo se borra si sigue siendo la que se mandó
    if (!siguesiendoLaMisma(entrada)) {
      enviadas += 1;
      continue;
    }
    const borrada = cola.remove(
      entrada.matchId,
      entrada.holeNumber,
      entrada.participantId,
      entrada.userId ?? null
    );
    if (!borrada) {
      // El golpe llegó pero no se pudo sacar de la cola: sin espacio, o en una
      // ventana privada. Contarlo como enviado lo dejaría reenviándose en cada
      // reconexión para siempre, así que se para: si el almacenamiento no
      // admite una escritura, tampoco admitirá las siguientes, y cada una
      // repetiría el mismo envío duplicado
      paroPor = 'no-se-pudo-borrar';
      break;
    }
    enviadas += 1;
  }

  return { enviadas, descartadas, paroPor };
};
