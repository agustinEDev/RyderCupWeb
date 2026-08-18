import { useTranslation } from 'react-i18next';
import StablefordCalculator from '../../domain/services/StablefordCalculator';
import MatchPlayStrokeAllocator from '../../domain/services/MatchPlayStrokeAllocator';

// Mirrors the backend's ScoringService._compute_standing SINGLES fallback:
// team is only set for FOURBALL/FOURSOMES, so a 2-participant match without
// team assignments is resolved positionally (first participant is "team A").
const resolveMatchTeams = (participants) => {
  const teamA = participants.filter((p) => (p.team ?? 'A') === 'A');
  const teamB = participants.filter((p) => p.team === 'B');
  if (teamB.length === 0 && participants.length === 2) {
    return { teamA: [participants[0]], teamB: [participants[1]] };
  }
  return { teamA, teamB };
};

/**
 * Match-play standing (SINGLES/FOURBALL/FOURSOMES): there's no individual
 * points/strokes ranking to show, just who's up and by how much, mirroring
 * the backend's already-computed `standing` (GetQuickMatchUseCase._compute_standing).
 */
// Una vuelta personal se mide con el hándicap de juego entero.
const PERSONAL_ROUND_ALLOWANCE = 100;

const MatchStandingSummary = ({ participants, standing, myToPar }) => {
  const { t } = useTranslation('quickMatch');

  if (!standing) {
    return (
      <p className="text-sm text-gray-500 text-center py-6" data-testid="quick-match-standing-empty">
        {t('scoring.classification.noHolesYet')}
      </p>
    );
  }

  const { teamA, teamB } = resolveMatchTeams(participants);
  const lead = standing.leadingTeam ? parseInt(standing.status, 10) : 0;
  const leaderNames = (standing.leadingTeam === 'A' ? teamA : teamB).map((p) => p.name).join(' & ');

  let resultLabel;
  if (!standing.leadingTeam) {
    resultLabel = t('scoring.classification.allSquare');
  } else if (standing.isDecided && standing.holesRemaining > 0) {
    resultLabel = t('scoring.classification.decidedResult', { lead, remaining: standing.holesRemaining });
  } else {
    resultLabel = t('scoring.classification.holesUp', { count: lead });
  }

  return (
    <div className="text-center py-6" data-testid="quick-match-standing">
      <p className="text-2xl font-bold text-gray-900">{resultLabel}</p>
      {standing.leadingTeam && (
        <p className="text-sm text-gray-500 mt-1">{t('scoring.classification.leads', { name: leaderNames })}</p>
      )}
      <p className="text-xs text-gray-400 mt-2">
        {t('scoring.classification.holesPlayed', { count: standing.holesPlayed })}
      </p>
      {/* En match play el marcador dice quién gana, no cómo jugó uno. Los
          golpes se dan por diferencia, así que el resultado propio se calcula
          aparte, con el hándicap de juego de cada uno. */}
      {myToPar !== null && myToPar !== undefined && (
        <p className="text-sm text-gray-600 mt-3" data-testid="quick-match-my-round">
          {t('scoring.classification.yourRound')}{' '}
          <span className="font-bold text-gray-900">{myToPar}</span>
        </p>
      )}
    </div>
  );
};

/**
 * Quick match classification: ranked by Stableford points (or net strokes for
 * Medal) in free play, no team columns — quick match is single-entry,
 * individual. Match-play formats (SINGLES/FOURBALL/FOURSOMES) show the match
 * standing instead — an individual points ranking doesn't mean anything there.
 * Split out of the hole-by-hole scorecard so each lives in its own tab.
 */
const FinishedBadge = ({ t }) => (
  <span
    className="ml-1 text-[10px] font-bold text-gray-400 align-super"
    title={t('scoring.classification.finishedTooltip')}
    aria-label={t('scoring.classification.finishedTooltip')}
  >
    {t('scoring.classification.finishedBadge')}
  </span>
);

const QuickMatchClassificationTable = ({
  holes = [],
  holeScores = [],
  participants = [],
  currentParticipantId,
  scoringFormat = null,
  standing = null,
  tees = [],
  allowancePercentage = 100,
  playMode = 'HANDICAP',
  participantStrokes = [],
  isCompleted = false,
  matchFormat = null,
}) => {
  const { t } = useTranslation('quickMatch');

  const isFreePlay = scoringFormat === 'MEDAL' || scoringFormat === 'STABLEFORD';

  if (!isFreePlay) {
    // La vuelta propia va contra el par con los golpes que le tocan a uno por
    // su hándicap de juego, no con el reparto del partido: en match play los
    // golpes se dan por diferencia, así que el de hándicap más bajo recibe
    // cero y su vuelta saldría a bruto.
    // En foursomes se juega a golpes alternos con una sola bola: lo anotado es
    // del equipo, así que no hay vuelta propia que enseñar.
    const me =
      matchFormat === 'FOURSOMES'
        ? null
        : participants.find((p) => p.participantId === currentParticipantId);
    // Al 100% y no con el allowance del partido, que equilibra una competición
    // en vez de medir una vuelta: con él, la misma vuelta cambiaba de resultado
    // según el formato. El resultado con allowance es el marcador del partido,
    // que ya está justo encima.
    const ownAllocation = me
      ? MatchPlayStrokeAllocator.allocate({
          participants,
          holes,
          tees,
          matchFormat: null,
          allowancePercentage: PERSONAL_ROUND_ALLOWANCE,
          playMode,
        })
      : {};
    const myTotals = me
      ? StablefordCalculator.computeParticipantTotals(me, holes, holeScores, ownAllocation)
      : null;

    return (
      <div data-testid="quick-match-classification-table">
        <MatchStandingSummary
          participants={participants}
          standing={standing}
          myToPar={
            myTotals?.holesPlayed
              ? StablefordCalculator.formatToPar(myTotals.netStrokes - myTotals.parPlayed)
              : null
          }
        />
      </div>
    );
  }

  const isMedal = scoringFormat === 'MEDAL';
  // Exactamente el mismo reparto que pinta la tarjeta: el del servidor si hay
  // red, el local si no. Recalcularlo aquí por separado abría la puerta a que
  // las dos pestañas diesen puntos distintos para el mismo jugador, que es el
  // fallo que este trabajo viene a cerrar.
  const allocation = MatchPlayStrokeAllocator.resolve({
    participantStrokes,
    participants,
    holes,
    tees,
    matchFormat: null,
    allowancePercentage,
    playMode,
  });

  const rank = isMedal
    ? StablefordCalculator.rankParticipantsByMedal
    : StablefordCalculator.rankParticipants;
  const ranking = rank(participants, holes, holeScores, allocation);

  return (
    <div data-testid="quick-match-classification-table" className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-gray-500">
            <th className="px-2 py-1.5 text-left font-medium">#</th>
            <th className="px-2 py-1.5 text-left font-medium">{t('scoring.classification.player')}</th>
            {isMedal ? (
              <>
                <th className="px-2 py-1.5 text-center font-medium">{t('scoring.classification.result')}</th>
                <th className="px-2 py-1.5 text-center font-medium">{t('scoring.classification.netStrokes')}</th>
              </>
            ) : (
              <th className="px-2 py-1.5 text-center font-medium">{t('scoring.classification.points')}</th>
            )}
            <th className="px-2 py-1.5 text-center font-medium">{t('scoring.classification.strokes')}</th>
            <th className="px-2 py-1.5 text-center font-medium">{t('scoring.classification.hole')}</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((row, index) => (
            <tr
              key={row.participantId}
              className={row.participantId === currentParticipantId ? 'bg-blue-50' : index % 2 === 1 ? 'bg-gray-50' : ''}
            >
              <td className="px-2 py-1.5 text-left text-gray-500">{index + 1}</td>
              <td className="px-2 py-1.5 text-left font-medium text-gray-900">
                {row.name}
                {row.participantId === currentParticipantId && (
                  <span className="ml-1 text-xs text-primary">({t('scoring.classification.you')})</span>
                )}
              </td>
              {isMedal ? (
                <>
                  <td className="px-2 py-1.5 text-center font-bold text-primary">
                    {row.holesPlayed ? StablefordCalculator.formatToPar(row.netStrokes - row.parPlayed) : '-'}
                    {isCompleted && <FinishedBadge t={t} />}
                  </td>
                  <td className="px-2 py-1.5 text-center text-gray-700">
                    {row.holesPlayed ? row.netStrokes : '-'}
                    {isCompleted && <FinishedBadge t={t} />}
                  </td>
                </>
              ) : (
                <td className="px-2 py-1.5 text-center font-bold text-primary">
                  {row.stablefordPoints}
                  {isCompleted && <FinishedBadge t={t} />}
                </td>
              )}
              <td className="px-2 py-1.5 text-center text-gray-700">
                {row.totalStrokes || '-'}
                {isCompleted && <FinishedBadge t={t} />}
              </td>
              <td className="px-2 py-1.5 text-center text-gray-500">{row.holesPlayed || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default QuickMatchClassificationTable;
