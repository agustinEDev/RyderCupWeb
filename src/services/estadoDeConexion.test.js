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
  it('arranca sin conexión si el navegador dice que no hay red', () => {
    // El único caso en que el navegador acierta seguro: modo avión. Antes se
    // arrancaba siempre optimista y la primera anotación se iba por el camino
    // de red, fallaba y salía un error rojo en vez del aviso
    const original = Object.getOwnPropertyDescriptor(globalThis.navigator, 'onLine');
    Object.defineProperty(globalThis.navigator, 'onLine', { value: false, configurable: true });
    try {
      olvidaElEstadoDeConexion();
      expect(hayConexion()).toBe(false);
    } finally {
      if (original) Object.defineProperty(globalThis.navigator, 'onLine', original);
    }
  });

  it('un oyente que se apunta durante el aviso no se llama en esa misma vuelta', () => {
    // El de la pantalla de anotación vacía la cola de hoyos: llamarlo dos veces
    // mandaría el mismo hoyo dos veces
    const tardio = vi.fn();
    seSuscribeALaConexion(() => seSuscribeALaConexion(tardio));

    apuntaFalloDeRed();

    expect(tardio).not.toHaveBeenCalled();
  });
});
