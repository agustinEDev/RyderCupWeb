import { describe, it, expect } from 'vitest';
import CompetitionAssembler from './CompetitionAssembler';
import CompetitionMapper from '../../infrastructure/mappers/CompetitionMapper';

/**
 * El plazo de inscripción llega a la pantalla (15 nov 2026; RyderCupAm #865),
 * por el camino real: respuesta → mapper → assembler.
 *
 *   caso                                  | qué llega
 *   --------------------------------------|---------------------------------------------
 *   A1 con los tres campos                | tal cual: el instante con su desfase y los dos sí/no
 *   A2 un backend sin ellos               | sin plazo, no vale y no lo cerró el plazo
 *   A3 sí/no que no son booleanos         | falsos
 */
const respuestaDeLaApi = (extra = {}) => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  creator_id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Ryder de los amigos',
  start_date: '2027-06-01',
  end_date: '2027-06-03',
  country_code: 'ES',
  play_mode: 'SCRATCH',
  number_of_players: 12,
  team_assignment: 'AUTOMATIC',
  status: 'ACTIVE',
  created_at: '2026-09-20T10:00:00Z',
  updated_at: '2026-09-20T10:00:00Z',
  ...extra,
});

const loQueLlegaALaPantalla = (apiData) =>
  CompetitionAssembler.toSimpleDTO(
    CompetitionMapper.toDomain(apiData),
    apiData,
  );

describe('CompetitionAssembler · el plazo de inscripción', () => {
  it('A1: Given los tres campos, When llega, Then pasan tal cual', () => {
    const dto = loQueLlegaALaPantalla(
      respuestaDeLaApi({
        enrollment_deadline: '2027-05-31T12:00:00+02:00',
        enrollment_deadline_applies: true,
        enrollment_closed_by_deadline: true,
      }),
    );

    expect(dto.enrollmentDeadline).toBe('2027-05-31T12:00:00+02:00');
    expect(dto.enrollmentDeadlineApplies).toBe(true);
    expect(dto.enrollmentClosedByDeadline).toBe(true);
  });

  it('A2: Given un backend sin ellos, When llega, Then sin plazo y en falso', () => {
    const dto = loQueLlegaALaPantalla(respuestaDeLaApi());

    expect(dto.enrollmentDeadline).toBeNull();
    expect(dto.enrollmentDeadlineApplies).toBe(false);
    expect(dto.enrollmentClosedByDeadline).toBe(false);
  });

  it('A3: Given sí/no que no son booleanos, When llega, Then en falso', () => {
    const dto = loQueLlegaALaPantalla(
      respuestaDeLaApi({
        enrollment_deadline_applies: 'true',
        enrollment_closed_by_deadline: 1,
      }),
    );

    expect(dto.enrollmentDeadlineApplies).toBe(false);
    expect(dto.enrollmentClosedByDeadline).toBe(false);
  });
});
