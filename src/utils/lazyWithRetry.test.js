import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cargarConReintento } from './lazyWithRetry';

/**
 * La carga de una pantalla diferida, con un reintento a los 1,5 s. Si carga,
 * olvida la marca de «ya recargué» (`recargaDeLaBarrera`); si no, la deja
 * (revisor, 25 oct 2026).
 *
 *   #   caso                                              | marca
 *   ----|-------------------------------------------------|-----------
 *   L1  carga el módulo                                   | se olvida
 *   L2  Vite resuelve sin módulo (#958 canceló el error)  | se queda
 *   L3  falla y el reintento carga                        | se olvida
 *   L4  falla dos veces                                   | se queda, y el error sigue
 */
const MARCA = 'lazy_load_error_reloaded';
const sinEspera = () => Promise.resolve();

describe('cargarConReintento', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem(MARCA, 'true');
  });

  it('L1: si carga el módulo, olvida la recarga', async () => {
    const modulo = { default: () => null };

    await expect(cargarConReintento(async () => modulo, sinEspera)).resolves.toBe(modulo);

    expect(sessionStorage.getItem(MARCA)).toBeNull();
  });

  it('L2: si Vite resuelve sin módulo, la recarga de la #958 está en camino: la marca se queda', async () => {
    await cargarConReintento(async () => undefined, sinEspera);

    expect(sessionStorage.getItem(MARCA)).toBe('true');
  });

  it('L3: si falla y el reintento carga, la olvida', async () => {
    const modulo = { default: () => null };
    const importar = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(modulo);
    const esperar = vi.fn(sinEspera);

    await expect(cargarConReintento(importar, esperar)).resolves.toBe(modulo);

    expect(esperar).toHaveBeenCalledWith(1500);
    expect(importar).toHaveBeenCalledTimes(2);
    expect(sessionStorage.getItem(MARCA)).toBeNull();
  });

  it('L4: si falla dos veces, el error sigue y la marca se queda', async () => {
    const fallo = new TypeError('Failed to fetch dynamically imported module: x.js');
    const importar = vi.fn().mockRejectedValue(fallo);

    await expect(cargarConReintento(importar, sinEspera)).rejects.toBe(fallo);

    expect(importar).toHaveBeenCalledTimes(2);
    expect(sessionStorage.getItem(MARCA)).toBe('true');
  });
});
