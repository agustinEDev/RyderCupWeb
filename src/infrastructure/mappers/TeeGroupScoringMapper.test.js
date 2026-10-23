import { describe, it, expect } from 'vitest';
import TeeGroupScoringMapper from './TeeGroupScoringMapper';

const VISTA = {
  group_id: 'g-1',
  round_id: 'r-1',
  golf_course_id: 'gc-1',
  number: 2,
  tee_time: '08:10',
  status: 'IN_PROGRESS',
  scoring_opens_at: null,
  tournament_type: 'STABLEFORD',
  picked_up_allowed: true,
  i_mark_user_id: null,
  players: [],
};

describe('TeeGroupScoringMapper.toScoringViewDTO', () => {
  it.each([
    [true, true],
    [false, false],
    [undefined, false],
    ['true', false],
  ])('la raya, solo con picked_up_allowed verdadero (%s): una vista vieja no la ofrece', (dato, sale) => {
    // 23 oct 2026: «que la raya no salga ya en Medal, no demos la oportunidad de que falle»
    expect(
      TeeGroupScoringMapper.toScoringViewDTO({ ...VISTA, picked_up_allowed: dato }).strokePlay.pickedUpAllowed
    ).toBe(sale);
  });

  it('lleva el campo de la franja, para pedir su mapa de hoyos', () => {
    expect(TeeGroupScoringMapper.toScoringViewDTO(VISTA).roundInfo.golfCourseId).toBe('gc-1');
  });

  it('y su nombre, bajo el título de la anotación (BE #573); sin él, null', () => {
    expect(TeeGroupScoringMapper.toScoringViewDTO({ ...VISTA, golf_course_name: 'Golf de Meis' }).roundInfo.golfCourseName).toBe('Golf de Meis');
    expect(TeeGroupScoringMapper.toScoringViewDTO(VISTA).roundInfo.golfCourseName).toBeNull();
  });

  it('el país del campo: el mapa solo tiene imagen en España (19 oct); sin él, null', () => {
    expect(TeeGroupScoringMapper.toScoringViewDTO({ ...VISTA, golf_course_country_code: 'PT' }).roundInfo.golfCourseCountryCode).toBe('PT');
    expect(TeeGroupScoringMapper.toScoringViewDTO(VISTA).roundInfo.golfCourseCountryCode).toBeNull();
  });

  it('F12 (BE #574): los metros de cada hoyo desde la barra de cada jugador; sin ellos, null', () => {
    const hoyo = (n, meters) => ({ hole: n, par: 4, strokes_received: 0, own_score: null, own_submitted: false, marker_score: null, marker_submitted: false, status: 'PENDING', ...(meters === undefined ? {} : { meters }) });
    const jugador = (id, metros) => ({ user_id: id, name: id, playing_handicap: 0, tee_color: 'YELLOW', holes: Array.from({ length: 18 }, (_, i) => hoyo(i + 1, metros(i))) });

    const vista = TeeGroupScoringMapper.toScoringViewDTO({
      ...VISTA,
      players: [jugador('ana', (i) => 300 + i), jugador('bea', (i) => (i === 0 ? null : undefined))],
    });

    const [ana, bea] = vista.players;
    expect(ana.holeCard.slice(0, 2).map((h) => h.meters)).toEqual([300, 301]);
    expect(bea.holeCard.slice(0, 2).map((h) => h.meters)).toEqual([null, null]);
  });

  it('sin el campo (un backend anterior) queda en null', () => {
    const anterior = { ...VISTA };
    delete anterior.golf_course_id;

    expect(TeeGroupScoringMapper.toScoringViewDTO(anterior).roundInfo.golfCourseId).toBeNull();
  });
});
