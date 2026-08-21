import { useTranslation } from 'react-i18next';
import {
  groupParticipantsBySide,
  entryAtOf,
  sideCardHolder,
  sideEntryOf,
} from '../../domain/services/FoursomesSides';
import GolfFigure from '../scoring/GolfFigure';
import StablefordCalculator from '../../domain/services/StablefordCalculator';

// Doble bogey BRUTO: lo que suma al total de golpes un hoyo que no se terminó.
// Sin golpes recibidos a propósito — ver `getCountingScore`.
const GROSS_DOUBLE_BOGEY_OVER_PAR = 2;
import MatchPlayStrokeAllocator from '../../domain/services/MatchPlayStrokeAllocator';
import PlayingHandicapCalculator from '../../domain/services/PlayingHandicapCalculator';

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

  const entryAt = entryAtOf(holeScores);

  // Recibe los participantes cuyos golpes forman UNA bola: uno en todos los
  // formatos menos foursomes, donde el bando comparte bola. Se elige recorriendo
  // el bando —no los golpes anotados, que llegan en el orden del backend— para
  // que esta tarjeta y la pantalla de anotación enseñen siempre la misma.
  const getEntry = (holeNumber, members) => sideEntryOf(members, entryAt(holeNumber));

  const getStrokesReceived = (holeNumber, participantId) =>
    allocation[participantId]?.strokesByHole?.[holeNumber] ?? 0;

  // Los golpes con los que cuenta el hoyo, o null si está sin anotar. Un hoyo
  // RECOGIDO —entrada sin número— vale `par + 2`, el doble bogey que se
  // escribe en la tarjeta, SIN golpes recibidos: este total es bruto y no puede
  // moverse con el allowance. Es la misma cuenta que hacen el calculador y el
  // backend, para que el total de aquí, el de la clasificación y el del
  // historial sigan siendo el mismo número.
  const getCountingScore = (holeNumber, members, par) => {
    const entry = getEntry(holeNumber, members);
    if (!entry) return null;
    return entry.score ?? par + GROSS_DOUBLE_BOGEY_OVER_PAR;
  };

  // Con signo: un hándicap plus suma negativo porque CEDE golpes. Sumarlo a
  // secas y preguntar por "> 0" hacía que la cabecera dijese "no recibe golpes"
  // mientras la propia tarjeta pintaba los puntos de los golpes cedidos.
  const totalStrokesFor = (participantId) =>
    holes.reduce((sum, h) => sum + getStrokesReceived(h.holeNumber, participantId), 0);

  // Se nombra el allowance en los formatos cuyo reparto NO se puede reproducir
  // restando los dos números de la cabecera:
  //
  //   FOURBALL   (ch - menor ch de los cuatro) x allowance  -> los Course
  //              Handicaps no se enseñan, así que con "Hcp de juego 23" y
  //              "Hcp de juego 10" en pantalla el reparto es 14 y la resta da
  //              13. Ahí es donde el lector cree ver un error de uno.
  //   FOURSOMES  diferencia de PROMEDIOS de equipo x allowance. La cabecera ya
  //              enseña el hándicap del BANDO (#423), así que la resta sí se
  //              parece al reparto, pero cada bando se redondea por su cuenta y
  //              puede quedarse a un golpe. Mismo caso que el FOURBALL.
  //   SINGLES    phA - phB, con el allowance ya dentro de los dos -> la resta
  //              de los dos números de la cabecera cuadra siempre. Decir aquí
  //              "el N% de la diferencia" sería falso.
  //   libre      cada uno recibe su Playing Handicap entero, sin diferencia.
  const explainsAllowance = matchFormat === 'FOURBALL' || matchFormat === 'FOURSOMES';

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

  // La tarjeta que se PINTA es la de la barra de quien la juega. `holes` es
  // solo la tarjeta de la PRIMERA barra del campo, y de los 800 campos
  // federados importados 25 cambian de par entre barras —Son Parc va de 71 en
  // amarillas a 58 en naranjas—, así que la fila Par, la figura del hoyo y los
  // puntos salían de un par ajeno mientras la pantalla de anotación, desde
  // #412, ya usaba el propio. Ver RyderCupWeb#417.
  //
  // Un bando de foursomes cuyos jugadores juegan pares distintos no tiene una
  // sola tarjeta que pintar —comparten bola, no barra—, así que ese caso se
  // queda con la del campo antes que inventar un par que no juega ninguno.
  // Se comparan las TARJETAS y no los objetos de salida: el foursomes mixto
  // normal es rojas masculinas con rojas femeninas, dos entradas distintas de
  // `tees` —`findTee` las separa por género a propósito— que suelen traer el
  // mismo par. Comparando salidas, la reserva saltaba justo ahí.
  const holesForCard = (card) => {
    const memberCards = card.members.map((m) =>
      MatchPlayStrokeAllocator.holeCardFor(m, holes, tees)
    );
    const [first] = memberCards;
    // La longitud entra en la comparación: sin ella, una tarjeta de barra más
    // corta —el caso parcial de RyderCupAm#215— pasaba en vacío y el bando
    // acababa pintado con hoyos que uno de los dos no juega.
    const samePar = memberCards.every(
      (c) =>
        c.length === first.length &&
        c.every((hole, i) => hole.par === first[i].par && hole.holeNumber === first[i].holeNumber)
    );
    return samePar ? first : holes;
  };

  // El hándicap de juego de una tarjeta de foursomes es el del BANDO: el de su
  // primer jugador dejaba dos bandos distintos con el mismo número al lado de
  // repartos distintos. Ver RyderCupWeb#423.
  //
  // Solo cuando el bando existe de verdad. Sin `team` no hay bandos, y entonces
  // `#foursomes` no reparte nada: anunciar un hándicap de bando junto a un
  // reparto a cero decía dos cosas incompatibles en la misma línea.
  //
  // Se calcula del promedio de Course Handicaps, que es de donde sale el
  // reparto, para que la resta de los dos bandos reproduzca los golpes de
  // debajo. Promediar en su lugar los hándicaps de juego que manda el servidor
  // NO vale: los manda por jugador y ya redondeados, así que
  // `round(avg(round(x), round(y)))` se aparta de `round(avg(x, y) x allowance)`
  // —dos compañeros con 3,4 y 5,4 al 50% dan 2 por un lado y 3 por el otro— y
  // el número volvería a no cuadrar con el reparto, que es lo que cierra #423.
  //
  // Solo se recurre a ellos cuando no hay con qué calcular: si la llamada al
  // campo falla —`useQuickMatchScoring` la envuelve en su propio try/catch—
  // `holes` y `tees` llegan vacíos, el cálculo local caería al hándicap índice
  // a pelo y la cabecera se separaría varios golpes de los puntos que pinta
  // debajo, que sí son del servidor.
  const playingHandicapOf = (card) => {
    if (matchFormat !== 'FOURSOMES' || card.members.length < 2) {
      return allocation[card.strokesId]?.playingHandicap ?? null;
    }
    const sinCampo = holes.length === 0 || tees.length === 0;
    const fromServer = card.members.map((m) => allocation[m.participantId]?.playingHandicap);
    if (sinCampo && fromServer.every((ph) => ph != null)) {
      return PlayingHandicapCalculator.roundHalfAwayFromZero(
        fromServer.reduce((sum, ph) => sum + ph, 0) / fromServer.length
      );
    }
    return MatchPlayStrokeAllocator.sidePlayingHandicap(
      card.members,
      holes,
      tees,
      allowancePercentage
    );
  };

  // Cada tarjeta resuelve sus hoyos y su hándicap UNA vez: los dos recorren a
  // los miembros y a los 18 hoyos, y se leían varias veces por tarjeta en cada
  // render.
  const cards = buildCards().map((card) => ({
    ...card,
    holes: holesForCard(card),
    playingHandicap: playingHandicapOf(card),
  }));

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
      const score = getCountingScore(h.holeNumber, members, h.par);
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
              <th
                key={h.holeNumber}
                scope="col"
                data-testid={`quick-match-par-${card.key}-${h.holeNumber}`}
                className="px-2 py-1 text-center text-gray-400 font-normal"
              >
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
              const entry = getEntry(h.holeNumber, card.members);
              const strokesReceived = getStrokesReceived(h.holeNumber, card.strokesId);
              // La raya es un hoyo anotado sin número: se pinta como raya y
              // puntúa cero. Para los puntos del hoyo se usa el doble bogey
              // NETO —lo que el WHS computa en un hoyo no terminado—, que no es
              // lo mismo que el `par + 2` bruto con el que suma al total de la
              // fila: el bruto no lleva golpes recibidos y el neto sí. Sin
              // entrada no hay hoyo que pintar.
              const isPickedUp = entry != null && entry.score == null;
              const score = isPickedUp
                ? StablefordCalculator.netDoubleBogey(h.par, strokesReceived)
                : (entry?.score ?? null);
              const dotCount = Math.min(Math.abs(strokesReceived), MAX_STROKE_DOTS);
              return (
                <td
                  key={h.holeNumber}
                  data-testid={`quick-match-score-cell-${card.key}-${h.holeNumber}`}
                  className="px-1 py-1 text-center align-top"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <GolfFigure score={isPickedUp ? null : score} par={h.par} pickedUp={isPickedUp} />
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
                    card.playingHandicap != null
                      ? t('scoring.scorecard.playingHandicap', {
                          value: card.playingHandicap,
                        })
                      : null,
                    describeStrokes(totalStrokesFor(card.strokesId)),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
            </p>
          </div>
          <div className="p-2 space-y-2">
            {renderSection(
              card.holes.filter((h) => h.holeNumber <= 9),
              ts('scorecard.out'),
              card
            )}
            {card.holes.some((h) => h.holeNumber > 9) &&
              renderSection(
                card.holes.filter((h) => h.holeNumber > 9),
                ts('scorecard.in'),
                card
              )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuickMatchScorecardTable;
