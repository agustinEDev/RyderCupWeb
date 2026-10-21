import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * De punta a punta (hotfix 2.50.1): la aplicación lleva días abierta con los
 * Términos aceptados; se publica una versión nueva y, al volver a ella, el
 * guardia de rutas lleva a aceptarlos. Con la sesión, el guardia y `useAuth`
 * de verdad: solo se finge la red.
 *
 *   caso                                          | se ve
 *   ----------------------------------------------|-------------------------------
 *   vuelve al frente, ahora pendientes            | la pantalla de aceptar
 *   vuelve al frente, todo igual                  | el panel, sin volver a pintarse
 *   sin la vigilancia montada                     | el panel (la vigilancia es la que lo hace)
 */
const respuestas = [];
vi.mock('../utils/tokenRefreshInterceptor', () => ({
  fetchWithTokenRefresh: () => Promise.resolve(respuestas.shift()),
}));
vi.mock('../utils/deviceRevocationLogout', () => ({ clearDeviceRevocationFlag: vi.fn() }));

const { reiniciaLaSesionCompartida, MINIMO_ENTRE_REVALIDACIONES_MS } = await import('../services/sesionCompartida');
const { useRevalidacionDeLaSesion } = await import('./useRevalidacionDeLaSesion');
const { default: ProtectedRoute } = await import('../components/auth/ProtectedRoute');

const ok = (cuerpo) => ({ ok: true, status: 200, json: async () => cuerpo });
let ahora = 5_000_000;

const pintadasDelPanel = { n: 0 };
const Panel = () => {
  pintadasDelPanel.n += 1;
  return <p>panel</p>;
};
const Vigilancia = () => {
  useRevalidacionDeLaSesion();
  return null;
};

const abrir = ({ vigilando = true } = {}) =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      {vigilando && <Vigilancia />}
      <Routes>
        <Route path="/dashboard" element={<ProtectedRoute><Panel /></ProtectedRoute>} />
        <Route path="/accept-terms" element={<p>aceptar los Términos</p>} />
        <Route path="/login" element={<p>entrar</p>} />
      </Routes>
    </MemoryRouter>
  );

const vuelveAlFrente = async () => {
  await act(async () => {
    Object.defineProperty(globalThis.document, 'visibilityState', { value: 'visible', configurable: true });
    globalThis.document.dispatchEvent(new globalThis.Event('visibilitychange'));
    await new Promise((r) => setTimeout(r, 0));
  });
};

describe('useRevalidacionDeLaSesion · al volver, a aceptar los Términos', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockImplementation(() => ahora);
    reiniciaLaSesionCompartida();
    respuestas.length = 0;
    pintadasDelPanel.n = 0;
    try { localStorage.removeItem('rydercup-sesion-conocida'); } catch { /* sin almacenamiento */ }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('vuelve al frente con los Términos ya pendientes: a aceptarlos', async () => {
    respuestas.push(ok({ id: 'u-1', terms_accepted: true }));
    abrir();
    expect(await screen.findByText('panel')).toBeInTheDocument();

    ahora += MINIMO_ENTRE_REVALIDACIONES_MS + 1;
    respuestas.push(ok({ id: 'u-1', terms_accepted: false }));
    await vuelveAlFrente();

    expect(screen.getByText('aceptar los Términos')).toBeInTheDocument();
  });

  it('con todo igual, el panel ni se vuelve a pintar', async () => {
    respuestas.push(ok({ id: 'u-1', terms_accepted: true }));
    abrir();
    expect(await screen.findByText('panel')).toBeInTheDocument();
    const pintadas = pintadasDelPanel.n;

    ahora += MINIMO_ENTRE_REVALIDACIONES_MS + 1;
    respuestas.push(ok({ id: 'u-1', terms_accepted: true }));
    await vuelveAlFrente();

    expect(screen.getByText('panel')).toBeInTheDocument();
    expect(pintadasDelPanel.n).toBe(pintadas);
    expect(respuestas).toHaveLength(0);
  });

  it('sin la vigilancia montada no se entera', async () => {
    respuestas.push(ok({ id: 'u-1', terms_accepted: true }));
    abrir({ vigilando: false });
    expect(await screen.findByText('panel')).toBeInTheDocument();

    ahora += MINIMO_ENTRE_REVALIDACIONES_MS + 1;
    respuestas.push(ok({ id: 'u-1', terms_accepted: false }));
    await vuelveAlFrente();

    expect(screen.getByText('panel')).toBeInTheDocument();
  });
});
