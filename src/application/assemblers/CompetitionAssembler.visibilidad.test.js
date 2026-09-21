import { describe, it, expect } from 'vitest';
import CompetitionAssembler from './CompetitionAssembler';
import CompetitionMapper from '../../infrastructure/mappers/CompetitionMapper';

/**
 * El camino REAL, de punta a punta (FE #664).
 *
 * La pantalla no habla con la entidad: recibe el DTO que arma este assembler.
 * Un campo que el mapper trae pero el assembler no copia no existe para la
 * aplicación — y como las pantallas se prueban con el caso de uso mockeado, el
 * hueco no lo ve nadie: los tests pasan en verde con el detalle enseñando lo
 * contrario de lo que el torneo es.
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
  status: 'DRAFT',
  created_at: '2026-09-20T10:00:00Z',
  updated_at: '2026-09-20T10:00:00Z',
  ...extra,
});

const loQueLlegaALaPantalla = (apiData) =>
  CompetitionAssembler.toSimpleDTO(CompetitionMapper.toDomain(apiData), apiData);

describe('CompetitionAssembler · la visibilidad llega a la pantalla (FE #664)', () => {
  it('una pública llega como pública', () => {
    const dto = loQueLlegaALaPantalla(respuestaDeLaApi({ visibility: 'PUBLIC' }));

    expect(dto.visibility).toBe('PUBLIC');
  });

  it('y una privada, como privada', () => {
    const dto = loQueLlegaALaPantalla(respuestaDeLaApi({ visibility: 'PRIVATE' }));

    expect(dto.visibility).toBe('PRIVATE');
  });

  it('sin el campo, privada: no se anuncia como abierta lo que no lo es', () => {
    const dto = loQueLlegaALaPantalla(respuestaDeLaApi());

    expect(dto.visibility).toBe('PRIVATE');
  });
});

describe('CompetitionAssembler · la apertura programada llega a la pantalla (FE #678)', () => {
  // Sin esto la ficha de una programada no puede decir cuándo abre: el dato
  // existe en la respuesta y se perdía por el camino, como la visibilidad
  it('A1: los días de antelación llegan tal cual', () => {
    const dto = loQueLlegaALaPantalla(respuestaDeLaApi({ enrollment_opens_days_before: 5 }));

    expect(dto.enrollmentOpensDaysBefore).toBe(5);
  });

  it('A2: sin el campo, no está programada', () => {
    const dto = loQueLlegaALaPantalla(respuestaDeLaApi());

    expect(dto.enrollmentOpensDaysBefore).toBeNull();
  });

  it('A3: y con el campo a null, tampoco', () => {
    const dto = loQueLlegaALaPantalla(respuestaDeLaApi({ enrollment_opens_days_before: null }));

    expect(dto.enrollmentOpensDaysBefore).toBeNull();
  });
});
