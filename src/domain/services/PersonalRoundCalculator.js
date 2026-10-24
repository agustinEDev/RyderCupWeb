import StablefordCalculator from './StablefordCalculator';
import MatchPlayStrokeAllocator from './MatchPlayStrokeAllocator';
import { entryAtOf, groupParticipantsBySide, sideCardHolder } from './FoursomesSides';
import { defaultAllowanceFor } from './defaultAllowance';

// Una vuelta personal se mide con el hándicap de juego entero. El allowance
// —95% en juego libre, 90% en fourball, 50% en foursomes— equilibra un partido,
// no mide una vuelta: con él, la misma vuelta salía -2, PAR o +8 según con qué
// formato se hubiera jugado, y dejaba de poder compararse con las demás.
const PERSONAL_ROUND_ALLOWANCE = 100;

/**
 * Golpes brutos del BANDO en foursomes: una bola por hoyo, la anote quien la
 * anote.
 *
 * Contarlos con `computeParticipantTotals(me, ...)` daba los golpes de quien
 * mira la pantalla bajo la etiqueta «Del equipo»: con la tarjeta llevada como
 * se juega —cada hoyo a nombre de quien golpeó— se perdían todos los hoyos del
 * compañero. Ver RyderCupWeb#420.
 *
 * Se toma UN score por hoyo y **nunca se suman los dos compañeros**: antes de
 * ese cambio ambos anotaban el mismo golpe, así que sumarlos duplicaría el
 * total de las vueltas ya jugadas.
 *
 * Sin `team` —partidas viejas, o un dato incompleto— el bando es el propio
 * jugador: se vuelve al comportamiento anterior en vez de mezclar a los cuatro.
 *
 * Cuál es la nota del bando lo decide `sideEntryOf`, la misma regla que usan la
 * pantalla de anotación y la tarjeta: aquí se recorrían los golpes anotados en
 * el orden del backend y allí los jugadores, así que con dos anotaciones del
 * mismo hoyo el total podía no cuadrar con lo que enseñaba la tarjeta.
 *
 * Un hoyo RECOGIDO cuenta: está jugado, y el resultado del partido lo trata
 * como cualquier otro. Vale su doble bogey NETO, `par + 2 + golpes recibidos`
 * (Agustín, 23 oct 2026). Es la misma cuenta que hace `_foursomes_side_strokes`
 * en el backend, del que este total tiene que seguir sin separarse.
 */

// Los parámetros de `compute` y `runningResult`, con sus valores por defecto.
// Como en un parámetro por defecto, solo se rellena lo que llega `undefined`
const PARAMETROS_POR_DEFECTO = Object.freeze({
  me: null,
  participants: [],
  holes: [],
  holeScores: [],
  tees: [],
  participantStrokes: [],
  matchFormat: null,
  allowancePercentage: null,
  playMode: 'HANDICAP',
});

const conDefectos = (params = {}) => ({
  ...PARAMETROS_POR_DEFECTO,
  ...Object.fromEntries(Object.entries(params).filter(([, valor]) => valor !== undefined)),
});

// Sin allowance conocido, el WHS por defecto del formato —95% en partido libre,
// 90% en fourball…—, el mismo que aplica el backend; no el 100% a ciegas
const allowanceDelPartido = ({ matchFormat, allowancePercentage }) =>
  allowancePercentage ?? defaultAllowanceFor(matchFormat);

// El reparto del partido: el que guardó el backend si lo hay, el local si no
const repartoDelPartido = (p) =>
  MatchPlayStrokeAllocator.resolve({
    participantStrokes: p.participantStrokes,
    participants: p.participants,
    holes: p.holes,
    tees: p.tees,
    matchFormat: p.matchFormat,
    allowancePercentage: allowanceDelPartido(p),
    playMode: p.playMode,
  });

const sideTotals = (me, participants, holes, holeScores, tees = [], allocation = {}) => {
  const members =
    groupParticipantsBySide(participants).find((side) =>
      side.some((p) => p.participantId === me.participantId)
    ) ?? [me];

  const entryAt = entryAtOf(holeScores);
  // El par de la raya sale de la tarjeta del PRIMERO del bando —a cuyo nombre se
  // guarda la bola—, no de `holes`, que es la de la primera barra del campo: en
  // 25 de los 800 campos federados el par cambia entre barras, y ahí el bruto de
  // aquí y el del historial se separaban por un golpe. `_side_pars` en el
  // backend resuelve la misma barra.
  const sideCard = MatchPlayStrokeAllocator.holeCardFor(members[0], holes, tees);
  const parAt = (holeNumber) =>
    sideCard.find((h) => h.holeNumber === holeNumber)?.par ??
    holes.find((h) => h.holeNumber === holeNumber)?.par ??
    null;

  let totalStrokes = 0;
  let holesPlayed = 0;

  for (const hole of holes) {
    const entries = members
      .map((member) => entryAt(hole.holeNumber)(member.participantId))
      .filter(Boolean);
    // Sin ninguna anotación el hoyo está por jugar y no cuenta.
    if (entries.length === 0) continue;

    // Con dos anotaciones del mismo hoyo manda el MENOR de los números, que es
    // con el que `ScoringService._best_ball` adjudica el hoyo: contar aquí uno
    // y resolver el partido con otro dejaría unos golpes que no explican su
    // resultado. Ojo, no es la regla de la tarjeta —allí manda el primero del
    // bando, para que todas las pantallas pinten la misma bola—; aquí lo que se
    // persigue es cuadrar con el resultado.
    const numbers = entries.map((entry) => entry.score).filter((score) => score != null);
    if (numbers.length > 0) {
      totalStrokes += Math.min(...numbers);
      holesPlayed += 1;
      continue;
    }

    // Solo rayas: el bando recogió. Sin el par de su barra no hay con qué
    // contarlo, y antes que inventar un número se deja el hoyo fuera, igual que
    // hace `_foursomes_side_strokes`. Vale su doble bogey neto con los golpes
    // del bando en el partido: comparten bola y reparto, el del titular
    // (`sideCardHolder`, el mismo que la tarjeta).
    const par = parAt(hole.holeNumber);
    if (par == null) continue;
    totalStrokes += StablefordCalculator.netDoubleBogey(
      par,
      StablefordCalculator.strokesOnHole(allocation, sideCardHolder(members).participantId, hole.holeNumber)
    );
    holesPlayed += 1;
  }

  return { totalStrokes, holesPlayed };
};

/**
 * La vuelta propia de un jugador en una partida rápida, en sus dos lecturas.
 *
 * Son dos números distintos y los dos son ciertos:
 *
 * - **La vuelta personal**, con el hándicap de juego entero. Es cómo jugó, y se
 *   puede comparar con cualquier otra vuelta suya.
 * - **La del partido**, con el reparto que decidió el resultado: el allowance
 *   del formato en juego libre, o por diferencia en match play, donde el de
 *   hándicap más bajo no recibe ninguno.
 *
 * Antes cada pantalla elegía uno por su cuenta y sin decirlo: el historial daba
 * la personal y la clasificación la del partido, así que la misma vuelta salía
 * `+4` en un sitio y `+3` en otro sin que nada explicara por qué. Se calculan
 * los dos aquí, una sola vez, y las pantallas los enseñan juntos y etiquetados.
 *
 * La del partido sale de `participantStrokes` —el reparto que guardó el
 * backend— y no de recalcularlo: si se recalculara, editar la valoración de una
 * barra cambiaría el resultado de vueltas ya jugadas.
 *
 * Esa garantía NO alcanza a la personal, que sí se calcula aquí contra el
 * CR/SR que tenga la barra hoy: el backend no guarda ningún reparto al 100%,
 * así que no hay de dónde sacarla. Corregir la valoración de una barra cambia
 * la vuelta personal de partidas ya jugadas mientras la del partido se queda
 * quieta. Para cerrarlo hace falta que el backend mande también ese reparto.
 */
class PersonalRoundCalculator {
  /**
   * @param {Object} params
   * @param {Object|null} params.me Participante del que es la vuelta
   * @param {Array<Object>} params.participants Todos los participantes
   * @param {Array<Object>} params.holes Tarjeta de referencia del campo
   * @param {Array<Object>} params.holeScores Golpes anotados
   * @param {Array<Object>} params.tees Salidas del campo
   * @param {Array<Object>} params.participantStrokes Reparto que mandó el backend
   * @param {?string} params.matchFormat SINGLES/FOURBALL/FOURSOMES, o null en juego libre
   * @param {?number} params.allowancePercentage Allowance efectivo del partido
   * @param {string} params.playMode HANDICAP o SCRATCH
   * @returns {?{personalToPar: ?string, matchToPar: ?string, totalStrokes: number}}
   *   `matchToPar` es null cuando coincide con la personal: no hay nada que
   *   aclarar y repetir el mismo número al lado solo es ruido. En foursomes las
   *   DOS lecturas son null y solo quedan los golpes brutos del equipo, así que
   *   quien lo pinte tiene que mirar `personalToPar` y no si el objeto es null.
   *   `totalStrokes` son los golpes brutos: el historial los pinta debajo del
   *   resultado, o como titular cuando no hay resultado que enseñar.
   */
  static compute(params) {
    const p = conDefectos(params);
    const { me, participants, holes, holeScores, tees, matchFormat, playMode } = p;
    if (!me) return null;

    // En foursomes se juega a golpes alternos con una sola bola: lo anotado es
    // del equipo, así que no hay vuelta propia que enseñar y las dos lecturas
    // salen a null. Los golpes brutos sí son un hecho del equipo, y sin ellos
    // la tarjeta del historial se quedaba entera en blanco.
    //
    // La regla vive AQUÍ y no en cada pantalla: estaba duplicada en el
    // historial, que además se ahorraba la petición de detalle, y cualquier
    // formato nuevo a golpes alternos habría que acordarse de añadirlo en los
    // dos sitios.
    if (matchFormat === 'FOURSOMES') {
      // Las salidas y el reparto del partido hacen falta para la raya: su par
      // es el de la barra del bando y vale su doble bogey neto
      const teamTotals = sideTotals(me, participants, holes, holeScores, tees, repartoDelPartido(p));
      if (!teamTotals.holesPlayed) return null;
      return {
        personalToPar: null,
        matchToPar: null,
        totalStrokes: teamTotals.totalStrokes,
      };
    }

    // El par sale de la barra del jugador, no de `holes`, que es la tarjeta de
    // la PRIMERA: en 25 de 800 campos el par cambia entre barras. Lo resuelve
    // `computeParticipantTotals`, el mismo sitio del que come el ranking de la
    // clasificacion y la tarjeta, para que las tres superficies no puedan dar
    // numeros distintos en la misma pantalla —que es lo que este servicio
    // existe para quitar—. Ver RyderCupWeb#417.
    //
    // Esa resolucion es todo o nada, igual que el backend: una tarjeta de barra
    // incompleta se lleva por delante los hoyos que le faltan, y con ellos los
    // golpes brutos que esta pagina pinta debajo del resultado. Se acepta a
    // cambio de dar el mismo numero que el historial. Ver RyderCupAm#215.

    const personalTotals = StablefordCalculator.computeParticipantTotals(
      me,
      holes,
      holeScores,
      MatchPlayStrokeAllocator.allocate({
        participants,
        holes,
        tees,
        matchFormat: null,
        allowancePercentage: PERSONAL_ROUND_ALLOWANCE,
        playMode,
      }),
      tees
    );
    if (!personalTotals.holesPlayed) return null;

    const matchTotals = StablefordCalculator.computeParticipantTotals(
      me,
      holes,
      holeScores,
      repartoDelPartido(p),
      tees
    );

    const personalToPar = StablefordCalculator.formatToPar(
      personalTotals.netStrokes - personalTotals.parPlayed
    );
    const matchToPar = StablefordCalculator.formatToPar(
      matchTotals.netStrokes - matchTotals.parPlayed
    );

    return {
      personalToPar,
      matchToPar: matchToPar === personalToPar ? null : matchToPar,
      totalStrokes: personalTotals.totalStrokes,
    };
  }

  /**
   * «Tu vuelta» mientras se anota: el acumulado neto contra el par de quien
   * anota, sobre los hoyos ya anotados.
   *
   * Se mide con su hándicap de juego PROPIO —el «Hcp de juego» de su tarjeta:
   * su hándicap con el allowance del formato— repartido por los índices de SU
   * barra. No con el reparto del partido: en match play ese es la diferencia y
   * el de hándicap más bajo no recibiría ningún golpe. Tampoco con el 100% de
   * `compute`: aquí se quiere el número del juego que se está jugando.
   *
   * El hándicap de juego sale de `resolve`, el mismo sitio del que lo lee la
   * tarjeta: el del backend si lo hay, el local si no. Si el backend manda un
   * reparto en el que falta quien anota, su hándicap de juego local con el
   * allowance del partido, no 0: con 0 «Tu vuelta» saldría a bruto.
   *
   * Solo el neto: los puntos Stableford se ven en la clasificación (22 oct).
   *
   * @param {Object} params Los de `compute`
   * @returns {?{toPar: ?number, toParLabel: ?string, holesPlayed: number}}
   *   null en foursomes —una bola por bando, no hay vuelta propia— o sin
   *   jugador. Sin hoyos anotados, `toPar` y `toParLabel` son null.
   */
  static runningResult(params) {
    const totals = totalesDeLaPartida(params);
    if (!totals) return null;

    const toPar = totals.holesPlayed ? totals.netStrokes - totals.parPlayed : null;
    return {
      toPar,
      toParLabel: toPar === null ? null : StablefordCalculator.formatToPar(toPar),
      holesPlayed: totals.holesPlayed,
    };
  }

  /**
   * «Tu vuelta» en el historial de partidas rápidas: la real de la partida, la
   * misma que se ve al anotar (Agustín, 24 oct 2026; deshace el 100 % del 18
   * ago). Con la forma de `compute`, para pintarla igual; sin la cifra del
   * partido al lado, que ya es esta. En foursomes, los golpes del bando.
   *
   * @param {Object} params Los de `compute`
   * @returns {?{personalToPar: ?string, matchToPar: null, totalStrokes: number}}
   */
  static vueltaDelHistorial(params) {
    if (params?.matchFormat === 'FOURSOMES') return PersonalRoundCalculator.compute(params);
    const totals = totalesDeLaPartida(params);
    if (!totals?.holesPlayed) return null;
    return {
      personalToPar: StablefordCalculator.formatToPar(totals.netStrokes - totals.parPlayed),
      matchToPar: null,
      totalStrokes: totals.totalStrokes,
    };
  }
}

/**
 * Los totales de la vuelta con el hándicap de juego de la partida, repartido
 * por los índices de su barra: lo que miden «Tu vuelta» al anotar y en el
 * historial. Null en foursomes o sin jugador.
 */
function totalesDeLaPartida(params) {
  const p = conDefectos(params);
  const { me, holes, holeScores, tees, matchFormat, playMode } = p;
  if (!me || matchFormat === 'FOURSOMES') return null;

  // En SCRATCH nadie recibe golpes, diga lo que diga un reparto viejo
  const playingHandicap =
    playMode === 'SCRATCH'
      ? 0
      : (repartoDelPartido(p)[me.participantId]?.playingHandicap ??
        MatchPlayStrokeAllocator.playingHandicap(me, holes, tees, allowanceDelPartido(p)));

  return StablefordCalculator.computeParticipantTotals(
    me,
    holes,
    holeScores,
    {
      [me.participantId]: MatchPlayStrokeAllocator.ownStrokes(me, holes, tees, playingHandicap),
    },
    tees
  );
}

export default PersonalRoundCalculator;
