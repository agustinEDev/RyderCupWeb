import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Ninguna petición tenía tope de tiempo (FE #624). Con mala cobertura un
 * `fetch` no falla: no contesta. Y en anotación los envíos van de uno en uno a
 * propósito, así que uno colgado retenía en el móvil todos los golpes de
 * después. El tope lo pide quien lo necesita (`topeMs`): el resto de llamadas
 * esperan a servicios externos lentos —RFEG, correo— y un corte las daría por
 * fallidas cuando el servidor sí las termina. Al vencer se trata como falta de
 * cobertura: la cola guarda el golpe y suelta el cerrojo.
 */

const TOPE_MS = 15000;

const llamarAlBackend = vi.fn();
vi.mock('../utils/tokenRefreshInterceptor', () => ({
  fetchWithTokenRefresh: (...args) => llamarAlBackend(...args),
}));
vi.mock('../contexts/csrfTokenSync', () => ({ getCsrfToken: () => 'csrf' }));
vi.mock('i18next', () => ({ default: { t: (clave) => `t(${clave})` } }));

const { apiRequest } = await import('./api');
const { esFalloDeRed } = await import('../utils/sinCobertura');
const { noLlegoAlServidor, seGuardaParaDespues } = await import('../utils/politicaDeLaCola');

// Como el `fetch` de verdad: no contesta nunca, y al abortar su señal rechaza
// con el motivo del aborto
const queNoContesta = (config) =>
  new Promise((_, rechaza) => {
    config.signal?.addEventListener('abort', () => rechaza(config.signal.reason));
  });

describe('apiRequest · el tope de tiempo (FE #624)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('T1 · una petición que no contesta se corta a los 15 s como falta de cobertura', async () => {
    llamarAlBackend.mockImplementation((_, config) => queNoContesta(config));

    let error = null;
    const peticion = apiRequest('/api/v1/scoring/m-1/holes/9', { method: 'POST', body: '{}', topeMs: TOPE_MS })
      .catch((e) => { error = e; });

    await vi.advanceTimersByTimeAsync(TOPE_MS - 100);
    expect(error).toBeNull();

    await vi.advanceTimersByTimeAsync(100);
    await peticion;

    expect(error).toBeInstanceOf(TypeError);
    expect(error.message).toBe('t(common:sinConexion.mensaje)');
    expect(esFalloDeRed(error)).toBe(true);
    expect(noLlegoAlServidor(error)).toBe(true);
    expect(seGuardaParaDespues(error)).toBe(true);
  });

  it('T2 · también si llegan las cabeceras y el cuerpo no termina', async () => {
    llamarAlBackend.mockImplementation(async (_, config) => ({
      ok: true,
      status: 200,
      json: () => queNoContesta(config),
    }));

    let error = null;
    const peticion = apiRequest('/api/v1/scoring/m-1', { topeMs: TOPE_MS }).catch((e) => { error = e; });
    await vi.advanceTimersByTimeAsync(TOPE_MS);
    await peticion;

    expect(error).toBeInstanceOf(TypeError);
    expect(noLlegoAlServidor(error)).toBe(true);
  });

  it('T3 · la que contesta a tiempo no se aborta después', async () => {
    let senal;
    llamarAlBackend.mockImplementation(async (_, config) => {
      senal = config.signal;
      return { ok: true, status: 200, json: async () => ({ hola: 1 }) };
    });

    await expect(apiRequest('/api/v1/scoring/m-1', { topeMs: TOPE_MS })).resolves.toEqual({ hola: 1 });
    await vi.advanceTimersByTimeAsync(TOPE_MS * 2);

    expect(senal).toBeDefined();
    expect(senal.aborted).toBe(false);
  });

  // El servidor SÍ contestó, con su estado: que el cuerpo del error se cuelgue
  // no lo convierte en falta de cobertura, o un rechazo se reintentaría
  it('T5 · un 409 cuyo cuerpo no termina sigue siendo un 409', async () => {
    llamarAlBackend.mockImplementation(async (_, config) => ({
      ok: false,
      status: 409,
      statusText: 'Conflict',
      json: () => queNoContesta(config),
    }));

    let error = null;
    const peticion = apiRequest('/api/v1/scoring/m-1/holes/9', { method: 'POST', body: '{}', topeMs: TOPE_MS })
      .catch((e) => { error = e; });
    await vi.advanceTimersByTimeAsync(TOPE_MS);
    await peticion;

    expect(error).not.toBeInstanceOf(TypeError);
    expect(error.status).toBe(409);
  });

  it('T4 · sin tope pedido no hay tope, y no se le pasa nada a fetch', async () => {
    llamarAlBackend.mockImplementation((_, config) => queNoContesta(config));

    let error = null;
    apiRequest('/api/v1/auth/register', { method: 'POST', body: '{}' })
      .catch((e) => { error = e; });
    await vi.advanceTimersByTimeAsync(TOPE_MS * 10);

    expect(error).toBeNull();
    expect(llamarAlBackend.mock.calls[0][1].signal).toBeUndefined();
  });

  it('T6 · `topeMs` no se le pasa a fetch', async () => {
    llamarAlBackend.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    await apiRequest('/api/v1/scoring/m-1', { topeMs: TOPE_MS });

    expect(llamarAlBackend.mock.calls[0][1]).not.toHaveProperty('topeMs');
  });

  // Un error que llega ANTES de que venza —una sesión caducada en el refresco
  // que se esperaba— es la respuesta, y darlo por falta de cobertura le diría
  // a la cola que reintente algo que no va a entrar. Lo que no ha llegado al
  // vencer, en cambio, no se sabe: eso sí es «sin conexión»
  it('T7 · un error que llega antes de vencer sigue siendo lo que es', async () => {
    const caducada = new Error('Refresh token expired. Please login again.');
    llamarAlBackend.mockImplementation(() => new Promise((_r, rechaza) => {
      setTimeout(() => rechaza(caducada), TOPE_MS - 5000);
    }));

    let error = null;
    const peticion = apiRequest('/api/v1/scoring/m-1', { topeMs: TOPE_MS }).catch((e) => { error = e; });
    await vi.advanceTimersByTimeAsync(TOPE_MS * 2);
    await peticion;

    expect(error).toBe(caducada);
  });

  // Segunda revisión: el interceptor espera al refresco compartido del token
  // sin mirar la señal, así que el aborto no la cortaba y quien anotaba
  // esperaba lo que tardara el refresco en rendirse
  it('T8 · se corta a los 15 s aunque lo de dentro no escuche la señal', async () => {
    llamarAlBackend.mockImplementation(() => new Promise(() => {}));

    let error = null;
    const peticion = apiRequest('/api/v1/scoring/m-1', { topeMs: TOPE_MS }).catch((e) => { error = e; });
    await vi.advanceTimersByTimeAsync(TOPE_MS);
    await peticion;

    expect(error).toBeInstanceOf(TypeError);
    expect(esFalloDeRed(error)).toBe(true);
  });

  // Hay motores —WebKit entre ellos— que al abortar rechazan con un
  // `AbortError` nuevo y no con el motivo de la señal
  it('T9 · y si el motor rechaza con otro AbortError, también es falta de cobertura', async () => {
    llamarAlBackend.mockImplementation(async (_, config) => ({
      ok: true,
      status: 200,
      json: () => new Promise((_r, rechaza) => {
        config.signal.addEventListener('abort', () => rechaza(new globalThis.DOMException('Aborted', 'AbortError')));
      }),
    }));

    let error = null;
    const peticion = apiRequest('/api/v1/scoring/m-1', { topeMs: TOPE_MS }).catch((e) => { error = e; });
    await vi.advanceTimersByTimeAsync(TOPE_MS);
    await peticion;

    expect(error).toBeInstanceOf(TypeError);
  });
});
