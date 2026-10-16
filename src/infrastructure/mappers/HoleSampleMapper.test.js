import { describe, it, expect } from 'vitest';
import HoleSampleMapper from './HoleSampleMapper';

/**
 * Las muestras de hoyo entre la API y el dominio (BE #532, marcado por par),
 * por barra (color y género).
 *
 * | Caso | Qué llega                                           | Qué sale                                              |
 * |------|-----------------------------------------------------|-------------------------------------------------------|
 * | S1   | un hoyo con dos barras                              | por hoyo, la lista de barras en el mismo orden (la más antigua primero), puntos en { lat, lon } |
 * | S1   | un hoyo sin barras                                  | lista vacía                                           |
 * | S2   | `collecting` que falta o no es booleano              | `recoge: true`                                        |
 * | S2   | una primera muestra rota (sin salida o sin green)    | `primera: null`                                       |
 * | S2   | género que falta                                     | `gender: null`                                        |
 * | S2   | una barra sin color, un hoyo sin número, no-lista    | se salta / vacío                                      |
 * | S3   | la muestra del jugador, con su id y su barra         | el cuerpo del POST                                    |
 */

const P = (latitude, longitude) => ({ latitude, longitude });
const PRIMERA = { tee: P(36.28, -5.33), bends: [P(36.2815, -5.331)], green_center: P(36.2827, -5.33) };
const PRIMERA_DOMINIO = { tee: { lat: 36.28, lon: -5.33 }, bends: [{ lat: 36.2815, lon: -5.331 }], greenCenter: { lat: 36.2827, lon: -5.33 } };

describe('HoleSampleMapper', () => {
  it('S1: de la API al dominio, por hoyo y por barra, en el orden en que llegan', () => {
    const api = Array.from({ length: 18 }, (_, i) => ({ hole_number: i + 1, tees: [] }));
    api[2] = {
      hole_number: 3,
      tees: [
        { tee_color: 'YELLOW', tee_gender: 'MALE', first_sample: PRIMERA, collecting: false },
        { tee_color: 'RED', tee_gender: null, first_sample: PRIMERA, collecting: true },
      ],
    };

    const resumen = HoleSampleMapper.toDomain(api);

    expect(Object.keys(resumen)).toHaveLength(18);
    expect(resumen[3]).toEqual([
      { color: 'YELLOW', gender: 'MALE', primera: PRIMERA_DOMINIO, recoge: false },
      { color: 'RED', gender: null, primera: PRIMERA_DOMINIO, recoge: true },
    ]);
    expect(resumen[1]).toEqual([]);
  });

  it('S2: lo que no se sabe de una barra es «sin primera y recogiendo»', () => {
    const resumen = HoleSampleMapper.toDomain([
      {
        hole_number: 1,
        tees: [
          { tee_color: 'WHITE', first_sample: null },
          { tee_color: 'BLUE', tee_gender: 'FEMALE', first_sample: { tee: P(1, 2), bends: [] }, collecting: 'no' },
          { tee_color: 'RED', tee_gender: 'FEMALE', first_sample: { ...PRIMERA, tee: null }, collecting: true },
          { tee_color: 'YELLOW', tee_gender: 'MALE', first_sample: { ...PRIMERA, bends: undefined }, collecting: true },
        ],
      },
    ]);

    expect(resumen[1]).toEqual([
      { color: 'WHITE', gender: null, primera: null, recoge: true },
      { color: 'BLUE', gender: 'FEMALE', primera: null, recoge: true },
      { color: 'RED', gender: 'FEMALE', primera: null, recoge: true },
      { color: 'YELLOW', gender: 'MALE', primera: { ...PRIMERA_DOMINIO, bends: [] }, recoge: true },
    ]);
  });

  it('S2: una barra sin color se salta; un hoyo sin lista de barras, lista vacía', () => {
    const resumen = HoleSampleMapper.toDomain([
      { hole_number: 1, tees: [{ tee_gender: 'MALE', first_sample: PRIMERA }, null, { tee_color: '', first_sample: PRIMERA }] },
      { hole_number: 2 },
    ]);

    expect(resumen).toEqual({ 1: [], 2: [] });
  });

  it('S2: un hoyo sin número válido se salta, y lo que no es lista es vacío', () => {
    expect(HoleSampleMapper.toDomain([{ hole_number: 'x', tees: [] }, null, { tees: [] }])).toEqual({});
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
});
