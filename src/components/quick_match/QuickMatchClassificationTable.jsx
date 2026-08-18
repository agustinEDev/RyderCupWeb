import { useTranslation } from 'react-i18next';
import StablefordCalculator from '../../domain/services/StablefordCalculator';
import MatchPlayStrokeAllocator from '../../domain/services/MatchPlayStrokeAllocator';
import PersonalRoundCalculator from '../../domain/services/PersonalRoundCalculator';

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
 * La vuelta propia, en sus dos lecturas: cómo jugó el jugador (hándicap de
 * juego entero) y, si sale distinto, cómo contó en el partido. El marcador de
 * arriba dice quién gana; esto dice cómo jugó uno, que no es lo mismo y hasta
 * ahora no se veía en ninguna parte.
 */
const PersonalRound = ({ round, className = '' }) => {
  const { t } = useTranslation('quickMatch');

  // En foursomes el calculador devuelve solo los golpes brutos del equipo, sin
  // ninguna de las dos lecturas: ahí no hay vuelta que enseñar.
  //
  // El contenedor con el hueco lo pinta este componente, no quien lo llama: con
  // el hueco fuera, un foursomes —o un espectador, o cualquiera antes de anotar
  // su primer hoyo— se comía el `padding` de una línea que no existe.
  if (!round?.personalToPar) return null;

  return (
    <div className={`text-center ${className}`}>
      <p className="text-sm text-gray-600 mt-3" data-testid="quick-match-my-round">
        {t('scoring.classification.yourRound')}{' '}
        <span className="font-bold text-gray-900">{round.personalToPar}</span>
        {round.matchToPar && (
          <span className="text-gray-500" data-testid="quick-match-my-round-in-match">
            {' '}{t('personalRound.inMatch', { value: round.matchToPar })}
          </span>
        )}
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
  participantStrokes = [],
  isCompleted = false,
  matchFormat = null,
}) => {
  const { t } = useTranslation('quickMatch');

  const isFreePlay = scoringFormat === 'MEDAL' || scoringFormat === 'STABLEFORD';

  // La vuelta propia se enseña en los dos formatos. En juego libre la columna
  // "Resultado" va con el reparto del partido —el allowance WHS del 95%— y el
  // historial destacaba el de hándicap entero: dos números distintos para la
  // misma vuelta, uno en cada pantalla y sin nada que lo explicara, que es el
  // fallo que este servicio existe para cerrar.
  const myRound = PersonalRoundCalculator.compute({
    me: participants.find((p) => p.participantId === currentParticipantId) ?? null,
    participants,
    holes,
    holeScores,
    tees,
    participantStrokes,
    matchFormat,
    allowancePercentage,
    playMode,
  });

  if (!isFreePlay) {
    // La vuelta propia va FUERA del marcador: el backend deja el standing en
    // null mientras no haya un hoyo anotado por todos, así que dentro se perdía
    // la vuelta de quien sí había anotado la suya entera.
    return (
      <div data-testid="quick-match-classification-table">
        <MatchStandingSummary participants={participants} standing={standing} />
        <PersonalRound round={myRound} className="pb-4" />
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
    <div data-testid="quick-match-classification-table">
      <div className="overflow-x-auto">
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
      {/* Fuera del contenedor con scroll: dentro, el `text-center` centraba
          sobre el ancho de la TABLA —unos 500px con cuatro jugadores— y en un
          móvil de 375px media línea quedaba fuera de pantalla, con scroll
          lateral para leer la vuelta de uno mismo.

          El paréntesis con la lectura del partido se enseña en los dos formatos
          libres. En MEDAL cuadra con la columna "Resultado", que va con el
          reparto del partido; en STABLEFORD no hay ninguna otra cifra al par en
          pantalla, pero el número sigue siendo el que decidió los puntos de la
          tabla de arriba, y es el que difiere del que destaca el historial. */}
      <PersonalRound round={myRound} className="py-3" />
    </div>
  );
};

export default QuickMatchClassificationTable;
