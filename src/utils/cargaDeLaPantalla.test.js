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
 *
 * Lo que añadió el revisor (2 nov 2026):
 *
 *   T27 | la primera carga de la aplicación            | pendiente, al momento y sin pedir nada: la
 *       |                                              | pantalla carga como hoy, con la carcasa puesta
 *   T28 | la sesión no contesta en 4 s                  | sinRed: el tope lo cubre todo
 *   T29 | la lista llega después del tope               | se guarda, y `tardia` la entrega
 *   T30 | se cierra sesión mientras se pide             | no se guarda
 *
 * Y el segundo revisor:
 *
 *   T28 | la sesión no contesta en 4 s                  | sinSesion: la pantalla vuelve a pedir al
 *       |                                              | saberse quién es (con sinRed se quedaba)
 *   T39 | cualquier fallo que no sea el tope            | a la consola, como antes, con su nombre
 */
const sesion = vi.hoisted(() => ({ user: { id: 'u-1' }, consulta: null, ahora: undefined }));
vi.mock('../services/sesionCompartida', () => ({
  consultaLaSesion: () => sesion.consulta ?? Promise.resolve(sesion.user),
  loQueHaySobreLaSesion: () => ({ user: sesion.ahora === undefined ? sesion.user : sesion.ahora }),
}));

const { cargaDeLaPantalla, marcaElArranque, TOPE_DE_LA_CARGA_MS } = await import('./cargaDeLaPantalla');
const { loGuardadoEnMemoria } = await import('../services/memoriaDeLasListas');
const { olvidaTodo } = await import('../services/loUltimoConocido');

const sinRed = () => new TypeError('Failed to fetch');
const delServidor = (status) => Object.assign(new Error('Rate limit exceeded'), { status });
const carga = (pedir) => cargaDeLaPantalla({ clave: 'competiciones', pedir });

describe('cargaDeLaPantalla', () => {
  beforeEach(() => {
    olvidaTodo();
    sesion.user = { id: 'u-1' };
    sesion.consulta = null;
    sesion.ahora = undefined;
    marcaElArranque(true);
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
    expect(await resultado).toMatchObject({ estado: 'sinRed', datos: [{ id: 'c-1' }] });
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

  it('T27: en la primera carga de la aplicación, pendiente al momento y sin pedir nada', async () => {
    marcaElArranque(false);
    sesion.consulta = new Promise(() => {});
    const pedir = vi.fn();

    expect(await carga(pedir)).toEqual({ estado: 'pendiente', datos: null });
    expect(pedir).not.toHaveBeenCalled();
  });

  it('T28: si la sesión no contesta en 4 s, sinSesion', async () => {
    vi.useFakeTimers();
    sesion.consulta = new Promise(() => {});
    const pedir = vi.fn();

    const resultado = carga(pedir);
    await vi.advanceTimersByTimeAsync(TOPE_DE_LA_CARGA_MS);

    expect(await resultado).toEqual({ estado: 'sinSesion', datos: null });
    expect(pedir).not.toHaveBeenCalled();
  });

  it('T28b: sesión y lista comparten los 4 s', async () => {
    vi.useFakeTimers();
    let sesionLista;
    sesion.consulta = new Promise((r) => { sesionLista = r; });
    const resultado = carga(() => new Promise(() => {}));

    await vi.advanceTimersByTimeAsync(3000);
    sesionLista({ id: 'u-1' });
    await vi.advanceTimersByTimeAsync(1000);

    expect(await resultado).toMatchObject({ estado: 'sinRed' });
  });

  it('T29: la lista que llega tras el tope se guarda y la entrega `tardia`', async () => {
    vi.useFakeTimers();
    let responde;
    const resultado = carga(() => new Promise((r) => { responde = r; }));
    await vi.advanceTimersByTimeAsync(TOPE_DE_LA_CARGA_MS);
    const { estado, tardia } = await resultado;

    responde([{ id: 'c-9' }]);

    expect(estado).toBe('sinRed');
    expect(await tardia).toEqual([{ id: 'c-9' }]);
    expect(loGuardadoEnMemoria('competiciones', 'u-1')).toEqual([{ id: 'c-9' }]);
  });

  it('T29b: si al final falla, `tardia` no entrega nada y no rompe', async () => {
    vi.useFakeTimers();
    let falla;
    const resultado = carga(() => new Promise((_, r) => { falla = r; }));
    await vi.advanceTimersByTimeAsync(TOPE_DE_LA_CARGA_MS);
    const { tardia } = await resultado;
    let entregada = false;
    tardia.then(() => { entregada = true; });

    falla(sinRed());
    await vi.advanceTimersByTimeAsync(10);

    expect(entregada).toBe(false);
  });

  it('T30: si se cierra sesión mientras se pide, no se guarda', async () => {
    await carga(async () => {
      sesion.ahora = null;
      return [{ id: 'c-1' }];
    });

    expect(loGuardadoEnMemoria('competiciones', 'u-1')).toBeNull();
  });

  it('T39: los fallos van a la consola como antes, también los de red', async () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fallo = sinRed();

    await cargaDeLaPantalla({ clave: 'competitions', pedir: async () => { throw fallo; } });

    expect(consola).toHaveBeenCalledWith('Error loading competitions:', fallo);
    consola.mockRestore();
  });

  it('T13: con los términos sin aceptar no se pide nada', async () => {
    sesion.user = { id: 'u-1', terms_accepted: false };
    const pedir = vi.fn();

    expect(await carga(pedir)).toEqual({ estado: 'sinSesion', datos: null });
    expect(pedir).not.toHaveBeenCalled();
  });
});
