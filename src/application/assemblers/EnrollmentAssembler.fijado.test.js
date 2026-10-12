import { describe, it, expect } from 'vitest';
import EnrollmentAssembler from './EnrollmentAssembler';
import EnrollmentMapper from '../../infrastructure/mappers/EnrollmentMapper';

/** D1 (FE #824, PR 5): el hándicap fijado y la categoría, desde el cierre (RyderCupAM#506). */
const api = (extra = {}) => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  competition_id: '550e8400-e29b-41d4-a716-446655440001',
  user_id: '550e8400-e29b-41d4-a716-446655440002',
  status: 'APPROVED',
  created_at: '2030-10-01T10:00:00Z',
  updated_at: '2030-10-01T10:00:00Z',
  user: { id: 'u', display_name: 'Ana', handicap: 14.2 },
  ...extra,
});
const dto = (apiData) => EnrollmentAssembler.toSimpleDTO(EnrollmentMapper.toDomain(apiData), apiData);

describe('EnrollmentAssembler · hándicap fijado y categoría (FE #824)', () => {
  it('desde el cierre, el fijado (llega como texto) y la categoría', () => {
    const d = dto(api({ fixed_handicap: '12.3', category: 2 }));

    expect(d.fixedHandicap).toBe(12.3);
    expect(d.category).toBe(2);
  });

  it('antes del cierre, o en una Ryder, vienen vacíos', () => {
    const d = dto(api({ fixed_handicap: null, category: null }));

    expect(d.fixedHandicap).toBeNull();
    expect(d.category).toBeNull();
  });

  it('un servidor que no los manda, vacíos también', () => {
    const d = dto(api());

    expect(d.fixedHandicap).toBeNull();
    expect(d.category).toBeNull();
  });
});
