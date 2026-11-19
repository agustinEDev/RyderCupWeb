import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { pintaGolpe, siguienteHueco } from './golpeDeLaCasilla';

const t = (clave) => clave;

describe('pintaGolpe', () => {
  it('sin anotar: un hueco que solo oye el lector de pantalla', () => {
    const { container } = render(<>{pintaGolpe(undefined, t)}</>);
    expect(container.innerHTML).toBe(
      '<span class="sr-only">input.notEntered</span>',
    );
  });

  it('la raya: el guion, con su nombre para el lector de pantalla', () => {
    const { container } = render(<>{pintaGolpe(null, t)}</>);
    expect(container.innerHTML).toBe(
      '<span aria-label="input.pickedUp" class="text-gray-600">—</span>',
    );
  });

  it('sin traducción de la raya, sin aria-label vacío', () => {
    const { container } = render(<>{pintaGolpe(null, () => '')}</>);
    expect(container.querySelector('span')).not.toHaveAttribute('aria-label');
  });

  it.each([[1], [5], [12]])('un número, tal cual: %i', (golpes) => {
    expect(pintaGolpe(golpes, t)).toBe(golpes);
  });
});

describe('siguienteHueco', () => {
  const vacio = {
    propioBloqueado: false,
    propio: undefined,
    marcadoBloqueado: false,
    marcado: undefined,
    haySegundo: false,
    segundoBloqueado: false,
    segundo: undefined,
  };

  it.each([
    ['nada anotado: el tuyo', {}, 'own'],
    ['tu raya cuenta como anotada', { propio: null }, 'marked'],
    [
      'el tuyo bloqueado y vacío: el del rival',
      { propioBloqueado: true },
      'marked',
    ],
    ['los dos puestos, sin segundo: ninguno', { propio: 4, marcado: 5 }, null],
    [
      'los dos puestos, con segundo vacío: el suyo',
      { propio: 4, marcado: null, haySegundo: true },
      'second',
    ],
    [
      'el segundo bloqueado: ninguno',
      { propio: 4, marcado: 5, haySegundo: true, segundoBloqueado: true },
      null,
    ],
    [
      'el segundo anotado: ninguno',
      { propio: 4, marcado: 5, haySegundo: true, segundo: 6 },
      null,
    ],
    [
      'el marcado bloqueado y vacío: el segundo',
      { propio: 4, marcadoBloqueado: true, haySegundo: true },
      'second',
    ],
    [
      'el marcado y el segundo vacíos: primero el marcado',
      { propio: 4, haySegundo: true },
      'marked',
    ],
  ])('%s', (_caso, cambios, esperado) => {
    expect(siguienteHueco({ ...vacio, ...cambios })).toBe(esperado);
  });
});
