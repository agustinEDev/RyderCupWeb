import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  hayConexion,
  apuntaFalloDeRed,
  apuntaRespuestaDelServidor,
  seSuscribeALaConexion,
  olvidaElEstadoDeConexion,
} from './estadoDeConexion';

describe('estadoDeConexion', () => {
  beforeEach(() => olvidaElEstadoDeConexion());

  it('arranca creyendo que hay conexión', () => {
    // Sin ninguna petición hecha, decir que no la hay sería adivinar, y el
    // aviso saldría en cada arranque
    expect(hayConexion()).toBe(true);
  });

  it('una petición que no llega deja la aplicación sin conexión', () => {
    apuntaFalloDeRed();
    expect(hayConexion()).toBe(false);
  });

  it('cualquier respuesta la devuelve, aunque sea un error del servidor', () => {
    // Un 500 demuestra que se está llegando: el problema es otro
    apuntaFalloDeRed();
    apuntaRespuestaDelServidor();
    expect(hayConexion()).toBe(true);
  });

  it('avisa a quien escuche, y solo cuando cambia', () => {
    const oyente = vi.fn();
    seSuscribeALaConexion(oyente);

    apuntaFalloDeRed();
    apuntaFalloDeRed();
    apuntaFalloDeRed();
    expect(oyente).toHaveBeenCalledTimes(1);

    apuntaRespuestaDelServidor();
    expect(oyente).toHaveBeenCalledTimes(2);
  });

  it('deja de avisar al darse de baja', () => {
    const oyente = vi.fn();
    const baja = seSuscribeALaConexion(oyente);
    baja();
    apuntaFalloDeRed();
    expect(oyente).not.toHaveBeenCalled();
  });
});
