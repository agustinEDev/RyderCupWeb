import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';

/**
 * En las rutas públicas no hay guardia que lleve a aceptar los Términos
 * (hotfix 2.50.1): quien solo abre el enlace de una clasificación compartida
 * no veía nunca la pantalla. Un aviso arriba, que no bloquea.
 *
 *   #   caso                                                  | se ve
 *   ----|-------------------------------------------------------|---------------------------
 *   1   clasificación pública, sesión confirmada, pendientes  | el aviso y «Aceptarlos»
 *   2   «Aceptarlos»                                          | a /accept-terms, recordando de dónde
 *   3   sin sesión                                            | nada
 *   4   aceptados                                             | nada
 *   5   sin el campo (backend antiguo)                        | nada
 *   6   sesión sin confirmar (la copia del dispositivo)       | nada
 *   7   las páginas legales (también con barra final)     | nada: se leen sin estorbos
 *   8   /accept-terms y las rutas privadas                    | nada: ahí manda el guardia
 *   9   se aceptan con la página abierta                      | se va sin recargar
 *   10  con barra final en la dirección                       | el aviso igual
 *   11  el resto de públicas: entrar, registrarse, Google,    | nada: solo en la clasificación
 *       restablecer, verificar, portada, arranque, precios    |   compartida (revisión)
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
}));
const fallo = { si: false };
vi.mock('../../utils/tokenRefreshInterceptor', () => ({
  fetchWithTokenRefresh: () => (fallo.si ? Promise.reject(new TypeError('Failed to fetch')) : Promise.resolve({ ok: false, status: 401 })),
}));
vi.mock('../../utils/deviceRevocationLogout', () => ({ clearDeviceRevocationFlag: vi.fn() }));

const { anotaLaSesion, consultaLaSesion, reiniciaLaSesionCompartida } = await import('../../services/sesionCompartida');
const { default: AvisoTerminosPendientes } = await import('./AvisoTerminosPendientes');

const CLASIFICACION = '/competitions/c-1/leaderboard';
const PENDIENTES = { id: 'u-1', terms_accepted: false };

const PantallaDeAceptar = () => {
  const location = useLocation();
  return <p>aceptar desde {location.state?.from?.pathname ?? 'ninguna'}</p>;
};

const abrir = (ruta) =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <AvisoTerminosPendientes />
      <Routes>
        <Route path="/accept-terms" element={<PantallaDeAceptar />} />
        <Route path="*" element={<p>pantalla</p>} />
      </Routes>
    </MemoryRouter>
  );

const aviso = () => screen.queryByTestId('aviso-terminos-pendientes');

describe('AvisoTerminosPendientes', () => {
  beforeEach(() => {
    reiniciaLaSesionCompartida();
    fallo.si = false;
    try { localStorage.removeItem('rydercup-sesion-conocida'); } catch { /* sin almacenamiento */ }
  });

  afterEach(() => {
    reiniciaLaSesionCompartida();
    vi.restoreAllMocks();
  });

  it('1: en la clasificación pública, con los Términos pendientes, avisa', () => {
    anotaLaSesion(PENDIENTES);
    abrir(CLASIFICACION);

    expect(aviso()).toHaveTextContent('avisoTerminos.texto');
    expect(screen.getByRole('link', { name: 'avisoTerminos.aceptar' })).toHaveAttribute('href', '/accept-terms');
    // No bloquea: la pantalla sigue ahí
    expect(screen.getByText('pantalla')).toBeInTheDocument();
  });

  it('2: «Aceptarlos» lleva a aceptarlos, recordando de dónde venía', () => {
    anotaLaSesion(PENDIENTES);
    abrir(CLASIFICACION);

    fireEvent.click(screen.getByRole('link', { name: 'avisoTerminos.aceptar' }));

    expect(screen.getByText(`aceptar desde ${CLASIFICACION}`)).toBeInTheDocument();
  });

  it('3: sin sesión no avisa', async () => {
    await consultaLaSesion();
    abrir(CLASIFICACION);

    expect(aviso()).toBeNull();
  });

  it.each([
    ['4: aceptados', { id: 'u-1', terms_accepted: true }],
    ['5: sin el campo (backend antiguo)', { id: 'u-1' }],
  ])('%s: no avisa', (_caso, usuario) => {
    anotaLaSesion(usuario);
    abrir(CLASIFICACION);

    expect(aviso()).toBeNull();
  });

  it('6: con la sesión sin confirmar (la copia del dispositivo) no avisa', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('rydercup-sesion-conocida', JSON.stringify(PENDIENTES));
    fallo.si = true;
    await consultaLaSesion();
    abrir(CLASIFICACION);

    expect(aviso()).toBeNull();
  });

  it.each(['/terms', '/privacy', '/cookies', '/legal', '/terms/'])('7: en %s no avisa: se lee sin estorbos', (ruta) => {
    anotaLaSesion(PENDIENTES);
    abrir(ruta);

    expect(aviso()).toBeNull();
  });

  it.each(['/accept-terms', '/dashboard', '/competitions/c-1'])('8: en %s no avisa: ahí manda el guardia', (ruta) => {
    anotaLaSesion(PENDIENTES);
    abrir(ruta);

    expect(aviso()).toBeNull();
  });

  it('9: al aceptarlos con la página abierta, se va sin recargar', () => {
    anotaLaSesion(PENDIENTES);
    abrir(CLASIFICACION);
    expect(aviso()).not.toBeNull();

    act(() => anotaLaSesion({ id: 'u-1', terms_accepted: true }));

    expect(aviso()).toBeNull();
  });

  it.each([
    '/',
    '/start',
    '/login',
    '/register',
    '/auth/google/callback',
    '/reset-password/abc',
    '/verify-email',
    '/forgot-password',
    '/pricing',
    '/contact',
    '/competitions/c-1/leaderboard/print',
  ])('11: en %s no avisa: solo en la clasificación compartida', (ruta) => {
    anotaLaSesion(PENDIENTES);
    abrir(ruta);

    expect(aviso()).toBeNull();
  });

  it('10: con barra final en la dirección, avisa igual', () => {
    anotaLaSesion(PENDIENTES);
    abrir(`${CLASIFICACION}/`);

    expect(aviso()).not.toBeNull();
  });
});
