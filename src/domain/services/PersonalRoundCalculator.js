import StablefordCalculator from './StablefordCalculator';
import MatchPlayStrokeAllocator from './MatchPlayStrokeAllocator';
import { entryAtOf, groupParticipantsBySide } from './FoursomesSides';

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
 * como cualquier otro. Vale doble bogey BRUTO —`par + 2`, sin golpes
 * recibidos—, porque este total es bruto y meterle un hoyo neto dentro
 * mezclaría dos escalas en el mismo número. Es la misma cuenta que hace
 * `_foursomes_side_strokes` en el backend, del que este total tiene que seguir
 * sin separarse.
 */
const GROSS_DOUBLE_BOGEY_OVER_PAR = 2;

const sideTotals = (me, participants, holes, holeScores) => {
  const members =
    groupParticipantsBySide(participants).find((side) =>
      side.some((p) => p.participantId === me.participantId)
    ) ?? [me];

  const entryAt = entryAtOf(holeScores);

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
    totalStrokes +=
      numbers.length > 0 ? Math.min(...numbers) : hole.par + GROSS_DOUBLE_BOGEY_OVER_PAR;
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
  static compute({
    me = null,
    participants = [],
    holes = [],
    holeScores = [],
    tees = [],
    participantStrokes = [],
    matchFormat = null,
    allowancePercentage = null,
    playMode = 'HANDICAP',
  }) {
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
      // Sin reparto: el bruto no depende de los golpes que se den.
      const teamTotals = sideTotals(me, participants, holes, holeScores);
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
      MatchPlayStrokeAllocator.resolve({
        participantStrokes,
        participants,
        holes,
        tees,
        matchFormat,
        allowancePercentage: allowancePercentage ?? PERSONAL_ROUND_ALLOWANCE,
        playMode,
      }),
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
}

export default PersonalRoundCalculator;
