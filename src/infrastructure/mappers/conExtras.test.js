import { describe, it, expect } from 'vitest';
import { aExtras, conExtras, conExtrasLista } from './conExtras';

/**
 * Lo que los repositorios entregan a la capa de aplicación: la entidad y, al
 * lado, la respuesta de la API en camelCase (`extras`).
 *
 *   #   caso                                        | qué sale
 *   ----|-------------------------------------------|---------------------------
 *   X1  aExtras con respuesta                     | sus claves en camelCase
 *   X2  aExtras sin respuesta (null / undefined)  | null
 *   X3  conExtras                                 | { entity, extras }
 *   X4  conExtrasLista                            | cada entidad con los suyos,
 *                                               | por posición
 */
describe('conExtras', () => {
  it('X1: aExtras traduce las claves', () => {
    expect(aExtras({ user_name: 'Ana', creator: { first_name: 'A' } })).toEqual(
      { userName: 'Ana', creator: { firstName: 'A' } },
    );
  });

  it.each([null, undefined])('X2: aExtras(%s) es null', (vacio) => {
    expect(aExtras(vacio)).toBeNull();
  });

  it('X3: conExtras empareja la entidad con sus extras', () => {
    const entity = { id: 'e1' };
    expect(conExtras(entity, { team_a_captain_id: 'u1' })).toEqual({
      entity,
      extras: { teamACaptainId: 'u1' },
    });
    expect(conExtras(entity, null)).toEqual({ entity, extras: null });
  });

  it('X4: conExtrasLista empareja por posición', () => {
    const a = { id: 'a' };
    const b = { id: 'b' };
    expect(
      conExtrasLista([a, b], [{ inviter_name: 'X' }, { inviter_name: 'Y' }]),
    ).toEqual([
      { entity: a, extras: { inviterName: 'X' } },
      { entity: b, extras: { inviterName: 'Y' } },
    ]);
  });
});
