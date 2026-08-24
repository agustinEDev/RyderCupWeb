import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * `ARRANCO_EN_LA_PORTADA` se resuelve al evaluar el modulo, asi que cada
 * "arranque" de la pestaña se simula reimportandolo con el modulo reseteado.
 * Una recarga del service worker es exactamente eso: mismo sessionStorage,
 * modulo evaluado de nuevo.
 */
const arrancar = async (ruta) => {
  window.history.pushState({}, '', ruta);
  vi.resetModules();
  return (await import('./appStartup')).ARRANCO_EN_LA_PORTADA;
};

describe('ARRANCO_EN_LA_PORTADA', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('es cierto cuando la pestaña arranca en la portada', async () => {
    expect(await arrancar('/')).toBe(true);
  });

  it('es falso cuando la pestaña arranca en otra pantalla', async () => {
    expect(await arrancar('/competitions/abc')).toBe(false);
  });

  it('deja de ser cierto al recargar la pestaña sobre la portada', async () => {
    expect(await arrancar('/')).toBe(true);
    // El service worker recarga por su cuenta al entrar una version nueva: a
    // quien este leyendo la portada no se le puede llevar al panel
    expect(await arrancar('/')).toBe(false);
  });

  it('no cuenta como arranque llegar a la portada desde una ruta profunda y recargar', async () => {
    // El caso del enlace compartido: se entra por una clasificacion, se navega
    // a la portada y ahi el service worker recarga. Sin marcar el arranque de
    // la ruta profunda, esa recarga se leia como un arranque en `/`
    expect(await arrancar('/competitions/abc')).toBe(false);
    expect(await arrancar('/')).toBe(false);
  });

  it('es falso cuando no hay almacenamiento de sesion', async () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('sin almacenamiento');
      },
      setItem: () => {
        throw new Error('sin almacenamiento');
      },
    });
    expect(await arrancar('/')).toBe(false);
  });
});
