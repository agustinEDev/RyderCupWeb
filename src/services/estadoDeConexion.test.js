import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  hayConexion,
  vigilaUnaPeticion,
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
    // `onLine` vive en el prototipo, no en la instancia, así que no hay
    // descriptor propio que devolver: se define uno y luego se borra. Con el
    // `if (original)` de antes no se restauraba nada y el resto del fichero se
    // quedaba con `navigator.onLine === false`, lo que hacía que otro test
    // pasara sin comprobar nada
    const propio = Object.getOwnPropertyDescriptor(globalThis.navigator, 'onLine');
    Object.defineProperty(globalThis.navigator, 'onLine', { value: false, configurable: true });
    try {
      olvidaElEstadoDeConexion();
      expect(hayConexion()).toBe(false);
    } finally {
      if (propio) Object.defineProperty(globalThis.navigator, 'onLine', propio);
      else delete globalThis.navigator.onLine;
    }

    // Y queda de verdad restaurado para los siguientes
    olvidaElEstadoDeConexion();
    expect(hayConexion()).toBe(true);
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

describe('la petición que se queda colgada (FE #515)', () => {
  beforeEach(() => {
    olvidaElEstadoDeConexion();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('una petición que no vuelve a tiempo cuenta como que no hay conexión', () => {
    // Es el caso de verdad en un campo: la petición no falla rápido, se queda
    // colgada. Esperar a que rechace cubría solo la interfaz caída, que es lo
    // que `navigator.onLine` ya sabía
    vigilaUnaPeticion();

    vi.advanceTimersByTime(5000);

    expect(hayConexion()).toBe(false);
  });

  it('si vuelve a tiempo no dice nada', () => {
    const suelta = vigilaUnaPeticion();

    vi.advanceTimersByTime(1000);
    suelta();
    vi.advanceTimersByTime(30000);

    expect(hayConexion()).toBe(true);
  });

  it('una petición lenta no declara sin conexión si otras están llegando', () => {
    // Subir una foto del carrete por datos, o despertar una instancia dormida,
    // tarda más del plazo. Culpar de eso a la red apagaba toda la aplicación
    vigilaUnaPeticion();

    vi.advanceTimersByTime(2000);
    apuntaRespuestaDelServidor();     // otra petición sí llegó
    vi.advanceTimersByTime(4000);     // y la lenta agota su plazo

    expect(hayConexion()).toBe(true);
  });

  it('pero si no llega nada más, la lenta sí cuenta', () => {
    vigilaUnaPeticion();

    vi.advanceTimersByTime(6000);

    expect(hayConexion()).toBe(false);
  });

  it('un oyente que falla no deja sin avisar a los demás', () => {
    // Avisar ocurre dentro de la petición: una excepción aquí llegaría a
    // sustituir la respuesta del servidor
    const segundo = vi.fn();
    seSuscribeALaConexion(() => { throw new Error('la cola está llena'); });
    seSuscribeALaConexion(segundo);

    expect(() => apuntaFalloDeRed()).not.toThrow();
    expect(segundo).toHaveBeenCalled();
  });

  it('reiniciar el módulo para los plazos en marcha', () => {
    vigilaUnaPeticion();

    olvidaElEstadoDeConexion();
    vi.advanceTimersByTime(30000);

    expect(hayConexion()).toBe(true);
  });
});

describe('darse de baja de los avisos', () => {
  it('un oyente dado de baja deja de contar, y el conjunto no crece', () => {
    olvidaElEstadoDeConexion();
    const oyente = vi.fn();

    const baja = seSuscribeALaConexion(oyente);
    baja();
    baja(); // idempotente: darse de baja dos veces no rompe nada

    apuntaFalloDeRed();

    expect(oyente).not.toHaveBeenCalled();
  });
});
