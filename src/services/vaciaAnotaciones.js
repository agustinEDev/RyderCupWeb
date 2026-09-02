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
 * Por qué se sale del bucle antes de tiempo. **Todos los valores están aquí**:
 * se producen en dos ficheros y se consumen en otros dos, y con cadenas
 * sueltas un valor nuevo que nadie contemplara se leía como «ha ido bien».
 */
export const PARO = Object.freeze({
  /** Sesión, servidor o red: se arregla solo con el tiempo */
  NO_ES_DE_ESTA: 'no-es-de-esta',
  /** El golpe llegó y el móvil no pudo sacarlo de la cola */
  NO_SE_PUDO_BORRAR: 'no-se-pudo-borrar',
  /** El servidor lo rechazó y el móvil no pudo apuntar el aviso */
  NO_SE_PUDO_ESCRIBIR: 'no-se-pudo-escribir',
  /** Otro vaciado lo está haciendo, o tomó el relevo de este */
  YA_HAY_OTRO: 'ya-hay-otro',
});

/**
 * Los paros que se arreglan esperando. Que el móvil no pueda escribir NO se
 * arregla con tiempo: reintentar ahí reenvía a cada rato un golpe que el
 * servidor ya tiene, que es justo lo que el corte del bucle venía a impedir.
 */
export const SE_ARREGLA_ESPERANDO = new Set([PARO.NO_ES_DE_ESTA, PARO.YA_HAY_OTRO]);

/** Los paros que son del almacenamiento del móvil, y hay que enseñar. */
export const ES_DEL_ALMACENAMIENTO = new Set([PARO.NO_SE_PUDO_BORRAR, PARO.NO_SE_PUDO_ESCRIBIR]);

/**
 * Qué aviso de almacenamiento queda en pantalla después de una pasada.
 *
 * Un paro del almacenamiento lo pone. Uno que se arregla esperando lo DEJA
 * COMO ESTABA: la pasada no ha llegado a tocar el disco, así que no sabe nada
 * nuevo de él, y quitarlo por una caída de red dejaba al jugador sin saber que
 * su móvil no guarda mientras la entrada seguía atascada. Solo una pasada que
 * termina sin pararse lo retira: esa sí ha escrito, y ha podido.
 *
 * @param {string|null} anterior - El que había
 * @param {string|null} paroPor - Por qué se paró esta pasada
 * @returns {string|null}
 */
export const avisoTrasElVaciado = (anterior, paroPor) => {
  if (ES_DEL_ALMACENAMIENTO.has(paroPor)) return paroPor;
  if (SE_ARREGLA_ESPERANDO.has(paroPor)) return anterior;
  return null;
};

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
const laMismaEnLaCola = (entrada) => {
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
  const esLaMisma = Boolean(
    ahora
      && ahora.timestamp === entrada.timestamp
      && JSON.stringify(ahora.scoreData) === JSON.stringify(entrada.scoreData)
  );
  // Se devuelve la copia de la cola y no la que se leyó al empezar: la de la
  // cola puede haber recibido el nombre de la partida mientras el bucle iba
  // —`ponleNombre` corre cuando carga la vista, y el vaciado de la primera
  // carga arranca antes—, y el aviso de una rechazada tiene que llevarlo
  return esLaMisma ? ahora : null;
};

/**
 * Cada cuánto se da señal de vida MIENTRAS una petición está en vuelo. Las
 * peticiones no llevan tiempo máximo, y una que se quede colgada más del plazo
 * de «colgado» del cerrojo dejaba que otra pestaña tomara el relevo y
 * reenviara la misma anotación, todavía en camino. Bastante por debajo de ese
 * plazo, que son dos minutos
 */
const LATIDO_EN_VUELO_MS = 30_000;

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
 * @param {() => boolean} [opciones.sigoVivo] - Se llama en cada vuelta, para
 *   que quien vigile pueda distinguir un bucle lento de uno colgado. Si
 *   devuelve `false`, este vaciado ya no es el que manda —otro tomó el relevo
 *   dándolo por colgado— y se para: seguir eran dos bucles enviando los
 *   mismos hoyos
 * @param {(entrada: object) => void} [opciones.alDescartar] - Aviso en
 *   pantalla de una anotación rechazada, antes de tocar el disco
 * @param {string|null} [opciones.dueñoSiNoLoTiene] - A quién se le atribuye el
 *   aviso de una anotación huérfana
 * @param {(entrada: object) => boolean} [opciones.seSalta] - Cuáles no toca
 *   este vaciado. Se consulta EN CADA VUELTA, no una vez al principio: el
 *   bucle tarda, y en ese rato el usuario puede entrar en una partida que se
 *   está enviando
 * @returns {Promise<{enviadas: number, llegaron: number, descartadas: number,
 *   cambiadas: number, paroPor: string|null}>} `enviadas` son las que llegaron
 *   Y salieron de la cola; `llegaron` cuenta también las que el servidor
 *   aceptó pero no se pudieron borrar o cambiaron en vuelo: quien pinta una
 *   tarjeta necesita saber que el servidor tiene algo nuevo aunque la cola no
 *   lo refleje. `cambiadas` son las que el jugador corrigió mientras el bucle
 *   iba: siguen en la cola con el valor nuevo y este bucle no las ha mandado;
 *   quien llama decide si dar otra pasada ya o esperar a su siguiente
 *   disparador. `paroPor` dice POR QUÉ se salió antes de tiempo, y no es
 *   decorativo: quien llama decide con él si reintentar (ver `PARO`)
 */
export const vaciaAnotaciones = async ({
  entradas,
  manda,
  seSalta = () => false,
  sigoVivo = () => true,
  alDescartar = () => {},
  dueñoSiNoLoTiene = null,
}) => {
  let enviadas = 0;
  let llegaron = 0;
  let descartadas = 0;
  let cambiadas = 0;
  let paroPor = null;

  for (const entrada of entradas) {
    // Señal de vida por vuelta: quien vigila que este bucle no se haya
    // colgado necesita distinguir «lento» de «muerto». Dieciocho hoyos a
    // siete segundos son más de dos minutos, y sin esto un vaciado que va
    // bien se daba por colgado y se lanzaba otro encima. Y si contesta que ya
    // no soy yo quien manda, se para aquí: el relevo ya está con estos mismos
    // hoyos
    if (sigoVivo() === false) {
      paroPor = PARO.YA_HAY_OTRO;
      break;
    }
    if (seSalta(entrada)) continue;
    // Se relee justo antes de mandarla: entre la lista de arriba y este
    // momento hay envíos en vuelo, y el jugador puede haber corregido este
    // hoyo. Mandar la copia vieja pisa su corrección en el servidor. La
    // corrección NO se manda desde aquí: quien llama puede tener que mirarla
    // contra el servidor antes —la partida rápida pregunta cuando otro
    // anotador puso otra cosa—, así que se le cuenta y él decide
    if (!laMismaEnLaCola(entrada)) {
      cambiadas += 1;
      continue;
    }

    // Señal de vida también MIENTRAS la petición va: sin esto, una colgada
    // más de dos minutos dejaba que otra pestaña tomara el relevo y la
    // reenviara. Si en ese rato contesta que ya no mando, no se puede hacer
    // nada con una petición en camino; se mira a la vuelta siguiente
    const latido = globalThis.setInterval(() => { sigoVivo(); }, LATIDO_EN_VUELO_MS);
    try {
      await manda(entrada);
    } catch (err) {
      if (esRechazoDefinitivo(err)) {
        // Salvo que el jugador la haya corregido mientras iba en camino: lo
        // que hay guardado ya no es esto. Apuntarla como perdida dejaría un
        // aviso permanente pidiendo repetir un hoyo que ya está corregido, y
        // no hay nada que lo retire
        const rechazada = laMismaEnLaCola(entrada);
        if (!rechazada) {
          cambiadas += 1;
          continue;
        }
        // Primero el aviso en pantalla, que no depende del disco: es lo único
        // que se le puede enseñar a alguien cuyo móvil está lleno
        alDescartar(rechazada);
        if (apartaLaRechazada(rechazada, dueñoSiNoLoTiene)) {
          descartadas += 1;
          continue;
        }
        // El aviso no cupo, así que la anotación se queda. Es el MISMO
        // almacenamiento que falla al borrar, y por el mismo motivo: seguir
        // con las demás son N peticiones condenadas y N escrituras fallidas en
        // cada reconexión, sin que nadie se entere de que el móvil está lleno
        paroPor = PARO.NO_SE_PUDO_ESCRIBIR;
        break;
      }
      // El fallo no es de esta anotación sino de la sesión, del servidor o de
      // la red: mientras siga así, las demás fallarían igual. Seguir el bucle
      // convertía un 403 de CSRF en un cierre de sesión por cada golpe
      // guardado, y un 503 en la cola entera reintentada a cada rato
      if (esFalloDeTodaLaSesion(err) || noLlegoAlServidor(err)) {
        paroPor = PARO.NO_ES_DE_ESTA;
        break;
      }
      // Ni rechazo ni red ni sesión: esta anotación no se puede enviar por lo
      // que trae dentro —el caso de uso valida antes de enviar—. Se deja donde
      // está, no se pierde, y se sigue con las demás: si parara aquí, una sola
      // entrada mala a la cabeza dejaría sin enviar los golpes de todas las
      // demás partidas, en cada reconexión, para siempre
      continue;
    } finally {
      globalThis.clearInterval(latido);
    }

    // Llegó: el servidor ya tiene algo nuevo, se borre o no de la cola
    llegaron += 1;
    // Solo se borra si sigue siendo la que se mandó
    if (!laMismaEnLaCola(entrada)) {
      // Y NO se cuenta como enviada: la corrección del jugador sigue en la
      // cola esperando. Contarla daba un «se envió todo» con cosas dentro, que
      // apagaba el reintento y dejaba la corrección esperando a un evento que
      // en un móvil que nunca perdió cobertura no vuelve a llegar
      cambiadas += 1;
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
      paroPor = PARO.NO_SE_PUDO_BORRAR;
      break;
    }
    enviadas += 1;
  }

  return { enviadas, llegaron, descartadas, cambiadas, paroPor };
};
