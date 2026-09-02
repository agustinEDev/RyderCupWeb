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
  // Por `getByMatch` y no por `getAll`: es la lectura que las pantallas
  // sustituyen en sus tests, y cambiarla dejaba la mitad de este bucle sin
  // ejercitar. Sale más caro —dos lecturas del almacenamiento por entrada—,
  // y se acepta a sabiendas: leer de más aquí no pierde golpes
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
export const apartaLaRechazada = (entrada, dueñoSiNoLoTiene = null) => {
  const apuntado = golpesPerdidos.apunta({
    matchId: entrada.matchId,
    matchName: entrada.matchName ?? null,
    matchNumber: entrada.matchNumber ?? null,
    holeNumber: entrada.holeNumber,
    participantId: entrada.participantId ?? null,
    // Con a quién atribuir lo huérfano: un aviso sin dueño lo ve TODA cuenta
    // del móvil, y el primero que pulse «Entendido» se lo lleva antes de que
    // lo vea el suyo
    userId: entrada.userId ?? dueñoSiNoLoTiene ?? null,
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
 * @param {() => void} [opciones.sigoVivo] - Se llama en cada vuelta, para que
 *   quien vigile pueda distinguir un bucle lento de uno colgado
 * @param {(entrada: object) => void} [opciones.alDescartar] - Aviso en
 *   pantalla de una anotación rechazada, antes de tocar el disco
 * @param {string|null} [opciones.dueñoSiNoLoTiene] - A quién se le atribuye el
 *   aviso de una anotación huérfana
 * @param {(entrada: object) => boolean} [opciones.seSalta] - Cuáles no toca
 *   este vaciado. Se consulta EN CADA VUELTA, no una vez al principio: el
 *   bucle tarda, y en ese rato el usuario puede entrar en una partida que se
 *   está enviando
 * @returns {Promise<{enviadas: number, descartadas: number, paroPor: string|null}>}
 *   `paroPor` dice POR QUÉ se salió antes de tiempo, y no es decorativo: quien
 *   llama decide con él si reintentar. `'no-es-de-esta'` se arregla solo con
 *   el tiempo; `'no-se-pudo-borrar'` y `'no-se-pudo-escribir'` son el
 *   almacenamiento lleno y reintentar solo repite envíos que ya llegaron
 */
export const vaciaAnotaciones = async ({
  entradas,
  manda,
  seSalta = () => false,
  sigoVivo = () => {},
  alDescartar = () => {},
  dueñoSiNoLoTiene = null,
}) => {
  let enviadas = 0;
  let descartadas = 0;
  let paroPor = null;

  for (const entrada of entradas) {
    // Señal de vida por vuelta: quien vigila que este bucle no se haya
    // colgado necesita distinguir «lento» de «muerto». Dieciocho hoyos a
    // siete segundos son más de dos minutos, y sin esto un vaciado que va
    // bien se daba por colgado y se lanzaba otro encima
    sigoVivo();
    if (seSalta(entrada)) continue;
    // Se relee justo antes de mandarla: entre la lista de arriba y este
    // momento hay envíos en vuelo, y el jugador puede haber corregido este
    // hoyo. Mandar la copia vieja pisa su corrección en el servidor
    if (!siguesiendoLaMisma(entrada)) continue;

    try {
      await manda(entrada);
    } catch (err) {
      if (esRechazoDefinitivo(err)) {
        // Salvo que el jugador la haya corregido mientras iba en camino: lo
        // que hay guardado ya no es esto. Apuntarla como perdida dejaría un
        // aviso permanente pidiendo repetir un hoyo que ya está corregido, y
        // no hay nada que lo retire
        if (!siguesiendoLaMisma(entrada)) continue;
        // Primero el aviso en pantalla, que no depende del disco: es lo único
        // que se le puede enseñar a alguien cuyo móvil está lleno
        alDescartar(entrada);
        if (apartaLaRechazada(entrada, dueñoSiNoLoTiene)) {
          descartadas += 1;
          continue;
        }
        // El aviso no cupo, así que la anotación se queda. Es el MISMO
        // almacenamiento que falla al borrar, y por el mismo motivo: seguir
        // con las demás son N peticiones condenadas y N escrituras fallidas en
        // cada reconexión, sin que nadie se entere de que el móvil está lleno
        paroPor = 'no-se-pudo-escribir';
        break;
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
      // Y NO se cuenta como enviada: la corrección del jugador sigue en la
      // cola esperando. Contarla daba un «se envió todo» con cosas dentro, que
      // apagaba el reintento y dejaba la corrección esperando a un evento que
      // en un móvil que nunca perdió cobertura no vuelve a llegar
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
