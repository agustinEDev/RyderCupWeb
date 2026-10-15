import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { recordarPosicion, leerUltimaPosicion, olvidaLaUltimaPosicion, CLAVE_ULTIMA_POSICION } from './ultimaPosicion';

describe('ultimaPosicion', () => {
  let almacen;

  beforeEach(() => {
    almacen = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k) => (almacen.has(k) ? almacen.get(k) : null),
      setItem: (k, v) => almacen.set(k, String(v)),
      removeItem: (k) => almacen.delete(k),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('guarda y lee la última posición buena', () => {
    recordarPosicion({ lat: 36.28, lon: -5.33 });

    expect(leerUltimaPosicion()).toEqual({ lat: 36.28, lon: -5.33 });
    expect(CLAVE_ULTIMA_POSICION).toBe('mapaDeHoyos:ultimaPosicion');
  });

  it('una posición rota no pisa la buena que había', () => {
    recordarPosicion({ lat: 36.28, lon: -5.33 });

    recordarPosicion({ lat: Number.NaN, lon: 0 });

    expect(leerUltimaPosicion()).toEqual({ lat: 36.28, lon: -5.33 });
  });

  it('una posición rota ni se guarda ni se lee', () => {
    recordarPosicion({ lat: Number.NaN, lon: 0 });
    expect(leerUltimaPosicion()).toBeNull();

    almacen.set(CLAVE_ULTIMA_POSICION, '{"lat":"x"}');
    expect(leerUltimaPosicion()).toBeNull();
  });

  it('al cerrar sesión se olvida: en un móvil compartido diría dónde estuvo la otra cuenta', () => {
    recordarPosicion({ lat: 36.28, lon: -5.33 });

    olvidaLaUltimaPosicion();

    expect(leerUltimaPosicion()).toBeNull();
  });

  it('sin almacenamiento, nada revienta', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
      removeItem: () => { throw new Error('denied'); },
    });

    expect(() => recordarPosicion({ lat: 1, lon: 1 })).not.toThrow();
    expect(leerUltimaPosicion()).toBeNull();
    expect(() => olvidaLaUltimaPosicion()).not.toThrow();
  });
});
