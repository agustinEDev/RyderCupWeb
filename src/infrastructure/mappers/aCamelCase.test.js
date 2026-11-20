import { describe, it, expect } from 'vitest';
import { aCamelCase } from './aCamelCase';

/**
 * La respuesta de la API, con las claves en camelCase y a cualquier
 * profundidad: lo que la capa de aplicación recibe en `extras`.
 *
 *   #   entrada                                   | salida
 *   ----|-----------------------------------------|---------------------------
 *   C1  claves snake_case, también con números    | camelCase (team_a_x → teamAX)
 *   C2  objetos y listas anidados                 | también traducidos
 *   C3  valores (textos, enums, null, 0, false)   | tal cual: solo cambian claves
 *   C4  null / undefined / un valor suelto        | tal cual
 */
describe('aCamelCase', () => {
  it('C1: traduce las claves, también las de una letra o con números', () => {
    expect(
      aCamelCase({
        user_name: 1,
        team_a_vice_captain_id: 2,
        name_en: 3,
        id: 4,
        lado2_x: 5,
      }),
    ).toEqual({
      userName: 1,
      teamAViceCaptainId: 2,
      nameEn: 3,
      id: 4,
      lado2X: 5,
    });
  });

  it('C2: entra en objetos y listas', () => {
    expect(
      aCamelCase({
        handicap_update: { pending_players: [{ user_id: 'u1' }] },
        countries: [{ name_es: 'España' }, null],
      }),
    ).toEqual({
      handicapUpdate: { pendingPlayers: [{ userId: 'u1' }] },
      countries: [{ nameEs: 'España' }, null],
    });
  });

  it('C3: los valores no se tocan', () => {
    const fecha = '2026-11-20T10:00:00Z';
    expect(
      aCamelCase({
        setup_mode: 'RYDER_CUP',
        tee_time: null,
        enrolled_count: 0,
        can_delete: false,
        started_at: fecha,
        sin_valor: undefined,
      }),
    ).toEqual({
      setupMode: 'RYDER_CUP',
      teeTime: null,
      enrolledCount: 0,
      canDelete: false,
      startedAt: fecha,
      sinValor: undefined,
    });
  });

  it.each([null, undefined, 'texto', 7, false])('C4: %s, tal cual', (valor) => {
    expect(aCamelCase(valor)).toBe(valor);
  });
});
