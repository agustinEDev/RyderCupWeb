import { useTranslation } from 'react-i18next';
import {
  groupParticipantsBySide,
  entryAtOf,
  sideCardHolder,
  sideEntryOf,
} from '../../domain/services/FoursomesSides';
import GolfFigure from '../scoring/GolfFigure';
import CarruselDeTarjetas from '../scoring/CarruselDeTarjetas';
import TarjetaVertical from '../scoring/TarjetaVertical';
import { useEsMovil } from '../../hooks/useEsMovil';
import StablefordCalculator from '../../domain/services/StablefordCalculator';

import MatchPlayStrokeAllocator from '../../domain/services/MatchPlayStrokeAllocator';
import { conLaMiaPrimero, conMiNombrePrimero } from '../../utils/ordenDeLasTarjetas';
import PlayingHandicapCalculator from '../../domain/services/PlayingHandicapCalculator';
import { formatoDeHandicapDeJuego } from '../../utils/formatoDeHandicap';

const MAX_STROKE_DOTS = 2;

// La letra de la cifra pequeña (puntos o neto), y la de su etiqueta en la
// cabecera de la fila (#419): iguales, para que se lean como pareja
const LETRA_DE_LA_CIFRA = 'text-[10px] font-semibold text-primary';

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
  const esMovil = useEsMovil();

  const isStableford = scoringFormat === 'STABLEFORD';
  const isMedal = scoringFormat === 'MEDAL';
  // Cómo se llama la cifra pequeña: columna en el móvil, cabecera de la fila en
  // la horizontal. En match play no hay
  const etiquetaDeLaCifra = isStableford
    ? t('scoring.scorecard.pointsShort')
    : isMedal
      ? t('scoring.scorecard.netShort')
      : undefined;

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

    return groupParticipantsBySide(participants).map((members) => {
      // Solo el NOMBRE se reordena para dejar delante al que mira: `members`
      // sigue como viene porque de él salen el dueño de la bola, los hoyos que
      // se pintan y el hándicap del bando.
      const comoSeLee = conMiNombrePrimero(
        members,
        (m) => m.participantId === currentParticipantId
      );

      return {
        key: sideCardHolder(members).participantId,
        title: comoSeLee.map((m) => m.name).join(' & '),
        members,
        strokesId: sideCardHolder(members).participantId,
        // La barra sigue al nombre que ENCABEZA, no al dueño de la bola: debajo
        // del título hay una sola barra, y el foursomes mixto normal son rojas
        // masculinas con rojas femeninas —`findTee` las separa por género a
        // propósito—, así que con el nombre propio delante y la barra del
        // compañero detrás la línea decía dos cosas de personas distintas.
        // Mismo defecto que #417 y #423, y aquí no cambia ningún cálculo:
        // `teeParticipant` solo escribe esta etiqueta.
        teeParticipant: comoSeLee[0],
        isMine: members.some((m) => m.participantId === currentParticipantId),
      };
    });
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
  // La tarjeta de quien mira va la primera, y en cuanto hay bandos la de su
  // pareja detrás (FE #550). Se ordena la lista que se PINTA, nunca
  // `participants`: `sideCardHolder` guarda la bola del bando a nombre de su
  // primer miembro y el reparto toma `[0]` y `[1]` como bandos cuando no hay
  // `team`, así que mover una tarjeta de sitio no puede mover un golpe.
  const cards = conLaMiaPrimero(
    buildCards().map((card) => ({
      ...card,
      holes: holesForCard(card),
      playingHandicap: playingHandicapOf(card),
    })),
    {
      esMia: (card) => card.isMine,
      equipoDe: (card) => card.members[0]?.team,
    }
  );

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

  const sumStrokes = (holeRange, card) =>
    holeRange.reduce((sum, h) => {
      // La casilla y la suma cuentan lo mismo: la raya, su doble bogey neto
      const { score } = datosDelHoyo(h, card);
      return score != null ? sum + score : sum;
    }, 0);

  // Lo que se sabe de un hoyo de una tarjeta: su golpe (o la raya) y lo que
  // recibe. Lo leen la casilla y la columna de puntos o neto
  const datosDelHoyo = (h, card) => {
    const entry = getEntry(h.holeNumber, card.members);
    const strokesReceived = getStrokesReceived(h.holeNumber, card.strokesId);
    // La raya es un hoyo anotado sin número: se pinta como raya y
    // puntúa cero. Vale su doble bogey NETO, `par + 2 + golpes recibidos`
    // en el partido (Agustín, 23 oct 2026: «siempre una raya es par +
    // golpes recibidos + 2»), también en el total de la fila. Sin
    // entrada no hay hoyo que pintar.
    const isPickedUp = entry != null && entry.score == null;
    const score = isPickedUp
      ? StablefordCalculator.netDoubleBogey(h.par, strokesReceived)
      : (entry?.score ?? null);
    const dotCount = Math.min(Math.abs(strokesReceived), MAX_STROKE_DOTS);
    return { isPickedUp, score, strokesReceived, dotCount };
  };

  // Los puntos Stableford o el neto en Medal de un hoyo, o null si no hay
  // nada que contar (hoyo sin anotar o match play). De aquí salen la casilla
  // y los subtotales, para que el hoyo y la suma no se separen
  const valorExtraDelHoyo = (h, card) => {
    const { score, strokesReceived } = datosDelHoyo(h, card);
    if (score == null) return null;
    if (isStableford) return StablefordCalculator.holePoints(score, h.par, strokesReceived);
    if (isMedal) return score - strokesReceived;
    return null;
  };

  // Lo mismo, como se pinta: en el móvil va en su propia columna; en la
  // horizontal, bajo la figura (o bajo los golpes del tramo, si es la suma)
  const pintaExtra = (valor, { subtotal = false } = {}) => {
    if (valor == null) return null;
    const prefijo = subtotal ? 'subtotal' : 'hole';
    const [testId, clave] = isStableford
      ? [`${prefijo}-points`, subtotal ? 'subtotalPoints' : 'holePoints']
      : [`${prefijo}-net-strokes`, subtotal ? 'subtotalNetStrokes' : 'holeNetStrokes'];
    return (
      <span
        data-testid={testId}
        className={LETRA_DE_LA_CIFRA}
        title={t(`scoring.scorecard.${clave}`, { count: valor })}
      >
        {valor}
      </span>
    );
  };

  const extraDelHoyo = (h, card) => pintaExtra(valorExtraDelHoyo(h, card));

  // Suma de los puntos o del neto de un tramo, solo de los hoyos jugados (la
  // raya ya cuenta como doble bogey neto). Sin ninguno jugado, nada
  const valorDelTramo = (holeRange, card) => {
    const valores = holeRange.map((h) => valorExtraDelHoyo(h, card)).filter((v) => v != null);
    if (valores.length === 0) return null;
    return valores.reduce((sum, v) => sum + v, 0);
  };
  const extraDelTramo = (holeRange, card) => pintaExtra(valorDelTramo(holeRange, card), { subtotal: true });

  // La suma de un tramo en la horizontal: los golpes y, debajo, los puntos o
  // el neto. Son dos cifras sin etiqueta que el lector leía de un tirón
  // («4238»): con subtotal se oye una frase y lo visible se le oculta
  // `extra` llega ya sumado: lo usa también la cabecera de la fila
  const totalDelTramo = (sectionHoles, card, extra) => {
    const golpes = sumStrokes(sectionHoles, card);
    const frase =
      extra == null
        ? null
        : isStableford
          ? t('scoring.scorecard.sectionTotalPointsA11y', { strokes: golpes, count: extra })
          : t('scoring.scorecard.sectionTotalNetA11y', { strokes: golpes, net: extra });
    return (
      <>
        <div className="flex flex-col items-center gap-0.5" aria-hidden={frase ? 'true' : undefined}>
          {golpes || '-'}
          {pintaExtra(extra, { subtotal: true })}
        </div>
        {frase && <span className="sr-only">{frase}</span>}
      </>
    );
  };

  // Lo que se pinta en la casilla de un hoyo: la figura, los puntos o el neto
  // del hoyo y los puntitos de los golpes. La comparten la tarjeta horizontal
  // y la vertical del móvil (FE #739)
  const casilla = (h, card, { conExtra = true } = {}) => {
    const { isPickedUp, score, strokesReceived, dotCount } = datosDelHoyo(h, card);
    return (
      <div className="flex flex-col items-center gap-0.5">
        <GolfFigure score={isPickedUp ? null : score} par={h.par} pickedUp={isPickedUp} />
        {conExtra && extraDelHoyo(h, card)}
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
    );
  };

  const renderSection = (sectionHoles, label, card, seccion) => {
    // Una vez por tramo: lo usan la cabecera de la fila y la casilla del total
    const extraSumado = valorDelTramo(sectionHoles, card);
    return (
      <div data-testid="vuelta-horizontal" className="overflow-x-auto">
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
              {etiquetaDeLaCifra && extraSumado != null ? (
                // La cifra pequeña con nombre (#419): en la cabecera y no en cada
                // casilla. El hueco mide lo que la figura, así la etiqueta cae a la
                // altura de las cifras y la fila no crece. Sin cifras en el tramo
                // no hay nada que nombrar, y sola la haría más alta
                <th scope="row" className="px-2 py-1 text-left align-top font-normal">
                  <span className="sr-only">{label}</span>
                  <div className="flex flex-col gap-0.5">
                    <span aria-hidden="true" className="h-7" />
                    <span className={LETRA_DE_LA_CIFRA}>{etiquetaDeLaCifra}</span>
                  </div>
                </th>
              ) : (
                // `sr-only` saca la celda del flujo, pero la tabla conserva su
                // columna: medido en Chrome (21 oct), las casillas siguen bajo
                // su hoyo, también en match play
                <th scope="row" className="px-2 py-1.5 text-left font-medium text-gray-400 sr-only">
                  {label}
                </th>
              )}
              {sectionHoles.map((h) => (
                <td
                  key={h.holeNumber}
                  data-testid={`quick-match-score-cell-${card.key}-${h.holeNumber}`}
                  className="px-1 py-1 text-center align-top"
                >
                  {casilla(h, card)}
                </td>
              ))}
              <td
                data-testid={`quick-match-section-total-${card.key}-${seccion}`}
                className="px-2 py-1 text-center font-bold align-top"
              >
                {totalDelTramo(sectionHoles, card, extraSumado)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // Quién es, desde qué barra juega y con qué hándicap: la comparten la
  // tarjeta horizontal y la vertical del móvil
  const cabeceraDe = (card) => (
    <>
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
                    value: formatoDeHandicapDeJuego(card.playingHandicap),
                  })
                : null,
              describeStrokes(totalStrokesFor(card.strokesId)),
            ]
              .filter(Boolean)
              .join(' · ')}
      </p>
    </>
  );

  const conIda = (card) => card.holes.some((h) => h.holeNumber > 9);
  const tarjetaVertical = (card) => (
    <TarjetaVertical
      clave={card.key}
      testId={`quick-match-player-card-${card.key}`}
      equipo={card.members[0]?.team === 'A' || card.members[0]?.team === 'B' ? card.members[0].team : null}
      cabecera={cabeceraDe(card)}
      // Los puntos o el neto en su columna, no apilados bajo la figura: hay
      // sitio y la fila queda más baja (ronda 2 de pruebas)
      columnaExtra={etiquetaDeLaCifra}
      hoyos={card.holes.map((h) => ({
        holeNumber: h.holeNumber,
        par: h.par,
        strokeIndex: h.strokeIndex,
        casilla: casilla(h, card, { conExtra: false }),
        extra: extraDelHoyo(h, card),
      }))}
      sumas={{
        ida: conIda(card) ? sumStrokes(card.holes.filter((h) => h.holeNumber <= 9), card) : undefined,
        vuelta: conIda(card) ? sumStrokes(card.holes.filter((h) => h.holeNumber > 9), card) : undefined,
        total: sumStrokes(card.holes, card),
      }}
      // Como `sumas`: con 9 hoyos no hay ida ni vuelta que sumar
      sumasExtra={{
        ida: conIda(card) ? extraDelTramo(card.holes.filter((h) => h.holeNumber <= 9), card) : undefined,
        vuelta: conIda(card) ? extraDelTramo(card.holes.filter((h) => h.holeNumber > 9), card) : undefined,
        total: extraDelTramo(card.holes, card),
      }}
    />
  );

  // FE #739 · en el móvil, las tarjetas de arriba abajo y deslizables, como en
  // competición: la horizontal no cabía a 360 px
  if (esMovil) {
    return (
      <div data-testid="quick-match-scorecard-table">
        <CarruselDeTarjetas
          tarjetas={cards.map((card) => ({
            clave: card.key,
            nombre: card.title,
            equipo: card.members[0]?.team === 'A' || card.members[0]?.team === 'B' ? card.members[0].team : undefined,
            contenido: tarjetaVertical(card),
          }))}
        />
      </div>
    );
  }

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
            {cabeceraDe(card)}
          </div>
          <div className="p-2 space-y-2">
            {renderSection(
              card.holes.filter((h) => h.holeNumber <= 9),
              ts('scorecard.out'),
              card,
              'ida'
            )}
            {card.holes.some((h) => h.holeNumber > 9) &&
              renderSection(
                card.holes.filter((h) => h.holeNumber > 9),
                ts('scorecard.in'),
                card,
                'vuelta'
              )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuickMatchScorecardTable;
