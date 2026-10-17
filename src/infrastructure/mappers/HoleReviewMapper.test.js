import { describe, it, expect } from 'vitest';
import HoleReviewMapper from './HoleReviewMapper';

/**
 * Lo que lee y manda el admin para revisar los hoyos (BE #575).
 *
 * | Caso | Qué                                   | Qué sale                                          |
 * |------|---------------------------------------|---------------------------------------------------|
 * | L1   | la lista                              | por campo, sus hoyos con cuántas muestras y si está guardado |
 * | C1   | un campo                              | sus hoyos: línea guardada, muestras (con id, barra y puntos en {lat, lon}) y la tarjeta de cada barra |
 * | C1   | una muestra solo green                | `tee: null`                                       |
 * | G1   | la línea que se guarda                | el cuerpo del PUT                                 |
 */

const P = (latitude, longitude) => ({ latitude, longitude });

describe('HoleReviewMapper', () => {
  it('L1: la lista de campos con hoyos por revisar', () => {
    const lista = HoleReviewMapper.listToDomain({
      courses: [{ golf_course_id: 'gc-1', name: 'Valderrama', holes: [{ hole_number: 1, samples: 2, saved: false }] }],
    });

    expect(lista).toEqual([{ golfCourseId: 'gc-1', name: 'Valderrama', holes: [{ holeNumber: 1, samples: 2 }] }]);
  });

  it('L1: sin lista, vacío', () => {
    expect(HoleReviewMapper.listToDomain(null)).toEqual([]);
  });

  it('C1: un campo, con sus muestras, su línea guardada y la tarjeta de cada barra', () => {
    const campo = HoleReviewMapper.reviewToDomain({
      golf_course_id: 'gc-1',
      name: 'Valderrama',
      holes: [
        {
          hole_number: 1,
          saved_line: { tee: P(1, 2), bends: [P(3, 4)], green_center: P(5, 6) },
          samples: [
            { id: 's-1', tee_color: 'YELLOW', tee_gender: 'MALE', tee: P(1, 2), bends: [], green_center: P(5, 6), received_on: '2026-10-17' },
            { id: 's-2', tee_color: 'RED', tee_gender: null, tee: null, bends: [], green_center: P(5, 7), received_on: '2026-10-17' },
          ],
          tees: [{ tee_color: 'YELLOW', tee_gender: 'MALE', identifier: null, par: 4, meters: 350 }],
        },
      ],
    });

    expect(campo.name).toBe('Valderrama');
    const [uno] = campo.holes;
    expect(uno.guardada).toEqual({ tee: { lat: 1, lon: 2 }, bends: [{ lat: 3, lon: 4 }], greenCenter: { lat: 5, lon: 6 } });
    expect(uno.muestras).toEqual([
      { id: 's-1', barra: { color: 'YELLOW', gender: 'MALE' }, tee: { lat: 1, lon: 2 }, bends: [], greenCenter: { lat: 5, lon: 6 }, llego: '2026-10-17' },
      { id: 's-2', barra: { color: 'RED', gender: null }, tee: null, bends: [], greenCenter: { lat: 5, lon: 7 }, llego: '2026-10-17' },
    ]);
    expect(uno.barras).toEqual([{ color: 'YELLOW', gender: 'MALE', identifier: null, par: 4, metros: 350 }]);
  });

  it('C1: un hoyo sin nada', () => {
    const { holes } = HoleReviewMapper.reviewToDomain({ golf_course_id: 'gc-1', name: 'X', holes: [{ hole_number: 2, saved_line: null, samples: [], tees: [] }] });

    expect(holes[0]).toEqual({ holeNumber: 2, guardada: null, osm: null, muestras: [], barras: [] });
  });

  it('G1: la línea que se guarda, al cuerpo del PUT', () => {
    expect(HoleReviewMapper.lineToApi({ tee: { lat: 1, lon: 2 }, bends: [{ lat: 3, lon: 4 }], greenCenter: { lat: 5, lon: 6 } })).toEqual({
      tee: P(1, 2),
      bends: [P(3, 4)],
      green_center: P(5, 6),
    });
  });
  it('la ubicación del campo, para marcar un hoyo sin nada; sin ella, null (17 oct)', () => {
    expect(HoleReviewMapper.reviewToDomain({ golf_course_id: 'gc-1', name: 'X', location: P(36.28, -5.33), holes: [] }).ubicacion).toEqual({ lat: 36.28, lon: -5.33 });
    expect(HoleReviewMapper.reviewToDomain({ golf_course_id: 'gc-1', name: 'X', location: null, holes: [] }).ubicacion).toBeNull();
    expect(HoleReviewMapper.reviewToDomain({ golf_course_id: 'gc-1', name: 'X', holes: [] }).ubicacion).toBeNull();
  });
  it('T10: la línea de OSM aprobada de cada hoyo, con su green o sin él', () => {
    const { holes } = HoleReviewMapper.reviewToDomain({
      golf_course_id: 'gc-1',
      name: 'X',
      holes: [
        { hole_number: 1, saved_line: null, osm_line: { points: [P(1, 2), P(3, 4)], green_center: P(3, 4) }, samples: [], tees: [] },
        { hole_number: 2, saved_line: null, osm_line: { points: [P(5, 6), P(7, 8)], green_center: null }, samples: [], tees: [] },
        { hole_number: 3, saved_line: null, osm_line: null, samples: [], tees: [] },
      ],
    });

    expect(holes.map((h) => h.osm)).toEqual([
      { puntos: [{ lat: 1, lon: 2 }, { lat: 3, lon: 4 }], green: { lat: 3, lon: 4 } },
      { puntos: [{ lat: 5, lon: 6 }, { lat: 7, lon: 8 }], green: null },
      null,
    ]);
  });
});
