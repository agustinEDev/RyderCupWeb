import StablefordCalculator from './StablefordCalculator';
import MatchPlayStrokeAllocator from './MatchPlayStrokeAllocator';

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
 */
const sideTotals = (me, participants, holes, holeScores) => {
  const sideIds = me.team
    ? new Set(participants.filter((p) => p.team === me.team).map((p) => p.participantId))
    : new Set([me.participantId]);

  let totalStrokes = 0;
  let holesPlayed = 0;

  for (const hole of holes) {
    const entry = holeScores.find(
      (hs) => sideIds.has(hs.participantId) && hs.holeNumber === hole.holeNumber && hs.score != null
    );
    if (!entry) continue;
    totalStrokes += entry.score;
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

    // El par se cuenta contra la tarjeta del campo, la misma que usa el ranking
    // de la clasificacion. No es la barra del jugador —`holes` es la tarjeta de
    // la PRIMERA barra, y en 25 de 800 campos el par cambia entre barras—, pero
    // contarlo aqui por barra y en la tabla de al lado por campo dejaba la fila
    // "Resultado" y esta linea con dos numeros distintos en la misma pantalla,
    // que es justo lo que este servicio existe para quitar. El par por barra se
    // arregla de una vez en las tres superficies en RyderCupWeb#417.
    //
    // De paso, `holeCardFor` es todo o nada: una tarjeta de barra incompleta se
    // llevaria por delante los hoyos que le faltan, y con ellos los golpes
    // brutos que esta pagina pinta debajo del resultado.

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
      })
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
      })
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
