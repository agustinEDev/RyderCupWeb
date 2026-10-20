import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { RUTAS_CON_TERMINOS_PENDIENTES, sePuedeEstarConTerminosPendientes } from './rutasPublicas';
import { llevaAAceptarLosTerminos, olvidaLaRedireccionATerminos } from './terminosPendientes';

/**
 * Revisión (puntos 4 y 7): UNA lista de rutas donde se puede estar con los
 * Términos pendientes, y la usan los dos que deciden: el guardia de rutas
 * (`ProtectedRoute`) y la redirección tras un 403 (`terminosPendientes`). Con
 * dos copias, una ruta añadida en un sitio y no en el otro rebota en bucle. Y
 * con la barra final normalizada: `/profile/devices/` es la misma pantalla.
 */
const sesion = vi.hoisted(() => ({ user: { id: 'u-1', terms_accepted: false } }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: sesion.user, loading: false }) }));

const { default: ProtectedRoute } = await import('../components/auth/ProtectedRoute');

const variantes = RUTAS_CON_TERMINOS_PENDIENTES.flatMap((ruta) => [ruta, `${ruta}/`]);

describe('rutas con los Términos pendientes: una sola lista para el guardia y la redirección', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    olvidaLaRedireccionATerminos();
    globalThis.sessionStorage.clear();
  });

  it('la lista es la de la decisión: aceptar, completar perfil y dispositivos', () => {
    expect([...RUTAS_CON_TERMINOS_PENDIENTES].sort()).toEqual(['/accept-terms', '/auth/complete-profile', '/profile/devices']);
  });

  it.each(variantes)('%s se reconoce, con o sin barra final', (ruta) => {
    expect(sePuedeEstarConTerminosPendientes(ruta)).toBe(true);
  });

  it.each(['/dashboard', '/profile', '/profile/devicesx', '/accept-termsx'])('%s no', (ruta) => {
    expect(sePuedeEstarConTerminosPendientes(ruta)).toBe(false);
  });

  it.each(variantes)('el guardia deja pasar %s', (ruta) => {
    render(
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="*" element={<ProtectedRoute><p>dentro</p></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('dentro')).toBeInTheDocument();
  });

  it.each(variantes)('la redirección tras un 403 no se dispara en %s', (ruta) => {
    const assign = vi.fn();
    vi.stubGlobal('location', { pathname: ruta, search: '', hash: '', origin: 'http://localhost', assign });

    expect(llevaAAceptarLosTerminos()).toBe(false);
    expect(assign).not.toHaveBeenCalled();
  });
});
