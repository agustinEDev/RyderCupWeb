import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * El puerto por el que el transporte pide a la interfaz lo que no puede hacer él
 * (traducir, avisar, Sentry, la página para volver, si una ruta es pública).
 *
 * | Caso                                             | Esperado                                   |
 * |--------------------------------------------------|--------------------------------------------|
 * | sin registrar, se usa                            | lanza «no hay interfaz … registrada»       |
 * | sin registrar, un cierre forzado                 | el mismo error, en voz alta                |
 * | sin registrar, un error de la API que se traduce | el mismo error, no un texto vacío          |
 * | se registra a medias                             | lanza y dice qué falta                     |
 * | se registra entera                               | `interfaz()` la devuelve                   |
 * | la composition root la registra                  | trae todo lo que hace falta                |
 * | main.jsx                                         | la carga antes que la aplicación           |
 */
const SIN_INTERFAZ = /No hay interfaz del transporte registrada: falta importar composition\/interfazDelTransporte/;

const COMPLETA = () =>
  Object.fromEntries(
    [
      'avisaASentryDelCierre',
      'olvidaElUsuarioDeSentry',
      'avisaAlUsuarioDelCierre',
      'ultimaCuentaDeEstaPestana',
      'redirigeAlLogin',
      'sinSesionEnRutaPublica',
      'traduce',
      'informaDelError',
      'llevaAAceptarLosTerminos',
      'silenciaElAviso',
    ].map((nombre) => [nombre, vi.fn()])
  );

describe('la interfaz del transporte', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('sin registrar, usarla lanza', async () => {
    const { interfaz } = await import('./interfazDelTransporte');

    expect(() => interfaz()).toThrow(SIN_INTERFAZ);
  });

  it('sin registrar, un cierre forzado falla en voz alta', async () => {
    const { alCerrarLaSesion, handleDeviceRevocationLogout } = await import('./deviceRevocationLogout');
    alCerrarLaSesion(() => {});
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn() });

    expect(() => handleDeviceRevocationLogout(null)).toThrow(SIN_INTERFAZ);
  });

  it('sin registrar, un 429 de la API no sale con un texto vacío: lanza', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 429, statusText: 'Too Many', json: async () => ({}) })));
    const { apiRequest } = await import('./api');

    await expect(apiRequest('/api/v1/x')).rejects.toThrow(SIN_INTERFAZ);
  });

  it('registrada a medias, dice qué le falta', async () => {
    const { registraLaInterfazDelTransporte } = await import('./interfazDelTransporte');
    const aMedias = COMPLETA();
    delete aMedias.traduce;
    delete aMedias.redirigeAlLogin;

    expect(() => registraLaInterfazDelTransporte(aMedias)).toThrow(
      'La interfaz del transporte no trae: redirigeAlLogin, traduce'
    );
  });

  it('registrada entera, es la que se usa', async () => {
    const { registraLaInterfazDelTransporte, interfaz } = await import('./interfazDelTransporte');
    const completa = COMPLETA();

    registraLaInterfazDelTransporte(completa);

    expect(interfaz()).toBe(completa);
  });

  it('la composition root la registra con todo', async () => {
    await import('../../composition/interfazDelTransporte');
    const { interfaz } = await import('./interfazDelTransporte');

    expect(Object.keys(interfaz()).sort()).toEqual(Object.keys(COMPLETA()).sort());
  });

  it('main.jsx la carga antes que la aplicación (y que nada que llame a la API)', () => {
    const lineas = readFileSync(resolve(globalThis.process.cwd(), 'src/main.jsx'), 'utf8').split('\n');
    const cableado = lineas.indexOf("import './composition/interfazDelTransporte';");
    const app = lineas.findIndex((linea) => linea.startsWith('import App '));

    expect(cableado).toBeGreaterThan(-1);
    expect(cableado).toBeLessThan(app);
  });
});
