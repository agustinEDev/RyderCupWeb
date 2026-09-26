import { describe, it, expect } from 'vitest';
import CompetitionAssembler from './CompetitionAssembler';
import CompetitionMapper from '../../infrastructure/mappers/CompetitionMapper';

/**
 * Cómo se repartieron los equipos DE VERDAD (FE #705).
 *
 * La competición guarda el modo con el que nació —del tipo Ryder sale
 * MANUAL—, así que la ficha enseñaba «Asignación de Equipos: Manual» de unos
 * equipos que los capitanes eligieron uno a uno en la sala de draft. Visto en
 * el Kind el 23 sep.
 */
const respuestaDeLaApi = (extra = {}) => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  creator_id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Ryder de los amigos',
  start_date: '2027-06-01',
  end_date: '2027-06-03',
  country_code: 'ES',
  play_mode: 'HANDICAP',
  number_of_players: 12,
  team_assignment: 'MANUAL',
  status: 'CLOSED',
  created_at: '2026-09-20T10:00:00Z',
  updated_at: '2026-09-20T10:00:00Z',
  ...extra,
});

const loQueLlegaALaPantalla = (apiData) =>
  CompetitionAssembler.toSimpleDTO(CompetitionMapper.toDomain(apiData), apiData);

describe('CompetitionAssembler · el reparto real llega a la pantalla', () => {
  it('R1: el reparto que se hizo va en su propio campo, sin pisar el configurado', () => {
    const dto = loQueLlegaALaPantalla(respuestaDeLaApi({ actual_team_assignment: 'DRAFT' }));

    expect(dto.actualTeamAssignment).toBe('DRAFT');
    expect(dto.teamAssignment).toBe('MANUAL');
  });

  it('R2: sin reparto todavía, no hay reparto real y queda el configurado', () => {
    // Los listados no mandan el campo, y la ficha antes de repartir tampoco
    const dto = loQueLlegaALaPantalla(respuestaDeLaApi());

    expect(dto.actualTeamAssignment).toBeNull();
    expect(dto.teamAssignment).toBe('MANUAL');
  });

  it('R3: una automática rehecha a mano sigue siendo automática', () => {
    // El modo configurado decide si se reparte solo al cerrar: si lo pisara
    // el reparto real, al reabrir y volver a cerrar los que entraron después
    // se quedarían sin equipo
    const dto = loQueLlegaALaPantalla(
      respuestaDeLaApi({ team_assignment: 'AUTOMATIC', actual_team_assignment: 'MANUAL' })
    );

    expect(dto.teamAssignment).toBe('AUTOMATIC');
    expect(dto.actualTeamAssignment).toBe('MANUAL');
  });
});
