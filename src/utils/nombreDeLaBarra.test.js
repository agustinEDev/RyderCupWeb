import { describe, it, expect } from 'vitest';
import { nombreDeLaBarra } from './nombreDeLaBarra';

/**
 * El nombre de una barra, igual en todas las pantallas (4 nov 2026): estaba
 * escrito en cinco sitios (la etiqueta, los botones de «Tu barra», el panel,
 * la ficha del campo y la tarjeta de la partida).
 */
const t = (clave, { defaultValue }) => (clave === 'form.teeColors.YELLOW' ? 'Amarillas' : defaultValue);

describe('nombreDeLaBarra', () => {
  it('el color traducido', () => {
    expect(nombreDeLaBarra(t, { color: 'YELLOW' })).toBe('Amarillas');
  });

  it('un color sin traducción sale tal cual', () => {
    expect(nombreDeLaBarra(t, { color: 'PURPLE' })).toBe('PURPLE');
  });

  it('el nombre propio de la barra manda sobre el color', () => {
    expect(nombreDeLaBarra(t, { color: 'YELLOW', identifier: 'Campeonato' })).toBe('Campeonato');
  });

  it.each([
    ['MALE', 'Amarillas (M)'],
    ['FEMALE', 'Amarillas (F)'],
    [null, 'Amarillas'],
    [undefined, 'Amarillas'],
  ])('con género %s: %s', (gender, esperado) => {
    expect(nombreDeLaBarra(t, { color: 'YELLOW', gender })).toBe(esperado);
  });
});
