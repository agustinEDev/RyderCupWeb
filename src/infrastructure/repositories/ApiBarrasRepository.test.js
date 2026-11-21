import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApiBarrasRepository from './ApiBarrasRepository';

vi.mock('../http/api.js', async () => ({
  segmento: (await vi.importActual('../http/rutaDeLaApi')).segmento,
  default: vi.fn(),
}));

import apiRequest from '../http/api.js';

const cuerpo = () => JSON.parse(apiRequest.mock.calls[0][1].body);
const ruta = () => apiRequest.mock.calls[0][0];
const metodo = () => apiRequest.mock.calls[0][1]?.method;

/**
 * Las barras de una inscripción (RyderCupAm#912 y barras por campo): la
 * general, la de cada campo y la de un campo para un género.
 */
describe('ApiBarrasRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('la general: PUT con el color, y null vuelve a la habitual', async () => {
    apiRequest.mockResolvedValue({ id: 'e1', tee_color: 'RED' });
    expect(await new ApiBarrasRepository().changeTee('e1', 'RED')).toEqual({
      id: 'e1',
      teeColor: 'RED',
    });
    expect(ruta()).toBe('/api/v1/enrollments/e1/tee');
    expect(metodo()).toBe('PUT');
    expect(cuerpo()).toEqual({ tee_color: 'RED' });
  });

  it('las de una inscripción, campo a campo', async () => {
    apiRequest.mockResolvedValue({
      general_tee: 'YELLOW',
      default_tee: 'RED',
      courses: [
        {
          golf_course_id: 'g1',
          golf_course_name: 'Aldeamayor',
          tee: null,
          source: 'NONE',
          options: ['BLUE', 'RED'],
        },
      ],
    });
    expect(await new ApiBarrasRepository().getTees('e1')).toEqual({
      generalTee: 'YELLOW',
      defaultTee: 'RED',
      courses: [
        {
          golfCourseId: 'g1',
          golfCourseName: 'Aldeamayor',
          tee: null,
          source: 'NONE',
          options: ['BLUE', 'RED'],
        },
      ],
    });
    expect(ruta()).toBe('/api/v1/enrollments/e1/tees');
  });

  it('las de una inscripción sin campos ni opciones: listas vacías', async () => {
    apiRequest.mockResolvedValue({ general_tee: null, default_tee: null });
    expect(await new ApiBarrasRepository().getTees('e1')).toEqual({
      generalTee: null,
      defaultTee: null,
      courses: [],
    });
  });

  it('la de un campo: PUT por campo, null la quita', async () => {
    apiRequest.mockResolvedValue({ tee_color: null });
    expect(
      await new ApiBarrasRepository().changeCourseTee('e1', 'g1', null),
    ).toEqual({ teeColor: null });
    expect(ruta()).toBe('/api/v1/enrollments/e1/courses/g1/tee');
    expect(metodo()).toBe('PUT');
    expect(cuerpo()).toEqual({ tee_color: null });
  });

  it('la de un campo para un género: PUT de la competición', async () => {
    apiRequest.mockResolvedValue({ gender: 'FEMALE', tee_color: 'RED' });
    expect(
      await new ApiBarrasRepository().setCourseTee('c1', 'g1', 'FEMALE', 'RED'),
    ).toEqual({ gender: 'FEMALE', teeColor: 'RED' });
    expect(ruta()).toBe('/api/v1/competitions/c1/courses/g1/tee');
    expect(cuerpo()).toEqual({ gender: 'FEMALE', tee_color: 'RED' });
  });

  it('un rechazo sale tal cual, con su código', async () => {
    const error = Object.assign(new Error('409'), {
      status: 409,
      errorCode: 'TEE_CHANGE_CLOSED',
    });
    apiRequest.mockRejectedValue(error);
    await expect(new ApiBarrasRepository().changeTee('e1', 'RED')).rejects.toBe(
      error,
    );
  });
});
