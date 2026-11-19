// Lo que la pantalla de anotar una partida de stroke play (`GroupScoringPage`)
// lee de la vista: quién soy en ella —mi tarjeta, a quién marco, quién me
// marca—, los golpes del hoyo en pantalla, los candados de la casilla, la
// entrega y los fallos. Funciones puras: la pantalla solo las pinta. Las que
// devuelven texto reciben la `t` de la pantalla (espacio `scoring`).
import { sinMarcadorEnJuego } from '../domain/services/PartidasDeLaFranja';
import TeeGroupStatus from '../domain/value_objects/TeeGroupStatus';
import { mensajeDeErrorDePartida } from './erroresDePartida';

// Quien se retiró o no se presentó ya no anota ni marca a nadie
const YA_NO_SIGUEN = ['RETIRADO', 'NO_PRESENTADO'];

const tarjetaDe = (tarjetas, jugador) =>
  tarjetas.find((c) => c.userId === jugador);

/** El nombre de un jugador de la partida, o `null` si no está en ella. */
export const nombreDe = (players, jugador) =>
  players.find((p) => p.userId === jugador)?.userName ?? null;

/** El hoyo `numero` de la tarjeta de un jugador (par, metros…). */
export const hoyoDeLaTarjetaDe = (players, jugador, numero) =>
  players
    .find((p) => p.userId === jugador)
    ?.holeCard.find((h) => h.holeNumber === numero);

/**
 * Mi papel en la partida según las tarjetas: la mía, a quién marco, quién me
 * marca y si sigue haciéndolo, y si mi tarjeta ya no se anota.
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
  const seJuega = (jugador) =>
    tarjetaDe(tarjetas, jugador)?.cardStatus === 'JUGANDO';
  const cerradaSinEntregar =
    Boolean(miTarjeta) &&
    !seJuega(userId) &&
    miTarjeta.cardStatus !== 'ENTREGADA';
  const meMarca = miTarjeta?.markedByUserId;
  return {
    miTarjeta,
    marcoA,
    seJuegaElMarcado: seJuega(marcoA),
    cerradaSinEntregar,
    noPresentado: miTarjeta?.cardStatus === 'NO_PRESENTADO',
    meMarca,
    // Si quien me marcaba se retiró o no se presentó, ya no me marca (CodeRabbit)
    sigueMarcandome:
      Boolean(meMarca) &&
      !YA_NO_SIGUEN.includes(tarjetaDe(tarjetas, meMarca)?.cardStatus),
    sinMarcador: isMatchPlayer && sinMarcadorEnJuego(tarjetas, userId),
  };
};

// El número del marcado que puso otro (el marcador de antes, o el
// organizador): con su nombre y sin tocarlo (2.ª pasada del QA)
const quienPusoLoDelMarcado = (t, players, suGolpe, userId) =>
  suGolpe?.markerSubmitted && suGolpe.markerBy && suGolpe.markerBy !== userId
    ? (suGolpe.markerByName ??
      nombreDe(players, suGolpe.markerBy) ??
      t('partida.anotherMarker'))
    : null;

// Quién me anotó ESTE hoyo: tras cambiar el círculo puede no ser mi marcador
// de ahora (revisor)
const quienMeAnoto = (players, miGolpe, cerradaSinEntregar, meMarca) => {
  if (miGolpe?.markerSubmitted && miGolpe.markerBy) {
    return miGolpe.markerByName ?? nombreDe(players, miGolpe.markerBy);
  }
  return cerradaSinEntregar ? null : nombreDe(players, meMarca);
};

/**
 * Los golpes del hoyo en pantalla —el mío y el de quien marco— y quién puso
 * cada número que no puse yo.
 */
export const golpesDelHoyoDeLaPartida = ({
  t,
  players,
  scoresVisibles,
  currentHole,
  userId,
  marcoA,
  cerradaSinEntregar,
  meMarca,
}) => {
  const golpesDelHoyo = scoresVisibles.find(
    (s) => s.holeNumber === currentHole,
  );
  const miGolpe = golpesDelHoyo?.playerScores.find((p) => p.userId === userId);
  const suGolpe = golpesDelHoyo?.playerScores.find((p) => p.userId === marcoA);
  return {
    miGolpe,
    suGolpe,
    loPusoOtro: quienPusoLoDelMarcado(t, players, suGolpe, userId),
    meAnoto: quienMeAnoto(players, miGolpe, cerradaSinEntregar, meMarca),
  };
};

/**
 * Todo lo que la pantalla necesita saber de mí en la partida: mis roles y los
 * golpes del hoyo en pantalla.
 */
export const rolesEnLaPartida = ({
  t,
  scoringView,
  scoresVisibles,
  currentHole,
  userId,
  isMatchPlayer,
}) => {
  const { strokePlay, players } = scoringView;
  const roles = rolesDeLasTarjetas({
    tarjetas: strokePlay.cards,
    iMarkUserId: strokePlay.iMarkUserId,
    userId,
    isMatchPlayer,
  });
  return {
    ...roles,
    ...golpesDelHoyoDeLaPartida({
      t,
      players,
      scoresVisibles,
      currentHole,
      userId,
      marcoA: roles.marcoA,
      cerradaSinEntregar: roles.cerradaSinEntregar,
      meMarca: roles.meMarca,
    }),
  };
};

/** Los candados de la casilla del hoyo, con los de `useScoring` y mis roles. */
export const candadosDeLaCasilla = ({
  canScore,
  isFullyLocked,
  isSessionBlocked,
  isOwnScoreLocked,
  isMarkerScoreLocked,
  cerradaSinEntregar,
  marcoA,
  seJuegaElMarcado,
}) => ({
  // Su tarjeta cerrada sin entregar se lee: así ve quién le anotó (QA 3)
  isReadOnly:
    !canScore || isFullyLocked || isSessionBlocked || cerradaSinEntregar,
  isOwnScoreLocked:
    isOwnScoreLocked || cerradaSinEntregar || !canScore || isSessionBlocked,
  // Sin a quién marcar, o con su tarjeta ya cerrada, su casilla no se toca
  isMarkerScoreLocked:
    !marcoA ||
    !seJuegaElMarcado ||
    isMarkerScoreLocked ||
    !canScore ||
    isSessionBlocked,
});

/** Lo que dice la barra de entrega, o `null` si no hay barra. */
export const estadoDeEntregaDeLaPartida = ({
  isMatchPlayer,
  cerradaSinEntregar,
  hasSubmitted,
  canSubmitScorecard,
  partidoAcabado,
}) => {
  if (!isMatchPlayer || cerradaSinEntregar) return null;
  if (hasSubmitted) return 'entregada';
  if (canSubmitScorecard) return 'entregar';
  return partidoAcabado ? 'faltaValidar' : null;
};

/** Los hoyos que no se pudieron guardar, en orden. */
export const hoyosNoGuardadosDe = (noGuardados) =>
  Object.keys(noGuardados)
    .map(Number)
    .sort((a, b) => a - b);

/**
 * Los golpes que pinta el selector de hoyos. Pinta un hoyo como hecho si todos
 * lo tienen validado: quien se retiró o no se presentó ya no anota, y con él
 * dentro ningún hoyo volvía a ponerse en verde (/code-review).
 */
export const golpesDelSelectorDeLaPartida = ({
  tarjetas,
  scoresVisibles,
  userId,
  isMatchPlayer,
}) => {
  const siguen = new Set(
    tarjetas
      .filter((c) => !YA_NO_SIGUEN.includes(c.cardStatus))
      .map((c) => c.userId),
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
 */
export const anotacionTerminada = (scoringView, userId) =>
  scoringView?.matchStatus === TeeGroupStatus.COMPLETED ||
  Boolean(
    scoringView?.strokePlay?.cards?.some(
      (c) => c.userId === userId && c.cardStatus !== 'JUGANDO',
    ),
  );

const CLAVE_POR_ESTADO = { 403: 'errors.forbidden', 404: 'errors.notFound' };
const CLAVE_POR_ACCION = {
  golpe: 'errors.failedToSubmitScore',
  tarjeta: 'errors.failedToSubmitScorecard',
};

/** Por qué no se pudo cargar la partida, con nuestras palabras. */
export const motivoDelFalloDeCarga = (t, err) => {
  const clave = CLAVE_POR_ESTADO[err?.status ?? err?.response?.status];
  return clave ? t(clave) : t('offline.noSePudoCargar');
};

/**
 * El texto del recuadro de fallo: lo de una acción (anotar, entregar) dice lo
 * suyo; lo demás, que no se pudo cargar.
 */
export const textoDelFalloDeLaPartida = (t, err, origenDelError) => {
  if (!CLAVE_POR_ACCION[origenDelError]) return motivoDelFalloDeCarga(t, err);
  if (err?.errorCode) return mensajeDeErrorDePartida(t, err);
  return err?.i18nKey ? t(err.i18nKey) : t(CLAVE_POR_ACCION[origenDelError]);
};
