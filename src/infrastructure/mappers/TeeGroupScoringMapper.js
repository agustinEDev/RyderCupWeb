// src/infrastructure/mappers/TeeGroupScoringMapper.js

/**
 * La vista de anotar una partida de stroke play (FE #824, PR 7;
 * RyderCupAm#535), traducida a la forma de la del partido de la Ryder
 * (`ScoringMapper.toScoringViewDTO`). Así la anotan las mismas piezas que ya
 * aguantan la cobertura mala: `useScoring`, la cola sin conexión, `HoleInput`.
 * Lo que solo existe en stroke play va aparte, en `strokePlay`.
 *
 * La vista de la partida trae los hoyos por jugador —cada uno con el par de
 * SU barra— y no por hoyo; aquí se dan la vuelta.
 */
const HOYOS = 18;

const totalesDe = (t) => ({
  thru: t.thru,
  points: t.points,
  grossPoints: t.gross_points,
  gross: t.gross,
  net: t.net,
  toParNet: t.to_par_net,
  toParGross: t.to_par_gross,
  complete: t.complete,
});

class TeeGroupScoringMapper {
  static toScoringViewDTO(api) {
    const jugadores = api.players || [];
    const nombre = new Map(jugadores.map((p) => [p.user_id, p.name]));
    const nombreDe = (id) => (id ? nombre.get(id) ?? null : null);
    const hoyoDe = (p, n) => (p.holes || []).find((h) => h.hole === n);
    const numeros = Array.from({ length: HOYOS }, (_, i) => i + 1);

    return {
      matchId: api.group_id,
      matchNumber: api.number,
      matchFormat: null,
      matchStatus: api.status,
      scoringOpensAt: api.scoring_opens_at ?? null,
      // En stroke play no se decide antes del 18
      isDecided: false,
      decidedResult: null,
      roundInfo: { id: api.round_id, date: null, sessionType: null, golfCourseName: null },
      competitionId: null,
      teamAName: null,
      teamBName: null,
      markerAssignments: jugadores.map((p) => ({
        scorerUserId: p.user_id,
        scorerName: p.name,
        marksUserId: p.marks_user_id ?? null,
        marksName: nombreDe(p.marks_user_id),
        markedByUserId: p.marked_by_user_id ?? null,
        markedByName: nombreDe(p.marked_by_user_id),
      })),
      players: jugadores.map((p) => ({
        userId: p.user_id,
        userName: p.name,
        team: null,
        color: p.tee_color ?? null,
        playingHandicap: p.playing_handicap,
        strokesReceived: numeros.map((n) => hoyoDe(p, n)?.strokes_received ?? 0),
        // El par de SU barra; la vista no trae índice ni metros
        holeCard: numeros.map((n) => ({ holeNumber: n, par: hoyoDe(p, n)?.par ?? null, strokeIndex: null, meters: null })),
      })),
      holes: numeros.map((n) => ({ holeNumber: n, par: jugadores[0] ? hoyoDe(jugadores[0], n)?.par ?? null : null, strokeIndex: null })),
      scores: numeros.map((n) => ({
        holeNumber: n,
        playerScores: jugadores.map((p) => {
          const h = hoyoDe(p, n) ?? {};
          return {
            userId: p.user_id,
            ownScore: h.own_score ?? null,
            ownSubmitted: h.own_submitted ?? false,
            markerScore: h.marker_score ?? null,
            markerSubmitted: h.marker_submitted ?? false,
            validationStatus: (h.status || 'PENDING').toLowerCase(),
            netScore: null,
            strokesReceivedThisHole: h.strokes_received ?? 0,
          };
        }),
        holeResult: null,
      })),
      matchStanding: null,
      scorecardSubmittedBy: jugadores.filter((p) => p.card_status === 'ENTREGADA').map((p) => p.user_id),
      strokePlay: {
        roundId: api.round_id,
        teeTime: api.tee_time,
        tournamentType: api.tournament_type,
        pickedUpAllowed: api.picked_up_allowed,
        iMarkUserId: api.i_mark_user_id ?? null,
        cards: jugadores.map((p) => ({
          userId: p.user_id,
          name: p.name,
          cardStatus: p.card_status,
          marksUserId: p.marks_user_id ?? null,
          markedByUserId: p.marked_by_user_id ?? null,
          totals: totalesDe(p.totals || {}),
        })),
      },
    };
  }

  /** Una clasificación: la de una franja, la general o la scratch. */
  static toStandingsDTO(api) {
    const fila = (r) => ({
      position: r.position,
      tied: r.tied,
      userId: r.user_id,
      name: r.name,
      category: r.category,
      handicap: Number(r.handicap),
      value: r.value,
      cards: r.cards,
      thru: r.thru,
      status: r.status,
    });
    return {
      tournamentType: api.tournament_type,
      scale: api.scale,
      rule: api.rule,
      category: api.category,
      rows: (api.rows || []).map(fila),
      me: api.me ? fila(api.me) : null,
    };
  }
}

export default TeeGroupScoringMapper;
