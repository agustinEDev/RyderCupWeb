/**
 * LA TABLA — Torneos cargando con su `loader` (FE #647, fase 3; aprobada el
 * 2 nov 2026). Sustituye a la del hotfix v2.24.1, cuyos casos siguen aquí.
 *
 *   #   | caso                                         | qué se ve
 *   ----|----------------------------------------------|----------------------------------------
 *   T1  | con red y competiciones                       | la lista
 *   T2  | con red y ninguna                             | «Aún no hay» y crear la primera
 *   T3  | sin red, nada en memoria                      | «sin conexión»; NO «no tienes», ni crear
 *   T3b | sin red ni lista (datos `null`)               | se pinta y se queda quieta: un `[]` nuevo
 *       |                                               | por pintada rehacía los filtros sin fin
 *   T4  | sin red, con la lista ya cargada              | la lista, con el aviso si el móvil cree
 *       |                                               | tener red (si no, ya lo dice la barra)
 *   T6  | 429/5xx, nada en memoria                      | «No se pudo cargar» + Reintentar
 *   T7  | 429/5xx, con la lista ya cargada              | la lista + «No se pudo actualizar» + Reintentar
 *   T8  | Reintentar                                    | se pide otra vez; bien, el aviso se va
 *   T9  | vuelve la señal sin red en pantalla           | se pide sola; bien, el aviso se va
 *   T10 | sin red / error del servidor                  | el toast de siempre, uno por carga fallida
 *       |                                               | (Agustín, 2 nov: como hoy)
 *   T11 | el texto técnico del error                    | no llega a la pantalla
 *   T16 | un filtro sin coincidencias                   | «No se encontraron», no «sin conexión»
 *   T23 | Torneos y otra pantalla muy seguidas          | se queda la última
 *
 * Lo que añadió el revisor (2 nov 2026):
 *
 *   T31 | primera carga de la aplicación (pendiente)    | la espera de hoy dentro de la pantalla, y la lista
 *   T32 | la sesión aún no se sabía al cargar           | la lista al saberse; nunca «Aún no hay»
 *   T33 | la lista llega después del tope de 4 s        | aparece sola, sin pedirla otra vez
 *   T32b| vuelve a faltar la sesión más tarde           | se vuelve a pedir otra vez
 *   T37 | pulsar Torneos estando en Torneos             | no se pide nada, como hoy (segundo revisor)
 *   T38 | Reintentar, la señal y la primera carga        | sí piden (no los frena lo de T37)
 *
 * Y `/code-review` (2 nov 2026):
 *
 *   T40 | la sesión se confirma o cambia (otro `user`)  | se vuelve a pedir, como hoy
 *   T41 | se navega mientras se vuelve a pedir          | luego, pulsar Torneos en Torneos no pide
 *   F1  | filtrar, entrar en un torneo y volver atrás   | los filtros siguen (Agustín: conservarlos)
 *   F2  | entrar de nuevo en Torneos                    | sin filtros, como hoy
 *   F3  | recargar                                      | sin filtros, como hoy (viven en memoria)
 *   F4  | filtrar                                       | no pide nada
 *   F5  | filtrar                                       | no apila entradas en el historial
 *   T41b| una marca de volver a pedir sin usar          | se olvida al salir de Torneos
 *   T34 | al restaurar el scroll                        | las tarjetas ya están pintadas (si no, el
 *       |                                               | navegador recorta la posición)
 *
 * Y el tercer revisor (2 nov 2026), con el diseño aprobado ese día: los filtros
 * dejan de escribirse en el historial y viven en memoria por cuenta y entrada:
 *
 *   C2  | filtrar, pulsar Torneos en Torneos, salir y  | los filtros siguen
 *       | volver atrás                                  |
 *   C3  | otra cuenta en el mismo móvil vuelve atrás    | sin filtros
 *   C4  | filtrar durante una recarga (Reintentar, la   | la recarga llega y se pinta
 *       | señal)                                        |
 *   C5  | otra navegación corta una recarga             | la siguiente sí carga
 *   C5b | Reintentar ya respondió                       | pulsar Torneos en Torneos no pide
 *   C6  | la sesión se confirma durante una carga       | se pide de nuevo, con una petición nueva
 *   C7  | dos toques seguidos desde otra pantalla       | una sola petición
 *   C7b | toques en la pestaña mientras Reintentar     | una sola petición nueva (cuarto revisor)
 *       | sigue en camino                               |
 *   C3b | cerrar sesión y volver a entrar               | sin filtros
 *   C8  | vuelve la señal con una petición vieja colgada| sale una nueva
 *   C9  | filtrar                                       | no toca el historial
 *
 * Y CodeRabbit (3 nov 2026):
 *
 *   C11 | otra cuenta entra sin salir de Torneos        | nunca ve la lista de la anterior: la
 *       |                                               | espera hasta que llega la suya
 *   C11b| ídem, con algo buscado por la anterior        | sin sus filtros, ni en pantalla ni
 *       |                                               | guardados como suyos (revisor)
 *   C11c| ídem, con la carga de la anterior fallida     | sin el aviso de esa carga
 *
 * Vacío porque no se ha podido preguntar no es vacío: decir «Aún no hay» y
 * ofrecer «Crear Tu Primera Competición» es afirmar algo que nadie ha
 * comprobado, y quien tenga las suyas las ve desaparecer.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Profiler, useLayoutEffect } from 'react';
import { act, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

const mockList = vi.fn();
vi.mock('../composition', () => ({
  listUserCompetitionsUseCase: { execute: (...a) => mockList(...a) },
}));

// La sesión como en la aplicación: una instantánea que avisa al cambiar
const sesion = vi.hoisted(() => ({ user: { id: 'u-1' }, oyentes: new Set(), instantanea: null }));
const ponLaSesion = (user) => {
  sesion.user = user;
  sesion.instantanea = { user, loading: false };
  sesion.oyentes.forEach((o) => o());
};
vi.mock('../hooks/useAuth', async () => {
  const { useSyncExternalStore } = await import('react');
  const suscribe = (o) => {
    sesion.oyentes.add(o);
    return () => sesion.oyentes.delete(o);
  };
  return { useAuth: () => useSyncExternalStore(suscribe, () => sesion.instantanea) };
});
vi.mock('../services/sesionCompartida', () => ({
  consultaLaSesion: () => {
    // Una vez sin saber quién es, como cuando la sesión supera el tope
    if (sesion.sinSaberUnaVez) {
      sesion.sinSaberUnaVez = false;
      return Promise.resolve(null);
    }
    return Promise.resolve(sesion.user);
  },
  loQueHaySobreLaSesion: () => ({ user: sesion.user }),
}));
vi.mock('../hooks/useAuthContext', () => ({
  useAuthContext: () => ({ user: { id: 'u-1' }, clearAuth: vi.fn() }),
}));
vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'es' } }),
}));

const toasts = vi.hoisted(() => []);
vi.mock('../utils/toast', () => ({
  default: { error: (m) => toasts.push(m), success: vi.fn() },
}));

const Competitions = (await import('./Competitions')).default;
const { loader, shouldRevalidate } = await import('./Competitions.datos');
const { olvidaTodo, olvidaLoDeEstaCuenta } = await import('../services/loUltimoConocido');
const { marcaElArranque, olvidaLoQueEstaEnCamino, pideOtraVez } = await import('../utils/cargaDeLaPantalla');

// Lo que hace la carcasa de la aplicación al montarse
const Carcasa = () => {
  useLayoutEffect(() => marcaElArranque(true), []);
  return null;
};
// Cuántas tarjetas había en el primer pintado: ahí restaura el scroll el router
const sonda = { tarjetas: null };
const Sonda = () => {
  useLayoutEffect(() => {
    sonda.tarjetas ??= document.querySelectorAll('[data-testid="tarjeta-competicion"]').length;
  });
  return null;
};

const TORNEO = { id: 'c-1', name: 'Torneo del Club', status: 'IN_PROGRESS', creatorId: 'u-1', participants: [] };
const sinRed = () => new TypeError('Failed to fetch');
const delServidor = (status) => Object.assign(new Error('Rate limit exceeded: 30 per 1 minute'), { status });
const enLinea = (si) => Object.defineProperty(globalThis.navigator, 'onLine', { value: si, configurable: true });

const pintadas = { cuantas: 0 };
const pinta = ({ state, antes = [] } = {}) => {
  const router = createMemoryRouter(
    [
      {
        path: '/competitions',
        loader,
        shouldRevalidate,
        element: (
          <>
            <Carcasa />
            <Profiler id="torneos" onRender={() => { pintadas.cuantas += 1; }}>
              <Competitions />
            </Profiler>
            <Sonda />
          </>
        ),
      },
      { path: '/otra', element: <p>otra pantalla</p> },
    ],
    { initialEntries: [...antes, { pathname: '/competitions', state }], initialIndex: antes.length }
  );
  render(<RouterProvider router={router} />);
  return router;
};

// Con la lista ya cargada en esta visita: se entra una vez con red y se vuelve
const conLaListaYaCargada = async (falloDespues) => {
  mockList.mockResolvedValueOnce([TORNEO]);
  const router = pinta();
  await screen.findByText('Torneo del Club');
  await act(() => router.navigate('/otra'));
  mockList.mockRejectedValue(falloDespues);
  await act(() => router.navigate('/competitions'));
  return router;
};

describe('Torneos con loader', () => {
  beforeEach(() => {
    toasts.length = 0;
    mockList.mockReset();
    olvidaTodo();
    ponLaSesion({ id: 'u-1' });
    sesion.sinSaberUnaVez = false;
    marcaElArranque(true);
    olvidaLoQueEstaEnCamino();
    sonda.tarjetas = null;
    enLinea(true);
  });

  // También si una prueba con relojes falsos falla a medias (CodeRabbit)
  afterEach(() => vi.useRealTimers());

  it('T1: con red, la lista', async () => {
    mockList.mockResolvedValue([TORNEO]);
    pinta();

    expect(await screen.findByText('Torneo del Club')).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledWith('u-1');
  });

  it('T2: con red y ninguna, «Aún no hay» y crear la primera', async () => {
    mockList.mockResolvedValue([]);
    pinta();

    expect(await screen.findByText('myCompetitions.createYourFirstCompetition')).toBeInTheDocument();
  });

  it('T3: sin red y nada en memoria: «sin conexión», no «no tienes»', async () => {
    mockList.mockRejectedValue(sinRed());
    pinta();

    expect(await screen.findByTestId('competiciones-sin-cobertura')).toBeInTheDocument();
    expect(screen.queryByText('myCompetitions.noCompetitionsYet')).not.toBeInTheDocument();
    expect(screen.queryByText('myCompetitions.createYourFirstCompetition')).not.toBeInTheDocument();
  });

  it('T3b: sin red ni lista, la pantalla se queda quieta', async () => {
    mockList.mockRejectedValue(sinRed());
    pinta();
    await screen.findByTestId('competiciones-sin-cobertura');
    await act(() => new Promise((r) => setTimeout(r, 50)));
    const trasCargar = pintadas.cuantas;

    await act(() => new Promise((r) => setTimeout(r, 100)));

    expect(pintadas.cuantas).toBe(trasCargar);
  });

  it('T4: sin red con la lista ya cargada: la lista y el aviso', async () => {
    await conLaListaYaCargada(sinRed());

    expect(await screen.findByText('Torneo del Club')).toBeInTheDocument();
    expect(screen.getByTestId('aviso-lista-sin-respuesta')).toHaveTextContent('sinConexion.aviso');
    expect(screen.queryByText('myCompetitions.createYourFirstCompetition')).not.toBeInTheDocument();
  });

  it('T4b: con el móvil sin red, el aviso ya lo da la barra de arriba: no se repite', async () => {
    await conLaListaYaCargada(sinRed());
    act(() => {
      enLinea(false);
      globalThis.dispatchEvent(new globalThis.Event('offline'));
    });

    expect(await screen.findByText('Torneo del Club')).toBeInTheDocument();
    expect(screen.queryByTestId('aviso-lista-sin-respuesta')).not.toBeInTheDocument();
  });

  it('T6: 429 sin nada en memoria: «No se pudo cargar» + Reintentar, nunca «Aún no hay»', async () => {
    mockList.mockRejectedValue(delServidor(429));
    pinta();

    expect(await screen.findByTestId('competiciones-sin-cargar')).toHaveTextContent('myCompetitions.noSePudoCargar');
    expect(screen.getByRole('button', { name: 'myCompetitions.reintentar' })).toBeInTheDocument();
    expect(screen.queryByText('myCompetitions.noCompetitionsYet')).not.toBeInTheDocument();
    expect(screen.queryByTestId('competiciones-sin-cobertura')).not.toBeInTheDocument();
    // Ni «Mostrando 0 de 0»: tampoco se ha comprobado
    expect(screen.queryByText('myCompetitions.showing')).not.toBeInTheDocument();
  });

  it('T7: 500 con la lista ya cargada: la lista + «No se pudo actualizar» + Reintentar', async () => {
    await conLaListaYaCargada(delServidor(500));

    expect(await screen.findByTestId('aviso-lista-sin-actualizar')).toHaveTextContent('myCompetitions.noSePudoActualizar');
    expect(screen.getByText('Torneo del Club')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'myCompetitions.reintentar' })).toBeInTheDocument();
  });

  it('T8: Reintentar vuelve a pedir y, si sale bien, el aviso se va', async () => {
    mockList.mockRejectedValueOnce(delServidor(500)).mockResolvedValue([TORNEO]);
    pinta();
    fireEvent.click(await screen.findByRole('button', { name: 'myCompetitions.reintentar' }));

    expect(await screen.findByText('Torneo del Club')).toBeInTheDocument();
    expect(screen.queryByTestId('competiciones-sin-cargar')).not.toBeInTheDocument();
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('T9: al volver la señal se pide sola y el aviso se va', async () => {
    mockList.mockRejectedValueOnce(sinRed()).mockResolvedValue([TORNEO]);
    pinta();
    await screen.findByTestId('competiciones-sin-cobertura');

    act(() => globalThis.dispatchEvent(new globalThis.Event('online')));

    expect(await screen.findByText('Torneo del Club')).toBeInTheDocument();
    expect(screen.queryByTestId('competiciones-sin-cobertura')).not.toBeInTheDocument();
  });

  it('T9b: con la lista bien cargada, volver la señal no pide nada', async () => {
    mockList.mockResolvedValue([TORNEO]);
    pinta();
    await screen.findByText('Torneo del Club');

    act(() => globalThis.dispatchEvent(new globalThis.Event('online')));
    await act(async () => { await Promise.resolve(); });

    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it('T10 y T11: un error del servidor saca el toast de siempre, sin el texto técnico', async () => {
    mockList.mockRejectedValue(delServidor(429));
    pinta();
    await screen.findByTestId('competiciones-sin-cargar');

    expect(toasts).toEqual(['detail.failedToLoadCompetitions']);
    expect(screen.queryByText(/Rate limit exceeded/)).not.toBeInTheDocument();
  });

  it('T10b: sin red, el toast de sin conexión, sin el texto técnico', async () => {
    mockList.mockRejectedValue(sinRed());
    pinta();
    await screen.findByTestId('competiciones-sin-cobertura');

    expect(toasts).toEqual(['sinConexion.mensaje']);
    expect(screen.queryByText(/Failed to fetch/)).not.toBeInTheDocument();
  });

  it('T10c: uno por carga fallida: reintentar y volver a fallar lo repite', async () => {
    mockList.mockRejectedValue(delServidor(500));
    pinta();
    fireEvent.click(await screen.findByRole('button', { name: 'myCompetitions.reintentar' }));
    await act(async () => { await Promise.resolve(); });

    await waitFor(() => expect(toasts).toHaveLength(2));
  });

  it('T10d: una carga buena no saca ninguno', async () => {
    mockList.mockResolvedValue([TORNEO]);
    pinta();
    await screen.findByText('Torneo del Club');

    expect(toasts).toEqual([]);
  });

  it('T16: un filtro sin coincidencias no se confunde con falta de red', async () => {
    await conLaListaYaCargada(sinRed());
    await screen.findByText('Torneo del Club');

    fireEvent.change(screen.getByPlaceholderText('myCompetitions.searchPlaceholder'), {
      target: { value: 'no existe nada con este nombre' },
    });

    expect(await screen.findByText('myCompetitions.noCompetitionsFound')).toBeInTheDocument();
    expect(screen.queryByTestId('competiciones-sin-cobertura')).not.toBeInTheDocument();
  });

  it('T31: en la primera carga, la espera de hoy y luego la lista', async () => {
    marcaElArranque(false);
    let responde;
    mockList.mockReturnValue(new Promise((r) => { responde = r; }));
    pinta();

    expect(await screen.findByText('myCompetitions.loadingCompetitions')).toBeInTheDocument();
    await act(async () => responde([TORNEO]));
    expect(await screen.findByText('Torneo del Club')).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it('T32: con la sesión aún sin saber, la espera, y la lista al saberse', async () => {
    ponLaSesion(null);
    mockList.mockResolvedValue([TORNEO]);
    pinta();
    // Sin usuario la pantalla no se pinta (en la aplicación, el guardia espera)
    await act(() => new Promise((r) => setTimeout(r, 50)));
    expect(screen.queryByText('myCompetitions.noCompetitionsYet')).not.toBeInTheDocument();
    expect(mockList).not.toHaveBeenCalled();

    act(() => ponLaSesion({ id: 'u-1' }));

    expect(await screen.findByText('Torneo del Club')).toBeInTheDocument();
    expect(screen.queryByText('myCompetitions.noCompetitionsYet')).not.toBeInTheDocument();
  });

  it('T32b: si más tarde vuelve a faltar la sesión, se vuelve a pedir', async () => {
    marcaElArranque(false);
    mockList.mockRejectedValueOnce(sinRed()).mockResolvedValue([TORNEO]);
    pinta();
    await screen.findByTestId('competiciones-sin-cobertura');

    sesion.sinSaberUnaVez = true;
    act(() => globalThis.dispatchEvent(new globalThis.Event('online')));

    expect(await screen.findByText('Torneo del Club')).toBeInTheDocument();
  });

  it('T33: la lista que llega tras el tope aparece sola, sin pedirla otra vez', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let responde;
    mockList.mockReturnValue(new Promise((r) => { responde = r; }));
    pinta();
    await act(() => vi.advanceTimersByTimeAsync(4000));
    expect(await screen.findByTestId('competiciones-sin-cobertura')).toBeInTheDocument();

    await act(async () => responde([TORNEO]));

    expect(await screen.findByText('Torneo del Club')).toBeInTheDocument();
    expect(screen.queryByTestId('competiciones-sin-cobertura')).not.toBeInTheDocument();
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it('T34: en el primer pintado las tarjetas ya están', async () => {
    mockList.mockResolvedValue([TORNEO]);
    pinta();
    await screen.findByText('Torneo del Club');

    expect(sonda.tarjetas).toBe(1);
  });

  it('T37: pulsar Torneos estando en Torneos no pide nada', async () => {
    mockList.mockResolvedValue([TORNEO]);
    const router = pinta();
    await screen.findByText('Torneo del Club');

    await act(() => router.navigate('/competitions'));

    expect(mockList).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Torneo del Club')).toBeInTheDocument();
  });

  it('T38: tras T37, Reintentar sigue pidiendo', async () => {
    mockList.mockRejectedValueOnce(delServidor(500)).mockResolvedValue([TORNEO]);
    const router = pinta();
    await screen.findByTestId('competiciones-sin-cargar');
    await act(() => router.navigate('/competitions'));
    expect(mockList).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'myCompetitions.reintentar' }));

    expect(await screen.findByText('Torneo del Club')).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('T40: si la sesión se confirma o cambia, se vuelve a pedir, como hoy', async () => {
    mockList.mockRejectedValueOnce(sinRed()).mockResolvedValue([TORNEO]);
    pinta();
    await screen.findByTestId('competiciones-sin-cobertura');

    // Otro objeto `user`: lo que publica la sesión al confirmarse
    act(() => ponLaSesion({ id: 'u-1' }));

    expect(await screen.findByText('Torneo del Club')).toBeInTheDocument();
  });

  it('T41: si se navega mientras se vuelve a pedir, luego pulsar Torneos en Torneos no pide', async () => {
    mockList.mockRejectedValueOnce(delServidor(500)).mockResolvedValue([TORNEO]);
    const router = pinta();
    fireEvent.click(await screen.findByRole('button', { name: 'myCompetitions.reintentar' }));
    await act(() => router.navigate('/otra'));
    await act(() => router.navigate('/competitions'));
    await screen.findByText('Torneo del Club');
    const antes = mockList.mock.calls.length;

    await act(() => router.navigate('/competitions'));

    expect(mockList).toHaveBeenCalledTimes(antes);
  });

  const filtraPorActivas = () =>
    fireEvent.change(screen.getByDisplayValue('myCompetitions.allStatuses'), { target: { value: 'ACTIVE' } });
  const LISTA = [
    { ...TORNEO, id: 'c-1', name: 'Torneo activo', status: 'ACTIVE' },
    { ...TORNEO, id: 'c-2', name: 'Torneo cerrado', status: 'CLOSED' },
  ];

  it('F1: filtrar, salir y volver atrás conserva los filtros', async () => {
    mockList.mockResolvedValue(LISTA);
    const router = pinta();
    await screen.findByText('Torneo cerrado');
    filtraPorActivas();
    fireEvent.change(screen.getByPlaceholderText('myCompetitions.searchPlaceholder'), { target: { value: 'activo' } });
    await act(async () => {});

    await act(() => router.navigate('/otra'));
    await act(() => router.navigate(-1));

    expect(await screen.findByText('Torneo activo')).toBeInTheDocument();
    expect(screen.queryByText('Torneo cerrado')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('myCompetitions.searchPlaceholder')).toHaveValue('activo');
    expect(screen.getByDisplayValue('myCompetitions.active')).toBeInTheDocument();
  });

  it('F5: filtrar no apila entradas: atrás sale de Torneos', async () => {
    mockList.mockResolvedValue(LISTA);
    const router = pinta({ antes: ['/otra'] });
    await screen.findByText('Torneo cerrado');
    filtraPorActivas();
    await act(async () => {});

    await act(() => router.navigate(-1));

    expect(router.state.location.pathname).toBe('/otra');
  });

  it('T41b: la marca de volver a pedir que no se usó se olvida al salir', async () => {
    mockList.mockResolvedValue([TORNEO]);
    const router = pinta();
    await screen.findByText('Torneo del Club');
    // Armada y sin usar: como un «Reintentar» al que adelanta una navegación
    pideOtraVez({ revalidate: () => {} });

    await act(() => router.navigate('/otra'));
    await act(() => router.navigate('/competitions'));
    await screen.findByText('Torneo del Club');
    const antes = mockList.mock.calls.length;
    await act(() => router.navigate('/competitions'));

    expect(mockList).toHaveBeenCalledTimes(antes);
  });

  it('F2: entrar de nuevo en Torneos empieza sin filtros', async () => {
    mockList.mockResolvedValue(LISTA);
    const router = pinta();
    await screen.findByText('Torneo cerrado');
    filtraPorActivas();
    await act(async () => {});

    await act(() => router.navigate('/otra'));
    await act(() => router.navigate('/competitions'));

    expect(await screen.findByText('Torneo cerrado')).toBeInTheDocument();
  });

  it('F4: filtrar no pide nada', async () => {
    mockList.mockResolvedValue(LISTA);
    pinta();
    await screen.findByText('Torneo cerrado');

    filtraPorActivas();
    await act(() => new Promise((r) => setTimeout(r, 50)));

    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it('T23: Torneos y otra pantalla muy seguidas: se queda la última', async () => {
    mockList.mockResolvedValue([]);
    const router = pinta();
    await screen.findByText('myCompetitions.createYourFirstCompetition');
    await act(() => router.navigate('/otra'));
    let responde;
    mockList.mockReturnValue(new Promise((r) => { responde = r; }));

    act(() => { router.navigate('/competitions'); });
    await act(() => router.navigate('/otra'));
    await act(async () => responde([TORNEO]));

    expect(router.state.location.pathname).toBe('/otra');
    expect(screen.getByText('otra pantalla')).toBeInTheDocument();
  });

  const busca = (texto) =>
    fireEvent.change(screen.getByPlaceholderText('myCompetitions.searchPlaceholder'), { target: { value: texto } });
  const colgada = () => {
    const pendiente = {};
    pendiente.promesa = new Promise((r, f) => { pendiente.responde = r; pendiente.falla = f; });
    return pendiente;
  };

  it('C2: tras pulsar Torneos en Torneos, salir y volver atrás conserva los filtros', async () => {
    mockList.mockResolvedValue(LISTA);
    const router = pinta();
    await screen.findByText('Torneo cerrado');
    filtraPorActivas();
    await act(async () => {});

    await act(() => router.navigate('/competitions', { replace: true }));
    expect(screen.queryByText('Torneo cerrado')).not.toBeInTheDocument();
    await act(() => router.navigate('/otra'));
    await act(() => router.navigate(-1));

    expect(await screen.findByText('Torneo activo')).toBeInTheDocument();
    expect(screen.queryByText('Torneo cerrado')).not.toBeInTheDocument();
  });

  it('C3: otra cuenta en el mismo móvil, al volver atrás, sin filtros', async () => {
    mockList.mockResolvedValue(LISTA);
    const router = pinta();
    await screen.findByText('Torneo cerrado');
    filtraPorActivas();
    busca('activo');
    await act(async () => {});
    await act(() => router.navigate('/otra'));

    act(() => ponLaSesion({ id: 'u-2' }));
    await act(() => router.navigate(-1));

    expect(await screen.findByText('Torneo cerrado')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('myCompetitions.searchPlaceholder')).toHaveValue('');
  });

  it('C4: filtrar mientras Reintentar está en camino no la corta', async () => {
    const segunda = colgada();
    mockList.mockRejectedValueOnce(delServidor(500)).mockReturnValueOnce(segunda.promesa);
    pinta();
    fireEvent.click(await screen.findByRole('button', { name: 'myCompetitions.reintentar' }));
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));

    busca('torneo');
    await act(async () => {});
    await act(async () => segunda.responde(LISTA));

    expect(await screen.findByText('Torneo activo')).toBeInTheDocument();
    expect(screen.queryByTestId('competiciones-sin-cargar')).not.toBeInTheDocument();
  });

  it('C4b: filtrar mientras se pide al volver la señal no la corta', async () => {
    const segunda = colgada();
    mockList.mockRejectedValueOnce(sinRed()).mockReturnValueOnce(segunda.promesa);
    pinta();
    await screen.findByTestId('competiciones-sin-cobertura');
    act(() => globalThis.dispatchEvent(new globalThis.Event('online')));
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));

    filtraPorActivas();
    await act(async () => {});
    await act(async () => segunda.responde(LISTA));

    expect(await screen.findByText('Torneo activo')).toBeInTheDocument();
    expect(screen.queryByTestId('competiciones-sin-cobertura')).not.toBeInTheDocument();
  });

  it('C5: si pulsar Torneos en Torneos corta la recarga, esa pulsación carga (con la misma petición)', async () => {
    const segunda = colgada();
    mockList.mockRejectedValueOnce(delServidor(500)).mockReturnValueOnce(segunda.promesa);
    const router = pinta();
    fireEvent.click(await screen.findByRole('button', { name: 'myCompetitions.reintentar' }));
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));

    act(() => { router.navigate('/competitions', { replace: true }); });
    // Que la carga del toque llegue a unirse antes de que conteste
    await act(() => new Promise((r) => setTimeout(r, 0)));
    await act(async () => segunda.responde(LISTA));

    expect(await screen.findByText('Torneo activo')).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('C5b: con Reintentar ya respondido, pulsar Torneos en Torneos no pide', async () => {
    mockList.mockRejectedValueOnce(delServidor(500)).mockResolvedValue(LISTA);
    const router = pinta();
    fireEvent.click(await screen.findByRole('button', { name: 'myCompetitions.reintentar' }));
    await screen.findByText('Torneo activo');

    await act(() => router.navigate('/competitions', { replace: true }));

    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('C6: la sesión se confirma durante la primera carga y esta falla: se pide de nuevo', async () => {
    marcaElArranque(false);
    const primera = colgada();
    mockList.mockReturnValueOnce(primera.promesa).mockResolvedValue(LISTA);
    pinta();
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(1));

    act(() => ponLaSesion({ id: 'u-1' }));
    await act(async () => primera.falla(sinRed()));

    expect(await screen.findByText('Torneo activo')).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('C6b: la sesión cambia durante un Reintentar: petición nueva, no la que ya iba', async () => {
    const segunda = colgada();
    mockList.mockRejectedValueOnce(delServidor(500)).mockReturnValueOnce(segunda.promesa).mockResolvedValue(LISTA);
    pinta();
    fireEvent.click(await screen.findByRole('button', { name: 'myCompetitions.reintentar' }));
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));

    act(() => ponLaSesion({ id: 'u-1' }));

    expect(await screen.findByText('Torneo activo')).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledTimes(3);
  });

  it('C7: dos toques seguidos en la pestaña desde otra pantalla, una sola petición', async () => {
    mockList.mockResolvedValue(LISTA);
    const router = pinta({ antes: ['/otra'] });
    await screen.findByText('Torneo cerrado');
    await act(() => router.navigate('/otra'));
    mockList.mockClear();
    const enCamino = colgada();
    mockList.mockReturnValue(enCamino.promesa);

    act(() => { router.navigate('/competitions'); });
    await act(() => { router.navigate('/competitions'); });
    await act(async () => enCamino.responde(LISTA));

    expect(await screen.findByText('Torneo cerrado')).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it('C7b: tocar la pestaña mientras Reintentar sigue en camino no pide más', async () => {
    mockList.mockRejectedValueOnce(delServidor(500)).mockReturnValue(new Promise(() => {}));
    const router = pinta();
    fireEvent.click(await screen.findByRole('button', { name: 'myCompetitions.reintentar' }));
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));

    await act(async () => { router.navigate('/competitions', { replace: true }); });
    await act(async () => { router.navigate('/competitions', { replace: true }); });
    await act(() => new Promise((r) => setTimeout(r, 20)));

    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('C3b: al cerrar sesión los filtros se olvidan', async () => {
    mockList.mockResolvedValue(LISTA);
    const router = pinta();
    await screen.findByText('Torneo cerrado');
    filtraPorActivas();
    await act(async () => {});
    await act(() => router.navigate('/otra'));

    olvidaLoDeEstaCuenta();
    await act(() => router.navigate(-1));

    expect(await screen.findByText('Torneo cerrado')).toBeInTheDocument();
  });

  it('C8: vuelve la señal otra vez con la petición anterior colgada: sale una nueva', async () => {
    mockList.mockRejectedValueOnce(sinRed()).mockReturnValueOnce(new Promise(() => {})).mockResolvedValue(LISTA);
    pinta();
    await screen.findByTestId('competiciones-sin-cobertura');
    act(() => globalThis.dispatchEvent(new globalThis.Event('online')));
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));

    act(() => globalThis.dispatchEvent(new globalThis.Event('online')));

    expect(await screen.findByText('Torneo activo')).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledTimes(3);
  });

  it('C9: filtrar no toca el historial', async () => {
    mockList.mockResolvedValue(LISTA);
    const router = pinta();
    await screen.findByText('Torneo cerrado');
    const { key } = router.state.location;

    filtraPorActivas();
    busca('activo');
    await act(async () => {});

    expect(router.state.location.key).toBe(key);
    expect(router.state.location.state).toBeFalsy();
  });

  it('C11: otra cuenta sin salir de Torneos no ve la lista de la anterior', async () => {
    mockList.mockResolvedValueOnce([TORNEO]);
    pinta();
    await screen.findByText('Torneo del Club');
    const suya = colgada();
    mockList.mockReturnValueOnce(suya.promesa);

    act(() => ponLaSesion({ id: 'u-2' }));

    expect(screen.queryByText('Torneo del Club')).not.toBeInTheDocument();
    expect(screen.getByText('myCompetitions.loadingCompetitions')).toBeInTheDocument();
    await act(async () => suya.responde(LISTA));
    expect(await screen.findByText('Torneo activo')).toBeInTheDocument();
    expect(mockList).toHaveBeenLastCalledWith('u-2');
  });

  it('C11b: otra cuenta sin salir de Torneos no hereda lo que buscó la anterior', async () => {
    mockList.mockResolvedValueOnce(LISTA);
    const router = pinta();
    await screen.findByText('Torneo cerrado');
    filtraPorActivas();
    busca('activo');
    await act(async () => {});
    mockList.mockResolvedValue(LISTA);

    act(() => ponLaSesion({ id: 'u-2' }));

    expect(await screen.findByText('Torneo cerrado')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('myCompetitions.searchPlaceholder')).toHaveValue('');
    // Ni guardados para ella: al volver atrás a esta entrada, sin filtros
    await act(() => router.navigate('/otra'));
    await act(() => router.navigate(-1));
    expect(await screen.findByText('Torneo cerrado')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('myCompetitions.searchPlaceholder')).toHaveValue('');
  });

  it('C11c: otra cuenta sin salir de Torneos no recibe el aviso de la carga fallida de la anterior', async () => {
    mockList.mockRejectedValueOnce(delServidor(500));
    pinta();
    await screen.findByTestId('competiciones-sin-cargar');
    toasts.length = 0;
    mockList.mockReturnValue(new Promise(() => {}));

    act(() => ponLaSesion({ id: 'u-2' }));
    await act(async () => {});

    expect(toasts).toEqual([]);
  });
});
