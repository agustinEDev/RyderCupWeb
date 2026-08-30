import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleCsrfLogout } from './csrfLogout';
import { recuerda, recuerdaLaLista, loQueSeSupo, laUltimaLista, olvidaTodo } from '../services/loUltimoConocido';

/**
 * LA TABLA — salir por un fallo de CSRF.
 *
 *   caso                                   | qué pasa
 *   ---------------------------------------|-----------------------------------
 *   se cierra la sesión                     | se va lo de la cuenta anterior
 *   y una respuesta llega después           | no lo repone
 */
describe('handleCsrfLogout · lo guardado sin cobertura (FE #524)', () => {
  let href;

  beforeEach(() => {
    const guardado = new Map();
    globalThis.localStorage = {
      getItem: (k) => (guardado.has(k) ? guardado.get(k) : null),
      setItem: (k, v) => guardado.set(k, String(v)),
      removeItem: (k) => guardado.delete(k),
    };
    olvidaTodo();
    href = '';
    delete window.location;
    window.location = { set href(v) { href = v; }, get href() { return href; } };
  });

  afterEach(() => vi.restoreAllMocks());

  it('se lleva las partidas guardadas de la cuenta anterior', () => {
    // Es el cuarto camino de salida y tampoco pasa por `clearAuth`: en un móvil
    // compartido, la siguiente persona sin señal veía la lista de la anterior
    recuerda('m-1', { partida: { id: 'm-1' }, campo: null });
    recuerdaLaLista([{ id: 'm-1' }]);

    handleCsrfLogout({ detail: 'CSRF token missing' });

    expect(loQueSeSupo('m-1')).toBeNull();
    expect(laUltimaLista()).toBeNull();
    expect(href).toBe('/login');
  });

  it('y una respuesta que conteste después no las repone', () => {
    // La redirección no es instantánea, y lo repuesto sí sobrevive a ella
    handleCsrfLogout();

    recuerda('m-1', { partida: { id: 'm-1' }, campo: null });
    recuerdaLaLista([{ id: 'm-1' }]);

    expect(loQueSeSupo('m-1')).toBeNull();
    expect(laUltimaLista()).toBeNull();
  });
});
