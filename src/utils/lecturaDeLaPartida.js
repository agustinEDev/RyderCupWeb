// Lo que la pantalla de anotar una partida de stroke play (`GroupScoringPage`)
// lee de la vista: los golpes del hoyo en pantalla y quién los puso, los
// candados de la casilla, la entrega y los fallos. Funciones puras: la
// pantalla solo las pinta. Las que devuelven texto reciben la `t` de la
// pantalla (espacio `scoring`). Las reglas de las tarjetas —a quién marco,
// quién me marca, quién sigue en juego— viven en el dominio
// (`domain/services/PartidasDeLaFranja`).
import { rolesDeLasTarjetas } from '../domain/services/rolesEnLaPartida';
import { mensajeDeErrorDePartida } from './erroresDePartida';

/** El nombre de un jugador de la partida, o `null` si no está en ella. */
export const nombreDe = (players, jugador) =>
  players.find((p) => p.userId === jugador)?.userName ?? null;

/** El hoyo `numero` de la tarjeta de un jugador (par, metros…). */
export const hoyoDeLaTarjetaDe = (players, jugador, numero) =>
  players
    .find((p) => p.userId === jugador)
    ?.holeCard.find((h) => h.holeNumber === numero);

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
