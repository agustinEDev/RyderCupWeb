import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Lo que se borra de la cuenta en un cierre duro (revocación, sesión caducada,
 * CSRF). `utils/deviceRevocationLogout` ya no importa los servicios que guardan
 * cosas de la cuenta (utils no importa services): tiene un registro de
 * limpiezas y este módulo de la composition root lo rellena.
 *
 * Si el registro se queda sin rellenar no falla nada a la vista: la siguiente
 * persona que entre en ese móvil vería las partidas sin cobertura, el modal del
 * hándicap, el número de Actividad o, sin cobertura, el nombre y el correo de la
 * cuenta anterior. Por eso se vigila aquí que main.jsx lo cargue el primero y
 * que estén las cuatro.
 */

const orden = vi.hoisted(() => []);
vi.mock('../services/loUltimoConocido', () => ({
  olvidaLoDeEstaCuenta: vi.fn(() => orden.push('loUltimoConocido')),
}));
vi.mock('../services/refrescoDeHandicapApuntes', () => ({
  olvidaElRefrescoDeHandicap: vi.fn(() => orden.push('refrescoDeHandicap')),
}));
vi.mock('../services/novedadesDeActividad', () => ({
  olvidaLasNovedades: vi.fn(() => orden.push('novedades')),
}));
vi.mock('../services/sesionCompartida', async (original) => ({
  ...(await original()),
  olvidaLaCopiaParaArrancarSinCobertura: vi.fn(() => orden.push('sesionConocida')),
}));
vi.mock('../utils/toast', () => ({
  default: { error: vi.fn(), success: vi.fn(), info: vi.fn(), dismiss: vi.fn() },
}));
vi.mock('../utils/sentryHelpers', () => ({ clearUserContext: vi.fn() }));
vi.mock('i18next', () => ({ default: { t: vi.fn((clave) => clave) } }));

await import('./limpiezaAlCerrarLaSesion');
const { limpiaLaCuenta, handleDeviceRevocationLogout } = await import('../utils/deviceRevocationLogout');
const { olvidaElCierreDeEstaCarga } = await import('../utils/cierreDeEstaCarga');
const { anotaLaCuentaDeEstaPestana, olvidaLaCuentaDeEstaPestana } = await import('../utils/vueltaTrasEntrar');

describe('limpiezaAlCerrarLaSesion', () => {
  beforeEach(() => {
    orden.length = 0;
    olvidaElCierreDeEstaCarga();
    vi.stubGlobal('localStorage', { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() });
    delete globalThis.window.location;
    globalThis.window.location = { href: '', pathname: '/dashboard' };
    olvidaLaCuentaDeEstaPestana();
    anotaLaCuentaDeEstaPestana('u-1');
  });

  it('main.jsx lo importa el primero, antes que nada que pueda cerrar la sesión', () => {
    const main = readFileSync(resolve(globalThis.process.cwd(), 'src/main.jsx'), 'utf8');
    const primerImport = main.split('\n').find((linea) => linea.startsWith('import '));

    expect(primerImport).toBe("import './composition/limpiezaAlCerrarLaSesion';");
  });

  it('limpiaLaCuenta borra las cuatro cosas de la cuenta, en el orden de siempre', () => {
    limpiaLaCuenta();

    expect(orden).toEqual(['loUltimoConocido', 'refrescoDeHandicap', 'novedades', 'sesionConocida']);
  });

  it('un cierre forzado de verdad (dispositivo revocado) las ejecuta', () => {
    vi.useFakeTimers();
    try {
      handleDeviceRevocationLogout();
    } finally {
      vi.useRealTimers();
    }

    expect(orden).toEqual(['loUltimoConocido', 'refrescoDeHandicap', 'novedades', 'sesionConocida']);
  });
});
