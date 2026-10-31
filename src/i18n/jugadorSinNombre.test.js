import { describe, it, expect } from 'vitest';
import es from './locales/es/schedule.json';
import en from './locales/en/schedule.json';

/**
 * El texto de quien no tiene nombre en la agenda (pasada del Kind, 31 oct
 * 2026): i18next pinta la clave si no la encuentra, y eso es lo que se quitaba.
 */
describe('El jugador sin nombre está traducido', () => {
  it('I1: suelto y numerado, en los dos idiomas', () => {
    expect(es.unnamedPlayer).toBe('Jugador');
    expect(en.unnamedPlayer).toBe('Player');
    expect(es.unnamedPlayerNumbered).toBe('Jugador {{numero}}');
    expect(en.unnamedPlayerNumbered).toBe('Player {{numero}}');
  });
});
