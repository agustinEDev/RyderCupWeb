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
 *   N7 | el cliente existe pero sin el seguimiento de navegación | no se instrumenta
 *
 * Que Sentry nombre de verdad la carga y las navegaciones: `navegacionesEnSentry.real.test.js`.
 */
const sentry = vi.hoisted(() => ({ cliente: null, envolver: vi.fn() }));
vi.mock('@sentry/react', () => ({
  getClient: () => sentry.cliente,
  wrapCreateBrowserRouterV7: (crear) => (rutas, opciones) => {
    sentry.envolver(crear(rutas, opciones), rutas);
  },
}));

const conSeguimiento = { getIntegrationByName: (nombre) => (nombre === 'BrowserTracing' ? {} : undefined) };
const sinSeguimiento = { getIntegrationByName: () => undefined };
const RUTAS = [{ path: '/' }];

let modulo;
beforeEach(async () => {
  vi.resetModules();
  sentry.cliente = null;
  sentry.envolver.mockClear();
  modulo = await import('./navegacionesEnSentry');
});

describe('navegaciones en Sentry', () => {
  it('N1: sin Sentry cargado, registrar no instrumenta', () => {
    modulo.registrarRouterParaSentry({ id: 'r1' }, RUTAS);

    expect(sentry.envolver).not.toHaveBeenCalled();
  });

  it('N2: con Sentry ya cargado, registrar instrumenta ESE router, una vez', () => {
    sentry.cliente = conSeguimiento;
    const router = { id: 'r1' };

    modulo.registrarRouterParaSentry(router, RUTAS);

    expect(sentry.envolver).toHaveBeenCalledTimes(1);
    expect(sentry.envolver).toHaveBeenCalledWith(router, RUTAS);
  });

  it('N3: si Sentry llega después, se instrumenta al llegar', () => {
    const router = { id: 'r1' };
    modulo.registrarRouterParaSentry(router, RUTAS);
    sentry.cliente = conSeguimiento;

    modulo.instrumentarRouterEnSentry();

    expect(sentry.envolver).toHaveBeenCalledTimes(1);
    expect(sentry.envolver).toHaveBeenCalledWith(router, RUTAS);
  });

  it('N4: dos llegadas, o registro y llegada cruzados: una sola vez', () => {
    sentry.cliente = conSeguimiento;
    modulo.registrarRouterParaSentry({ id: 'r1' }, RUTAS);

    modulo.instrumentarRouterEnSentry();
    modulo.instrumentarRouterEnSentry();

    expect(sentry.envolver).toHaveBeenCalledTimes(1);
  });

  it('N5: si llega sin router, nada; al registrarse, se instrumenta', () => {
    sentry.cliente = conSeguimiento;
    modulo.instrumentarRouterEnSentry();
    expect(sentry.envolver).not.toHaveBeenCalled();

    modulo.registrarRouterParaSentry({ id: 'r1' }, RUTAS);

    expect(sentry.envolver).toHaveBeenCalledTimes(1);
  });

  it('N6: otro montaje con otro router: se instrumenta el nuevo', () => {
    sentry.cliente = conSeguimiento;
    modulo.registrarRouterParaSentry({ id: 'r1' }, RUTAS);
    const nuevo = { id: 'r2' };

    modulo.registrarRouterParaSentry(nuevo, RUTAS);

    expect(sentry.envolver).toHaveBeenCalledTimes(2);
    expect(sentry.envolver).toHaveBeenLastCalledWith(nuevo, RUTAS);
  });

  it('N7: con cliente pero sin el seguimiento de navegación, no', () => {
    sentry.cliente = sinSeguimiento;

    modulo.registrarRouterParaSentry({ id: 'r1' }, RUTAS);
    modulo.instrumentarRouterEnSentry();

    expect(sentry.envolver).not.toHaveBeenCalled();
  });
});
