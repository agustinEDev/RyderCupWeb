import { describe, expect, it } from 'vitest';

import { siViene } from './campoSiViene';

/**
 * «No viene» y «viene vacío» son dos cosas distintas, y hay sitios donde la
 * diferencia decide qué se le ofrece al jugador: con `scoring_opens_at`, vacío
 * es «este campo no abre solo» y ausente es «este servidor es anterior a la
 * BE #305» (FE #621). Aplanarlas con `?? null` dejó sin botón de anotar a todo
 * partido programado.
 *
 * El idioma para respetarlo estaba copiado en tres sitios —los dos mappers y el
 * caso de uso—, que es donde la regla del repositorio dice unificar.
 */
describe('siViene', () => {
  it('copia el campo cuando viene, aunque venga vacío', () => {
    expect(siViene({ a: 1 }, 'a')).toEqual({ a: 1 });
    expect(siViene({ a: null }, 'a')).toEqual({ a: null });
    expect(siViene({ a: undefined }, 'a')).toEqual({ a: undefined });
  });

  it('no copia nada cuando el campo no viene', () => {
    expect(siViene({ b: 1 }, 'a')).toEqual({});
    expect('a' in siViene({ b: 1 }, 'a')).toBe(false);
  });

  it('sabe cambiarle el nombre, que la API habla otro idioma', () => {
    expect(siViene({ scoring_opens_at: '2026-09-19T06:00:00+02:00' }, 'scoring_opens_at', 'scoringOpensAt'))
      .toEqual({ scoringOpensAt: '2026-09-19T06:00:00+02:00' });
    expect(siViene({}, 'scoring_opens_at', 'scoringOpensAt')).toEqual({});
  });

  it('aguanta que no le den nada', () => {
    expect(siViene(null, 'a')).toEqual({});
    expect(siViene(undefined, 'a')).toEqual({});
  });
});
