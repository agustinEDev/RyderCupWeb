/**
 * Llegar al campo con el partido ya en el móvil (FE #615).
 *
 * La pantalla de anotación sabe pintarse de lo guardado (FE #614), pero solo si
 * el partido se abrió alguna vez con cobertura. En un campo sin señal eso no
 * se arregla allí: tiene que pasar ANTES, en los momentos en que la aplicación
 * ya tiene los datos en la mano —en casa, en el hotel, en el wifi del club—.
 *
 * Sin trabajo de fondo a propósito: Safari no implementa ni Background Sync ni
 * Periodic Background Sync, tampoco en la aplicación instalada. Lo guardado
 * solo se calienta con la aplicación abierta, así que va montado en las
 * pantallas que el jugador ya visita: el panel y sus próximos partidos.
 */
import * as offlineQueue from '../utils/scoringOfflineQueue';
import { fechaLocal } from '../utils/fechaLocal';
import {
  losUltimosPartidos,
  olvida,
  olvidaLoDeEstaCuenta,
  precarga,
  recuerdaLosPartidos,
} from './loUltimoConocido';

/** Mañana y tarde. Caben tres y lo precargado deja sitio a lo que se abre. */
const CUANTAS_SE_PRECARGAN = 2;

/**
 * Cada vista cuesta una petición del cubo de límites que comparte todo el
 * campo (ADR-038). El panel se abre muchas veces, y un torneo entero pidiendo
 * dos vistas por jugador en cada apertura lo multiplica.
 */
const CADA_CUANTO_MS = 15 * 60 * 1000;

/** Cuándo se pidió cada vista. En memoria: una recarga en frío es rara. */
const pedidas = new Map();

/** Solo para las pruebas. */
export const olvidaLasPrecargas = () => pedidas.clear();

/**
 * Los partidos del próximo día con partidos. No «los de hoy»: lo normal es
 * abrir la aplicación la noche antes, en el hotel, y ahí el partido es de
 * mañana.
 */
export const partidosDelProximoDia = (partidos, ahora = new Date()) => {
  const hoy = fechaLocal(ahora);
  const porJugar = (partidos ?? []).filter((p) => p?.id && p.roundDate && p.roundDate >= hoy);
  if (porJugar.length === 0) return [];
  const dia = porJugar.map((p) => p.roundDate).sort()[0];
  return porJugar.filter((p) => p.roundDate === dia).slice(0, CUANTAS_SE_PRECARGAN);
};

/**
 * Nunca lanza: es un extra, y quien la llama no la espera.
 *
 * @param {{partidos: Array, userId: string, pideLaVista: (id: string) => Promise<Object>, ahora?: Date}} p
 */
export const precargaElProximoDia = async ({ partidos, userId, pideLaVista, ahora = new Date() }) => {
  // Una detrás de otra y no a la vez: son peticiones de más sobre el mismo
  // cubo, y nadie está esperando por ellas
  const tanda = partidosDelProximoDia(partidos, ahora);
  for (const partido of tanda) {
    const antes = pedidas.get(partido.id);
    if (antes !== undefined && ahora.getTime() - antes < CADA_CUANTO_MS) continue;
    pedidas.set(partido.id, ahora.getTime());

    try {
      const vista = await pideLaVista(partido.id);
      // Solo los que se juegan, como en la pantalla de anotación: las plazas
      // son pocas y compartidas con partida rápida
      if (!vista?.players?.some((p) => p.userId === userId)) continue;
      // Lo que hay en la cola se lee JUSTO antes de escribir: entre la
      // petición y aquí se ha podido anotar algo. Y la tanda entera tampoco se
      // puede ir: al hacer sitio para una se echaba a otra de las mismas
      const protegidas = new Set([
        ...offlineQueue.getAll().map((entrada) => entrada.matchId),
        ...tanda.map((p) => p.id),
      ]);
      precarga(partido.id, { partida: vista, campo: null }, { protegidas });
    } catch (err) {
      const estado = err?.status ?? err?.response?.status;
      // Una respuesta CON estado es una respuesta: ese partido ya no está o no
      // es tuyo, y pintarlo desde el móvil sería dejar anotar sobre nada
      if (estado === 404 || estado === 403) {
        olvida(partido.id);
      } else if (estado === undefined) {
        // Sin respuesta no se gasta el turno: en cuanto vuelva la cobertura
        // hay que intentarlo, que para eso está esto
        pedidas.delete(partido.id);
      }
    }
  }
};

/** Lo guardado, sin los partidos de días que ya pasaron. */
const losGuardados = (ahora) => {
  const hoy = fechaLocal(ahora);
  return (losUltimosPartidos() ?? []).filter((p) => p?.roundDate && p.roundDate >= hoy);
};

/**
 * Los próximos partidos para enseñar, con red o sin ella. Nunca lanza.
 *
 * Una lista vacía porque no se pudo preguntar no es una lista vacía: decir «no
 * tienes partidos» a quien tiene uno dentro de una hora es afirmar algo que
 * nadie ha comprobado. Por eso sale `sinRespuesta` aparte.
 *
 * @param {{lee: () => Promise<{matches: Array, complete: boolean}>, userId: string,
 *   pideLaVista: (id: string) => Promise<Object>, ahora?: Date}} p
 * @returns {Promise<{partidos: Array, desdeMemoria: boolean, sinRespuesta: boolean}>}
 */
export const leeLosProximosPartidos = async ({ lee, userId, pideLaVista, ahora = new Date() }) => {
  try {
    const { matches, complete } = await lee();
    // Media lista VACÍA no dice nada: si falló la única competición con
    // partidos, enseñarla es el mismo «no tienes» de siempre
    if (complete || matches.length > 0) {
      // Media lista se enseña, pero no se guarda: pisaría una completa y en el
      // campo faltaría justo el partido de la competición que falló
      if (complete) recuerdaLosPartidos(matches);
      precargaElProximoDia({ partidos: matches, userId, pideLaVista, ahora });
      return { partidos: matches, desdeMemoria: false, sinRespuesta: false };
    }
  } catch (err) {
    console.error('Error loading upcoming matches:', err);
    // El 401 y el 403 desmienten: no hemos entrado, o esto no es nuestro. Y se
    // borra lo guardado, como en partida rápida: seguía ahí para el siguiente
    // fallo de red. Con `err.status` a secas por lo mismo que allí —el del
    // refresco fallido viene en `.response` y no desmiente nada (FE #514)—
    if (err?.status === 401 || err?.status === 403) {
      olvidaLoDeEstaCuenta();
      return { partidos: [], desdeMemoria: false, sinRespuesta: true };
    }
  }

  const guardados = losGuardados(ahora);
  return guardados.length > 0
    ? { partidos: guardados, desdeMemoria: true, sinRespuesta: false }
    : { partidos: [], desdeMemoria: false, sinRespuesta: true };
};

/**
 * La hora «HH:MM» que trae una marca de tiempo del servidor, en el huso que ella
 * misma declara —el del campo (BE #305)—, sin pasarla por el del dispositivo.
 *
 * Se lee de la propia cadena por eso: `new Date(iso)` conserva el instante pero
 * pierde el desfase, y cualquier formateo posterior sale en la hora del móvil.
 * Una marca sin desfase no dice de dónde es, y ahí no se inventa nada.
 */
/**
 * Escribe una hora del CAMPO tal como viene, sin que el huso del dispositivo la
 * mueva: se leen los números del propio ISO y se formatean en UTC. El idioma sí
 * decide cómo se escriben —«18:00» en español es «6:00 PM» en inglés—.
 *
 * Devuelve `null` si el dato no trae desfase, porque entonces no dice de qué
 * reloj habla.
 */
const escritoComoEnElCampo = (iso, idioma, opciones, respaldo) => {
  const partes = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(iso ?? ''));
  if (!partes) return null;
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/.test(String(iso).trim())) return null;

  const [, anio, mes, dia, hora, minuto] = partes;
  // Una fecha de mentira con esos números, formateada en UTC: así el huso del
  // dispositivo no la mueve
  const comoSeEscribe = new Date(
    Date.UTC(Number(anio), Number(mes) - 1, Number(dia), Number(hora), Number(minuto))
  );
  try {
    return new Intl.DateTimeFormat(String(idioma || 'es').replace(/_/g, '-'), {
      ...opciones,
      timeZone: 'UTC',
    }).format(comoSeEscribe);
  } catch {
    // `Intl` lanza `RangeError` con una etiqueta que no entienda, y aquí eso
    // tumbaría el render de la pantalla entera
    return respaldo({ anio, mes, dia, hora, minuto });
  }
};

export const horaDelCampo = (iso, idioma = 'es') =>
  escritoComoEnElCampo(
    iso,
    idioma,
    { hour: '2-digit', minute: '2-digit' },
    ({ hora, minuto }) => `${hora}:${minuto}`
  );

/**
 * Como `horaDelCampo`, pero con el día delante: el plazo de los sobres cae de
 * madrugada, así que sin la fecha no se entiende de qué día se habla (FE #655).
 */
export const fechaYHoraDelCampo = (iso, idioma = 'es') =>
  escritoComoEnElCampo(
    iso,
    idioma,
    { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
    ({ dia, mes, hora, minuto }) => `${dia}/${mes} ${hora}:${minuto}`
  );

/**
 * De una lista de partidos, el instante de la PRÓXIMA apertura que queda por
 * llegar, o `null` si no hay ninguna. Sirve para poner un solo despertador en
 * la lista en vez de uno por tarjeta (FE #621, `/code-review`).
 */
export const laProximaApertura = (partidos, ahora = new Date()) => {
  const pendientes = (partidos || [])
    .map((partido) => abreMasTarde(partido, ahora))
    .filter(Boolean)
    .map((fecha) => fecha.getTime());
  return pendientes.length > 0 ? Math.min(...pendientes) : null;
};

/**
 * La hora de apertura de un partido programado, si aún no ha llegado. La usa la
 * pantalla de anotación para decir CUÁNDO abre en vez de ofrecer casillas que
 * el servidor va a rechazar (FE #621). Devuelve la fecha, no un booleano,
 * porque quien pregunta necesita enseñarla.
 */
export const abreMasTarde = ({ status, scoringOpensAt }, ahora = new Date()) => {
  if (status !== 'SCHEDULED' || !scoringOpensAt) return null;
  const abre = new Date(scoringOpensAt);
  if (Number.isNaN(abre.getTime()) || ahora >= abre) return null;
  return abre;
};

/**
 * Un partido en juego se anota siempre. Uno programado, desde la hora a la que
 * la anotación abre sola (BE #305): la manda el servidor en `scoringOpensAt`,
 * con el huso del CAMPO ya dentro, así que aquí solo se compara —la tabla de
 * horas vive en el servidor y en un sitio solo (FE #621)—.
 *
 * Dos casos sin hora, que no son el mismo:
 *
 *   - El servidor la manda VACÍA: ese campo no tiene coordenadas, no abre solo
 *     y hay que arrancarlo a mano. Con red no se ofrece anotar; sin ella se
 *     aplica la misma regla de abajo, que anotar sin cobertura no se le quita
 *     a nadie.
 *   - No viene el campo: lo guardó una versión anterior a la BE #305. Se
 *     conserva la regla de entonces —el programado de HOY se deja anotar sin
 *     red—, para no dejar tirado en el campo a un móvil que se preparó con la
 *     versión vieja. Si nadie lo arranca, el servidor rechaza los golpes y
 *     salen en el aviso de golpes perdidos, no en silencio.
 *
 * El reloj del móvil es el único que hay sin cobertura, así que uno adelantado
 * puede ofrecer anotar antes de tiempo. El servidor lo rechaza igual, y ese
 * rechazo es reintentable: el golpe se queda en la cola, no se pierde.
 */
export const sePuedeAnotar = (partido, { desdeMemoria, ahora = new Date() }) => {
  if (partido?.status === 'IN_PROGRESS') return true;
  if (partido?.status !== 'SCHEDULED') return false;

  const deHoyYSinPoderPreguntar = () => Boolean(
    desdeMemoria && partido.roundDate === fechaLocal(ahora)
  );

  if (partido.scoringOpensAt !== undefined) {
    // Sin hora: ese campo no tiene coordenadas y no abre solo. Con red manda el
    // servidor y no se ofrece. Sin red NO se le quita al jugador lo que ya
    // tenía: el partido de hoy se deja anotar y los golpes esperan en la cola,
    // que es la regla de producto de anotar sin cobertura
    if (!partido.scoringOpensAt) return deHoyYSinPoderPreguntar();
    const abre = new Date(partido.scoringOpensAt);
    if (Number.isNaN(abre.getTime())) return deHoyYSinPoderPreguntar();
    return ahora >= abre;
  }

  return deHoyYSinPoderPreguntar();
};
