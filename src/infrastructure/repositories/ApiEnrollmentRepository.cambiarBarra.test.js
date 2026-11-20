import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApiEnrollmentRepository from './ApiEnrollmentRepository';

vi.mock('../http/api.js', async () => ({
  segmento: (await vi.importActual('../http/rutaDeLaApi')).segmento,
  default: vi.fn(),
}));

import apiRequest from '../http/api.js';

/**
 * Cambiar la barra de una inscripción (FE #1214, RyderCupAm#912):
 * PUT /enrollments/{id}/tee con el color, o null para volver a la de por
 * defecto. Vuelve la barra que quedó.
 */
describe('ApiEnrollmentRepository · cambiar la barra', () => {
  beforeEach(() => vi.clearAllMocks());

  it('manda el color y devuelve la barra que quedó', async () => {
    apiRequest.mockResolvedValue({ id: 'e1', tee_color: 'RED' });

    const hecho = await new ApiEnrollmentRepository().changeTee('e1', 'RED');

    const [ruta, opciones] = apiRequest.mock.calls[0];
    expect(ruta).toBe('/api/v1/enrollments/e1/tee');
    expect(opciones.method).toBe('PUT');
    expect(JSON.parse(opciones.body)).toEqual({ tee_color: 'RED' });
    expect(hecho).toEqual({ id: 'e1', teeColor: 'RED' });
  });

  it('con null vuelve a la de por defecto', async () => {
    apiRequest.mockResolvedValue({ id: 'e1', tee_color: null });

    const hecho = await new ApiEnrollmentRepository().changeTee('e1', null);

    expect(JSON.parse(apiRequest.mock.calls[0][1].body)).toEqual({
      tee_color: null,
    });
    expect(hecho).toEqual({ id: 'e1', teeColor: null });
  });

  it('un rechazo sale tal cual, con su código', async () => {
    const error = Object.assign(new Error('409'), {
      status: 409,
      errorCode: 'TEE_CHANGE_CLOSED',
    });
    apiRequest.mockRejectedValue(error);

    await expect(
      new ApiEnrollmentRepository().changeTee('e1', 'RED'),
    ).rejects.toBe(error);
  });
});
