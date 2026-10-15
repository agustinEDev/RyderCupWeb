import { describe, it, expect, beforeEach, vi } from 'vitest';
import ApiTeeGroupScoringRepository from './ApiTeeGroupScoringRepository';
import * as apiModule from '../../services/api';

vi.mock('../../services/api', () => ({ default: vi.fn() }));

/**
 * Anotar una partida de stroke play (FE #824, PR 7; RyderCupAm#535). La vista
 * se traduce a la forma de la de la Ryder para reutilizar `useScoring`, la
 * cola y las piezas de anotar; lo propio del stroke play va en `strokePlay`.
 */
const hoyo = (hole, extra = {}) => ({
  hole,
  par: 4,
  strokes_received: hole === 1 ? 1 : 0,
  own_score: null,
  own_submitted: false,
  marker_score: null,
  marker_submitted: false,
  status: 'PENDING',
  ...extra,
});
const totales = { thru: 1, points: 3, gross_points: 2, gross: 4, net: 3, to_par_net: -1, to_par_gross: 0, complete: false };
const jugador = (userId, name, marks, markedBy, extra = {}) => ({
  user_id: userId,
  name,
  playing_handicap: 11,
  tee_color: 'YELLOW',
  card_status: 'JUGANDO',
  marks_user_id: marks,
  marked_by_user_id: markedBy,
  holes: Array.from({ length: 18 }, (_, i) => hoyo(i + 1)),
  totals: totales,
  ...extra,
});
const VISTA = {
  group_id: 'g-1',
  round_id: 'r-1',
  number: 2,
  tee_time: '08:10',
  status: 'IN_PROGRESS',
  scoring_opens_at: '2030-10-12T06:00:00Z',
  tournament_type: 'STABLEFORD',
  picked_up_allowed: true,
  i_mark_user_id: 'bea',
  players: [
    jugador('ana', 'Ana Alba', 'bea', 'bea', {
      holes: [
        hoyo(1, { own_score: 5, own_submitted: true, marker_score: 5, marker_submitted: true, status: 'MATCH' }),
        hoyo(2, { own_score: null, own_submitted: true, status: 'MISMATCH', marker_score: 6, marker_submitted: true }),
        ...Array.from({ length: 16 }, (_, i) => hoyo(i + 3)),
      ],
    }),
    jugador('bea', 'Bea Blanco', 'ana', 'ana', { card_status: 'ENTREGADA', brought_in: true, tee_color: 'RED', played: true }),
  ],
};

describe('ApiTeeGroupScoringRepository (FE #824, PR 7)', () => {
  let repo;
  let api;

  beforeEach(() => {
    repo = new ApiTeeGroupScoringRepository();
    api = apiModule.default;
    vi.clearAllMocks();
    api.mockResolvedValue(VISTA);
  });

  it('la vista, en la forma de la de la Ryder', async () => {
    const v = await repo.getScoringView('g-1');

    expect(api).toHaveBeenCalledWith('/api/v1/competitions/groups/g-1/scoring-view');
    expect(v.matchId).toBe('g-1');
    expect(v.matchNumber).toBe(2);
    expect(v.matchStatus).toBe('IN_PROGRESS');
    expect(v.scoringOpensAt).toBe('2030-10-12T06:00:00Z');
    expect(v.isDecided).toBe(false);
    expect(v.roundInfo).toEqual({ id: 'r-1', date: null, sessionType: null, golfCourseName: null, golfCourseId: null });
    expect(v.markerAssignments).toEqual([
      { scorerUserId: 'ana', scorerName: 'Ana Alba', marksUserId: 'bea', marksName: 'Bea Blanco', markedByUserId: 'bea', markedByName: 'Bea Blanco' },
      { scorerUserId: 'bea', scorerName: 'Bea Blanco', marksUserId: 'ana', marksName: 'Ana Alba', markedByUserId: 'ana', markedByName: 'Ana Alba' },
    ]);
    expect(v.players[1]).toMatchObject({ userId: 'bea', userName: 'Bea Blanco', team: null, color: 'RED', playingHandicap: 11 });
    expect(v.players[0].strokesReceived).toHaveLength(18);
    expect(v.players[0].strokesReceived[0]).toBe(1);
    expect(v.players[0].holeCard[0]).toEqual({ holeNumber: 1, par: 4, strokeIndex: null, meters: null });
    expect(v.holes).toHaveLength(18);
    expect(v.holes[0]).toEqual({ holeNumber: 1, par: 4, strokeIndex: null });
    expect(v.scorecardSubmittedBy).toEqual(['bea']);
  });

  it('los golpes de cada hoyo: validado, en desacuerdo y recogida (propio nulo y enviado)', async () => {
    const v = await repo.getScoringView('g-1');

    const ana = (h) => v.scores[h - 1].playerScores.find((p) => p.userId === 'ana');
    expect(v.scores).toHaveLength(18);
    expect(ana(1)).toEqual({
      userId: 'ana',
      ownScore: 5,
      ownSubmitted: true,
      markerScore: 5,
      markerSubmitted: true,
      markerBy: null,
      markerByName: null,
      validationStatus: 'match',
      netScore: null,
      strokesReceivedThisHole: 1,
    });
    expect(ana(2)).toMatchObject({ ownScore: null, ownSubmitted: true, validationStatus: 'mismatch' });
    expect(ana(3).validationStatus).toBe('pending');
  });

  it('lo propio del stroke play, aparte', async () => {
    const v = await repo.getScoringView('g-1');

    expect(v.strokePlay).toEqual({
      roundId: 'r-1',
      teeTime: '08:10',
      tournamentType: 'STABLEFORD',
      pickedUpAllowed: true,
      iMarkUserId: 'bea',
      cards: [
        {
          userId: 'ana',
          name: 'Ana Alba',
          cardStatus: 'JUGANDO',
          teeGender: null,
          marksUserId: 'bea',
          markedByUserId: 'bea',
          broughtIn: false,
          // Si jugó: «Retirar» y no «No presentado» (RyderCupAm#553)
          played: false,
          totals: { thru: 1, points: 3, grossPoints: 2, gross: 4, net: 3, toParNet: -1, toParGross: 0, complete: false },
        },
        {
          userId: 'bea',
          name: 'Bea Blanco',
          cardStatus: 'ENTREGADA',
          teeGender: null,
          marksUserId: 'ana',
          markedByUserId: 'ana',
          // Vino de otra partida (BE #539)
          broughtIn: true,
          played: true,
          totals: { thru: 1, points: 3, grossPoints: 2, gross: 4, net: 3, toParNet: -1, toParGross: 0, complete: false },
        },
      ],
    });
  });

  it('sin marcador (partida de 1) ni apertura conocida', async () => {
    api.mockResolvedValue({ ...VISTA, scoring_opens_at: null, i_mark_user_id: null, players: [jugador('ana', 'Ana', null, null)] });

    const v = await repo.getScoringView('g-1');

    expect(v.scoringOpensAt).toBeNull();
    expect(v.strokePlay.iMarkUserId).toBeNull();
    expect(v.markerAssignments[0]).toMatchObject({ marksUserId: null, marksName: null, markedByUserId: null, markedByName: null });
  });

  it('anotar un hoyo: el cuerpo de la Ryder, sin lo que no viene (nulo es recogida)', async () => {
    await repo.submitHoleScore('g-1', 3, { ownScore: null, markedPlayerId: 'bea' });

    expect(api).toHaveBeenCalledWith('/api/v1/competitions/groups/g-1/scores/holes/3', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(api.mock.calls[0][1].body)).toEqual({ own_score: null, marked_player_id: 'bea' });
    expect(api.mock.calls[0][1].topeMs).toBeGreaterThan(0);
  });

  it.each([
    ['entregar', (r) => r.submitScorecard('g-1'), '/api/v1/competitions/groups/g-1/scorecard'],
    ['retirarse', (r) => r.retire('g-1'), '/api/v1/competitions/groups/g-1/scorecard/retire'],
    ['reabrir', (r) => r.reopenCard('g-1', 'ana'), '/api/v1/competitions/groups/g-1/players/ana/reopen'],
    ['no presentado', (r) => r.markNoShow('g-1', 'ana'), '/api/v1/competitions/groups/g-1/players/ana/no-show'],
    // QA del 11 oct 2026: quien juega sin marcador (BE #539)
    ['validar lo anotado', (r) => r.validateScored('g-1', 'ana'), '/api/v1/competitions/groups/g-1/players/ana/validate-scored'],
    // El organizador retira a quien ya jugó (RyderCupAm#553)
    ['retirar a un jugador', (r) => r.retirePlayer('g-1', 'ana'), '/api/v1/competitions/groups/g-1/players/ana/retire'],
  ])('%s: POST y devuelve la vista', async (_caso, hacer, url) => {
    const v = await hacer(repo);

    expect(api).toHaveBeenCalledWith(url, expect.objectContaining({ method: 'POST' }));
    expect(v.matchId).toBe('g-1');
  });

  it('borrar lo anotado en un hoyo (organizador): DELETE con el lado (RyderCupAm#553)', async () => {
    const v = await repo.deleteHole('g-1', 'ana', 7, 'marker');

    expect(api).toHaveBeenCalledWith(
      '/api/v1/competitions/groups/g-1/players/ana/holes/7?side=marker',
      expect.objectContaining({ method: 'DELETE' })
    );
    expect(v.matchId).toBe('g-1');
  });

  it('corregir un hoyo (organizador): PUT con los lados que vienen', async () => {
    const v = await repo.correctHole('g-1', 'ana', 7, { markerScore: 5 });

    expect(api).toHaveBeenCalledWith('/api/v1/competitions/groups/g-1/players/ana/holes/7', expect.objectContaining({ method: 'PUT' }));
    expect(JSON.parse(api.mock.calls[0][1].body)).toEqual({ marker_score: 5 });
    expect(v.matchId).toBe('g-1');
  });

  it('cerrar la franja: devuelve sus partidas', async () => {
    api.mockResolvedValue({ round_id: 'r-1', editable: false, unassigned_players: [], groups: [] });

    const vista = await repo.closeWindow('r-1');

    expect(api).toHaveBeenCalledWith('/api/v1/competitions/rounds/r-1/groups/close', { method: 'POST' });
    expect(vista).toEqual({ roundId: 'r-1', editable: false, canAddGroup: false, unassignedPlayers: [], groups: [] });
  });

  it('la clasificación de la franja, con o sin categoría', async () => {
    api.mockResolvedValue({
      tournament_type: 'MEDAL',
      scale: 'NETA',
      rule: 'ACCUMULATED',
      category: 2,
      rows: [{ position: 3, tied: true, user_id: 'ana', name: 'Ana', category: 2, handicap: '12.3', value: -2, cards: 1, thru: 18, status: 'CLASIFICADO', retired: true, tee_gender: 'FEMALE' }],
      me: null,
    });

    const c = await repo.getWindowStandings('r-1', 2);

    expect(api).toHaveBeenCalledWith('/api/v1/competitions/rounds/r-1/standings?category=2');
    expect(c).toEqual({
      tournamentType: 'MEDAL',
      scale: 'NETA',
      rule: 'ACCUMULATED',
      category: 2,
      rows: [{ position: 3, tied: true, userId: 'ana', name: 'Ana', category: 2, handicap: 12.3, value: -2, cards: 1, thru: 18, status: 'CLASIFICADO', retired: true, teeGender: 'FEMALE' }],
      me: null,
    });

    await repo.getWindowStandings('r-1');
    expect(api).toHaveBeenLastCalledWith('/api/v1/competitions/rounds/r-1/standings');
  });

  it('FE #856: sin el género de la fila (servidor anterior), null', async () => {
    api.mockResolvedValue({
      tournament_type: 'MEDAL', scale: 'NETA', rule: 'ACCUMULATED', category: null,
      rows: [{ position: null, tied: false, user_id: 'ana', name: 'Ana', category: 1, handicap: '1', value: null, cards: 0, thru: 0, status: 'NP' }],
      me: null,
    });

    const c = await repo.getWindowStandings('r-1');

    expect(c.rows[0].teeGender).toBeNull();
  });

  it('la general de la competición, con o sin categoría (PR 8)', async () => {
    api.mockResolvedValue({ tournament_type: 'STABLEFORD', scale: 'NETA', rule: 'BEST_CARD', category: 1, rows: [], me: null });

    const c = await repo.getCompetitionStandings('c-1', 1);

    expect(api).toHaveBeenCalledWith('/api/v1/competitions/c-1/standings?category=1');
    expect(c).toEqual({ tournamentType: 'STABLEFORD', scale: 'NETA', rule: 'BEST_CARD', category: 1, rows: [], me: null });
    await repo.getCompetitionStandings('c-1');
    expect(api).toHaveBeenLastCalledWith('/api/v1/competitions/c-1/standings');
  });

  it('la scratch de la competición (PR 8)', async () => {
    api.mockResolvedValue({ tournament_type: 'MEDAL', scale: 'SCRATCH', rule: 'ACCUMULATED', category: null, rows: [], me: null });

    const c = await repo.getScratchStandings('c-1');

    expect(api).toHaveBeenCalledWith('/api/v1/competitions/c-1/standings/scratch');
    expect(c.scale).toBe('SCRATCH');
  });

  it('la fila de quien mira cuando queda fuera del corte (`me`), con la misma forma', async () => {
    const fila = { position: null, tied: false, user_id: 'yo', name: 'Yo', category: null, handicap: '-1.2', value: null, cards: 0, thru: 0, status: 'NP' };
    api.mockResolvedValue({ tournament_type: 'STABLEFORD', scale: 'SCRATCH', rule: 'BEST_CARD', category: null, rows: [], me: fila });

    const c = await repo.getWindowStandings('r-1');

    expect(c.me).toEqual({ position: null, tied: false, userId: 'yo', name: 'Yo', category: null, handicap: -1.2, value: null, cards: 0, thru: 0, status: 'NP', retired: false, teeGender: null });
  });
});
