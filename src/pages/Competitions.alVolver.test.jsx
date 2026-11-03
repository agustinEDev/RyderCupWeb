/**
 * LA TABLA — las tarjetas de Torneos al volver atrás, sin su animación de
 * entrada (FE #647, fase 3), aprobada por Agustín el 3 nov 2026. Al volver, el
 * router deja el scroll a la altura de la séptima tarjeta, y su retraso
 * (0,05 s por cada una anterior) dejaba la pantalla en blanco un momento: el
 * parpadeo que vio en el iPhone.
 *
 *   #    cómo se llega a Torneos                 | las tarjetas
 *   -----|-----------------------------------------|--------------------------------
 *   C1   desde la pestaña o un enlace (nueva)   | con animación, como hoy
 *   C1b  ídem, tras haberla visto ya            | con animación: es otra entrada
 *   C2   atrás (la flecha de la app)             | sin animación: ya pintadas
 *   C3   atrás del navegador o el gesto          | sin animación (el mismo camino)
 *   C4   adelante del navegador                  | sin animación
 *   C5   recargar estando en Torneos             | con animación, como hoy
 *   C6   abrir la aplicación en /competitions    | con animación, como hoy
 *   C7   tras volver, un filtro saca otras       | las nuevas, con animación
 *   C7b  tras volver, un filtro sin resultados y | con animación (revisor: la
 *        quitarlo                                | rejilla se vuelve a montar)
 *   C7c  volver con un filtro que no casa con    | con animación: al volver no
 *        nada, y quitarlo                        | había ninguna pintada
 *   C7d  ídem C7b con el filtro de estado        | con animación
 *   C7e  tras volver, un filtro oculta una y     | esa, con animación: se montó
 *        quitarlo la enseña de nuevo             | otra vez (/code-review)
 *   C8   volver sin la lista pintada (sin red) y | con animación: no había nada
 *        llega después                           | pintado que conservar
 *   C8b  se vio vacía y, al volver, ya hay        | con animación: no se habían
 *        competiciones                           | visto
 *
 * La flecha de la app es `navigate(-1)`, el mismo atrás que el del navegador:
 * C2 y C3 son una sola prueba.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useLayoutEffect } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';

const mockList = vi.fn();
vi.mock('../composition', () => ({
  listUserCompetitionsUseCase: { execute: (...a) => mockList(...a) },
}));

// El MISMO objeto en cada render: uno nuevo recrea la carga y no para
const sesion = vi.hoisted(() => ({ user: { id: 'u-1' }, loading: false }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => sesion }));
vi.mock('../services/sesionCompartida', () => ({
  consultaLaSesion: () => Promise.resolve(sesion.user),
  loQueHaySobreLaSesion: () => ({ user: sesion.user }),
}));
vi.mock('../hooks/useAuthContext', () => ({
  useAuthContext: () => ({ user: { id: 'u-1' }, clearAuth: vi.fn() }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, p) => (p ? `${clave} ${JSON.stringify(p)}` : clave),
    i18n: { language: 'es' },
  }),
}));
vi.mock('../utils/toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));

const Competitions = (await import('./Competitions')).default;
const { loader, shouldRevalidate } = await import('./Competitions.datos');
const { marcaElArranque, olvidaLoQueEstaEnCamino } = await import('../utils/cargaDeLaPantalla');
// Cerrar sesión o una visita nueva: también vacía la memoria de las listas
const { olvidaTodo } = await import('../services/loUltimoConocido');

const torneo = (id, name) => ({ id, name, status: 'IN_PROGRESS', creatorId: 'u-1', participants: [] });
const LISTA = [torneo('c-1', 'Torneo Alfa'), torneo('c-2', 'Torneo Beta')];
const sinRed = () => new TypeError('Failed to fetch');
const enLinea = (si) => Object.defineProperty(globalThis.navigator, 'onLine', { value: si, configurable: true });

// La opacidad de cada tarjeta al entrar en la página: animada, sale a 0. Con
// un observador y no con un efecto: las que llegan sin navegar (C7, C8) no
// repintan nada fuera de la pantalla
const alAparecer = new Map();
const apunta = (t) => {
  const nombre = t.querySelector('h3')?.textContent ?? t.textContent.slice(0, 20);
  if (!alAparecer.has(nombre)) alAparecer.set(nombre, t.style.opacity);
};
new globalThis.MutationObserver((cambios) => {
  for (const c of cambios) {
    for (const n of c.addedNodes) {
      if (n.nodeType !== 1) continue;
      if (n.matches('[data-testid="tarjeta-competicion"]')) apunta(n);
      n.querySelectorAll('[data-testid="tarjeta-competicion"]').forEach(apunta);
    }
  }
}).observe(document.body, { childList: true, subtree: true });
const Carcasa = () => {
  useLayoutEffect(() => marcaElArranque(true), []);
  return null;
};

const pinta = ({ entradas = ['/competitions'], indice = entradas.length - 1 } = {}) => {
  const router = createMemoryRouter(
    [
      {
        path: '/competitions',
        loader,
        shouldRevalidate,
        element: (
          <>
            <Carcasa />
            <Competitions />
          </>
        ),
      },
      { path: '/otra', element: <p>otra pantalla</p> },
    ],
    { initialEntries: entradas, initialIndex: indice }
  );
  const vista = render(<RouterProvider router={router} />);
  return { router, vista };
};

const animada = (nombre) => alAparecer.get(nombre) === '0';
const empiezaDeNuevo = () => alAparecer.clear();

// Torneos ya pintada en esta visita; se sale a otra pantalla
const pintadaYFuera = async () => {
  const { router, vista } = pinta();
  await screen.findByText('Torneo Alfa');
  await act(() => router.navigate('/otra'));
  await screen.findByText('otra pantalla');
  empiezaDeNuevo();
  return { router, vista };
};

describe('Torneos · sin animación de entrada al volver atrás', () => {
  beforeEach(() => {
    mockList.mockReset();
    mockList.mockResolvedValue(LISTA);
    olvidaTodo();
    olvidaLoQueEstaEnCamino();
    marcaElArranque(true);
    empiezaDeNuevo();
    enLinea(true);
  });

  it('C1: entrar desde otra pantalla (navegación nueva) anima las tarjetas', async () => {
    const { router } = pinta({ entradas: ['/otra'] });
    await act(() => router.navigate('/competitions'));
    await screen.findByText('Torneo Alfa');
    expect(animada('Torneo Alfa')).toBe(true);
    expect(animada('Torneo Beta')).toBe(true);
  });

  it('C1b: volver a entrar desde la pestaña, tras haberla visto, también anima', async () => {
    const { router } = await pintadaYFuera();
    await act(() => router.navigate('/competitions'));
    await screen.findByText('Torneo Alfa');
    expect(animada('Torneo Alfa')).toBe(true);
  });

  it('C2/C3: volver atrás (flecha de la app o del navegador) las deja ya pintadas', async () => {
    const { router } = await pintadaYFuera();
    await act(() => router.navigate(-1));
    await screen.findByText('Torneo Alfa');
    expect(alAparecer.get('Torneo Alfa')).toBe('1');
    expect(alAparecer.get('Torneo Beta')).toBe('1');
  });

  it('C4: adelante del navegador a un Torneos ya pintado, tampoco anima', async () => {
    const { router } = pinta({ entradas: ['/otra'] });
    await act(() => router.navigate('/competitions'));
    await screen.findByText('Torneo Alfa');
    await act(() => router.navigate(-1));
    await screen.findByText('otra pantalla');
    empiezaDeNuevo();
    await act(() => router.navigate(1));
    await screen.findByText('Torneo Alfa');
    expect(alAparecer.get('Torneo Alfa')).toBe('1');
  });

  it('C5: recargar en Torneos (una visita nueva) anima, aunque llegue por el historial', async () => {
    const { vista } = pinta();
    await screen.findByText('Torneo Alfa');
    vista.unmount();
    // Recargar: la memoria de la visita se va, y la carga inicial es un POP
    olvidaTodo();
    empiezaDeNuevo();
    pinta();
    await screen.findByText('Torneo Alfa');
    expect(animada('Torneo Alfa')).toBe(true);
  });

  it('C6: abrir la aplicación directamente en Torneos anima', async () => {
    pinta();
    await screen.findByText('Torneo Alfa');
    expect(animada('Torneo Alfa')).toBe(true);
    expect(animada('Torneo Beta')).toBe(true);
  });

  it('C7: tras volver, las tarjetas que saca un filtro sí se animan', async () => {
    const { router } = pinta();
    await screen.findByText('Torneo Alfa');
    fireEvent.change(screen.getByPlaceholderText('myCompetitions.searchPlaceholder'), { target: { value: 'Alfa' } });
    expect(screen.queryByText('Torneo Beta')).toBeNull();
    await act(() => router.navigate('/otra'));
    await screen.findByText('otra pantalla');
    empiezaDeNuevo();
    await act(() => router.navigate(-1));
    await screen.findByText('Torneo Alfa');
    expect(alAparecer.get('Torneo Alfa')).toBe('1');
    // Quitar el filtro saca la otra: esa es nueva en pantalla
    fireEvent.change(screen.getByPlaceholderText('myCompetitions.searchPlaceholder'), { target: { value: '' } });
    await screen.findByText('Torneo Beta');
    expect(animada('Torneo Beta')).toBe(true);
  });

  it('C7b: tras volver, un filtro sin resultados y quitarlo vuelve a animar', async () => {
    const { router } = await pintadaYFuera();
    await act(() => router.navigate(-1));
    await screen.findByText('Torneo Alfa');
    const buscador = screen.getByPlaceholderText('myCompetitions.searchPlaceholder');
    fireEvent.change(buscador, { target: { value: 'zzz' } });
    expect(screen.queryByText('Torneo Alfa')).toBeNull();
    empiezaDeNuevo();
    fireEvent.change(buscador, { target: { value: '' } });
    await screen.findByText('Torneo Alfa');
    expect(animada('Torneo Alfa')).toBe(true);
  });

  it('C7c: volver con un filtro que no casa con nada y quitarlo, anima', async () => {
    const { router } = pinta();
    await screen.findByText('Torneo Alfa');
    fireEvent.change(screen.getByPlaceholderText('myCompetitions.searchPlaceholder'), { target: { value: 'zzz' } });
    await act(() => router.navigate('/otra'));
    await screen.findByText('otra pantalla');
    empiezaDeNuevo();
    await act(() => router.navigate(-1));
    await screen.findByText('myCompetitions.noCompetitionsFound');
    fireEvent.change(screen.getByPlaceholderText('myCompetitions.searchPlaceholder'), { target: { value: '' } });
    await screen.findByText('Torneo Alfa');
    expect(animada('Torneo Alfa')).toBe(true);
  });

  it('C7d: tras volver, el filtro de estado sin resultados y quitarlo vuelve a animar', async () => {
    const { router } = await pintadaYFuera();
    await act(() => router.navigate(-1));
    await screen.findByText('Torneo Alfa');
    const estado = screen.getByRole('combobox');
    fireEvent.change(estado, { target: { value: 'DRAFT' } });
    expect(screen.queryByText('Torneo Alfa')).toBeNull();
    empiezaDeNuevo();
    fireEvent.change(estado, { target: { value: 'ALL' } });
    await screen.findByText('Torneo Alfa');
    expect(animada('Torneo Alfa')).toBe(true);
  });

  it('C7e: tras volver, una tarjeta que un filtro oculta y vuelve a enseñar, anima', async () => {
    const { router } = await pintadaYFuera();
    await act(() => router.navigate(-1));
    await screen.findByText('Torneo Alfa');
    const buscador = screen.getByPlaceholderText('myCompetitions.searchPlaceholder');
    fireEvent.change(buscador, { target: { value: 'Beta' } });
    expect(screen.queryByText('Torneo Alfa')).toBeNull();
    empiezaDeNuevo();
    fireEvent.change(buscador, { target: { value: '' } });
    await screen.findByText('Torneo Alfa');
    expect(animada('Torneo Alfa')).toBe(true);
  });

  it('C8: volver sin la lista pintada y que llegue después la anima', async () => {
    mockList.mockRejectedValue(sinRed());
    const { router } = pinta({ entradas: ['/otra'] });
    await act(() => router.navigate('/competitions'));
    await screen.findByTestId('competiciones-sin-cobertura');
    await act(() => router.navigate('/otra'));
    await screen.findByText('otra pantalla');
    await act(() => router.navigate(-1));
    await screen.findByTestId('competiciones-sin-cobertura');
    // Vuelve la señal: se pide sola y llega la lista
    mockList.mockReset();
    mockList.mockResolvedValue(LISTA);
    await act(async () => {
      globalThis.dispatchEvent(new globalThis.Event('online'));
    });
    await screen.findByText('Torneo Alfa');
    expect(alAparecer.get('Torneo Alfa')).toBe('0');
  });

  it('C8b: se vio vacía y al volver ya hay competiciones: animan', async () => {
    mockList.mockResolvedValue([]);
    const { router } = pinta({ entradas: ['/otra'] });
    await act(() => router.navigate('/competitions'));
    await screen.findByText('myCompetitions.noCompetitionsYet');
    await act(() => router.navigate('/otra'));
    await screen.findByText('otra pantalla');
    mockList.mockResolvedValue(LISTA);
    await act(() => router.navigate(-1));
    await screen.findByText('Torneo Alfa');
    expect(animada('Torneo Alfa')).toBe(true);
  });
});
