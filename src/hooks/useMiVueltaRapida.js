import { useMemo } from 'react';
import PersonalRoundCalculator from '../domain/services/PersonalRoundCalculator';
import { PlayModeType } from '../domain/value_objects/HandicapSettings';

/**
 * «Tu vuelta» en la anotación de partida rápida (21 oct): el acumulado neto
 * de quien anota con SU hándicap de juego, sobre lo visible —lo pendiente de
 * enviar incluido—. En foursomes sale null: una bola por bando, no hay vuelta
 * propia.
 *
 * En un useMemo: la pantalla se pinta de nuevo con cada sondeo aunque no
 * cambie ningún golpe. Es un hook, así que la página lo llama ANTES de sus
 * salidas tempranas.
 *
 * @param {{
 *   quickMatch: object | null | undefined,
 *   myParticipant: object | null | undefined,
 *   holes: Array<object>,
 *   holeScoresVisibles: Array<object>,
 *   tees: Array<object>,
 * }} datos
 * @returns {object | null} lo que devuelve `PersonalRoundCalculator.runningResult`
 */
export const useMiVueltaRapida = ({
  quickMatch,
  myParticipant,
  holes,
  holeScoresVisibles,
  tees,
}) => {
  const participants = quickMatch?.participants;
  const participantStrokes = quickMatch?.participantStrokes;
  const matchFormat = quickMatch?.matchFormat ?? null;
  const effectiveAllowance = quickMatch?.effectiveAllowance ?? null;
  const playMode = quickMatch?.playMode ?? PlayModeType.HANDICAP;
  return useMemo(
    () =>
      PersonalRoundCalculator.runningResult({
        me: myParticipant,
        participants: participants ?? [],
        holes,
        holeScores: holeScoresVisibles,
        tees,
        participantStrokes: participantStrokes ?? [],
        matchFormat,
        allowancePercentage: effectiveAllowance,
        playMode,
      }),
    [
      myParticipant,
      participants,
      holes,
      holeScoresVisibles,
      tees,
      participantStrokes,
      matchFormat,
      effectiveAllowance,
      playMode,
    ],
  );
};
