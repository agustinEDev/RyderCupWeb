// Lo que la pantalla de anotación de competición (`ScoringPage`) lee del
// partido para el hoyo en pantalla: a quién marco, sus bloqueos, las tarjetas
// de cada barra y los hoyos que no se pudieron guardar.
import { aQuienesMarco } from '../domain/services/retiradaDelFourball';
import { rivalDe } from './golpesDelHoyo';

/**
 * Los hoyos que no se pudieron guardar, en orden (FE #622). Los que ya no se
 * pueden anotar —sin permiso, o con bloqueados los golpes que se perdieron— no
 * piden volver a anotarlos, que sería pedir algo imposible: van en otra frase.
 */
export const hoyosSinGuardar = ({
  noGuardados,
  markerAssignments,
  userId,
  canScore,
  isOwnScoreLocked,
  marcaBloqueadaPara,
}) => {
  const hoyosNoGuardados = Object.keys(noGuardados).map(Number).sort((a, b) => a - b);
  // Cada marca, con el bloqueo de SU rival: quien marca a dos las nombra con él
  // y puede tener uno entregado y el otro no. A quien ya no marca (se deshizo
  // la retirada) no se le puede volver a anotar (26 oct 2026)
  const misMarcados = aQuienesMarco(markerAssignments, userId);
  const [primerMarcado = null, segundoMarcado = null] = misMarcados;
  const golpeBloqueado = (g) => {
    if (g === 'ownScore') return isOwnScoreLocked;
    const rival = rivalDe(g);
    if (rival) return !misMarcados.includes(rival) || marcaBloqueadaPara(rival);
    return marcaBloqueadaPara(primerMarcado);
  };
  const yaNoSeAnota = (hoyo) => !canScore || noGuardados[hoyo].golpes.every(golpeBloqueado);
  const porAnotar = hoyosNoGuardados.filter((h) => !yaNoSeAnota(h));
  const sinAnotar = hoyosNoGuardados.filter(yaNoSeAnota);
  return { hoyosNoGuardados, primerMarcado, segundoMarcado, porAnotar, sinAnotar };
};

/**
 * El hoyo en pantalla, para quien anota: a quién marca (uno, o dos con un
 * retirado), sus bloqueos, las tarjetas de cada barra y las filas del hoyo.
 */
export const lecturaDelHoyo = ({
  scoringView,
  currentUserId,
  currentHole,
  scoresVisibles,
  primerMarcado,
  segundoMarcado,
  marcaBloqueadaPara,
}) => {
  // Fourball con un retirado (F5): su pareja marca también al rival que él
  // marcaba. La casilla es del primero, como siempre, y la del segundo va
  // debajo (26 oct 2026: una casilla por marcado, sin elegir)
  const nombreDe = (id) => scoringView?.players?.find((p) => p.userId === id)?.userName ?? id;
  // Quien no marca a nadie no tiene asignación propia de la que sacarlo
  const quienMeMarcaId = scoringView?.markerAssignments?.find((ma) => ma.marksUserId === currentUserId)?.scorerUserId;
  const quienMeMarca = quienMeMarcaId ? nombreDe(quienMeMarcaId) : null;
  const markerAssignment = scoringView?.markerAssignments?.find(
    (ma) => ma.scorerUserId === currentUserId && ma.marksUserId === primerMarcado
  );
  // Cada marcado con su bloqueo: con dos, el primero no dice nada del otro. Sin
  // marcado (el rival que marcaba al retirado) no hay marca que guardar
  const marcaBloqueada = marcaBloqueadaPara(markerAssignment?.marksUserId);
  const segundoBloqueado = segundoMarcado ? marcaBloqueadaPara(segundoMarcado) : true;

  // A quién marco, para «Anotas a …» del hoyo. En foursomes hay una bola por
  // pareja y se marca a la pareja rival (#710): «Luna / Óscar», no solo Luna.
  // Lo decía la tarjeta «Info del Partido», que se quitó para que la
  // navegación se viera sin desplazar la pantalla (16 oct)
  const formato = scoringView?.matchFormat;
  const jugadores = scoringView?.players;
  const marcoAId = markerAssignment?.marksUserId;
  const equipoMarcado = formato === 'FOURSOMES' && marcoAId ? jugadores?.find((p) => p.userId === marcoAId)?.team : null;
  const parejaMarcada = equipoMarcado
    ? jugadores.filter((p) => p.team === equipoMarcado).map((p) => p.userName).join(' / ')
    : '';
  const aQuienMarco = parejaMarcada || markerAssignment?.marksName || null;

  // El par, el índice y los metros son de la barra de CADA jugador: en 56 de
  // los 800 campos federados el índice cambia entre barras y en 25 el par.
  // El backend ya manda la tarjeta resuelta por jugador (RyderCupAm#213); esta
  // pantalla leía `holes`, que es la del campo, y le pintaba a quien no juega
  // la primera barra un par que no era el suyo. Ver RyderCupWeb#417.
  //
  // Reserva a la tarjeta del campo para quien venga sin la suya, que es lo que
  // manda el backend cuando no pudo cargar el campo.
  const holeCardOf = (userId) =>
    scoringView?.players?.find((p) => p.userId === userId)?.holeCard ?? [];
  const holeFor = (userId) =>
    holeCardOf(userId).find((h) => h.holeNumber === currentHole) ?? null;

  // Get current hole data
  const courseHoleData = scoringView?.holes?.find((h) => h.holeNumber === currentHole);
  const currentHoleData = holeFor(currentUserId) ?? courseHoleData;

  // Lo que se ve del hoyo: el servidor con lo que está en la cola encima, que lo
  // compone el hook (FE #606). La pantalla ya no guarda su propia copia de lo
  // anotado: nunca se vaciaba, así que un golpe rechazado seguía pintándose
  const currentHoleScore = scoresVisibles.find((s) => s.holeNumber === currentHole);
  const currentPlayerScore = currentHoleScore?.playerScores?.find(
    (ps) => ps.userId === currentUserId
  );
  // Score entry for the player the current user marks (to read what current user entered as marker)
  const markedPlayerScore = currentHoleScore?.playerScores?.find(
    (ps) => ps.userId === markerAssignment?.marksUserId
  );

  // La fila del segundo marcado en este hoyo, y su nombre, de su asignación
  // como el del primero: sin él, `null`, y la casilla pone las palabras de
  // siempre (no su id)
  const filaDelSegundo = currentHoleScore?.playerScores?.find((ps) => ps.userId === segundoMarcado);
  const nombreDelSegundo = (segundoMarcado
    && scoringView?.markerAssignments?.find((ma) => ma.marksUserId === segundoMarcado)?.marksName) || null;

  return {
    quienMeMarca,
    markerAssignment,
    marcaBloqueada,
    segundoBloqueado,
    aQuienMarco,
    holeFor,
    courseHoleData,
    currentHoleData,
    currentHoleScore,
    currentPlayerScore,
    markedPlayerScore,
    filaDelSegundo,
    nombreDelSegundo,
  };
};
