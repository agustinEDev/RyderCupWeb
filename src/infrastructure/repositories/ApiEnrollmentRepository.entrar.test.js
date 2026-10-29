import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApiEnrollmentRepository from './ApiEnrollmentRepository';

vi.mock('../../services/api.js', () => ({ default: vi.fn() }));

import apiRequest from '../../services/api.js';

/**
 * Apuntarse a una pública (release social 3, 28 oct 2026): la franja y la espera
 * van con sus nombres de la API, y vuelve si entró con plaza o esperando.
 */
describe('ApiEnrollmentRepository · apuntarse', () => {
  beforeEach(() => vi.clearAllMocks());

  it('manda la barra, la franja y la espera, y devuelve si espera', async () => {
    apiRequest.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      competition_id: '22222222-2222-4222-8222-222222222222',
      user_id: '33333333-3333-4333-8333-333333333333',
      status: 'APPROVED',
      created_at: '2027-01-01T00:00:00Z',
      round_id: 'r1',
      waiting: true,
    });

    const hecho = await new ApiEnrollmentRepository().requestEnrollment('c1', {
      color: 'WHITE',
      roundId: 'r1',
      waitingList: true,
    });

    const [ruta, opciones] = apiRequest.mock.calls[0];
    expect(ruta).toBe('/api/v1/competitions/c1/enrollments');
    expect(JSON.parse(opciones.body)).toEqual({
      tee_color: 'WHITE',
      round_id: 'r1',
      waiting_list: true,
    });
    expect(hecho.enrollment.status.toString()).toBe('APPROVED');
    expect(hecho.roundId).toBe('r1');
    expect(hecho.waiting).toBe(true);
  });

  it('sin franja no manda nada de franjas', async () => {
    apiRequest.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      competition_id: '22222222-2222-4222-8222-222222222222',
      user_id: '33333333-3333-4333-8333-333333333333',
      status: 'APPROVED',
      created_at: '2027-01-01T00:00:00Z',
    });

    const hecho = await new ApiEnrollmentRepository().requestEnrollment('c1', {});

    expect(JSON.parse(apiRequest.mock.calls[0][1].body)).toEqual({});
    expect(hecho.waiting).toBe(false);
    expect(hecho.roundId).toBeNull();
  });
});
