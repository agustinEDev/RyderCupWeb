import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import PlayerStatsPage from './PlayerStatsPage';
import PlayerStats from '../domain/entities/PlayerStats';

/**
 * Las estadísticas descartan lo que llega tarde (T2).
 *
 *   #      caso                                         | qué pasa
 *   -------|----------------------------------------------|-------------------------
 *   T2-17  llega un `user` nuevo con el mismo id          | no se vuelve a pedir
 *   T2-18  cambia el usuario con la carga en vuelo        | las viejas no se pintan
 */
const mockGetPlayerStats = vi.fn();
vi.mock('../composition', () => ({
  getPlayerStatsUseCase: { execute: (...args) => mockGetPlayerStats(...args) },
  getRecentMatchesUseCase: { execute: () => Promise.resolve([]) },
  getPlayerStatsByGolfCourseUseCase: { execute: vi.fn() },
  getScoringBreakdownUseCase: { execute: () => Promise.resolve(null) },
}));
const sesion = vi.hoisted(() => ({ user: { id: 'user-1' } }));
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: sesion.user, loading: false }),
}));
vi.mock('../components/layout/HeaderAuth', () => ({ default: () => <div /> }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) =>
      options && typeof options.count === 'number'
        ? `${key}:${options.count}`
        : key,
    i18n: { language: 'es' },
  }),
}));
vi.mock('../hooks/useEntryMotion', () => ({
  useEntryMotion: () => ({ animateEntry: false }),
}));

const aMano = () => {
  let resolver;
  const promesa = new Promise((res) => {
    resolver = res;
  });
  return { promesa, resolver };
};
const cifras = (roundsPlayed) =>
  PlayerStats.fromPersistence({
    handicap: 18,
    scoringAvg: 12.5,
    roundsPlayed,
    estimatedIndex: 14.2,
  });
const arbol = () => (
  <MemoryRouter>
    <PlayerStatsPage />
  </MemoryRouter>
);

describe('PlayerStatsPage: la carga descarta lo que llega tarde (T2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sesion.user = { id: 'user-1' };
    mockGetPlayerStats.mockResolvedValue(cifras(10));
  });

  it('T2-17: un `user` nuevo con el mismo id no vuelve a pedir', async () => {
    const { rerender } = render(arbol());
    await act(async () => {});
    expect(screen.getByTestId('stat-rounds')).toHaveTextContent('10');

    sesion.user = { id: 'user-1', first_name: 'Otra copia' };
    rerender(arbol());
    await act(async () => {});

    expect(mockGetPlayerStats).toHaveBeenCalledTimes(1);
  });

  it('T2-18: si cambia el usuario con la carga en vuelo, las viejas no se pintan', async () => {
    const vieja = aMano();
    const nueva = aMano();
    mockGetPlayerStats
      .mockReturnValueOnce(vieja.promesa)
      .mockReturnValueOnce(nueva.promesa);
    const { rerender } = render(arbol());

    sesion.user = { id: 'user-2' };
    rerender(arbol());
    await act(async () => {});
    expect(mockGetPlayerStats).toHaveBeenCalledTimes(2);
    await act(async () => vieja.resolver(cifras(77)));

    expect(screen.queryByText('77')).not.toBeInTheDocument();
    await act(async () => nueva.resolver(cifras(5)));
    expect(screen.getByTestId('stat-rounds')).toHaveTextContent('5');
  });
});
