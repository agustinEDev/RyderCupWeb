import CardStatus from '../value_objects/CardStatus';
import TeeGroupStatus from '../value_objects/TeeGroupStatus';
import {
  esNoPresentado,
  seRetiro,
  sinMarcadorEnJuego,
} from './PartidasDeLaFranja';

/**
 * Los papeles de cada uno en la anotación de una partida de la franja: a quién
 * marco, si mi marcador me sigue marcando, si mi tarjeta está cerrada. Van
 * aparte de `PartidasDeLaFranja` para no cargarlos al arrancar: solo los usa la
 * pantalla de anotar, que se descarga al abrirla (presupuesto del arranque).
 */

/**
 * @typedef {Object} TarjetaDeLaPartida
 * @property {string} userId
 * @property {string} cardStatus - Un valor de `CardStatus`
 * @property {?string} markedByUserId
 */

/**
 * @param {TarjetaDeLaPartida[]} tarjetas
 * @param {?string} jugador
 * @returns {TarjetaDeLaPartida|undefined}
 */
const tarjetaDe = (tarjetas, jugador) =>
  tarjetas.find((c) => c.userId === jugador);

/**
 * Quien se retiró o no se presentó ya no anota ni marca a nadie.
 *
 * @param {?{cardStatus?: string}} [tarjeta]
 * @returns {boolean}
 */
const yaNoSigue = (tarjeta) => seRetiro(tarjeta) || esNoPresentado(tarjeta);

/**
 * Mi papel en la partida según las tarjetas: la mía, a quién marco, quién me
 * marca y si sigue haciéndolo, y si mi tarjeta ya no se anota.
 *
 * @param {{tarjetas: TarjetaDeLaPartida[], iMarkUserId: ?string, userId: string, isMatchPlayer: boolean}} datos
 */
export const rolesDeLasTarjetas = ({
  tarjetas,
  iMarkUserId,
  userId,
  isMatchPlayer,
}) => {
  const miTarjeta = tarjetaDe(tarjetas, userId);
  // Solo en su partida (bajas): no marca a nadie, su golpe lo valida el organizador
  const marcoA = iMarkUserId;
  // Una tarjeta retirada o de no presentado ya no se anota: el servidor tira
  // ese lado con un 200 y el golpe desaparecería sin aviso (revisor). La
  // entregada ya la bloquea `useScoring`
  /** @param {?string} jugador */
  const seJuega = (jugador) =>
    tarjetaDe(tarjetas, jugador)?.cardStatus === CardStatus.JUGANDO;
  const cerradaSinEntregar =
    Boolean(miTarjeta) &&
    !seJuega(userId) &&
    miTarjeta.cardStatus !== CardStatus.ENTREGADA;
  const meMarca = miTarjeta?.markedByUserId;
  return {
    miTarjeta,
    marcoA,
    seJuegaElMarcado: seJuega(marcoA),
    cerradaSinEntregar,
    noPresentado: esNoPresentado(miTarjeta),
    meMarca,
    // Si quien me marcaba se retiró o no se presentó, ya no me marca (CodeRabbit)
    sigueMarcandome:
      Boolean(meMarca) && !yaNoSigue(tarjetaDe(tarjetas, meMarca)),
    sinMarcador: isMatchPlayer && sinMarcadorEnJuego(tarjetas, userId),
  };
};

/**
 * Los golpes que pinta el selector de hoyos. Pinta un hoyo como hecho si todos
 * lo tienen validado: quien se retiró o no se presentó ya no anota, y con él
 * dentro ningún hoyo volvía a ponerse en verde (/code-review).
 *
 * @param {{tarjetas: TarjetaDeLaPartida[], scoresVisibles: Array<{playerScores: Array<{userId: string}>}>, userId: string, isMatchPlayer: boolean}} datos
 */
export const golpesDelSelectorDeLaPartida = ({
  tarjetas,
  scoresVisibles,
  userId,
  isMatchPlayer,
}) => {
  const siguen = new Set(
    tarjetas.filter((c) => !yaNoSigue(c)).map((c) => c.userId),
  );
  // Y quien ya no sigue (retirado, no presentado) ve la suya: los hoyos que no
  // jugó no son verdes para él (3.ª pasada del QA)
  const delSelector =
    isMatchPlayer && !siguen.has(userId) ? new Set([userId]) : siguen;
  return (
    scoresVisibles
      // Lo que nadie anotó sale vacío en el selector (#847)
      .map((s) => ({
        ...s,
        playerScores: s.playerScores.filter((p) => delSelector.has(p.userId)),
      }))
  );
};

/**
 * Si ya no hay anotación a la que volver tras un arranque en frío: la partida
 * cerrada, o mi tarjeta ya no se juega (entregada, retirada o no presentado).
 *
 * @param {?{matchStatus?: string, strokePlay?: {cards?: TarjetaDeLaPartida[]}}} scoringView - O nada, sin vista
 * @param {string} userId
 * @returns {boolean}
 */
export const anotacionTerminada = (scoringView, userId) =>
  scoringView?.matchStatus === TeeGroupStatus.COMPLETED ||
  Boolean(
    scoringView?.strokePlay?.cards?.some(
      (c) => c.userId === userId && c.cardStatus !== CardStatus.JUGANDO,
    ),
  );
