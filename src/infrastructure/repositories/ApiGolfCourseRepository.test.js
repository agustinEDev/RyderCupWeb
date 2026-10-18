// src/infrastructure/repositories/ApiGolfCourseRepository.test.js

import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApiGolfCourseRepository from './ApiGolfCourseRepository';
import apiRequest from '../../services/api.js';

vi.mock('../../services/api.js', () => ({
  default: vi.fn(),
}));

const COURSE = {
  id: 'course-1',
  name: 'Real Club de Golf',
  country_code: 'ES',
  course_type: 'STANDARD_18',
  approval_status: 'APPROVED',
  total_par: 72,
  tees: [],
};

/** Devuelve la URL con la que se llamó a la API. */
const calledUrl = () => apiRequest.mock.calls[0][0];

/** Devuelve los parámetros de esa URL. */
const calledParams = () => new URLSearchParams(calledUrl().split('?')[1] ?? '');

describe('ApiGolfCourseRepository.list', () => {
  let repository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new ApiGolfCourseRepository();
    apiRequest.mockResolvedValue({ golf_courses: [COURSE], count: 1, total: 1 });
  });

  it('devuelve los campos junto al total que cumple el filtro', async () => {
    apiRequest.mockResolvedValue({ golf_courses: [COURSE], count: 1, total: 802 });

    const page = await repository.list();

    expect(page.courses).toHaveLength(1);
    expect(page.courses[0].name).toBe('Real Club de Golf');
    // El total no son los devueltos: es lo que permite saber que hay más
    expect(page.total).toBe(802);
  });

  it('manda el nombre para que filtre la base de datos', async () => {
    await repository.list({ name: 'Real Club' });

    expect(calledParams().get('name')).toBe('Real Club');
  });

  it('manda el límite y el desplazamiento al paginar', async () => {
    await repository.list({ limit: 20, offset: 40 });

    expect(calledParams().get('limit')).toBe('20');
    expect(calledParams().get('offset')).toBe('40');
  });

  it('no manda nada cuando no se filtra', async () => {
    await repository.list();

    expect(calledUrl()).toBe('/api/v1/golf-courses');
  });

  it('no manda el desplazamiento cuando es cero', async () => {
    await repository.list({ limit: 20, offset: 0 });

    expect(calledParams().has('offset')).toBe(false);
  });

  it('manda un límite de cero, que no es lo mismo que no pedir límite', async () => {
    await repository.list({ limit: 0 });

    expect(calledParams().get('limit')).toBe('0');
  });

  it('sigue funcionando si la respuesta no trae total', async () => {
    // Un backend anterior a la paginación no lo devuelve, y la lista no debe
    // quedarse vacía por eso
    apiRequest.mockResolvedValue({ golf_courses: [COURSE, COURSE] });

    const page = await repository.list();

    expect(page.courses).toHaveLength(2);
    expect(page.total).toBe(2);
  });

  it('conserva los filtros que ya existían', async () => {
    await repository.list({ countryCode: 'ES', approvalStatus: 'APPROVED' });

    expect(calledParams().get('country_code')).toBe('ES');
    expect(calledParams().get('approval_status')).toBe('APPROVED');
  });

  it('manda la posición para que el backend ordene por cercanía', async () => {
    await repository.list({ lat: 40.4168, lon: -3.7038 });

    expect(calledParams().get('lat')).toBe('40.4168');
    expect(calledParams().get('lon')).toBe('-3.7038');
  });

  it('manda el radio solo cuando se pide', async () => {
    await repository.list({ lat: 40.4168, lon: -3.7038, radiusKm: 50 });

    expect(calledParams().get('radius_km')).toBe('50');
  });

  it('no manda media coordenada, que el backend rechaza con un 400', async () => {
    await repository.list({ lat: 40.4168 });

    expect(calledParams().has('lat')).toBe(false);
  });

  it('no manda el radio sin posición desde la que medirlo', async () => {
    await repository.list({ radiusKm: 50 });

    expect(calledParams().has('radius_km')).toBe(false);
  });

  it('manda el ecuador y Greenwich, que son posiciones válidas', async () => {
    // Con una comprobación por verdadero, el cero se caería
    await repository.list({ lat: 0, lon: 0 });

    expect(calledParams().get('lat')).toBe('0');
    expect(calledParams().get('lon')).toBe('0');
  });
});

describe('ApiGolfCourseRepository.getHoleMap', () => {
  beforeEach(() => vi.clearAllMocks());

  it('pide el mapa del campo y lo traduce', async () => {
    apiRequest.mockResolvedValue({
      golf_course_id: 'gc-1',
      status: 'APPROVED',
      version: 'v1',
      attribution: null,
      holes_needing_green: [],
      geojson: { type: 'FeatureCollection', features: [] },
    });

    const mapa = await new ApiGolfCourseRepository().getHoleMap('gc-1');

    expect(apiRequest).toHaveBeenCalledWith('/api/v1/golf-courses/gc-1/hole-map');
    expect(mapa.version).toBe('v1');
  });

  it('M2: un 404 HOLE_MAP_NOT_FOUND es «sin mapa», no un error', async () => {
    apiRequest.mockImplementation(async () => {
      throw Object.assign(new Error('x'), { status: 404, errorCode: 'HOLE_MAP_NOT_FOUND' });
    });

    expect(await new ApiGolfCourseRepository().getHoleMap('gc-1')).toBeNull();
  });

  it('cualquier otro fallo se propaga', async () => {
    apiRequest.mockImplementation(async () => {
      throw Object.assign(new Error('x'), { status: 500 });
    });

    await expect(new ApiGolfCourseRepository().getHoleMap('gc-1')).rejects.toThrow('x');
  });
});

/**
 * Muestras de hoyo, anónimas y por barra (BE #532, marcado por par).
 *
 * | Caso | Qué                                  | Qué se espera                                          |
 * |------|--------------------------------------|--------------------------------------------------------|
 * | S4   | pedir el resumen                     | GET .../hole-map/samples con tope, por hoyo y barra     |
 * | S5   | enviar una muestra                   | POST .../hole-map/samples/{hoyo} con id, barra y puntos |
 * | S5   | 204 (sin cuerpo), o un 2xx sin JSON  | se resuelve: llegó                                     |
 * | S5   | 404 / 422 / sin red                  | se propaga (lo decide quien envía)                      |
 */
describe('ApiGolfCourseRepository — muestras de hoyo', () => {
  beforeEach(() => vi.clearAllMocks());

  const PUNTOS = { tee: { lat: 36.28, lon: -5.33 }, bends: [], greenCenter: { lat: 36.2827, lon: -5.33 } };
  const MUESTRA = { id: 'm-1', barra: { color: 'YELLOW', gender: 'MALE' }, ...PUNTOS };

  it('S4: el resumen, por hoyo, traducido (17 oct)', async () => {
    apiRequest.mockResolvedValue([
      { hole_number: 1, first_sample: null, first_green: null, collecting: true, tees: [] },
      {
        hole_number: 3,
        first_sample: { tee: { latitude: 36.28, longitude: -5.33 }, bends: [], green_center: { latitude: 36.2827, longitude: -5.33 } },
        first_green: null,
        collecting: false,
        tees: [],
      },
    ]);

    const resumen = await new ApiGolfCourseRepository().getHoleSamples('gc-1');

    expect(apiRequest).toHaveBeenCalledWith('/api/v1/golf-courses/gc-1/hole-map/samples', { topeMs: 15000 });
    expect(resumen).toEqual({
      1: { guardada: null, primera: null, green: null, recoge: true },
      3: { guardada: null, primera: PUNTOS, green: null, recoge: false },
    });
  });

  it('S5: enviar es un POST al hoyo con el id, la barra y los puntos, y el 204 se resuelve', async () => {
    apiRequest.mockResolvedValue(null);

    await expect(new ApiGolfCourseRepository().sendHoleSample('gc-1', 3, MUESTRA)).resolves.toBeUndefined();

    expect(apiRequest).toHaveBeenCalledWith('/api/v1/golf-courses/gc-1/hole-map/samples/3', {
      method: 'POST',
      body: JSON.stringify({
        id: 'm-1',
        tee_color: 'YELLOW',
        tee_gender: 'MALE',
        tee: { latitude: 36.28, longitude: -5.33 },
        bends: [],
        green_center: { latitude: 36.2827, longitude: -5.33 },
      }),
      topeMs: 15000,
    });
  });

  it('S5: un 2xx con un cuerpo que no es JSON (un proxy, un portal) también llegó', async () => {
    apiRequest.mockRejectedValue(new SyntaxError('Unexpected token e in JSON'));

    await expect(new ApiGolfCourseRepository().sendHoleSample('gc-1', 3, MUESTRA)).resolves.toBeUndefined();
  });

  it.each([
    [404, 'GOLF_COURSE_NOT_FOUND'],
    [422, 'HOLE_NOT_IN_COURSE'],
  ])('S5: un %i %s se propaga', async (status, errorCode) => {
    apiRequest.mockRejectedValue(Object.assign(new Error('x'), { status, errorCode }));

    await expect(new ApiGolfCourseRepository().sendHoleSample('gc-1', 3, MUESTRA)).rejects.toMatchObject({ errorCode });
  });

  it('S4: los fallos del resumen se propagan (lo decide quien lo pide)', async () => {
    apiRequest.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(new ApiGolfCourseRepository().getHoleSamples('gc-1')).rejects.toThrow('Failed to fetch');
  });
});


describe('ApiGolfCourseRepository — reportar un hoyo (entrega 7)', () => {
  beforeEach(() => vi.clearAllMocks());
  const REPORTE = { id: 'r-1', reason: 'HOLE_CHANGED', tee: { lat: 36.28, lon: -5.33 }, bends: [{ lat: 36.2815, lon: -5.331 }], greenCenter: { lat: 36.2827, lon: -5.33 } };

  it('es un POST al hoyo con el id, el motivo y la línea propuesta, y el 204 se resuelve', async () => {
    apiRequest.mockResolvedValue(null);

    await expect(new ApiGolfCourseRepository().sendHoleReport('gc-1', 3, REPORTE)).resolves.toBeUndefined();

    expect(apiRequest).toHaveBeenCalledWith('/api/v1/golf-courses/gc-1/hole-map/reports/3', {
      method: 'POST',
      body: JSON.stringify({
        id: 'r-1',
        reason: 'HOLE_CHANGED',
        tee: { latitude: 36.28, longitude: -5.33 },
        bends: [{ latitude: 36.2815, longitude: -5.331 }],
        green_center: { latitude: 36.2827, longitude: -5.33 },
      }),
      topeMs: 15000,
    });
  });

  it('un 2xx con un cuerpo que no es JSON también llegó', async () => {
    apiRequest.mockRejectedValue(new SyntaxError('Unexpected token'));

    await expect(new ApiGolfCourseRepository().sendHoleReport('gc-1', 3, REPORTE)).resolves.toBeUndefined();
  });

  it('un 422 se propaga', async () => {
    apiRequest.mockRejectedValue(Object.assign(new Error('x'), { status: 422, errorCode: 'HOLE_NOT_IN_COURSE' }));

    await expect(new ApiGolfCourseRepository().sendHoleReport('gc-1', 3, REPORTE)).rejects.toMatchObject({ errorCode: 'HOLE_NOT_IN_COURSE' });
  });
});


describe('ApiGolfCourseRepository — revisar hoyos (admin, BE #575)', () => {
  beforeEach(() => apiRequest.mockReset());

  it('la lista y un campo, de sus rutas de admin', async () => {
    apiRequest.mockResolvedValueOnce({ courses: [{ golf_course_id: 'gc-1', name: 'V', holes: [] }] });
    apiRequest.mockResolvedValueOnce({ golf_course_id: 'gc-1', name: 'V', holes: [] });
    const repo = new ApiGolfCourseRepository();

    expect(await repo.listHoleReviews()).toEqual([{ golfCourseId: 'gc-1', name: 'V', holes: [] }]);
    expect(await repo.getHoleReview('gc-1')).toEqual({ golfCourseId: 'gc-1', name: 'V', ubicacion: null, holes: [] });
    expect(apiRequest.mock.calls.map((c) => c[0])).toEqual([
      '/api/v1/golf-courses/admin/hole-reviews',
      '/api/v1/golf-courses/admin/gc-1/hole-reviews',
    ]);
  });

  it('guardar es un PUT con la línea; reabrir y borrar, DELETE', async () => {
    apiRequest.mockResolvedValue(null);
    const repo = new ApiGolfCourseRepository();

    await repo.saveHoleLine('gc-1', 3, { tee: { lat: 1, lon: 2 }, bends: [], greenCenter: { lat: 3, lon: 4 } });
    await repo.reopenHole('gc-1', 3);
    await repo.deleteHoleSample('gc-1', 's-1');

    const [[guardar, opciones], [reabrir, deReabrir], [borrar, deBorrar]] = apiRequest.mock.calls;
    expect([guardar, opciones.method]).toEqual(['/api/v1/golf-courses/admin/gc-1/hole-lines/3', 'PUT']);
    expect(JSON.parse(opciones.body)).toEqual({ tee: { latitude: 1, longitude: 2 }, bends: [], green_center: { latitude: 3, longitude: 4 } });
    expect([reabrir, deReabrir.method]).toEqual(['/api/v1/golf-courses/admin/gc-1/hole-lines/3', 'DELETE']);
    expect([borrar, deBorrar.method]).toEqual(['/api/v1/golf-courses/admin/gc-1/hole-samples/s-1', 'DELETE']);
  });
});
