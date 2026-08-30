/**
 * LA TABLA — quién pasa por el guardia de rol (FE #529).
 *
 *   caso                                   | qué pasa
 *   ---------------------------------------|-----------------------------------
 *   admin confirmado                        | entra
 *   sin el rol, confirmado                  | a /unauthorized
 *   sesión SIN CONFIRMAR                    | espera: no decide con ella
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import RoleGuard from './RoleGuard';

const estado = { user: null, loading: false, sinConfirmar: false };
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => estado }));

const monta = () =>
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<RoleGuard allowedRoles="ADMIN"><p>el panel</p></RoleGuard>} />
        <Route path="/unauthorized" element={<p>fuera de aquí</p>} />
      </Routes>
    </MemoryRouter>
  );

describe('RoleGuard', () => {
  beforeEach(() => {
    estado.user = null;
    estado.loading = false;
    estado.sinConfirmar = false;
  });

  it('un administrador confirmado entra', () => {
    estado.user = { id: 'u-1', is_admin: true };

    monta();

    expect(screen.getByText('el panel')).toBeInTheDocument();
  });

  it('quien no tiene el rol se va a /unauthorized', () => {
    estado.user = { id: 'u-2', is_admin: false };

    monta();

    expect(screen.getByText('fuera de aquí')).toBeInTheDocument();
  });

  it('con la sesión sin confirmar no decide: espera', () => {
    // La sesión apuntada en el dispositivo no lleva privilegios a propósito, así
    // que decidir con ella echaba a un administrador que recargara /admin con un
    // bache de red. Y con `replace`: la respuesta buena que llega tres segundos
    // después ya no lo devuelve donde estaba
    estado.user = { id: 'u-1', is_admin: false };
    estado.sinConfirmar = true;

    monta();

    expect(screen.queryByText('fuera de aquí')).not.toBeInTheDocument();
    expect(screen.queryByText('el panel')).not.toBeInTheDocument();
  });
});
