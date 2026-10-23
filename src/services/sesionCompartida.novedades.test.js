import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Sin sesión al arrancar —o al revalidar—, el número de Actividad y el del
 * icono se olvidan: pueden ser de la cuenta que había antes en el dispositivo
 * y que salió por un camino que no limpió (revisión FE-1).
 */
const respuestas = [];
vi.mock('../utils/tokenRefreshInterceptor', () => ({
  fetchWithTokenRefresh: () => Promise.resolve(respuestas.shift()),
}));
vi.mock('../utils/deviceRevocationLogout', () => ({
  isDeviceRevoked: () => false,
  handleDeviceRevocationLogout: vi.fn(),
  clearDeviceRevocationFlag: vi.fn(),
}));
const olvida = vi.fn();
vi.mock('./novedadesDeActividad', () => ({ olvidaLasNovedades: () => olvida() }));

const { consultaLaSesion, reiniciaLaSesionCompartida } = await import('./sesionCompartida');

describe('sesionCompartida · el número de Actividad sin sesión', () => {
  beforeEach(() => {
    reiniciaLaSesionCompartida();
    respuestas.length = 0;
    olvida.mockClear();
  });

  it.each([401, 404])('the server says there is no session (%s): forgets it', async (status) => {
    respuestas.push({ ok: false, status, json: async () => ({}) });

    await consultaLaSesion();

    expect(olvida).toHaveBeenCalledTimes(1);
  });

  it('with a session it keeps it', async () => {
    respuestas.push({ ok: true, status: 200, json: async () => ({ id: 'u-1' }) });

    await consultaLaSesion();

    expect(olvida).not.toHaveBeenCalled();
  });
});
