import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';

/**
 * FE #1064 (R1, R9): al ir al login porque no hay sesión, la página de la que venía lleva
 * la última cuenta que estuvo dentro de la pestaña; si entra otra, irá a su panel. Ir a
 * aceptar los Términos (ya hay cuenta) no la lleva.
 */
const sesion = vi.hoisted(() => ({ user: null, sinConfirmar: false }));
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: sesion.user, loading: false, sinConfirmar: sesion.sinConfirmar }),
}));
const cuenta = vi.hoisted(() => ({ ultima: vi.fn(() => 'u-1'), anota: vi.fn() }));
vi.mock('../../utils/vueltaTrasEntrar', () => ({
  estadoParaElLogin: (location) => ({ from: { ...location, cuenta: cuenta.ultima() } }),
  anotaLaCuentaDeEstaPestana: cuenta.anota,
}));

const { default: ProtectedRoute } = await import('./ProtectedRoute');
const { default: RoleGuard } = await import('./RoleGuard');

const Destino = ({ nombre }) => {
  const { state } = useLocation();
  return (
    <p>
      {nombre} desde {state?.from?.pathname ?? 'ninguna'} de {String(state?.from?.cuenta ?? 'nadie')}
    </p>
  );
};

const abrir = (ruta) =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/competitions/7" element={<ProtectedRoute><p>ficha</p></ProtectedRoute>} />
        <Route path="/admin" element={<RoleGuard allowedRoles="ADMIN"><p>admin</p></RoleGuard>} />
        <Route path="/dashboard" element={<ProtectedRoute><p>panel</p></ProtectedRoute>} />
        <Route path="/login" element={<Destino nombre="login" />} />
        <Route path="/accept-terms" element={<Destino nombre="terminos" />} />
      </Routes>
    </MemoryRouter>
  );

describe('la página de la que venía lleva su cuenta', () => {
  beforeEach(() => {
    sesion.user = null;
    sesion.sinConfirmar = false;
    cuenta.anota.mockClear();
    cuenta.ultima.mockReturnValue('u-1');
  });

  it('R1: ProtectedRoute sin sesión, al login con la última cuenta de la pestaña', () => {
    abrir('/competitions/7');

    expect(screen.getByText('login desde /competitions/7 de u-1')).toBeInTheDocument();
  });

  it('R1: RoleGuard sin sesión, igual', () => {
    abrir('/admin');

    expect(screen.getByText('login desde /admin de u-1')).toBeInTheDocument();
  });

  it('R6: sin cuenta en la pestaña, la página sin cuenta (vale para cualquiera)', () => {
    cuenta.ultima.mockReturnValue(null);

    abrir('/competitions/7');

    expect(screen.getByText('login desde /competitions/7 de nadie')).toBeInTheDocument();
  });

  it('R9: a aceptar los Términos no se lleva cuenta', () => {
    sesion.user = { id: 'u-1', terms_accepted: false };

    abrir('/dashboard');

    expect(screen.getByText('terminos desde /dashboard de nadie')).toBeInTheDocument();
  });

  it('con la sesión que confirma el backend, apunta su cuenta como la de la pestaña (revisión)', () => {
    // Una pestaña puede tener sesión viva sin el usuario guardado (otra pestaña lo borró):
    // la cuenta la sabe el backend, y la puerta de las páginas protegidas la apunta
    sesion.user = { id: 'u-7', terms_accepted: true };

    abrir('/competitions/7');

    expect(screen.getByText('ficha')).toBeInTheDocument();
    expect(cuenta.anota).toHaveBeenCalledWith('u-7');
  });

  it('con la sesión guardada SIN confirmar por el backend, no apunta nada (CodeRabbit #1070)', () => {
    sesion.user = { id: 'u-7', terms_accepted: true };
    sesion.sinConfirmar = true;

    abrir('/competitions/7');

    expect(cuenta.anota).not.toHaveBeenCalled();
  });
});

