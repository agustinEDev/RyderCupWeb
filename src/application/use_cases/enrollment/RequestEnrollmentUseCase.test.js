import { describe, it, expect, vi } from 'vitest';
import RequestEnrollmentUseCase from './RequestEnrollmentUseCase';
import EnrollmentMapper from '../../../infrastructure/mappers/EnrollmentMapper';

/**
 * Apuntarse a una pública entra directamente (release social 3, 28 oct 2026):
 * la franja o su espera viajan en la petición, y la respuesta dice si entró
 * con plaza o esperando.
 */
const inscripcion = () =>
  EnrollmentMapper.toDomain({
    id: '11111111-1111-4111-8111-111111111111',
    competition_id: '22222222-2222-4222-8222-222222222222',
    user_id: '33333333-3333-4333-8333-333333333333',
    status: 'APPROVED',
    created_at: '2027-01-01T00:00:00Z',
    updated_at: '2027-01-01T00:00:00Z',
  });

describe('RequestEnrollmentUseCase · inscripción directa', () => {
  it('manda la franja y la espera, y dice si entró esperando', async () => {
    const repo = {
      requestEnrollment: vi.fn().mockResolvedValue({
        enrollment: inscripcion(),
        roundId: 'r1',
        waiting: true,
      }),
    };

    const hecho = await new RequestEnrollmentUseCase(repo).execute('c1', null, {
      color: 'WHITE',
      roundId: 'r1',
      waitingList: true,
    });

    expect(repo.requestEnrollment).toHaveBeenCalledWith('c1', {
      color: 'WHITE',
      roundId: 'r1',
      waitingList: true,
    });
    expect(hecho.status).toBe('APPROVED');
    expect(hecho.waiting).toBe(true);
    expect(hecho.roundId).toBe('r1');
  });
});
