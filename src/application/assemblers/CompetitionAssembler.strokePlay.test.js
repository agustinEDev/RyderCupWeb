import { describe, it, expect } from 'vitest';
import CompetitionAssembler from './CompetitionAssembler';
import CompetitionMapper from '../../infrastructure/mappers/CompetitionMapper';

/**
 * Los ajustes del stroke play llegan a la pantalla (FE #824, RyderCupAm#536),
 * de punta a punta: la respuesta, el mapper y el assembler.
 */
const respuestaDeLaApi = (extra = {}) => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  creator_id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Medal del club',
  start_date: '2027-06-01',
  end_date: '2027-06-03',
  country_code: 'ES',
  play_mode: 'HANDICAP',
  number_of_players: 12,
  status: 'ACTIVE',
  tournament_type: 'MEDAL',
  modality: 'STROKE_PLAY',
  created_at: '2026-10-03T10:00:00Z',
  updated_at: '2026-10-03T10:00:00Z',
  ...extra,
});

const loQueLlegaALaPantalla = (apiData) =>
  CompetitionAssembler.toSimpleDTO(CompetitionMapper.toDomain(apiData), apiData);

describe('CompetitionAssembler · los ajustes del stroke play (FE #824)', () => {
  it('M1: los límites llegan como números (la API los manda como texto)', () => {
    const dto = loQueLlegaALaPantalla(
      respuestaDeLaApi({
        stroke_play: {
          category_limits: ['12.0', '26.0'],
          max_matchdays_per_player: 2,
          overall_standing: 'BEST_CARD',
          category_count: null,
        },
      })
    );

    expect(dto.strokePlay).toEqual({
      categoryLimits: [12, 26],
      categoryCount: null,
      maxMatchdaysPerPlayer: 2,
      overallStanding: 'BEST_CARD',
    });
  });

  it('M2: las categorías iguales llegan con su número', () => {
    const dto = loQueLlegaALaPantalla(
      respuestaDeLaApi({
        stroke_play: {
          category_limits: [],
          max_matchdays_per_player: 1,
          overall_standing: 'ACCUMULATED',
          category_count: 3,
        },
      })
    );

    expect(dto.strokePlay.categoryCount).toBe(3);
  });

  it('M3: una respuesta de antes del contador es de límites a mano', () => {
    const dto = loQueLlegaALaPantalla(
      respuestaDeLaApi({
        stroke_play: { category_limits: [], max_matchdays_per_player: 1, overall_standing: 'ACCUMULATED' },
      })
    );

    expect(dto.strokePlay.categoryCount).toBeNull();
  });

  it('M4: un Medal sin `stroke_play` (un listado) tiene los de por defecto', () => {
    const dto = loQueLlegaALaPantalla(respuestaDeLaApi());

    expect(dto.strokePlay).toEqual({
      categoryLimits: [],
      categoryCount: null,
      maxMatchdaysPerPlayer: 1,
      overallStanding: 'ACCUMULATED',
    });
  });

  it('M5: una Ryder no los trae', () => {
    const dto = loQueLlegaALaPantalla(
      respuestaDeLaApi({ tournament_type: 'RYDER_CUP', modality: 'MATCH_PLAY', team_1_name: 'A', team_2_name: 'B' })
    );

    expect(dto.strokePlay).toBeNull();
  });
});
