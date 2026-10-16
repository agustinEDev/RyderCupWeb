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
  it('lleva el campo de la franja, para pedir su mapa de hoyos', () => {
    expect(TeeGroupScoringMapper.toScoringViewDTO(VISTA).roundInfo.golfCourseId).toBe('gc-1');
  });

  it('y su nombre, bajo el título de la anotación (BE #573); sin él, null', () => {
    expect(TeeGroupScoringMapper.toScoringViewDTO({ ...VISTA, golf_course_name: 'Golf de Meis' }).roundInfo.golfCourseName).toBe('Golf de Meis');
    expect(TeeGroupScoringMapper.toScoringViewDTO(VISTA).roundInfo.golfCourseName).toBeNull();
  });

  it('sin el campo (un backend anterior) queda en null', () => {
    const anterior = { ...VISTA };
    delete anterior.golf_course_id;

    expect(TeeGroupScoringMapper.toScoringViewDTO(anterior).roundInfo.golfCourseId).toBeNull();
  });
});
