import { useTranslation } from 'react-i18next';
import StablefordCalculator from '../../domain/services/StablefordCalculator';

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
const MatchStandingSummary = ({ participants, standing }) => {
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
  isCompleted = false,
}) => {
  const { t } = useTranslation('quickMatch');

  const isFreePlay = scoringFormat === 'MEDAL' || scoringFormat === 'STABLEFORD';

  if (!isFreePlay) {
    return (
      <div data-testid="quick-match-classification-table">
        <MatchStandingSummary participants={participants} standing={standing} />
      </div>
    );
  }

  const isMedal = scoringFormat === 'MEDAL';
  // El modo de juego viaja hasta el servicio de dominio, que es quien decide si
  // se reparten golpes. Falsear aquí el hándicap para forzar el scratch dejaba
  // la regla escondida en un componente.
  const ranking = isMedal
    ? StablefordCalculator.rankParticipantsByMedal(
        participants,
        holes,
        holeScores,
        tees,
        allowancePercentage,
        playMode
      )
    : StablefordCalculator.rankParticipants(
        participants,
        holes,
        holeScores,
        tees,
        allowancePercentage,
        playMode
      );

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
