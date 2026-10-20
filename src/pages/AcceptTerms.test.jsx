import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * F3: la pantalla de aceptación de los Términos.
 *
 *   caso                                        | qué pasa
 *   --------------------------------------------|---------------------------------------
 *   se pinta                                    | casilla, privacidad informada, aceptar y salir
 *   aceptar sin marcar                          | error accesible, no se llama al backend
 *   aceptar marcada                             | accept-terms, se reconfirma la sesión y vuelve a donde iba
 *   sin origen                                  | al panel
 *   origen por ?from= (redirección desde api.js)| vuelve allí; uno externo o raro, al panel
 *   accept-terms falla                          | error visible, se queda
 *   ya aceptados (o backend antiguo)            | no se queda aquí: a donde iba
 *   salir                                       | cierra la sesión
 *   no pinta la cabecera (pediría el avatar)    | aserción sobre el fichero
 */
const aceptar = vi.fn();
const refetch = vi.fn();
const logout = vi.fn();
const toastError = vi.fn();
const sesion = vi.hoisted(() => ({ user: null }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
}));
vi.mock('../utils/toast', () => ({ default: { error: (...a) => toastError(...a), success: vi.fn(), info: vi.fn() } }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: sesion.user, loading: false, refetch }) }));
vi.mock('../hooks/useLogout', () => ({ useLogout: () => ({ logout }) }));
vi.mock('../composition', () => ({ acceptTermsUseCase: { execute: (...a) => aceptar(...a) } }));

const { default: AcceptTerms } = await import('./AcceptTerms');

const abrir = (entrada = { pathname: '/accept-terms', state: { from: { pathname: '/competitions/7' } } }) =>
  render(
    <MemoryRouter initialEntries={[entrada]}>
      <Routes>
        <Route path="/accept-terms" element={<AcceptTerms />} />
        <Route path="/competitions/:id" element={<p>la competición</p>} />
        <Route path="/dashboard" element={<p>panel</p>} />
      </Routes>
    </MemoryRouter>
  );

const casilla = () => screen.getByRole('checkbox', { name: /register\.acceptTerms/ });
const botonAceptar = () => screen.getByRole('button', { name: 'acceptTermsPage.acceptButton' });

describe('AcceptTerms (F3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sesion.user = { id: 'u-1', terms_accepted: false };
    aceptar.mockResolvedValue({ termsAccepted: true });
    refetch.mockImplementation(async () => {
      sesion.user = { id: 'u-1', terms_accepted: true };
    });
  });

  it('pinta el título, la casilla, la privacidad informada, aceptar y salir', () => {
    abrir();

    expect(screen.getByRole('heading', { level: 1, name: 'acceptTermsPage.title' })).toBeInTheDocument();
    expect(casilla()).not.toBeChecked();
    expect(screen.getByRole('link', { name: 'register.privacyLink' })).toHaveAttribute('href', '/privacy');
    expect(botonAceptar()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'acceptTermsPage.logout' })).toBeInTheDocument();
  });

  it('sin marcar: error accesible y no se llama al backend', () => {
    abrir();

    fireEvent.click(botonAceptar());

    expect(screen.getByText('google.completeProfile.acceptTermsRequired')).toBeInTheDocument();
    expect(casilla()).toHaveAttribute('aria-invalid', 'true');
    expect(aceptar).not.toHaveBeenCalled();
  });

  it('marcada: acepta, reconfirma la sesión y vuelve a donde iba', async () => {
    abrir();

    fireEvent.click(casilla());
    fireEvent.click(botonAceptar());

    expect(await screen.findByText('la competición')).toBeInTheDocument();
    expect(aceptar).toHaveBeenCalledTimes(1);
    expect(refetch).toHaveBeenCalled();
    expect(aceptar.mock.invocationCallOrder[0]).toBeLessThan(refetch.mock.invocationCallOrder[0]);
  });

  it('sin origen, al panel', async () => {
    abrir('/accept-terms');

    fireEvent.click(casilla());
    fireEvent.click(botonAceptar());

    expect(await screen.findByText('panel')).toBeInTheDocument();
  });

  it.each([
    ['/accept-terms?from=%2Fcompetitions%2F7', 'la competición'],
    ['/accept-terms?from=https%3A%2F%2Fevil.example', 'panel'],
    ['/accept-terms?from=%2F%2Fevil.example', 'panel'],
    ['/accept-terms?from=%2Faccept-terms', 'panel'],
  ])('origen por la URL %s → %s', async (url, destino) => {
    abrir(url);

    fireEvent.click(casilla());
    fireEvent.click(botonAceptar());

    expect(await screen.findByText(destino)).toBeInTheDocument();
  });

  it('si accept-terms falla: error visible y se queda', async () => {
    aceptar.mockRejectedValue(new Error('boom'));
    abrir();

    fireEvent.click(casilla());
    fireEvent.click(botonAceptar());

    expect(await screen.findByText('acceptTermsPage.error')).toBeInTheDocument();
    expect(refetch).not.toHaveBeenCalled();
    expect(screen.queryByText('la competición')).toBeNull();
    expect(botonAceptar()).not.toBeDisabled();
  });

  it.each([
    ['ya aceptados', { id: 'u-1', terms_accepted: true }],
    ['backend antiguo, sin el campo', { id: 'u-1' }],
  ])('%s: no se queda aquí', (_caso, usuario) => {
    sesion.user = usuario;
    abrir();

    expect(screen.getByText('la competición')).toBeInTheDocument();
  });

  it('salir cierra la sesión', () => {
    abrir();

    fireEvent.click(screen.getByRole('button', { name: 'acceptTermsPage.logout' }));

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('no monta la cabecera ni nada que pida el avatar: daría 403 hasta aceptar', () => {
    const fuente = readFileSync(resolve(process.cwd(), 'src/pages/AcceptTerms.jsx'), 'utf8');

    expect(fuente).not.toMatch(/HeaderAuth|layout\/Header|Avatar/);
  });

  it('tiene su ruta protegida en App.jsx', () => {
    const app = readFileSync(resolve(process.cwd(), 'src/App.jsx'), 'utf8');

    expect(app).toContain('<Route path="/accept-terms" element={<ProtectedRoute><AcceptTerms /></ProtectedRoute>} />');
  });
});
