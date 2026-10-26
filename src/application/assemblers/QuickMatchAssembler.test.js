import { describe, it, expect } from 'vitest';
import QuickMatchAssembler from './QuickMatchAssembler';
import QuickMatchMapper from '../../infrastructure/mappers/QuickMatchMapper';

/**
 * La fila de «Mis partidas rápidas» (H5, 25 oct 2026). La lista no recibe
 * entidades: pasa por `toSimpleDTO`, que se guarda en localStorage para verla
 * sin conexión. Sin `playedAt` aquí, la pantalla seguía con la fecha de
 * creación aunque el backend la mandara (revisor sin contexto).
 */
const deLaApi = (extra = {}) =>
  QuickMatchMapper.toDomain({
    id: 'qm-1',
    creator_id: 'user-1',
    golf_course_id: 'course-1',
    match_format: 'SINGLES',
    status: 'COMPLETED',
    participants: [],
    scorer_ids: [],
    created_at: '2026-10-15T18:00:00Z',
    updated_at: '2026-10-21T23:00:00Z',
    ...extra,
  });

describe('QuickMatchAssembler.toSimpleDTO · la fecha de juego', () => {
  it('H5: lleva playedAt en ISO, que sobrevive al guardarse como JSON', () => {
    const dto = QuickMatchAssembler.toSimpleDTO(deLaApi({ played_at: '2026-10-21T22:30:00Z' }));

    expect(dto.playedAt).toBe('2026-10-21T22:30:00.000Z');
    expect(new Date(JSON.parse(JSON.stringify(dto)).playedAt).toISOString()).toBe('2026-10-21T22:30:00.000Z');
  });

  it('H5: con un backend viejo (sin played_at), nulo y la pantalla usa la de creación', () => {
    expect(QuickMatchAssembler.toSimpleDTO(deLaApi()).playedAt).toBeNull();
  });
});
