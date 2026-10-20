import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';

/**
 * F3: la pantalla de aceptación de los Términos.
 *
 *   caso                                              | qué pasa
 *   --------------------------------------------------|---------------------------------------
 *   se pinta                                          | casilla, privacidad informada, aceptar, dispositivos y salir
 *   sin cabecera ni avatar                            | nada que dé 403 hasta aceptar
 *   aceptar sin marcar                                | error accesible, no se llama al backend
 *   aceptar marcada                                   | accept-terms y se siembra la sesión con su respuesta (DTO)
 *   origen con hash                                   | vuelve allí, con el hash
 *   origen sin más / malicioso (\, tab, //, externo)  | al panel
 *   accept-terms falla                                | UN aviso (role=alert, sin toast), la casilla sigue marcada y se puede reintentar
 *   ya aceptados                                      | no se queda aquí
 *   llega desde un 403 (?from=) y la sesión dice otra cosa | se pinta igual: rebotar sería un bucle (revisión, punto 1)
 *   salir                                             | cierra la sesión
 */
const aceptar = vi.fn();
const anotaLaSesion = vi.fn();
const logout = vi.fn();
const toastError = vi.fn();
const sesion = vi.hoisted(() => ({ user: null }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
}));
vi.mock('../utils/toast', () => ({ default: { error: (...a) => toastError(...a), success: vi.fn(), info: vi.fn() } }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: sesion.user, loading: false, refetch: vi.fn() }) }));
vi.mock('../hooks/useLogout', () => ({ useLogout: () => ({ logout }) }));
vi.mock('../services/sesionCompartida', () => ({ anotaLaSesion: (...a) => anotaLaSesion(...a) }));
vi.mock('../composition', () => ({ acceptTermsUseCase: { execute: (...a) => aceptar(...a) } }));

const { default: AcceptTerms } = await import('./AcceptTerms');

const Competicion = () => {
  const { hash } = useLocation();
  return <p>la competición{hash}</p>;
};

const abrir = (entrada = { pathname: '/accept-terms', state: { from: { pathname: '/competitions/7' } } }) =>
  render(
    <MemoryRouter initialEntries={[entrada]}>
      <Routes>
        <Route path="/accept-terms" element={<AcceptTerms />} />
        <Route path="/competitions/:id" element={<Competicion />} />
        <Route path="/dashboard" element={<p>panel</p>} />
      </Routes>
    </MemoryRouter>
  );

const casilla = () => screen.getByRole('checkbox', { name: /register\.acceptTerms/ });
const botonAceptar = () => screen.getByRole('button', { name: 'acceptTermsPage.acceptButton' });
const DTO = { id: 'u-1', is_admin: true, terms_accepted: true };

const aceptarMarcando = () => {
  fireEvent.click(casilla());
  fireEvent.click(botonAceptar());
};

describe('AcceptTerms (F3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sesion.user = { id: 'u-1', terms_accepted: false };
    aceptar.mockResolvedValue({ user: { termsAccepted: true }, datosDelBackend: DTO });
  });

  it('pinta el título, la casilla, la privacidad informada, aceptar, dispositivos y salir', () => {
    abrir();

    expect(screen.getByRole('heading', { level: 1, name: 'acceptTermsPage.title' })).toBeInTheDocument();
    expect(casilla()).not.toBeChecked();
    expect(screen.getByRole('link', { name: 'register.privacyLink' })).toHaveAttribute('href', '/privacy');
    expect(botonAceptar()).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'acceptTermsPage.devices' })).toHaveAttribute('href', '/profile/devices');
    expect(screen.getByRole('button', { name: 'acceptTermsPage.logout' })).toBeInTheDocument();
  });

  it('no pinta cabecera, navegación ni avatar: darían 403 hasta aceptar', () => {
    const { container } = abrir();

    expect(screen.queryByRole('banner')).toBeNull();
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  it('sin marcar: error accesible y no se llama al backend', () => {
    abrir();

    fireEvent.click(botonAceptar());

    expect(screen.getByText('google.completeProfile.acceptTermsRequired')).toBeInTheDocument();
    expect(casilla()).toHaveAttribute('aria-invalid', 'true');
    expect(aceptar).not.toHaveBeenCalled();
  });

  it('marcada: acepta, siembra la sesión con el DTO del backend y vuelve a donde iba', async () => {
    abrir();

    aceptarMarcando();

    expect(await screen.findByText('la competición')).toBeInTheDocument();
    expect(aceptar).toHaveBeenCalledTimes(1);
    expect(anotaLaSesion).toHaveBeenCalledWith(DTO);
  });

  it('vuelve con el hash del origen', async () => {
    abrir({ pathname: '/accept-terms', state: { from: { pathname: '/competitions/7', hash: '#hoyo-3' } } });

    aceptarMarcando();

    expect(await screen.findByText('la competición#hoyo-3')).toBeInTheDocument();
  });

  it('sin origen, al panel', async () => {
    abrir('/accept-terms');

    aceptarMarcando();

    expect(await screen.findByText('panel')).toBeInTheDocument();
  });

  it.each([
    ['/competitions/7', 'la competición'],
    ['/competitions/7#hoyo-3', 'la competición#hoyo-3'],
    ['https://evil.com', 'panel'],
    ['//evil.com', 'panel'],
    ['/\\evil.com', 'panel'],
    ['/\t/evil.com', 'panel'],
    ['/accept-terms', 'panel'],
    ['/accept-terms?from=%2Fdashboard', 'panel'],
  ])('origen por la URL %j → %s', async (desde, destino) => {
    abrir(`/accept-terms?from=${encodeURIComponent(desde)}`);

    aceptarMarcando();

    expect(await screen.findByText(destino)).toBeInTheDocument();
  });

  it('si accept-terms falla: un solo aviso, la casilla sigue marcada y se puede reintentar', async () => {
    aceptar.mockRejectedValueOnce(new Error('boom'));
    abrir();

    aceptarMarcando();

    expect(await screen.findByRole('alert')).toHaveTextContent('acceptTermsPage.error');
    expect(toastError).not.toHaveBeenCalled();
    expect(anotaLaSesion).not.toHaveBeenCalled();
    expect(casilla()).toBeChecked();
    expect(botonAceptar()).not.toBeDisabled();

    fireEvent.click(botonAceptar());

    expect(await screen.findByText('la competición')).toBeInTheDocument();
    expect(aceptar).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['ya aceptados', { id: 'u-1', terms_accepted: true }],
    ['backend antiguo, sin el campo', { id: 'u-1' }],
  ])('%s: no se queda aquí', (_caso, usuario) => {
    sesion.user = usuario;
    abrir();

    expect(screen.getByText('la competición')).toBeInTheDocument();
  });

  it.each([
    ['aceptados', { id: 'u-1', terms_accepted: true }],
    ['sin el campo', { id: 'u-1' }],
  ])('llegando desde un 403 (?from=) con la sesión %s: se pinta igual, sin rebotar', (_caso, usuario) => {
    sesion.user = usuario;
    abrir('/accept-terms?from=%2Fcompetitions%2F7');

    expect(screen.getByRole('heading', { level: 1, name: 'acceptTermsPage.title' })).toBeInTheDocument();
    expect(screen.queryByText('la competición')).toBeNull();
  });

  it('salir cierra la sesión', () => {
    abrir();

    fireEvent.click(screen.getByRole('button', { name: 'acceptTermsPage.logout' }));

    expect(logout).toHaveBeenCalledTimes(1);
  });
});
