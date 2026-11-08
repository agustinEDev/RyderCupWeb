import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';

/**
 * FE #1064 (R1, R9): al ir al login porque no hay sesión, la página de la que venía lleva
 * la última cuenta que estuvo dentro de la pestaña; si entra otra, irá a su panel. Ir a
 * aceptar los Términos (ya hay cuenta) no la lleva.
 */
const sesion = vi.hoisted(() => ({ user: null }));
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ user: sesion.user, loading: false }) }));
const cuenta = vi.hoisted(() => ({ ultima: vi.fn(() => 'u-1') }));
vi.mock('../../utils/vueltaTrasEntrar', () => ({
  estadoParaElLogin: (location) => ({ from: { ...location, cuenta: cuenta.ultima() } }),
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
});
