import { useTranslation } from 'react-i18next';
import {
  groupParticipantsBySide,
  scoreAtOf,
  sideCardHolder,
  sideScoreOf,
} from '../../domain/services/FoursomesSides';
import GolfFigure from '../scoring/GolfFigure';
import StablefordCalculator from '../../domain/services/StablefordCalculator';
import MatchPlayStrokeAllocator from '../../domain/services/MatchPlayStrokeAllocator';

const MAX_STROKE_DOTS = 2;

/**
 * Quick match scorecard: one card per participant (instead of a single shared
 * table with every player as a row) so reviewing several cards side by side
 * isn't a wall of numbers. Each card has its own hole-by-hole grid (OUT/IN),
 * no team columns or validation icons — quick match is single-entry,
 * individual. Small dots under each score mark the holes where that
 * participant receives a handicap stroke. In free-play matches, each hole also
 * shows the Stableford points earned (STABLEFORD) or the net strokes played
 * (MEDAL).
 *
 * Los golpes salen de `MatchPlayStrokeAllocator`, el mismo reparto que usa el
 * backend para decidir cada hoyo. Antes se repartía el Playing Handicap entero
 * de cada jugador incluso en match play, que es el método del stroke play: los
 * puntos caían en hoyos distintos de los que de verdad daban ventaja.
 *
 * La cabecera dice desde qué barra juega cada uno. No es adorno: una barra del
 * género equivocado cambia el Playing Handicap varios golpes y hasta ahora no
 * había forma de verlo desde la tarjeta.
 */
const QuickMatchScorecardTable = ({
  holes = [],
  holeScores = [],
  participants = [],
  currentParticipantId,
  tees = [],
  allowancePercentage = 100,
  scoringFormat = null,
  matchFormat = null,
  playMode = 'HANDICAP',
  participantStrokes = [],
}) => {
  const { t } = useTranslation('quickMatch');
  const { t: ts } = useTranslation('scoring');
  const { t: tCourses } = useTranslation('golfCourses');

  const outHoles = holes.filter((h) => h.holeNumber <= 9);
  const inHoles = holes.filter((h) => h.holeNumber > 9);

  const isStableford = scoringFormat === 'STABLEFORD';
  const isMedal = scoringFormat === 'MEDAL';

  // El backend manda el reparto con el que ha decidido cada hoyo, y es el dato
  // bueno mientras haya red. Sin conexión no llega nada y se recalcula, que es
  // justo para lo que existe `MatchPlayStrokeAllocator`.
  const allocation = MatchPlayStrokeAllocator.resolve({
    participantStrokes,
    participants,
    holes,
    tees,
    matchFormat,
    allowancePercentage,
    playMode,
  });

  const scoreAt = scoreAtOf(holeScores);

  // Recibe los participantes cuyos golpes forman UNA bola: uno en todos los
  // formatos menos foursomes, donde el bando comparte bola. Se elige recorriendo
  // el bando —no los golpes anotados, que llegan en el orden del backend— para
  // que esta tarjeta y la pantalla de anotación enseñen siempre la misma.
  const getScore = (holeNumber, members) => sideScoreOf(members, scoreAt(holeNumber));

  const getStrokesReceived = (holeNumber, participantId) =>
    allocation[participantId]?.strokesByHole?.[holeNumber] ?? 0;

  // Con signo: un hándicap plus suma negativo porque CEDE golpes. Sumarlo a
  // secas y preguntar por "> 0" hacía que la cabecera dijese "no recibe golpes"
  // mientras la propia tarjeta pintaba los puntos de los golpes cedidos.
  const totalStrokesFor = (participantId) =>
    holes.reduce((sum, h) => sum + getStrokesReceived(h.holeNumber, participantId), 0);

  // Solo el FOURBALL reparte a partir de una diferencia que NO se puede leer en
  // la cabecera, y por eso es el único que necesita explicarse:
  //
  //   FOURBALL   (ch - menor ch de los cuatro) x allowance  -> los Course
  //              Handicaps no se enseñan, así que con "Hcp de juego 23" y
  //              "Hcp de juego 10" en pantalla el reparto es 14 y la resta da
  //              13. Ahí es donde el lector cree ver un error de uno.
  //   SINGLES    phA - phB, con el allowance ya dentro de los dos -> la resta
  //              de los dos números de la cabecera cuadra siempre. Decir aquí
  //              "el N% de la diferencia" sería falso.
  //   FOURSOMES  diferencia de PROMEDIOS de equipo: los dos compañeros reciben
  //              el mismo número junto a hándicaps de juego distintos, y ningún
  //              par de números en pantalla lo reproduce. Necesita su propia
  //              explicación, no esta.
  //   libre      cada uno recibe su Playing Handicap entero, sin diferencia.
  const explainsAllowance = matchFormat === 'FOURBALL';

  const withAllowanceNote = (text) =>
    explainsAllowance
      ? `${text} ${t('scoring.scorecard.ofTheDifference', { allowance: allowancePercentage })}`
      : text;

  const describeStrokes = (total) => {
    if (total > 0) {
      return withAllowanceNote(t('scoring.scorecard.receivesStrokes', { count: total }));
    }
    if (total < 0) {
      return withAllowanceNote(
        t('scoring.scorecard.givesStrokes', { count: Math.abs(total) })
      );
    }
    return t('scoring.scorecard.receivesNoStrokes');
  };

  // Una tarjeta por bando en foursomes —comparten bola, así que comparten
  // tarjeta— y una por jugador en todo lo demás. Con una tarjeta por jugador,
  // una vuelta anotada como se juega dejaba a cada compañero con la mitad de
  // los hoyos y la otra mitad en blanco. Ver RyderCupWeb#420.
  //
  // El reparto de foursomes ya es de equipo: los dos compañeros reciben los
  // mismos golpes, así que leerlos del primero no pierde nada.
  const buildCards = () => {
    if (matchFormat !== 'FOURSOMES') {
      return participants.map((p) => ({
        key: p.participantId,
        title: p.name,
        members: [p],
        strokesId: p.participantId,
        teeParticipant: p,
        isMine: p.participantId === currentParticipantId,
      }));
    }

    return groupParticipantsBySide(participants).map((members) => ({
      key: sideCardHolder(members).participantId,
      title: members.map((m) => m.name).join(' & '),
      members,
      strokesId: sideCardHolder(members).participantId,
      teeParticipant: sideCardHolder(members),
      isMine: members.some((m) => m.participantId === currentParticipantId),
    }));
  };

  const cards = buildCards();

  const renderTeeLabel = (participant) => {
    const tee = MatchPlayStrokeAllocator.findTee(participant, tees);
    if (!tee) return null;
    const name =
      tee.identifier || tCourses(`form.teeColors.${tee.color}`, { defaultValue: tee.color });
    // Mismo sufijo (M)/(F) que TeeColorBadge y el selector, para no tener dos
    // convenciones según la pantalla
    const suffix = tee.gender === 'MALE' ? ' (M)' : tee.gender === 'FEMALE' ? ' (F)' : '';
    return `${name}${suffix}`;
  };

  const sumStrokes = (holeRange, members) =>
    holeRange.reduce((sum, h) => {
      const score = getScore(h.holeNumber, members);
      return score != null ? sum + score : sum;
    }, 0);

  const renderSection = (sectionHoles, label, card) => (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-2 py-1 text-left font-medium text-gray-500">{ts('scorecard.hole')}</th>
            {sectionHoles.map((h) => (
              <th key={h.holeNumber} className="px-2 py-1 text-center font-medium text-gray-500 w-8">
                {h.holeNumber}
              </th>
            ))}
            <th className="px-2 py-1 text-center font-bold text-gray-700">{label}</th>
          </tr>
          <tr className="bg-gray-50">
            <th scope="row" className="px-2 py-1 text-left text-gray-400 font-normal">{ts('scorecard.par')}</th>
            {sectionHoles.map((h) => (
              <th key={h.holeNumber} scope="col" className="px-2 py-1 text-center text-gray-400 font-normal">
                {h.par}
              </th>
            ))}
            <th scope="col" className="px-2 py-1 text-center font-medium text-gray-500">
              {sectionHoles.reduce((s, h) => s + h.par, 0)}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" className="px-2 py-1.5 text-left font-medium text-gray-400 sr-only">
              {label}
            </th>
            {sectionHoles.map((h) => {
              const score = getScore(h.holeNumber, card.members);
              const strokesReceived = getStrokesReceived(h.holeNumber, card.strokesId);
              const dotCount = Math.min(Math.abs(strokesReceived), MAX_STROKE_DOTS);
              return (
                <td
                  key={h.holeNumber}
                  data-testid={`quick-match-score-cell-${card.key}-${h.holeNumber}`}
                  className="px-1 py-1 text-center align-top"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <GolfFigure score={score} par={h.par} />
                    {score != null && isStableford && (
                      <span
                        data-testid="hole-points"
                        className="text-[10px] font-semibold text-primary"
                        title={t('scoring.scorecard.holePoints', {
                          count: StablefordCalculator.holePoints(score, h.par, strokesReceived),
                        })}
                      >
                        {StablefordCalculator.holePoints(score, h.par, strokesReceived)}
                      </span>
                    )}
                    {score != null && isMedal && (
                      <span
                        data-testid="hole-net-strokes"
                        className="text-[10px] font-semibold text-primary"
                        title={t('scoring.scorecard.holeNetStrokes', { count: score - strokesReceived })}
                      >
                        {score - strokesReceived}
                      </span>
                    )}
                    {dotCount > 0 && (
                      <div
                        className="flex gap-0.5"
                        data-testid="stroke-dots"
                        title={
                          strokesReceived > 0
                            ? t('scoring.scorecard.strokeReceived', { count: strokesReceived })
                            : t('scoring.scorecard.strokeGiven', { count: Math.abs(strokesReceived) })
                        }
                      >
                        {Array.from({ length: dotCount }).map((_, i) => (
                          <span
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${strokesReceived > 0 ? 'bg-primary' : 'bg-amber-500'}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </td>
              );
            })}
            <td className="px-2 py-1 text-center font-bold">
              {sumStrokes(sectionHoles, card.members) || '-'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div data-testid="quick-match-scorecard-table" className="space-y-3">
      {cards.map((card) => (
        <div
          key={card.key}
          data-testid={`quick-match-player-card-${card.key}`}
          className={`rounded-lg border overflow-hidden ${
            card.isMine ? 'border-primary/40 bg-blue-50/30' : 'border-gray-200'
          }`}
        >
          <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200">
            <span className="text-sm font-semibold text-gray-800">
              {card.title}
              {card.isMine && (
                <span className="ml-1.5 text-xs font-normal text-primary">
                  ({t('scoring.classification.you')})
                </span>
              )}
            </span>
            <p
              className="text-xs text-gray-500 leading-tight"
              data-testid={`quick-match-player-handicap-${card.key}`}
            >
              {playMode === 'SCRATCH'
                ? t('scoring.scorecard.scratchMatch')
                : [
                    renderTeeLabel(card.teeParticipant),
                    allocation[card.strokesId]
                      ? t('scoring.scorecard.playingHandicap', {
                          value: allocation[card.strokesId].playingHandicap,
                        })
                      : null,
                    describeStrokes(totalStrokesFor(card.strokesId)),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
            </p>
          </div>
          <div className="p-2 space-y-2">
            {renderSection(outHoles, ts('scorecard.out'), card)}
            {inHoles.length > 0 && renderSection(inHoles, ts('scorecard.in'), card)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuickMatchScorecardTable;
