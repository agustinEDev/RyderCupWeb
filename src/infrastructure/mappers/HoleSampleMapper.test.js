import { describe, it, expect } from 'vitest';
import HoleSampleMapper from './HoleSampleMapper';

/**
 * Las muestras de hoyo entre la API y el dominio (BE #575, 17 oct: una
 * referencia por hoyo).
 *
 * | Caso | Qué llega                                           | Qué sale                                              |
 * |------|-----------------------------------------------------|-------------------------------------------------------|
 * | S1   | un hoyo con su primera completa y un green suelto   | por hoyo `{ primera, green, recoge }`, en { lat, lon } |
 * | S1   | un hoyo sin muestras                                | `{ primera: null, green: null, recoge: true }`        |
 * | S2   | `collecting` que falta o no es booleano             | `recoge: true`                                        |
 * | S2   | una primera rota (sin salida o sin green), un green roto | `null`                                           |
 * | S2   | un hoyo sin número, o lo que no es lista            | se salta / vacío                                      |
 * | S3   | la muestra del jugador, con su id y su barra        | el cuerpo del POST                                    |
 * | S3   | una solo green                                      | `tee: null` y sin codos                               |
 */

const P = (latitude, longitude) => ({ latitude, longitude });
const PRIMERA = { tee: P(36.28, -5.33), bends: [P(36.2815, -5.331)], green_center: P(36.2827, -5.33) };
const PRIMERA_DOMINIO = { tee: { lat: 36.28, lon: -5.33 }, bends: [{ lat: 36.2815, lon: -5.331 }], greenCenter: { lat: 36.2827, lon: -5.33 } };
const VACIO = { primera: null, green: null, recoge: true };

describe('HoleSampleMapper', () => {
  it('S1: de la API al dominio, por hoyo: su primera completa, su green suelto y si recoge', () => {
    const api = Array.from({ length: 18 }, (_, i) => ({ hole_number: i + 1, first_sample: null, first_green: null, collecting: true, tees: [] }));
    api[2] = { hole_number: 3, first_sample: PRIMERA, first_green: P(36.283, -5.33), collecting: false, tees: [] };

    const resumen = HoleSampleMapper.toDomain(api);

    expect(Object.keys(resumen)).toHaveLength(18);
    expect(resumen[3]).toEqual({ primera: PRIMERA_DOMINIO, green: { lat: 36.283, lon: -5.33 }, recoge: false });
    expect(resumen[1]).toEqual(VACIO);
  });

  it('S2: lo que no se sabe de un hoyo es «sin muestra y recogiendo»', () => {
    const resumen = HoleSampleMapper.toDomain([
      { hole_number: 1 },
      { hole_number: 2, first_sample: { tee: P(1, 2), bends: [] }, first_green: { latitude: 'x' }, collecting: 'no' },
      { hole_number: 3, first_sample: { ...PRIMERA, tee: null }, collecting: true },
      { hole_number: 4, first_sample: { ...PRIMERA, bends: undefined }, collecting: true },
    ]);

    expect(resumen).toEqual({ 1: VACIO, 2: VACIO, 3: VACIO, 4: { ...VACIO, primera: { ...PRIMERA_DOMINIO, bends: [] } } });
  });

  it('S2: un hoyo sin número válido se salta, y lo que no es lista es vacío', () => {
    expect(HoleSampleMapper.toDomain([{ hole_number: 'x' }, null, {}])).toEqual({});
    expect(HoleSampleMapper.toDomain(null)).toEqual({});
    expect(HoleSampleMapper.toDomain({ hole_number: 1 })).toEqual({});
  });

  it('S3: del dominio al cuerpo del POST, con el id y la barra', () => {
    expect(
      HoleSampleMapper.toApi({ id: 'm-1', barra: { color: 'YELLOW', gender: 'MALE' }, ...PRIMERA_DOMINIO }),
    ).toEqual({ id: 'm-1', tee_color: 'YELLOW', tee_gender: 'MALE', ...PRIMERA });
  });

  it('S3: sin género, null; sin codos, lista vacía', () => {
    const cuerpo = HoleSampleMapper.toApi({ id: 'm-1', barra: { color: 'RED' }, tee: { lat: 1, lon: 2 }, greenCenter: { lat: 3, lon: 4 } });

    expect(cuerpo.tee_gender).toBeNull();
    expect(cuerpo.bends).toEqual([]);
  });

  it('S3: una solo green (17 oct) va sin salida y sin codos', () => {
    const cuerpo = HoleSampleMapper.toApi({ id: 'm-1', barra: { color: 'RED' }, tee: null, bends: [], greenCenter: { lat: 3, lon: 4 } });

    expect(cuerpo).toEqual({ id: 'm-1', tee_color: 'RED', tee_gender: null, tee: null, bends: [], green_center: P(3, 4) });
  });
});
