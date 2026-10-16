import { describe, it, expect } from 'vitest';
import HoleSampleMapper from './HoleSampleMapper';

/**
 * Las muestras de hoyo entre la API y el dominio (BE #532, marcado por par).
 *
 * | Caso | Qué llega                                      | Qué sale                                   |
 * |------|------------------------------------------------|--------------------------------------------|
 * | S1   | 18 hoyos, uno con primera muestra              | por número de hoyo, puntos en { lat, lon } |
 * | S1   | `first_sample: null`                           | `primera: null`                            |
 * | S2   | `collecting` que falta o no es booleano         | `recoge: true` (lo que no se sabe, recoge) |
 * | S2   | una primera muestra rota (sin green)            | `primera: null`                            |
 * | S2   | un hoyo sin número válido, o algo que no es lista | se salta / vacío                         |
 * | S3   | la muestra del jugador                          | el cuerpo del POST, puntos con nombre      |
 */

const P = (latitude, longitude) => ({ latitude, longitude });
const PRIMERA = { tee: P(36.28, -5.33), bends: [P(36.2815, -5.331)], green_center: P(36.2827, -5.33) };

describe('HoleSampleMapper', () => {
  it('S1: de la API al dominio, por hoyo y con { lat, lon }', () => {
    const api = Array.from({ length: 18 }, (_, i) => ({ hole_number: i + 1, first_sample: null, collecting: true }));
    api[2] = { hole_number: 3, first_sample: PRIMERA, collecting: false };

    const muestras = HoleSampleMapper.toDomain(api);

    expect(Object.keys(muestras)).toHaveLength(18);
    expect(muestras[3]).toEqual({
      primera: { tee: { lat: 36.28, lon: -5.33 }, bends: [{ lat: 36.2815, lon: -5.331 }], greenCenter: { lat: 36.2827, lon: -5.33 } },
      recoge: false,
    });
    expect(muestras[1]).toEqual({ primera: null, recoge: true });
  });

  it('S2: lo que no se sabe de un hoyo es «sin primera y recogiendo»', () => {
    const muestras = HoleSampleMapper.toDomain([
      { hole_number: 1, first_sample: null },
      { hole_number: 2, first_sample: { tee: P(1, 2), bends: [] }, collecting: 'no' },
      { hole_number: 4, first_sample: { ...PRIMERA, bends: undefined }, collecting: true },
    ]);

    expect(muestras[1]).toEqual({ primera: null, recoge: true });
    expect(muestras[2]).toEqual({ primera: null, recoge: true });
    expect(muestras[4].primera.bends).toEqual([]);
  });

  it('S2: sin salida, la primera muestra no vale (el servidor siempre la pide)', () => {
    expect(HoleSampleMapper.toDomain([{ hole_number: 5, first_sample: { ...PRIMERA, tee: null }, collecting: true }])[5].primera).toBeNull();
  });

  it('S2: un hoyo sin número válido se salta, y lo que no es lista es vacío', () => {
    expect(HoleSampleMapper.toDomain([{ hole_number: 'x', first_sample: PRIMERA }, null, { first_sample: PRIMERA }])).toEqual({});
    expect(HoleSampleMapper.toDomain(null)).toEqual({});
    expect(HoleSampleMapper.toDomain({ hole_number: 1 })).toEqual({});
  });

  it('S3: del dominio al cuerpo del POST', () => {
    expect(
      HoleSampleMapper.toApi({ tee: { lat: 36.28, lon: -5.33 }, bends: [{ lat: 36.2815, lon: -5.331 }], greenCenter: { lat: 36.2827, lon: -5.33 } }),
    ).toEqual(PRIMERA);
  });

  it('S3: sin codos, lista vacía', () => {
    expect(HoleSampleMapper.toApi({ tee: { lat: 1, lon: 2 }, greenCenter: { lat: 3, lon: 4 } }).bends).toEqual([]);
  });
});
