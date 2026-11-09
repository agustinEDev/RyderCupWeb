import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * El aviso de un cierre forzado, para enseñarlo en /login: la página de partida
 * se recarga a los 500 ms y su aviso de 8 s apenas se veía.
 *
 * | Caso                                   | Esperado                                      |
 * |----------------------------------------|-----------------------------------------------|
 * | se guarda y se toma                    | el motivo, y ya no está                       |
 * | se toma sin guardar                    | null                                          |
 * | sin sessionStorage (lanza al guardar)  | no se guarda (quien llama lo enseña ya)       |
 * | el aviso de cada motivo                | revocado 🔒, caducado ⏱️, otro ℹ️ (también «toString») |
 * | se enseña                              | su texto traducido, 8000 ms, su icono, `delCierre` |
 */
const toast = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('./toast', () => ({ default: toast }));

const { guardaElAvisoDelCierre, tomaElAvisoDelCierre, muestraElAvisoDelCierre } = await import('./avisoTrasElCierre');
const traduce = (clave, { ns }) => `${ns}:${clave}`;

describe('el aviso de un cierre forzado, para /login', () => {
  beforeEach(() => {
    globalThis.sessionStorage.clear();
    toast.error.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('se guarda y se toma una sola vez', () => {
    expect(guardaElAvisoDelCierre('revocation')).toBe(true);

    expect(tomaElAvisoDelCierre()).toBe('revocation');
    expect(tomaElAvisoDelCierre()).toBeNull();
  });

  it('sin guardar no hay nada que tomar', () => {
    expect(tomaElAvisoDelCierre()).toBeNull();
  });

  it('sin sessionStorage no se guarda', () => {
    vi.stubGlobal('sessionStorage', {
      setItem: () => {
        throw new Error('bloqueado');
      },
      getItem: () => null,
      removeItem: () => {},
    });

    expect(guardaElAvisoDelCierre('revocation')).toBe(false);
  });

  it.each([
    ['revocation', 'auth:errors.deviceRevoked', '🔒'],
    ['expiration', 'auth:errors.sessionExpired', '⏱️'],
    ['ended', 'auth:errors.sessionEnded', 'ℹ️'],
    ['toString', 'auth:errors.sessionEnded', 'ℹ️'],
  ])('%s se enseña con su texto y su icono, 8 s y como aviso del cierre', (motivo, texto, icono) => {
    muestraElAvisoDelCierre(motivo, traduce);

    expect(toast.error).toHaveBeenCalledWith(texto, { duration: 8000, icon: icono, delCierre: true });
  });
});
