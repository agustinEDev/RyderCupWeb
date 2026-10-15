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

describe('ApiGolfCourseRepository — marcas de hoyo (PR C)', () => {
  beforeEach(() => vi.clearAllMocks());

  const MARCA = {
    tee: { lat: 36.28, lon: -5.33 },
    bends: [],
    greenCenter: { lat: 36.2827, lon: -5.33 },
    markedAt: '2026-10-15T08:05:00.000Z',
  };
  const RESPUESTA = {
    hole_number: 3,
    tee: { latitude: 36.28, longitude: -5.33 },
    bends: [],
    green_center: { latitude: 36.2827, longitude: -5.33 },
    marked_at: '2026-10-15T08:05:00Z',
  };

  it('guardar es un PUT al hoyo con el cuerpo de la API, y devuelve la que queda', async () => {
    apiRequest.mockResolvedValue(RESPUESTA);

    const guardada = await new ApiGolfCourseRepository().saveHoleMark('gc-1', 3, MARCA);

    expect(apiRequest).toHaveBeenCalledWith('/api/v1/golf-courses/gc-1/hole-map/marks/3', {
      method: 'PUT',
      body: JSON.stringify({
        tee: { latitude: 36.28, longitude: -5.33 },
        bends: [],
        green_center: { latitude: 36.2827, longitude: -5.33 },
        marked_at: '2026-10-15T08:05:00.000Z',
      }),
      topeMs: 15000,
    });
    expect(guardada.holeNumber).toBe(3);
    expect(guardada.greenCenter).toEqual({ lat: 36.2827, lon: -5.33 });
  });

  it('las mías, traducidas', async () => {
    apiRequest.mockResolvedValue([RESPUESTA, { ...RESPUESTA, hole_number: 5, tee: null }]);

    const mias = await new ApiGolfCourseRepository().getMyHoleMarks('gc-1');

    expect(apiRequest).toHaveBeenCalledWith('/api/v1/golf-courses/gc-1/hole-map/marks/mine', { topeMs: 15000 });
    expect(mias.map((m) => [m.holeNumber, m.tee])).toEqual([
      [3, { lat: 36.28, lon: -5.33 }],
      [5, null],
    ]);
  });

  it('un 2xx que no se entiende vale como guardada la enviada (si no, se reenviaría siempre)', async () => {
    apiRequest.mockResolvedValue(null);

    expect(await new ApiGolfCourseRepository().saveHoleMark('gc-1', 3, MARCA)).toBe(MARCA);
  });

  it('los fallos se propagan (los decide quien guarda)', async () => {
    apiRequest.mockImplementation(async () => {
      throw Object.assign(new Error('x'), { status: 409, errorCode: 'HOLE_ALREADY_MAPPED' });
    });

    await expect(new ApiGolfCourseRepository().saveHoleMark('gc-1', 3, MARCA)).rejects.toMatchObject({ errorCode: 'HOLE_ALREADY_MAPPED' });
  });
});
