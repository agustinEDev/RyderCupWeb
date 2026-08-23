import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

// Lo que deciden: si la aplicacion corre instalada, y que hace el hook que
// resuelve la sesion —redirigir, seguir comprobando o no hacer nada—.
let instalada = false;
let comprobando = false;
const usosDelHook = [];

vi.mock('../hooks/useRedirectIfAuthenticated', () => ({
  useRedirectIfAuthenticated: (opciones) => {
    usosDelHook.push(opciones);
    return comprobando;
  },
}));

vi.mock('../hooks/useStandalone', () => ({
  useStandalone: () => instalada,
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

vi.mock('../components/layout/Header', () => ({ default: () => <div /> }));
vi.mock('../components/layout/Footer', () => ({ default: () => <div /> }));
vi.mock('../components/ui/InstallInstructionsModal', () => ({ default: () => null }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'es' } }),
}));

// Cada prueba parte de una aplicacion recien abierta: la marca de arranque
// vive en `sessionStorage`, asi que sin limpiarla la primera se la come y las
// siguientes correrian todas como «ya arrancada» —que es lo que hacia que
// estos tests pasaran incluso borrando la comprobacion que dicen vigilar—.
const pintar = async () => {
  const { default: LandingRecienAbierta } = await import('./Landing');
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<LandingRecienAbierta />} />
        <Route path="/dashboard" element={<div data-testid="panel" />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('Landing · abrir la aplicacion instalada', () => {
  beforeEach(() => {
    instalada = false;
    comprobando = false;
    usosDelHook.length = 0;
    sessionStorage.clear();
    vi.resetModules();
  });

  it('busca la sesion cuando se abre desde el icono', async () => {
    instalada = true;

    await pintar();

    expect(usosDelHook.at(-1)).toEqual({ enabled: true });
  });

  it('no la busca en el navegador: ahi la portada tiene sentido', async () => {
    instalada = false;

    await pintar();

    // Y de paso no se gasta una peticion autenticada en cada visita anonima a
    // la pagina publica mas visitada
    expect(usosDelHook.at(-1)).toEqual({ enabled: false });
  });

  it('solo mira la sesion al arrancar, no al volver a la portada', async () => {
    // Dentro de la aplicacion, el logo de la cabecera y «Caracteristicas»
    // apuntan a `/`: si cada visita rebotara al panel, la portada quedaria
    // inalcanzable desde Terminos o Privacidad.
    instalada = true;

    // El «ya arranque» vive en el modulo y sobrevive entre pruebas, asi que se
    // recarga para partir de una aplicacion recien abierta
    vi.resetModules();
    const { default: LandingRecienAbierta } = await import('./Landing');

    const pintarLa = () =>
      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<LandingRecienAbierta />} />
            <Route path="/dashboard" element={<div data-testid="panel" />} />
          </Routes>
        </MemoryRouter>
      );

    const primera = pintarLa();
    expect(usosDelHook.at(-1)).toEqual({ enabled: true });
    primera.unmount();

    pintarLa();
    expect(usosDelHook.at(-1)).toEqual({ enabled: false });
  });

  it('no pinta la portada mientras resuelve la sesion', async () => {
    // Si se pintara, apareceria entera para desaparecer un segundo despues; en
    // una instancia fria eso son segundos de la pantalla equivocada
    instalada = true;
    comprobando = true;

    await pintar();

    expect(screen.queryByText('hero.title')).not.toBeInTheDocument();
  });

  it('enseña la portada cuando no hay sesion que resolver', async () => {
    // Afirmando el CONTENIDO: comprobar que no esta el panel pasaba igual si
    // la pagina no pintara nada, porque a `/dashboard` no se llega desde aqui
    instalada = true;
    comprobando = false;

    await pintar();

    expect(screen.getByText('hero.title')).toBeInTheDocument();
  });
});
