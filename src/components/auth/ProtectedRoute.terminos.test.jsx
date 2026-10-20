import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';

/**
 * F3: con los Términos sin aceptar, las rutas protegidas llevan a /accept-terms.
 *
 *   ruta pedida              | terms_accepted | se ve
 *   -------------------------|----------------|-------------------------------
 *   /dashboard               | false          | la pantalla de aceptación, con el origen
 *   /dashboard               | true           | el panel
 *   /dashboard               | sin el campo   | el panel (backend antiguo)
 *   /accept-terms            | false          | la propia pantalla, sin rebotar
 *   /auth/complete-profile   | false          | completar perfil: allí acepta el usuario nuevo de Google
 */
const sesion = vi.hoisted(() => ({ user: null }));
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ user: sesion.user, loading: false }) }));

const { default: ProtectedRoute } = await import('./ProtectedRoute');

const PantallaDeAceptar = () => {
  const location = useLocation();
  return <p>aceptar los Términos desde {location.state?.from?.pathname ?? 'ninguna'}</p>;
};

const abrir = (ruta) =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/dashboard" element={<ProtectedRoute><p>panel</p></ProtectedRoute>} />
        <Route path="/accept-terms" element={<ProtectedRoute><PantallaDeAceptar /></ProtectedRoute>} />
        <Route path="/auth/complete-profile" element={<ProtectedRoute><p>completar perfil</p></ProtectedRoute>} />
        <Route path="/login" element={<p>entrar</p>} />
      </Routes>
    </MemoryRouter>
  );

describe('ProtectedRoute · Términos sin aceptar (F3)', () => {
  it('pendientes: a la pantalla de aceptación, recordando a dónde iba', () => {
    sesion.user = { id: 'u-1', terms_accepted: false };
    abrir('/dashboard');

    expect(screen.getByText('aceptar los Términos desde /dashboard')).toBeInTheDocument();
    expect(screen.queryByText('panel')).toBeNull();
  });

  it.each([
    ['aceptados', { id: 'u-1', terms_accepted: true }],
    ['sin el campo (backend antiguo)', { id: 'u-1' }],
  ])('%s: entra', (_caso, usuario) => {
    sesion.user = usuario;
    abrir('/dashboard');

    expect(screen.getByText('panel')).toBeInTheDocument();
  });

  it('en la propia pantalla de aceptación no rebota', () => {
    sesion.user = { id: 'u-1', terms_accepted: false };
    abrir('/accept-terms');

    expect(screen.getByText('aceptar los Términos desde ninguna')).toBeInTheDocument();
  });

  it('completar perfil deja pasar: es donde acepta el usuario nuevo de Google', () => {
    sesion.user = { id: 'u-1', terms_accepted: false };
    abrir('/auth/complete-profile');

    expect(screen.getByText('completar perfil')).toBeInTheDocument();
  });

  it('sin sesión, al formulario como siempre', () => {
    sesion.user = null;
    abrir('/dashboard');

    expect(screen.getByText('entrar')).toBeInTheDocument();
  });
});
