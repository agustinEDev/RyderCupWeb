import { describe, expect, it } from 'vitest';

import { nombreRealSiAporta, nombreVisible } from './nombreVisible';

describe('nombreVisible', () => {
  it('usa lo que el servidor ya resolvió', () => {
    const persona = { display_name: 'Chuchi', first_name: 'Agustin', last_name: 'Estevez' };
    expect(nombreVisible(persona)).toBe('Chuchi');
  });

  it('entiende también la entidad de dominio en camelCase', () => {
    expect(nombreVisible({ displayName: 'Chuchi' })).toBe('Chuchi');
    expect(nombreVisible({ firstName: 'Ana', lastName: 'Garcia' })).toBe('Ana Garcia');
  });

  it('cae al alias cuando no viene el campo resuelto', () => {
    // Respuestas guardadas antes de BE #239, u objetos armados en el cliente
    expect(nombreVisible({ alias: 'Chuchi', first_name: 'Agustin', last_name: 'Estevez' }))
      .toBe('Chuchi');
  });

  it('cae al nombre completo cuando no hay alias', () => {
    expect(nombreVisible({ first_name: 'Agustin', last_name: 'Estevez' })).toBe('Agustin Estevez');
  });

  it('aguanta que falte el apellido', () => {
    expect(nombreVisible({ first_name: 'Agustin' })).toBe('Agustin');
  });

  it('usa el nombre ya compuesto como último recurso', () => {
    // Los invitados de una partida rápida llegan así: sin cuenta, con el
    // nombre que tecleó quien los añadió
    expect(nombreVisible({ name: 'Jane Doe' })).toBe('Jane Doe');
    expect(nombreVisible({ full_name: 'Ana Garcia' })).toBe('Ana Garcia');
  });

  it('no revienta con nada', () => {
    expect(nombreVisible(null)).toBe('');
    expect(nombreVisible(undefined)).toBe('');
    expect(nombreVisible({})).toBe('');
  });
});

describe('nombreRealSiAporta', () => {
  it('devuelve el nombre real cuando se está enseñando un alias', () => {
    const persona = { display_name: 'Chuchi', first_name: 'Agustin', last_name: 'Estevez' };
    expect(nombreRealSiAporta(persona)).toBe('Agustin Estevez');
  });

  it('devuelve vacío cuando sería repetir lo mismo', () => {
    // Sin alias, el nombre visible YA es el real: enseñarlo dos veces ensucia
    const persona = { display_name: 'Ana Garcia', first_name: 'Ana', last_name: 'Garcia' };
    expect(nombreRealSiAporta(persona)).toBe('');
  });

  it('devuelve vacío si no se sabe el nombre real', () => {
    expect(nombreRealSiAporta({ display_name: 'Chuchi' })).toBe('');
    expect(nombreRealSiAporta(null)).toBe('');
  });
});
