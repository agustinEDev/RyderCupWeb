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
      // El campo de la franja, para pedir su mapa de hoyos (BE #532)
      roundInfo: {
        id: api.round_id,
        date: null,
        sessionType: null,
        // Su nombre, bajo el título de la anotación (BE #573)
        golfCourseName: api.golf_course_name ?? null,
        golfCourseId: api.golf_course_id ?? null,
        // Su país: el mapa solo tiene imagen en España (19 oct)
        golfCourseCountryCode: api.golf_course_country_code ?? null,
      },
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
        // Con el color, la barra: las muestras del mapa van por barra (16 oct)
        teeGender: p.tee_gender ?? null,
        playingHandicap: p.playing_handicap,
        strokesReceived: numeros.map((n) => hoyoDe(p, n)?.strokes_received ?? 0),
        // El par y los metros de SU barra (los metros, BE #574); la vista no trae índice
        holeCard: numeros.map((n) => ({ holeNumber: n, par: hoyoDe(p, n)?.par ?? null, strokeIndex: null, meters: hoyoDe(p, n)?.meters ?? null })),
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
            // Quién puso el lado del marcador: tras cambiar el círculo, el de antes
            markerBy: h.marker_by ?? null,
            markerByName: h.marker_by_name ?? null,
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
        // HH:MM, como en ScheduleMapper
        teeTime: typeof api.tee_time === 'string' ? api.tee_time.slice(0, 5) : api.tee_time,
        tournamentType: api.tournament_type,
        // Solo un sí expreso: una vista vieja sin el dato no ofrece la raya (23 oct 2026)
        pickedUpAllowed: api.picked_up_allowed === true,
        iMarkUserId: api.i_mark_user_id ?? null,
        cards: jugadores.map((p) => ({
          userId: p.user_id,
          name: p.name,
          cardStatus: p.card_status,
          // Para «Retirada», «No presentada» (pasada en el móvil, 12 oct 2026)
          teeGender: p.tee_gender ?? null,
          marksUserId: p.marks_user_id ?? null,
          markedByUserId: p.marked_by_user_id ?? null,
          // Vino de otra partida a acompañar al que se quedó solo (BE #539)
          broughtIn: p.brought_in ?? false,
          // Si ya jugó, el organizador le retira: no puede darle por no presentado (RyderCupAm#553)
          played: p.played ?? false,
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
      // Su última tarjeta quedó retirada: en Stableford cuenta, pero no sigue (BE)
      retired: r.retired ?? false,
      // Para «No presentada» o «Retirada» (FE #856, RyderCupAm#558)
      teeGender: r.tee_gender ?? null,
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
