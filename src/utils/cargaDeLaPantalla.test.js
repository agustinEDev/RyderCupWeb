import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Lo común de los `loader` de las pantallas (FE #647, fase 3; caminos C1-C17 y
 * tabla de Torneos aprobados el 2 nov 2026). Nunca lanza: lo que pasó va en
 * `estado`, y la pantalla decide qué enseñar.
 *
 *   #   | caso                                        | esperado
 *   ----|---------------------------------------------|----------------------------------------
 *   T1  | responde                                    | ok, con los datos; quedan en memoria
 *   T3  | sin red, nada en memoria                    | sinRed, sin datos
 *   T4  | sin red, con lo de antes en memoria         | sinRed, con lo de antes
 *   T5  | no responde en 4 s                          | sinRed (con lo de antes, si hay)
 *   T6  | 429 / 5xx, nada en memoria                  | error, sin datos
 *   T7  | 429 / 5xx, con lo de antes                  | error, con lo de antes
 *   C1  | un fallo no borra la memoria                | lo de antes sigue para la próxima
 *   T12 | sin sesión                                  | sinSesion, sin pedir nada
 *   T13 | términos sin aceptar                        | sinSesion, sin pedir nada
 *   C2  | pide con el usuario de la sesión            | `pedir` lo recibe
 */
const sesion = vi.hoisted(() => ({ user: { id: 'u-1' } }));
vi.mock('../services/sesionCompartida', () => ({
  consultaLaSesion: () => Promise.resolve(sesion.user),
}));

const { cargaDeLaPantalla, TOPE_DE_LA_CARGA_MS } = await import('./cargaDeLaPantalla');
const { olvidaTodo } = await import('../services/loUltimoConocido');

const sinRed = () => new TypeError('Failed to fetch');
const delServidor = (status) => Object.assign(new Error('Rate limit exceeded'), { status });
const carga = (pedir) => cargaDeLaPantalla({ clave: 'competiciones', pedir });

describe('cargaDeLaPantalla', () => {
  beforeEach(() => {
    olvidaTodo();
    sesion.user = { id: 'u-1' };
    Object.defineProperty(globalThis.navigator, 'onLine', { value: true, configurable: true });
  });
  afterEach(() => vi.useRealTimers());

  it('T1: responde: ok con los datos', async () => {
    expect(await carga(async () => [{ id: 'c-1' }])).toEqual({ estado: 'ok', datos: [{ id: 'c-1' }] });
  });

  it('C2: pide con el usuario de la sesión', async () => {
    const pedir = vi.fn(async () => []);
    await carga(pedir);

    expect(pedir).toHaveBeenCalledWith({ id: 'u-1' });
  });

  it('T3: sin red y nada en memoria: sinRed sin datos', async () => {
    expect(await carga(async () => { throw sinRed(); })).toEqual({ estado: 'sinRed', datos: null });
  });

  it('T4: sin red con lo de antes: sinRed con lo de antes', async () => {
    await carga(async () => [{ id: 'c-1' }]);

    expect(await carga(async () => { throw sinRed(); })).toEqual({ estado: 'sinRed', datos: [{ id: 'c-1' }] });
  });

  it('T5: sin respuesta en 4 s: sinRed, con lo de antes', async () => {
    await carga(async () => [{ id: 'c-1' }]);
    vi.useFakeTimers();

    const resultado = carga(() => new Promise(() => {}));
    await vi.advanceTimersByTimeAsync(TOPE_DE_LA_CARGA_MS);

    expect(TOPE_DE_LA_CARGA_MS).toBe(4000);
    expect(await resultado).toEqual({ estado: 'sinRed', datos: [{ id: 'c-1' }] });
  });

  it('T5b: antes de los 4 s aún espera', async () => {
    vi.useFakeTimers();
    let resuelta = false;
    carga(() => new Promise(() => {})).then(() => { resuelta = true; });

    await vi.advanceTimersByTimeAsync(TOPE_DE_LA_CARGA_MS - 1);

    expect(resuelta).toBe(false);
  });

  it('T6: 429 y nada en memoria: error sin datos', async () => {
    expect(await carga(async () => { throw delServidor(429); })).toEqual({ estado: 'error', datos: null });
  });

  it('T7: 500 con lo de antes: error con lo de antes', async () => {
    await carga(async () => [{ id: 'c-1' }]);

    expect(await carga(async () => { throw delServidor(500); })).toEqual({ estado: 'error', datos: [{ id: 'c-1' }] });
  });

  it('C1: un fallo no borra lo de antes', async () => {
    await carga(async () => [{ id: 'c-1' }]);
    await carga(async () => { throw delServidor(500); });

    expect(await carga(async () => { throw sinRed(); })).toEqual({ estado: 'sinRed', datos: [{ id: 'c-1' }] });
  });

  it('T12: sin sesión no se pide nada', async () => {
    sesion.user = null;
    const pedir = vi.fn();

    expect(await carga(pedir)).toEqual({ estado: 'sinSesion', datos: null });
    expect(pedir).not.toHaveBeenCalled();
  });

  it('T13: con los términos sin aceptar no se pide nada', async () => {
    sesion.user = { id: 'u-1', terms_accepted: false };
    const pedir = vi.fn();

    expect(await carga(pedir)).toEqual({ estado: 'sinSesion', datos: null });
    expect(pedir).not.toHaveBeenCalled();
  });
});
