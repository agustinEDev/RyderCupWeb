import { describe, it, expect, vi, afterEach } from 'vitest';
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
  default: ({ compacto }) => <div data-testid={compacto ? 'language-switcher-compacto' : 'language-switcher'} />,
}));

vi.mock('../../composition', () => ({
  logoutUseCase: { execute: vi.fn() },
}));

vi.mock('../../utils/broadcastAuth', () => ({
  broadcastLogout: vi.fn(),
}));

let novedades = 0;
vi.mock('../../hooks/useNovedadesDeActividad', () => ({
  useNovedadesDeActividad: () => novedades,
  olvidaLasNovedades: () => {},
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

  /**
   * Entre md y xl los seis enlaces no caben: la cabecera pedía 1243 px y la
   * página se desplazaba en horizontal (FE #680). Por debajo de xl se esconden y
   * pasan al desplegable del avatar, que ya existía; desde xl, en línea como
   * siempre. Nada de un botón «Menú» aparte.
   */
  describe('los enlaces que no caben van al desplegable del avatar (FE #680)', () => {
    const ENLACES = [
      '/dashboard',
      '/browse-competitions',
      '/competitions',
      '/competitions/create',
      '/player/invitations',
      '/feed',
    ];
    const abrePerfil = () => fireEvent.click(screen.getByText('AS').closest('button'));
    const enDesplegable = () => screen.queryByTestId('navegacion-en-desplegable');

    it('M1: no hay un botón «Menú» aparte', () => {
      renderHeader('/dashboard');

      expect(screen.queryByRole('button', { name: /header\.menu/ })).not.toBeInTheDocument();
    });

    it('M2: el desplegable del avatar trae los seis enlaces, en el orden de siempre, antes del perfil', () => {
      renderHeader('/dashboard');

      abrePerfil();

      const hrefs = [...enDesplegable().querySelectorAll('a')].map((a) => a.getAttribute('href'));
      expect(hrefs).toEqual(ENLACES);
      const verPerfil = screen.getByText('header.viewProfile');
      expect(
        enDesplegable().compareDocumentPosition(verPerfil) & globalThis.Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });

    it('M3: elegir uno de esos enlaces cierra el desplegable', () => {
      renderHeader('/dashboard');
      abrePerfil();

      fireEvent.click(enDesplegable().querySelector('a[href="/feed"]'));

      expect(screen.queryByText('header.logout')).not.toBeInTheDocument();
    });

    it('M4: Escape cierra el desplegable', () => {
      renderHeader('/dashboard');
      abrePerfil();

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(screen.queryByText('header.logout')).not.toBeInTheDocument();
    });

    it('M6: el avatar indica que despliega algo, y si está abierto', () => {
      // Con los enlaces dentro, el desplegable es ahora el único camino a ellos
      // por debajo de xl: tiene que notarse que el avatar se abre
      renderHeader('/dashboard');
      const botonPerfil = screen.getByText('AS').closest('button');

      expect(botonPerfil).toHaveAttribute('aria-expanded', 'false');
      expect(screen.getByTestId('indicador-desplegable')).not.toHaveClass('rotate-180');

      abrePerfil();

      expect(botonPerfil).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByTestId('indicador-desplegable')).toHaveClass('rotate-180');
    });

    // Antes (FE #680) el idioma solo vivia en el desplegable para ahorrar
    // sitio. Agustín, 20 oct: vuelve a la barra, pero como un globo de solo
    // icono, que cabe entre md y xl
    it('L1: en la barra de escritorio el idioma es un globo compacto, sin abrir nada', () => {
      renderHeader('/dashboard');

      expect(screen.getByTestId('language-switcher-compacto')).toBeInTheDocument();
      // El selector con texto sigue sin ocupar la barra
      expect(screen.queryByTestId('language-switcher')).not.toBeInTheDocument();
    });

    it('L1b: el globo va justo antes del avatar', () => {
      renderHeader('/dashboard');

      const botonPerfil = screen.getByText('AS').closest('button');
      // Hermano del bloque del avatar, no dentro de el: dentro, cada pulsacion
      // en el globo contaria como pulsar en el desplegable
      expect(screen.getByTestId('language-switcher-compacto').nextElementSibling).toBe(botonPerfil.parentElement);
    });

    it('L1c: solo en escritorio; en movil el idioma sigue en Perfil', () => {
      renderHeader('/dashboard');

      const bloque = screen.getByTestId('language-switcher-compacto').closest('.md\\:flex');
      expect(bloque).toHaveClass('hidden');
    });

    it('L2: se cambia desde el desplegable del avatar, en su propia fila', () => {
      renderHeader('/dashboard');

      abrePerfil();

      const fila = screen.getByTestId('idioma-en-desplegable');
      expect(fila).toHaveTextContent('header.language');
      expect(fila).toContainElement(screen.getByTestId('language-switcher'));
    });

    it('M4b: tras cerrarlo con Escape, el foco vuelve al avatar', () => {
      // Si el foco estaba dentro del desplegable, al desaparecer caería al
      // body y quien va con teclado perdería el sitio
      renderHeader('/dashboard');
      const botonPerfil = screen.getByText('AS').closest('button');
      abrePerfil();
      enDesplegable().querySelector('a[href="/feed"]').focus();

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(document.activeElement).toBe(botonPerfil);
    });

    it('M5: los enlaces en línea solo desde xl, y en el desplegable solo por debajo', () => {
      // jsdom no mide anchos: lo que se puede vigilar aquí es el contrato de
      // clases. Que de verdad quepa se mide en el navegador (FE #680).
      renderHeader('/dashboard');
      abrePerfil();

      expect(screen.getByTestId('navegacion-en-linea')).toHaveClass('hidden', 'xl:flex');
      expect(enDesplegable()).toHaveClass('xl:hidden');
    });
  });

  describe('the unseen number on the desktop Actividad link (FE-1, case 1)', () => {
    afterEach(() => {
      novedades = 0;
    });

    const enLinea = () =>
      screen.getByTestId('navegacion-en-linea').querySelector('a[href="/feed"]');

    it('shows nothing at zero', () => {
      renderHeader('/dashboard');

      expect(enLinea().querySelector('[data-testid="insignia-novedades"]')).toBeNull();
    });

    it('shows 9+ from ten, inline and in the avatar menu', () => {
      novedades = 12;
      renderHeader('/dashboard');

      expect(enLinea().querySelector('[data-testid="insignia-novedades"]')).toHaveTextContent('9+');
      fireEvent.click(screen.getByText('AS').closest('button'));
      const enMenu = screen.getByTestId('navegacion-en-desplegable').querySelector('a[href="/feed"]');
      expect(enMenu.querySelector('[data-testid="insignia-novedades"]')).toHaveTextContent('9+');
    });

    it('only the Actividad link carries it', () => {
      novedades = 2;
      renderHeader('/dashboard');

      expect(screen.getAllByTestId('insignia-novedades')).toHaveLength(1);
    });
  });
});
