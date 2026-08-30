import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import HeaderAuth from './HeaderAuth';
import { logoutUseCase } from '../../composition';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'es', changeLanguage: vi.fn() },
  }),
}));

vi.mock('../ui/LanguageSwitcher', () => ({
  default: () => <div data-testid="language-switcher" />,
}));

vi.mock('../../composition', () => ({
  logoutUseCase: { execute: vi.fn() },
}));

vi.mock('../../utils/broadcastAuth', () => ({
  broadcastLogout: vi.fn(),
}));

const clearAuth = vi.fn();
vi.mock('../../hooks/useAuthContext', () => ({
  useAuthContext: () => ({ clearAuth }),
}));

const user = { first_name: 'Ana', last_name: 'Soto', is_admin: false };

const renderHeader = (path, props = {}) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <HeaderAuth user={user} {...props} />
    </MemoryRouter>
  );

/**
 * Cabecera contextual en movil (FE #310): decir donde estas y como volver, en
 * lugar de repetir la marca en cada pantalla.
 */
describe('HeaderAuth', () => {
  it('shows the screen title instead of the brand on mobile', () => {
    renderHeader('/profile/devices');

    expect(screen.getByRole('heading', { level: 1, name: 'screens.devices' })).toBeInTheDocument();
  });

  it('offers a back arrow to the parent screen', () => {
    renderHeader('/profile/devices');

    expect(screen.getByRole('link', { name: 'back' })).toHaveAttribute('href', '/profile');
  });

  it('omits the back arrow on a bottom-navigation root', () => {
    renderHeader('/dashboard');

    expect(screen.queryByRole('link', { name: 'back' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'screens.dashboard' })).toBeInTheDocument();
  });

  it('lets a page override the title with a runtime name', () => {
    // El nombre de un torneo no cabe en un mapa estatico
    renderHeader('/competitions/abc-123', { title: 'Copa de Otoño' });

    expect(screen.getByRole('heading', { level: 1, name: 'Copa de Otoño' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'back' })).toHaveAttribute('href', '/competitions');
  });

  it('lets a page drop the back arrow explicitly', () => {
    renderHeader('/profile/devices', { backTo: null });

    expect(screen.queryByRole('link', { name: 'back' })).not.toBeInTheDocument();
  });

  it('keeps the brand on a route outside the map', () => {
    // Alta de perfil: no es una pantalla de la aplicacion todavia
    renderHeader('/auth/complete-profile');

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    // El mock de i18n devuelve la clave: el alt de la marca ya no es un literal
    expect(screen.getAllByAltText('brandMarkAlt').length).toBeGreaterThan(0);
  });

  it('keeps the desktop navigation untouched', () => {
    renderHeader('/profile/devices');

    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual(expect.arrayContaining(['/dashboard', '/browse-competitions', '/competitions']));
  });

  it('reaches the feed from the desktop navigation', () => {
    /**
     * La navegacion inferior es md:hidden, asi que en escritorio esta cabecera
     * es el unico camino al feed. Sin este enlace la seccion solo se alcanza
     * tecleando la URL.
     *
     * Amigos ya no cuelga de la cabecera: se entra desde dentro del feed, igual
     * que en movil. Que ese segundo salto exista lo vigila FeedPage.test.jsx
     * ("links to the friends list"), de modo que la cadena completa hasta
     * /friends sigue cubierta.
     */
    renderHeader('/dashboard');

    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(hrefs).toContain('/feed');
  });

  /**
   * Al perfil de un jugador se llega desde el feed, desde Amigos y desde la
   * busqueda: no hay padre unico al que volver, asi que se retrocede por el
   * historial. Esta flecha es la de movil; en escritorio la vuelta la pone la
   * propia pagina, junto al contenido.
   */
  describe('vuelta desde el perfil de un jugador', () => {
    const renderPlayerProfile = (entries, index) =>
      render(
        <MemoryRouter initialEntries={entries} initialIndex={index}>
          <Routes>
            <Route path="/friends" element={<p>lista de amigos</p>} />
            <Route path="/feed" element={<p>actividad</p>} />
            <Route path="/players/:userId" element={<HeaderAuth user={user} />} />
          </Routes>
        </MemoryRouter>
      );

    it('goes back to the previous page instead of a fixed parent', () => {
      renderPlayerProfile(['/friends', '/players/abc'], 1);

      fireEvent.click(screen.getByRole('button', { name: 'back' }));

      expect(screen.getByText('lista de amigos')).toBeInTheDocument();
    });

    it('falls back to the feed when there is nowhere to go back to', () => {
      // Entrar por URL directa deja el historial vacio: retroceder sacaria de
      // la aplicacion
      renderPlayerProfile(['/players/abc'], 0);

      fireEvent.click(screen.getByRole('button', { name: 'back' }));

      expect(screen.getByText('actividad')).toBeInTheDocument();
    });

    it('falls back after a chain of replaces, which renews the location key', () => {
      /**
       * Abrir un perfil compartido sin sesion encadena dos `replace` —el
       * redirect a /login y la vuelta tras entrar—, y cada uno estrena `key`
       * sin apilar entrada. Mirando solo la `key` esto parecia historial
       * propio y la flecha sacaba de la aplicacion.
       *
       * React Router deja ese recorrido en `window.history.state.idx`, que
       * los `replace` no incrementan.
       */
      const previous = window.history.state;
      window.history.replaceState({ idx: 0 }, '');

      try {
        // Dos entradas y una `key` real, justo lo que enmascaraba el fallo
        renderPlayerProfile(['/friends', '/players/abc'], 1);

        fireEvent.click(screen.getByRole('button', { name: 'back' }));

        expect(screen.getByText('actividad')).toBeInTheDocument();
        expect(screen.queryByText('lista de amigos')).not.toBeInTheDocument();
      } finally {
        window.history.replaceState(previous, '');
      }
    });
  });
  describe('salir deja el dispositivo limpio (FE #531)', () => {
    /**
     * LA TABLA — pulsar «Cerrar Sesión».
     *
     *   caso                              | qué pasa
     *   ----------------------------------|--------------------------------------
     *   el backend contesta               | se limpia lo de la cuenta
     *   el backend no contesta            | se limpia igual
     */
    const abreElMenuYSale = () => {
      const botones = screen.getAllByRole('button');
      fireEvent.click(botones[botones.length - 1]);
      fireEvent.click(screen.getByText('header.logout'));
    };

    it('lo de la cuenta se va del dispositivo', async () => {
      // Salía con una redirección dura y nada más, y una redirección no vacía
      // el almacenamiento: quedaban el nombre, el correo, el hándicap y las
      // partidas guardadas, para quien entrara después en ese móvil
      clearAuth.mockClear();
      logoutUseCase.execute.mockResolvedValue(undefined);

      renderHeader('/dashboard');
      abreElMenuYSale();

      await waitFor(() => expect(clearAuth).toHaveBeenCalled());
    });

    it('y también cuando el backend no contesta', async () => {
      // Quedarse sin cobertura al salir no es motivo para dejar los datos
      // puestos: la sesión se cierra igual de este lado
      clearAuth.mockClear();
      logoutUseCase.execute.mockRejectedValue(new TypeError('Failed to fetch'));

      renderHeader('/dashboard');
      abreElMenuYSale();

      await waitFor(() => expect(clearAuth).toHaveBeenCalled());
    });
  });
});
