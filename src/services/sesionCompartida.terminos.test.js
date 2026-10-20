import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Revisión (punto 1): tras aceptar los Términos, la copia de la sesión que
 * guarda el dispositivo (`rydercup-sesion-conocida`) tiene que decirlo también.
 * Si no, al abrir la aplicación sin cobertura se arranca con la copia vieja
 * —`terms_accepted: false`—, el guardia manda a aceptar, la cola de anotaciones
 * se queda apagada y aceptar necesita una red que no hay.
 */
vi.mock('../utils/tokenRefreshInterceptor', () => ({ fetchWithTokenRefresh: vi.fn() }));
vi.mock('../utils/deviceRevocationLogout', () => ({ clearDeviceRevocationFlag: vi.fn() }));

const { fetchWithTokenRefresh } = await import('../utils/tokenRefreshInterceptor');
const { anotaLaSesion, consultaLaSesion, olvidaLaSesion, reiniciaLaSesionCompartida, loQueHaySobreLaSesion } =
  await import('./sesionCompartida');

const USUARIO = { id: 'u-1', email: 'ana@example.com', first_name: 'Ana', last_name: 'Prueba' };

describe('sesionCompartida · la copia del dispositivo tras aceptar los Términos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    olvidaLaSesion();
    reiniciaLaSesionCompartida();
  });

  afterEach(() => {
    olvidaLaSesion();
    reiniciaLaSesionCompartida();
  });

  it('sembrar la sesión actualiza también la copia del dispositivo', () => {
    anotaLaSesion({ ...USUARIO, terms_accepted: true });

    expect(JSON.parse(globalThis.localStorage.getItem('rydercup-sesion-conocida'))).toMatchObject({ terms_accepted: true });
  });

  it('arranque sin cobertura tras aceptar: se entra con los Términos aceptados', async () => {
    // La sesión de antes, confirmada por el servidor con los Términos pendientes
    fetchWithTokenRefresh.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ...USUARIO, terms_accepted: false }) });
    await consultaLaSesion();
    expect(loQueHaySobreLaSesion().user.terms_accepted).toBe(false);

    // Se aceptan: la pantalla siembra la sesión con la respuesta de accept-terms
    anotaLaSesion({ ...USUARIO, terms_accepted: true });

    // Se cierra la aplicación y se abre sin cobertura
    reiniciaLaSesionCompartida();
    fetchWithTokenRefresh.mockRejectedValue(new TypeError('Failed to fetch'));
    await consultaLaSesion();

    expect(loQueHaySobreLaSesion().user).toMatchObject({ id: 'u-1', terms_accepted: true });
  });
});
