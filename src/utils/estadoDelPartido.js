// Lo que la anotación de competición (`useScoring`) deriva de la vista: quién
// puede anotar, qué está bloqueado y si la tarjeta se puede entregar.

// Always allow navigating all 18 holes, even if match decided early
const TOTAL_HOLES = 18;

/**
 * @param {Object|null} scoringView la vista del partido
 * @param {string} currentUserId
 * @param {boolean} isAdmin
 */
export const estadoDelPartido = (scoringView, currentUserId, isAdmin) => {
  // Determine if user is a player in this match
  const isMatchPlayer =
    scoringView?.players?.some((p) => p.userId === currentUserId) ?? false;

  // Fourball: el retirado ni anota ni entrega hasta que se deshaga (RyderCupAM#665)
  const isWithdrawn =
    scoringView?.withdrawnPlayerIds?.includes(currentUserId) ?? false;

  // Admins can score any match even if not enrolled as a player
  const canScore = (isMatchPlayer && !isWithdrawn) || isAdmin;

  // Determine if scorecard already submitted by current user
  const hasSubmitted =
    scoringView?.scorecardSubmittedBy?.includes(currentUserId) ?? false;

  // Find the current user's marker assignment
  const myAssignment = scoringView?.markerAssignments?.find(
    (ma) => ma.scorerUserId === currentUserId,
  );

  // Who do I mark (to check if the person I mark has submitted)
  const markedPlayerId = myAssignment?.marksUserId;
  const markedPlayerHasSubmitted = markedPlayerId
    ? (scoringView?.scorecardSubmittedBy?.includes(markedPlayerId) ?? false)
    : false;

  // Own scores locked after I submit my scorecard
  const isOwnScoreLocked = hasSubmitted;

  // Marker scores locked only when the person I mark has submitted their scorecard
  const isMarkerScoreLocked = markedPlayerHasSubmitted;

  // Fully locked = both my own scores and marker scores are locked.
  // Must use markedPlayerHasSubmitted (the player I mark), not whoever marks ME —
  // in FOURBALL/FOURSOMES marking is a non-reciprocal 4-cycle (A1 marks B1, but is
  // marked by B2), so those are different people and mixing them up read-only-locks
  // the whole input as soon as MY marker submits, even while the player I still mark
  // has an unresolved discrepancy — leaving no one able to fix it.
  const isFullyLocked = isOwnScoreLocked && isMarkerScoreLocked;

  // My line on every hole, in hole order
  const myHoleScores =
    scoringView?.scores?.map((s) =>
      s.playerScores?.find((ps) => ps.userId === currentUserId),
    ) ?? [];

  // Count validated holes
  const validatedHoles = myHoleScores.filter(
    (ps) => ps?.validationStatus === 'match',
  ).length;

  // A hole counts as played when EITHER side has put a score on my line: a
  // decided match leaves the rest unplayed on purpose, but a hole my marker
  // scored and I did not is a hole I still owe. Reading `ownSubmitted` alone
  // hid exactly that hole — and once the card is in, `isOwnScoreLocked` makes
  // the input read-only and the API drops a late own score without an error
  // (`submit_hole_score_use_case.py`, `if not own_score_locked`), so the hole
  // would be lost for good and fall out of the match result.
  const playedHoles = myHoleScores.filter(
    (ps) => ps?.ownSubmitted || ps?.markerSubmitted,
  );
  const everyPlayedHoleValidated =
    playedHoles.length > 0 &&
    playedHoles.every((ps) => ps.validationStatus === 'match');

  const totalHoles = TOTAL_HOLES;

  // A match play match ends as soon as one side is more holes up than there are
  // holes left, and the backend accepts that card: SubmitScorecardUseCase only
  // requires the holes that WERE played to be validated. Asking for all 18 here
  // left the "Partido Decidido" dialog offering a "Continuar para Enviar"
  // button with nothing behind it, so a decided match could never be signed off
  // by its players.
  const canSubmitScorecard =
    canScore &&
    !hasSubmitted &&
    (scoringView?.isDecided
      ? everyPlayedHoleValidated
      : validatedHoles >= totalHoles);

  // Acabado: decidido, o con los 18 jugados aunque no se decidiera antes. Es
  // cuando toca entregar la tarjeta y la pantalla lo pide (FE #745); si queda
  // algún hoyo sin validar, `canSubmitScorecard` sigue en false y se dice cuál
  const partidoAcabado =
    Boolean(scoringView?.isDecided) || playedHoles.length >= totalHoles;

  // What the confirmation dialog counts against: in a decided match the card is
  // complete at the hole it ended on, so "12/18" would read as unfinished
  const holesToSubmit = scoringView?.isDecided
    ? playedHoles.length
    : totalHoles;

  return {
    isMatchPlayer,
    isWithdrawn,
    canScore,
    hasSubmitted,
    isOwnScoreLocked,
    isMarkerScoreLocked,
    isFullyLocked,
    validatedHoles,
    totalHoles,
    canSubmitScorecard,
    partidoAcabado,
    holesToSubmit,
  };
};
