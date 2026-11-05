import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * La cabecera X-App-Mode (FE #1046): la app instalada la manda para que el backend
 * no funda su dispositivo con el de Safari del mismo móvil (cada una tiene sus cookies).
 *
 *   M1  la app instalada  | X-App-Mode: standalone
 *   M2  el navegador      | sin cabecera
 *   M3  si detectarlo lanza | sin cabecera, y no lanza
 */
const instalada = vi.hoisted(() => ({ valor: false, lanza: false }));
vi.mock('./standalone', () => ({
  detectStandalone: () => {
    if (instalada.lanza) throw new Error('sin window');
    return instalada.valor;
  },
}));

const { cabeceraDelModoDeLaApp } = await import('./modoDeLaApp');

describe('la cabecera del modo de la app', () => {
  beforeEach(() => {
    instalada.valor = false;
    instalada.lanza = false;
  });

  it('M1: la app instalada manda X-App-Mode: standalone', () => {
    instalada.valor = true;
    expect(cabeceraDelModoDeLaApp()).toEqual({ 'X-App-Mode': 'standalone' });
  });

  it('M2: el navegador no manda nada', () => {
    expect(cabeceraDelModoDeLaApp()).toEqual({});
  });

  it('M3: si detectarlo lanza, nada y sin lanzar', () => {
    instalada.lanza = true;
    expect(cabeceraDelModoDeLaApp()).toEqual({});
  });
});
