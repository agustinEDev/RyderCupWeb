import { describe, it, expect } from 'vitest';
import CompetitionAssembler from './CompetitionAssembler';
import CompetitionMapper from '../../infrastructure/mappers/CompetitionMapper';

/**
 * El tipo de torneo llega a la pantalla (FE #791, RyderCupAm#251).
 *
 * El camino real, de punta a punta: un campo que el mapper trae y el assembler
 * no copia no existe para la aplicación.
 */
const respuestaDeLaApi = (extra = {}) => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  creator_id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Torneo del club',
  start_date: '2027-06-01',
  end_date: '2027-06-03',
  country_code: 'ES',
  play_mode: 'HANDICAP',
  number_of_players: 12,
  status: 'ACTIVE',
  created_at: '2026-10-03T10:00:00Z',
  updated_at: '2026-10-03T10:00:00Z',
  ...extra,
});

const loQueLlegaALaPantalla = (apiData) =>
  CompetitionAssembler.toSimpleDTO(CompetitionMapper.toDomain(apiData), apiData);

describe('CompetitionAssembler · el tipo de torneo (FE #791)', () => {
  it('A1: el tipo y la modalidad llegan a la pantalla', () => {
    const dto = loQueLlegaALaPantalla(
      respuestaDeLaApi({ tournament_type: 'RYDER_CUP', modality: 'MATCH_PLAY', setup_mode: 'MANUAL' })
    );

    expect(dto.tournamentType).toBe('RYDER_CUP');
    expect(dto.modality).toBe('MATCH_PLAY');
    expect(dto.hasTeams).toBe(true);
  });

  it('A2: una respuesta de antes del tipo es una Ryder Cup de match play', () => {
    const dto = loQueLlegaALaPantalla(respuestaDeLaApi());

    expect(dto.tournamentType).toBe('RYDER_CUP');
    expect(dto.modality).toBe('MATCH_PLAY');
    expect(dto.setupMode).toBe('RYDER_CUP');
  });

  it('A3: un Stableford no se inventa el modo de montaje de la Ryder', () => {
    const dto = loQueLlegaALaPantalla(
      respuestaDeLaApi({ tournament_type: 'STABLEFORD', modality: 'STROKE_PLAY', setup_mode: null })
    );

    expect(dto.tournamentType).toBe('STABLEFORD');
    expect(dto.modality).toBe('STROKE_PLAY');
    expect(dto.setupMode).toBeNull();
  });

  it('A4: un Stableford llega sin equipos ni reparto inventados', () => {
    const dto = loQueLlegaALaPantalla(
      respuestaDeLaApi({
        tournament_type: 'STABLEFORD',
        modality: 'STROKE_PLAY',
        team_1_name: null,
        team_2_name: null,
        team_assignment: null,
        setup_mode: null,
      })
    );

    expect(dto.team1Name).toBeNull();
    expect(dto.team2Name).toBeNull();
    expect(dto.teamAssignment).toBeNull();
    expect(dto.hasTeams).toBe(false);
  });

  it('A5: una Ryder de antes sin nombres sigue con «Team 1» y «Team 2»', () => {
    const dto = loQueLlegaALaPantalla(respuestaDeLaApi());

    expect([dto.team1Name, dto.team2Name]).toEqual(['Team 1', 'Team 2']);
    expect(dto.teamAssignment).toBe('MANUAL');
  });
});
