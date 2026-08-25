import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router';

// Lo que deciden: si la aplicacion corre instalada, y que hace el hook que
// resuelve la sesion —redirigir, seguir comprobando o no hacer nada—.
let instalada = false;
let comprobando = false;
let textosListos = true;
const usosDelHook = [];

vi.mock('../hooks/useRedirectIfAuthenticated', () => ({
  useRedirectIfAuthenticated: (opciones) => {
    usosDelHook.push(opciones);
    return comprobando;
  },
}));

vi.mock('../hooks/useStandalone', () => ({
  useStandalone: () => instalada,
  // La cortina del arranque tambien lo usa: solo se sostiene con la aplicacion
  // instalada
  detectStandalone: () => instalada,
}));

vi.mock('../hooks/useInstallPrompt', () => ({
  useInstallPrompt: () => ({
    canInstall: false,
    isIOS: false,
    iosInstallRoute: null,
    isDesktopSafari: false,
    isInstalled: false,
    install: vi.fn(),
  }),
}));

vi.mock('../hooks/useEntryMotion', () => ({
  useEntryMotion: () => ({ animateEntry: false, animateOnScroll: false }),
}));

// La cabecera de verdad lleva el enlace por el que se sale de la portada; aqui
// basta con uno que navegue igual —PUSH— para poder volver por el logo
vi.mock('../components/layout/Header', () => ({
  default: () => <Link to="/terms">a terminos</Link>,
}));
vi.mock('../components/layout/Footer', () => ({ default: () => <div /> }));
vi.mock('../components/ui/InstallInstructionsModal', () => ({ default: () => null }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'es' }, ready: textosListos }),
}));

/**
 * Abre la aplicacion por `rutaDeEntrada` y devuelve lo pintado.
 *
 * Se recargan los modulos y se pone la URL ANTES de importar: por donde se
 * entro se decide al cargar el paquete, no al montar la portada, asi que sin
 * las dos cosas todas las pruebas correrian como si siempre se hubiera
 * arrancado en `/` —que es justo lo que hacia que pasaran incluso borrando la
 * comprobacion que dicen vigilar—.
 */
const abrirLaAplicacion = async (rutaDeEntrada = '/') => {
  sessionStorage.clear();
  return recargarLaPagina(rutaDeEntrada);
};

/**
 * Recarga la pagina sin cerrar la pestana: vuelve a evaluar los modulos pero
 * respeta `sessionStorage`. Es lo que hace el service worker por su cuenta al
 * entrar una version nueva.
 */
const recargarLaPagina = async (rutaDeEntrada = '/') => {
  vi.resetModules();
  window.history.replaceState({}, '', rutaDeEntrada);

  const { default: Landing } = await import('./Landing');

  return render(
    <MemoryRouter initialEntries={[rutaDeEntrada]}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<div data-testid="panel" />} />
        <Route path="/terms" element={<Link to="/">al inicio</Link>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('Landing · abrir la aplicacion instalada', () => {
  beforeEach(() => {
    instalada = false;
    comprobando = false;
    textosListos = true;
    usosDelHook.length = 0;
  });

  it('busca la sesion cuando se abre desde el icono', async () => {
    instalada = true;

    await abrirLaAplicacion();

    expect(usosDelHook.at(-1)).toEqual({ enabled: true });
  });

  it('no la busca en el navegador: ahi la portada tiene sentido', async () => {
    instalada = false;

    await abrirLaAplicacion();

    // Y de paso no se gasta una peticion autenticada en cada visita anonima a
    // la pagina publica mas visitada
    expect(usosDelHook.at(-1)).toEqual({ enabled: false });
  });

  it('no la busca al volver a la portada desde dentro de la aplicacion', async () => {
    // El logo de la cabecera y «Caracteristicas» apuntan a `/`: si cada visita
    // rebotara al panel, la portada quedaria inalcanzable desde Terminos o
    // Privacidad. Se llega por enlace, que es una navegacion PUSH, y no por la
    // entrada de la aplicacion.
    instalada = true;

    await abrirLaAplicacion('/terms');
    expect(usosDelHook).toHaveLength(0);

    fireEvent.click(screen.getByText('al inicio'));

    expect(usosDelHook.at(-1)).toEqual({ enabled: false });
  });

  it('no la busca al volver a la portada tras haber arrancado en ella', async () => {
    // El caso que la ruta de entrada sola no cubre: se arranco en `/`, se
    // navego dentro y se vuelve por el logo. Es PUSH, no la entrada, y quien se
    // acaba de registrar desde la portada no puede salir rebotado al pulsarlo.
    instalada = true;

    await abrirLaAplicacion('/');
    expect(usosDelHook.at(-1)).toEqual({ enabled: true });

    fireEvent.click(screen.getByText('a terminos'));
    fireEvent.click(screen.getByText('al inicio'));

    expect(usosDelHook.at(-1)).toEqual({ enabled: false });
  });

  it('no la busca cuando el service worker recarga la pagina', async () => {
    // Al entrar una version nueva, el service worker recarga solo. Si esa
    // recarga contara como arranque, se llevaria al panel a quien estuviera
    // leyendo la portada.
    instalada = true;

    await abrirLaAplicacion('/');
    expect(usosDelHook.at(-1)).toEqual({ enabled: true });

    // Sin tocar `sessionStorage`: la pestana es la misma
    await recargarLaPagina('/');

    expect(usosDelHook.at(-1)).toEqual({ enabled: false });
  });

  it('no la busca si la aplicacion arranco en otra pantalla', async () => {
    // La aplicacion instalada de Android captura los enlaces de su ambito: un
    // enlace compartido a una clasificacion abre AHI, y el primer toque en el
    // logo montaba la portada por primera vez. Si eso contara como arranque,
    // quien entrara por un enlace no veria la portada nunca.
    instalada = true;

    await abrirLaAplicacion('/competitions/7/leaderboard');
    window.history.replaceState({}, '', '/');
    await import('./Landing').then(({ default: Landing }) =>
      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<Landing />} />
          </Routes>
        </MemoryRouter>
      )
    );

    expect(usosDelHook.at(-1)).toEqual({ enabled: false });
  });

  it('no pinta la portada mientras resuelve la sesion', async () => {
    // Si se pintara, apareceria entera para desaparecer un segundo despues; en
    // una instancia fria eso son segundos de la pantalla equivocada
    instalada = true;
    comprobando = true;

    await abrirLaAplicacion();

    expect(screen.queryByText('hero.title')).not.toBeInTheDocument();
  });

  it('enseña la portada cuando no hay sesion que resolver', async () => {
    // Afirmando el CONTENIDO: comprobar que no esta el panel pasaba igual si
    // la pagina no pintara nada, porque a `/dashboard` no se llega desde aqui
    instalada = true;
    comprobando = false;

    await abrirLaAplicacion();

    expect(screen.getByText('hero.title')).toBeInTheDocument();
  });
});

/**
 * La portada tambien es puerta de entrada: los iconos instalados ANTES de
 * FE #465 llevan `/` cocido como ruta de arranque, porque iOS guarda la URL al
 * crear el acceso directo y no la cambia cuando cambia el manifiesto. Sin
 * sostener la cortina aqui, para toda esa gente el arreglo del arranque no hace
 * nada (FE #485).
 */
describe('Landing y la cortina del arranque', () => {
  const sigueLaCortina = () => Boolean(document.getElementById('arranque'));
  let cortina;

  beforeEach(async () => {
    instalada = true;
    comprobando = false;
    textosListos = true;
    usosDelHook.length = 0;
    cortina = await import('../utils/cortinaDeArranque');
    cortina.reiniciaLaCortina();
    document.body.innerHTML = '<div id="arranque"></div>';
    window.matchMedia = () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} });
    // La ruta `/` avisa: al llegar, la cortina se queda esperando
    cortina.esperaElAviso();
  });

  afterEach(() => {
    cortina.reiniciaLaCortina();
  });

  it('mientras busca la sesion, la cortina se queda', async () => {
    comprobando = true;

    await abrirLaAplicacion();

    expect(sigueLaCortina()).toBe(true);
  });

  it('con la portada ya en pantalla, se levanta', async () => {
    await abrirLaAplicacion();

    expect(sigueLaCortina()).toBe(false);
  });

  it('sin los textos todavia, la cortina se queda', async () => {
    textosListos = false;

    await abrirLaAplicacion();

    expect(sigueLaCortina()).toBe(true);
  });
});
