import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * El router de datos se crea al montar la aplicación, y el seguimiento de
 * navegaciones de Sentry llega ~2 s después (main.jsx lo carga diferido). Su
 * envoltorio solo instrumenta routers que crea con la configuración ya puesta,
 * así que se le pasa el NUESTRO cuando llega (revisor, FE #647 fase 1).
 *
 *   #  | caso                                                   | esperado
 *   ---|--------------------------------------------------------|-------------------------------
 *   N1 | se registra el router sin Sentry cargado               | no se instrumenta (aún)
 *   N2 | se registra con Sentry ya cargado                      | se instrumenta, una vez
 *   N3 | Sentry llega después                                   | se instrumenta al llegar
 *   N4 | llega dos veces, o registro y llegada se cruzan        | una sola instrumentación
 *   N5 | llega sin router registrado                            | nada; al registrarse, sí
 *   N6 | otro montaje registra otro router                      | se instrumenta el nuevo
 *   N10| el envoltorio de Sentry lanza                          | no rompe; se reintenta al llegar otra vez
 *   N7 | el cliente existe pero sin el seguimiento de navegación | no se instrumenta
 *   N11| el orden de producción: App registra, luego llega src/sentry.ts | se instrumenta al llegar
 *   N12| el módulo del seguimiento se vuelve a evaluar (HMR)    | el mismo router no se envuelve dos veces
 *
 * Que Sentry nombre de verdad la carga y las navegaciones: `navegacionesEnSentry.real.test.js`.
 */
const sentry = vi.hoisted(() => ({ cliente: null, envolver: vi.fn(), falla: false }));
vi.mock('@sentry/react', () => ({
  getClient: () => sentry.cliente,
  // Sin carga de página activa: el nombre lo prueban los tests con Sentry de verdad
  getActiveSpan: () => undefined,
  getRootSpan: (span) => span,
  spanToJSON: () => ({}),
  wrapCreateBrowserRouterV7: (crear) => (rutas, opciones) => {
    if (sentry.falla) throw new Error('Sentry cambió por dentro');
    sentry.envolver(crear(rutas, opciones), rutas);
  },
}));

const conSeguimiento = { getIntegrationByName: (nombre) => (nombre === 'BrowserTracing' ? {} : undefined) };
const sinSeguimiento = { getIntegrationByName: () => undefined };
const RUTAS = [{ path: '/' }];

let modulo;
let registro;
beforeEach(async () => {
  vi.resetModules();
  sentry.cliente = null;
  sentry.envolver.mockClear();
  sentry.falla = false;
  // El registro, en su módulo sin Sentry (lo importa App.jsx); el seguimiento
  // llega aparte, con src/sentry.ts
  registro = await import('./routerParaSentry');
  modulo = await import('./navegacionesEnSentry');
});

describe('navegaciones en Sentry', () => {
  it('N1: sin Sentry cargado, registrar no instrumenta', () => {
    registro.registrarRouterParaSentry({ id: 'r1', state: { historyAction: 'POP' }, subscribe: () => () => {} }, RUTAS);

    expect(sentry.envolver).not.toHaveBeenCalled();
  });

  it('N2: con Sentry ya cargado, registrar instrumenta ESE router, una vez', () => {
    sentry.cliente = conSeguimiento;
    const router = { id: 'r1', state: { historyAction: 'POP' }, subscribe: () => () => {} };

    registro.registrarRouterParaSentry(router, RUTAS);

    expect(sentry.envolver).toHaveBeenCalledTimes(1);
    expect(sentry.envolver).toHaveBeenCalledWith(router, RUTAS);
  });

  it('N3: si Sentry llega después, se instrumenta al llegar', () => {
    const router = { id: 'r1', state: { historyAction: 'POP' }, subscribe: () => () => {} };
    registro.registrarRouterParaSentry(router, RUTAS);
    sentry.cliente = conSeguimiento;

    modulo.instrumentarRouterEnSentry();

    expect(sentry.envolver).toHaveBeenCalledTimes(1);
    expect(sentry.envolver).toHaveBeenCalledWith(router, RUTAS);
  });

  it('N4: dos llegadas, o registro y llegada cruzados: una sola vez', () => {
    sentry.cliente = conSeguimiento;
    registro.registrarRouterParaSentry({ id: 'r1', state: { historyAction: 'POP' }, subscribe: () => () => {} }, RUTAS);

    modulo.instrumentarRouterEnSentry();
    modulo.instrumentarRouterEnSentry();

    expect(sentry.envolver).toHaveBeenCalledTimes(1);
  });

  it('N5: si llega sin router, nada; al registrarse, se instrumenta', () => {
    sentry.cliente = conSeguimiento;
    modulo.instrumentarRouterEnSentry();
    expect(sentry.envolver).not.toHaveBeenCalled();

    registro.registrarRouterParaSentry({ id: 'r1', state: { historyAction: 'POP' }, subscribe: () => () => {} }, RUTAS);

    expect(sentry.envolver).toHaveBeenCalledTimes(1);
  });

  it('N6: otro montaje con otro router: se instrumenta el nuevo', () => {
    sentry.cliente = conSeguimiento;
    registro.registrarRouterParaSentry({ id: 'r1', state: { historyAction: 'POP' }, subscribe: () => () => {} }, RUTAS);
    const nuevo = { id: 'r2', state: { historyAction: 'POP' }, subscribe: () => () => {} };

    registro.registrarRouterParaSentry(nuevo, RUTAS);

    expect(sentry.envolver).toHaveBeenCalledTimes(2);
    expect(sentry.envolver).toHaveBeenLastCalledWith(nuevo, RUTAS);
  });

  it('N10: si el envoltorio de Sentry lanza, no rompe y se reintenta', () => {
    sentry.cliente = conSeguimiento;
    sentry.falla = true;

    expect(() => registro.registrarRouterParaSentry({ id: 'r1', state: { historyAction: 'POP' }, subscribe: () => () => {} }, RUTAS)).not.toThrow();
    sentry.falla = false;
    modulo.instrumentarRouterEnSentry();

    expect(sentry.envolver).toHaveBeenCalledTimes(1);
  });

  it('N7: con cliente pero sin el seguimiento de navegación, no', () => {
    sentry.cliente = sinSeguimiento;

    registro.registrarRouterParaSentry({ id: 'r1', state: { historyAction: 'POP' }, subscribe: () => () => {} }, RUTAS);
    modulo.instrumentarRouterEnSentry();

    expect(sentry.envolver).not.toHaveBeenCalled();
  });

  it('N11: el orden de producción: App registra su router y el seguimiento llega después', async () => {
    vi.resetModules();
    sentry.cliente = conSeguimiento;
    // App.jsx: solo el registro, sin cargar el seguimiento
    const deLaApp = await import('./routerParaSentry');
    const router = { id: 'r1', state: { historyAction: 'POP' }, subscribe: () => () => {} };
    deLaApp.registrarRouterParaSentry(router, RUTAS);
    expect(sentry.envolver).not.toHaveBeenCalled();

    // src/sentry.ts, ~2 s después: carga el seguimiento y lo pone
    const seguimiento = await import('./navegacionesEnSentry');
    seguimiento.instrumentarRouterEnSentry();

    expect(sentry.envolver).toHaveBeenCalledTimes(1);
    expect(sentry.envolver).toHaveBeenCalledWith(router, RUTAS);
  });

  it('N12: si el seguimiento se vuelve a evaluar (HMR), el mismo router no se envuelve otra vez', async () => {
    sentry.cliente = conSeguimiento;
    const router = { id: 'r1', state: { historyAction: 'POP' }, subscribe: () => () => {} };
    registro.registrarRouterParaSentry(router, RUTAS);
    expect(sentry.envolver).toHaveBeenCalledTimes(1);

    // Otra evaluación del módulo del seguimiento, con el mismo registro
    const otraEvaluacion = await import('./navegacionesEnSentry.js?otra-evaluacion');
    otraEvaluacion.instrumentarRouterEnSentry();
    registro.registrarRouterParaSentry(router, RUTAS);

    expect(sentry.envolver).toHaveBeenCalledTimes(1);
  });
});
