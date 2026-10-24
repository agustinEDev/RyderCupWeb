/**
 * Cuándo cuenta un match play de partida rápida ya cerrado: decidido antes
 * del 18, o los dos bandos con los mismos hoyos y al menos nueve. Es la regla
 * con la que Actividad dice «sin terminar» (`counted_round.py` del back, tabla
 * A del 22 oct 2026), para que la pantalla de la partida no diga «ganó» donde
 * Actividad no lo dice (Agustín, 24 oct 2026).
 */
export const MIN_HOYOS_QUE_CUENTAN = 9;

const hoyosDe = (holeScores, participantId) =>
  new Set(holeScores.filter((h) => h.participantId === participantId).map((h) => h.holeNumber));

/**
 * Los hoyos que entregó un bando: los que anotaron todos sus jugadores, porque
 * en fourball la bola que falta puede cambiar el mejor neto (en individual el
 * bando es el jugador). En foursomes el bando juega una bola, a nombre de uno. La raya (sin
 * número) es un hoyo entregado.
 */
const hoyosDelBando = (holeScores, bando, matchFormat) => {
  const porJugador = bando.map((p) => hoyosDe(holeScores, p.participantId));
  if (porJugador.length === 0) return new Set();
  if (matchFormat !== 'FOURSOMES') {
    return new Set([...porJugador[0]].filter((hoyo) => porJugador.every((h) => h.has(hoyo))));
  }
  return new Set(porJugador.flatMap((h) => [...h]));
};

export const cuentaElMatchPlay = ({ holeScores, teamA, teamB, matchFormat, decididaAntes }) => {
  if (decididaAntes) return true;
  const a = hoyosDelBando(holeScores, teamA, matchFormat);
  const b = hoyosDelBando(holeScores, teamB, matchFormat);
  return a.size >= MIN_HOYOS_QUE_CUENTAN && a.size === b.size && [...a].every((hoyo) => b.has(hoyo));
};
