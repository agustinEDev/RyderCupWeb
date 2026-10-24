import { describe, it, expect, vi } from 'vitest';
import { cargarConReintento } from './lazyWithRetry';

/**
 * La carga de una pantalla diferida, con un reintento a los 1,5 s antes de
 * dejar el error a `LazyLoadErrorBoundary`.
 */
const sinEspera = () => Promise.resolve();

describe('cargarConReintento', () => {
  it('si carga a la primera, el módulo, sin esperar', async () => {
    const modulo = { default: () => null };
    const esperar = vi.fn(sinEspera);

    await expect(cargarConReintento(async () => modulo, esperar)).resolves.toBe(modulo);

    expect(esperar).not.toHaveBeenCalled();
  });

  it('si falla y el reintento carga, el módulo, tras 1,5 s', async () => {
    const modulo = { default: () => null };
    const importar = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(modulo);
    const esperar = vi.fn(sinEspera);

    await expect(cargarConReintento(importar, esperar)).resolves.toBe(modulo);

    expect(esperar).toHaveBeenCalledWith(1500);
    expect(importar).toHaveBeenCalledTimes(2);
  });

  it('si falla dos veces, el error sigue hacia la barrera', async () => {
    const fallo = new TypeError('Failed to fetch dynamically imported module: x.js');
    const importar = vi.fn().mockRejectedValue(fallo);

    await expect(cargarConReintento(importar, sinEspera)).rejects.toBe(fallo);

    expect(importar).toHaveBeenCalledTimes(2);
  });
});
