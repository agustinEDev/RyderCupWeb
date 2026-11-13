import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import UpcomingMatchesPage from './UpcomingMatchesPage';

/**
 * «Mis próximos partidos» descarta lo que llega tarde (T2).
 *
 *   #      caso                                     | qué pasa
 *   -------|------------------------------------------|---------------------------------------------
 *   T2-14  sin usuario                              | ni espera ni petición
 *   T2-15  cambia el usuario con la lectura en vuelo | la lista vieja no se pinta
 *   T2-17d llega un `user` nuevo con el mismo id     | no se vuelve a pedir
 *   T2-16  la lectura falla entera                  | «no se pudo preguntar», no una espera sin fin
 */
const sesion = vi.hoisted(() => ({ user: { id: 'u-1' }, loading: false }));
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => sesion }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'es' } }),
}));
vi.mock('../../components/layout/HeaderAuth', () => ({ default: () => null }));
vi.mock('../../components/schedule/TarjetaDeLoProximo', () => ({
  default: ({ partido }) => <div data-testid={`proximo-${partido.id}`} />,
}));
const listarCompeticiones = vi.fn();
vi.mock('../../composition', () => ({
  listUserCompetitionsUseCase: { execute: (...a) => listarCompeticiones(...a) },
  getUpcomingMatchesUseCase: { executeWithCompleteness: vi.fn() },
  getScoringViewUseCase: { execute: vi.fn() },
  getUpcomingTeeGroupsUseCase: { executeWithCompleteness: vi.fn() },
  getTeeGroupScoringViewUseCase: { execute: vi.fn() },
}));
// Las dos lecturas, a mano: lo que se prueba es cómo trata la pantalla lo que
// devuelven y cuándo
const leePartidos = vi.fn();
vi.mock('../../services/partidosSinCobertura', async () => ({
  ...(await vi.importActual('../../services/partidosSinCobertura')),
  leeLosProximosPartidos: (...a) => leePartidos(...a),
  leeLasProximasPartidas: () =>
    Promise.resolve({ partidas: [], desdeMemoria: false, sinRespuesta: false, incompleta: false }),
}));

const aMano = () => {
  let resolver;
  let rechazar;
  const promesa = new Promise((res, rej) => {
    resolver = res;
    rechazar = rej;
  });
  return { promesa, resolver, rechazar };
};
const partidos = (...ids) => ({
  partidos: ids.map((id) => ({ id, roundDate: '2099-01-01', status: 'SCHEDULED', teamAPlayerNames: [], teamBPlayerNames: [] })),
  desdeMemoria: false,
  sinRespuesta: false,
  incompleta: false,
});
const arbol = () => (
  <MemoryRouter>
    <UpcomingMatchesPage />
  </MemoryRouter>
);
const espera = () => screen.queryByText('upcomingMatches.loading');

describe('UpcomingMatchesPage: la lectura descarta lo que llega tarde (T2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sesion.user = { id: 'u-1' };
    listarCompeticiones.mockResolvedValue([]);
    leePartidos.mockResolvedValue(partidos('m-1'));
  });

  it('T2-14: sin usuario, ni espera ni petición', async () => {
    sesion.user = null;
    render(arbol());
    await act(async () => {});

    expect(espera()).not.toBeInTheDocument();
    expect(leePartidos).not.toHaveBeenCalled();
    expect(listarCompeticiones).not.toHaveBeenCalled();
  });

  it('T2-15: si cambia el usuario con la lectura en vuelo, la lista vieja no se pinta', async () => {
    const vieja = aMano();
    const nueva = aMano();
    leePartidos.mockReturnValueOnce(vieja.promesa).mockReturnValueOnce(nueva.promesa);
    const { rerender } = render(arbol());

    sesion.user = { id: 'u-2' };
    rerender(arbol());
    await act(async () => {});
    expect(leePartidos).toHaveBeenCalledTimes(2);
    await act(async () => vieja.resolver(partidos('del-primero')));

    expect(screen.queryByTestId('proximo-del-primero')).not.toBeInTheDocument();
    expect(espera()).toBeInTheDocument();
    await act(async () => nueva.resolver(partidos('del-segundo')));
    expect(screen.getByTestId('proximo-del-segundo')).toBeInTheDocument();
    expect(screen.queryByTestId('proximo-del-primero')).not.toBeInTheDocument();
  });

  it('T2-17d: un `user` nuevo con el mismo id no vuelve a pedir', async () => {
    const { rerender } = render(arbol());
    await screen.findByTestId('proximo-m-1');

    sesion.user = { id: 'u-1' };
    rerender(arbol());
    await act(async () => {});

    expect(leePartidos).toHaveBeenCalledTimes(1);
    expect(listarCompeticiones).toHaveBeenCalledTimes(1);
  });

  it('T2-16: si la lectura falla entera, «no se pudo preguntar» y no una espera sin fin', async () => {
    const falla = aMano();
    leePartidos.mockReturnValueOnce(falla.promesa);
    render(arbol());
    expect(espera()).toBeInTheDocument();

    await act(async () => falla.rechazar(new Error('inesperado')));

    expect(espera()).not.toBeInTheDocument();
    expect(screen.getByText('upcomingMatches.sinRespuesta')).toBeInTheDocument();
    expect(screen.queryByText('upcomingMatches.noMatches')).not.toBeInTheDocument();
  });

  it('T2-16b: el fallo de la lectura queda registrado (antes llegaba a Sentry como rechazo sin capturar)', async () => {
    const registro = vi.spyOn(globalThis.console, 'error').mockImplementation(() => {});
    const falla = aMano();
    leePartidos.mockReturnValueOnce(falla.promesa);
    render(arbol());
    const error = new Error('inesperado');

    await act(async () => falla.rechazar(error));

    expect(registro).toHaveBeenCalledWith(expect.any(String), error);
    registro.mockRestore();
  });
});
