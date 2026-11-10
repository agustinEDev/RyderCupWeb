import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * La copia del usuario para arrancar sin cobertura (`rydercup-sesion-conocida`) guarda
 * solo lo permitido (fase 3, FE-06, opción A); en memoria el usuario sigue completo.
 *
 *   S1 sesión confirmada por el servidor  | memoria completa; copia sin correo, género…
 *   S2 sembrada tras aceptar los Términos | copia reducida, con terms_accepted
 *   S3 arranque sin red con la copia      | se entra con id, nombre, Términos y avatar;
 *                                         | sin correo ni género (el perfil pinta «—»)
 *   S4 copia completa de antes            | se reescribe reducida al arrancar (módulo nuevo)
 *   S5 el servidor dice que no hay sesión | la misma limpieza que salir (registro único)
 *   S6 copia completa escrita tras arrancar | se lee reducida igual
 */
vi.mock('../infrastructure/http/tokenRefreshInterceptor', () => ({ fetchWithTokenRefresh: vi.fn() }));
const limpieza = vi.hoisted(() => ({ olvidaLoGuardadoDeLaCuenta: vi.fn() }));
vi.mock('../infrastructure/http/deviceRevocationLogout', () => ({
  clearDeviceRevocationFlag: vi.fn(),
  olvidaLoGuardadoDeLaCuenta: limpieza.olvidaLoGuardadoDeLaCuenta,
}));

const RECUERDO = 'rydercup-sesion-conocida';
const COMPLETO = {
  id: 'u-1',
  email: 'ana@example.com',
  pending_email: 'nueva@example.com',
  first_name: 'Ana',
  last_name: 'Prueba',
  alias: null,
  gender: 'FEMALE',
  handicap: 12.4,
  country_code: 'ES',
  updated_at: '2026-11-01T00:00:00Z',
  email_verified: true,
  terms_accepted: true,
  is_admin: false,
};
const PROHIBIDOS = ['email', 'pending_email', 'gender', 'handicap', 'country_code'];

const cargar = async () => {
  vi.resetModules();
  const { fetchWithTokenRefresh } = await import('../infrastructure/http/tokenRefreshInterceptor');
  const sesion = await import('./sesionCompartida');
  return { fetchWithTokenRefresh, ...sesion };
};

const copia = () => JSON.parse(globalThis.localStorage.getItem(RECUERDO));

describe('sesionCompartida · copia reducida del usuario (fase 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.localStorage.clear();
  });

  afterEach(() => globalThis.localStorage.clear());

  it('S1: con sesión, la memoria lleva todo y la copia solo lo permitido', async () => {
    const { fetchWithTokenRefresh, consultaLaSesion, loQueHaySobreLaSesion } = await cargar();
    fetchWithTokenRefresh.mockResolvedValueOnce({ ok: true, status: 200, json: async () => COMPLETO });

    await consultaLaSesion();

    expect(loQueHaySobreLaSesion().user).toEqual(COMPLETO);
    for (const campo of PROHIBIDOS) expect(copia()).not.toHaveProperty(campo);
    expect(copia()).toMatchObject({ id: 'u-1', first_name: 'Ana', terms_accepted: true, email_verified: true });
  });

  it('S2: sembrada tras aceptar los Términos, también reducida', async () => {
    const { anotaLaSesion } = await cargar();

    anotaLaSesion(COMPLETO);

    for (const campo of PROHIBIDOS) expect(copia()).not.toHaveProperty(campo);
    expect(copia()).toMatchObject({ terms_accepted: true });
  });

  it('S3: sin red, se arranca con la copia: lo justo, sin correo ni género', async () => {
    const primera = await cargar();
    primera.fetchWithTokenRefresh.mockResolvedValueOnce({ ok: true, status: 200, json: async () => COMPLETO });
    await primera.consultaLaSesion();

    const { fetchWithTokenRefresh, consultaLaSesion, loQueHaySobreLaSesion } = await cargar();
    fetchWithTokenRefresh.mockRejectedValue(new TypeError('Failed to fetch'));
    await consultaLaSesion();

    const { user, sinConfirmar } = loQueHaySobreLaSesion();
    expect(sinConfirmar).toBe(true);
    expect(user).toMatchObject({ id: 'u-1', first_name: 'Ana', terms_accepted: true, updated_at: COMPLETO.updated_at });
    for (const campo of PROHIBIDOS) expect(user).not.toHaveProperty(campo);
  });

  it('S4: una copia completa de antes se reescribe reducida al arrancar', async () => {
    globalThis.localStorage.setItem(RECUERDO, JSON.stringify(COMPLETO));

    await cargar();

    for (const campo of PROHIBIDOS) expect(copia()).not.toHaveProperty(campo);
    expect(copia()).toMatchObject({ id: 'u-1', first_name: 'Ana' });
  });

  it('S6: una copia completa escrita después de arrancar (otra pestaña con la versión de antes) se lee reducida', async () => {
    const { fetchWithTokenRefresh, consultaLaSesion, loQueHaySobreLaSesion } = await cargar();
    globalThis.localStorage.setItem(RECUERDO, JSON.stringify(COMPLETO));
    fetchWithTokenRefresh.mockRejectedValue(new TypeError('Failed to fetch'));

    await consultaLaSesion();

    const { user } = loQueHaySobreLaSesion();
    expect(user).toMatchObject({ id: 'u-1', terms_accepted: true });
    for (const campo of PROHIBIDOS) expect(user).not.toHaveProperty(campo);
  });

  it.each([401, 404])('S5: sin sesión (%s) hace la misma limpieza que salir', async (status) => {
    const { fetchWithTokenRefresh, consultaLaSesion } = await cargar();
    fetchWithTokenRefresh.mockResolvedValueOnce({ ok: false, status, json: async () => ({}) });

    await consultaLaSesion();

    expect(limpieza.olvidaLoGuardadoDeLaCuenta).toHaveBeenCalledTimes(1);
  });

  it('S5b: un fallo de red NO limpia nada (anotar sin cobertura)', async () => {
    const { fetchWithTokenRefresh, consultaLaSesion } = await cargar();
    fetchWithTokenRefresh.mockRejectedValue(new TypeError('Failed to fetch'));

    await consultaLaSesion();

    expect(limpieza.olvidaLoGuardadoDeLaCuenta).not.toHaveBeenCalled();
  });
});
