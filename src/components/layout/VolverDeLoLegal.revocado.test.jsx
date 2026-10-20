import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

/**
 * «Volver» de lo legal con el dispositivo revocado, con el `AuthProvider` de
 * verdad: lo que la cuenta dejó guardado para anotar sin cobertura y el
 * hándicap pendiente se olvidan, como en `handleDeviceRevocationLogout`, pero
 * se sale a la portada y no a /login.
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
}));

vi.mock('../../utils/tokenRefreshInterceptor', () => ({
  refreshAccessToken: vi.fn(),
  fetchWithTokenRefresh: vi.fn(),
}));

vi.mock('../../services/loUltimoConocido', () => ({ olvidaLoDeEstaCuenta: vi.fn() }));
vi.mock('../../services/refrescoDeHandicapApuntes', () => ({ olvidaElRefrescoDeHandicap: vi.fn() }));
vi.mock('../../utils/sentryHelpers', () => ({ clearUserContext: vi.fn() }));

const { olvidaLoDeEstaCuenta } = await import('../../services/loUltimoConocido');
const { olvidaElRefrescoDeHandicap } = await import('../../services/refrescoDeHandicapApuntes');
const { clearUserContext } = await import('../../utils/sentryHelpers');
const { AuthProvider } = await import('../../contexts/AuthContext');
const { default: VolverDeLoLegal } = await import('./VolverDeLoLegal');
const { ESTADO_DE_LA_SESION, estadoDeLaSesion } = await import('../../services/sesionEnPaginaPublica');

const REVOCADO = { detail: 'Dispositivo revocado. Por favor, inicia sesión nuevamente.' };
const respuesta = (status, cuerpo = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => cuerpo,
});

let almacen;
const fetchFalso = vi.fn();

beforeEach(() => {
  almacen = { user: JSON.stringify({ id: 'u1', email: 'a@b.es' }) };
  vi.stubGlobal('localStorage', {
    getItem: (clave) => almacen[clave] ?? null,
    setItem: (clave, valor) => {
      almacen[clave] = String(valor);
    },
    removeItem: (clave) => {
      delete almacen[clave];
    },
  });
  vi.stubGlobal('fetch', fetchFalso);
  fetchFalso.mockReset();
  vi.mocked(olvidaLoDeEstaCuenta).mockReset();
  vi.mocked(olvidaElRefrescoDeHandicap).mockReset();
  vi.mocked(clearUserContext).mockReset();
  window.history.replaceState(null, '');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('L4 · dispositivo revocado', () => {
  it('L4a: la consulta lo distingue de una sesión muerta', async () => {
    fetchFalso.mockResolvedValueOnce(respuesta(401, REVOCADO));

    expect(await estadoDeLaSesion()).toBe(ESTADO_DE_LA_SESION.REVOCADA);
    expect(ESTADO_DE_LA_SESION.REVOCADA).not.toBe(ESTADO_DE_LA_SESION.MUERTA);
  });

  it('L4b: olvida lo de esta cuenta y el hándicap pendiente, y va a la portada', async () => {
    fetchFalso.mockResolvedValueOnce(respuesta(401, REVOCADO));
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/terms']}>
          <Routes>
            <Route path="/" element={<p>portada</p>} />
            <Route path="/login" element={<p>acceso</p>} />
            <Route path="/terms" element={<VolverDeLoLegal />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'volver' }));
    });

    expect(screen.getByText('portada')).toBeInTheDocument();
    expect(olvidaLoDeEstaCuenta).toHaveBeenCalled();
    expect(olvidaElRefrescoDeHandicap).toHaveBeenCalled();
    expect(clearUserContext).toHaveBeenCalledTimes(1);
    expect(almacen.user).toBeUndefined();
    expect(almacen.device_revocation_handled).toBeUndefined();
  });
});
