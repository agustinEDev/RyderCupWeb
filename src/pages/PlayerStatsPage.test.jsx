import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import PlayerStatsPage from './PlayerStatsPage';
import PlayerStats from '../domain/entities/PlayerStats';
import RecentMatch from '../domain/entities/RecentMatch';

const mockGetPlayerStats = vi.fn();
const mockGetRecentMatches = vi.fn();
const mockGetPlayerStatsByGolfCourse = vi.fn();

vi.mock('../composition', () => ({
  getPlayerStatsUseCase: { execute: (...args) => mockGetPlayerStats(...args) },
  getRecentMatchesUseCase: { execute: (...args) => mockGetRecentMatches(...args) },
  getPlayerStatsByGolfCourseUseCase: {
    execute: (...args) => mockGetPlayerStatsByGolfCourse(...args),
  },
  logoutUseCase: { execute: vi.fn() },
}));

// El objeto se crea una vez: devolver uno nuevo en cada render haria que
// cualquier efecto que dependa de `user` se reejecutara sin parar
const authUser = { id: 'user-1', first_name: 'Ana' };
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: authUser, loading: false }),
}));

vi.mock('../components/layout/HeaderAuth', () => ({ default: () => <div /> }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      // `counted` primero: las claves que lo llevan traen tambien `count`
      // para que i18next pluralice, y si no se mira antes se pierde
      if (options?.counted !== undefined) return `${key}:${options.counted}/${options.count}`;
      if (options && typeof options.count === 'number') return `${key}:${options.count}`;
      return key;
    },
    i18n: { language: 'es' },
  }),
}));

vi.mock('../hooks/useEntryMotion', () => ({ useEntryMotion: () => ({ animateEntry: false }) }));

const fullStats = PlayerStats.fromPersistence({
  handicap: 18,
  scoringAvg: 12.5,
  roundsPlayed: 10,
  estimatedIndex: 14.2,
  bestDifferential: 9.4,
  roundsWithDifferential: 8,
});

const matches = [
  RecentMatch.fromPersistence({
    id: 'm1',
    golfCourseId: 'course-1',
    golfCourseName: 'St Andrews',
    scoringFormat: 'MEDAL',
  }),
  RecentMatch.fromPersistence({
    id: 'm2',
    golfCourseId: 'course-2',
    golfCourseName: 'Valderrama',
    scoringFormat: 'MEDAL',
  }),
  RecentMatch.fromPersistence({
    id: 'm3',
    golfCourseId: 'course-1',
    golfCourseName: 'St Andrews',
    scoringFormat: 'MEDAL',
  }),
];

const renderPage = () =>
  render(
    <MemoryRouter>
      <PlayerStatsPage />
    </MemoryRouter>
  );

describe('PlayerStatsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPlayerStats.mockResolvedValue(fullStats);
    mockGetRecentMatches.mockResolvedValue(matches);
    mockGetPlayerStatsByGolfCourse.mockResolvedValue(
      PlayerStats.fromPersistence({ roundsPlayed: 2, scoringAvg: 8, estimatedIndex: 11.1 })
    );
  });

  it('shows the global figures', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('stat-rounds')).toHaveTextContent('10');
    });
    expect(screen.getByTestId('stat-index')).toHaveTextContent('14.2');
    expect(screen.getByTestId('stat-best')).toHaveTextContent('9.4');
  });

  it('asks for the whole history, not just the dashboard slice', async () => {
    renderPage();

    await waitFor(() => expect(mockGetRecentMatches).toHaveBeenCalled());
    // Sin limite: esta es la pagina del "ver todas"
    expect(mockGetRecentMatches).toHaveBeenCalledWith();
  });

  describe('the course filter', () => {
    it('lists each course the player has played, once', async () => {
      renderPage();

      await waitFor(() => expect(screen.getByTestId('course-filter')).toBeInTheDocument());
      // Dos partidas en St Andrews, pero un solo filtro
      expect(screen.getAllByTestId(/^course-filter-/)).toHaveLength(2);
      expect(screen.getByTestId('course-filter-course-1')).toHaveTextContent('St Andrews');
    });

    it('loads that course figures when picked', async () => {
      renderPage();

      await waitFor(() => expect(screen.getByTestId('course-filter-course-1')).toBeInTheDocument());
      fireEvent.click(screen.getByTestId('course-filter-course-1'));

      await waitFor(() => {
        expect(mockGetPlayerStatsByGolfCourse).toHaveBeenCalledWith('course-1');
      });
      await waitFor(() => expect(screen.getByTestId('stat-rounds')).toHaveTextContent('2'));
    });

    it('goes back to the global figures without asking the backend again', async () => {
      renderPage();

      await waitFor(() => expect(screen.getByTestId('course-filter-course-1')).toBeInTheDocument());
      fireEvent.click(screen.getByTestId('course-filter-course-1'));
      await waitFor(() => expect(screen.getByTestId('stat-rounds')).toHaveTextContent('2'));

      fireEvent.click(screen.getByText('playerStats.allCourses'));

      await waitFor(() => expect(screen.getByTestId('stat-rounds')).toHaveTextContent('10'));
      expect(mockGetPlayerStats).toHaveBeenCalledTimes(1);
    });

    it('has no filter to show when nothing has been played', async () => {
      // Sin partidas no hay ni campos que filtrar ni cifras que enseñar: los
      // dos mocks tienen que contar la misma historia
      mockGetPlayerStats.mockResolvedValue(PlayerStats.empty());
      mockGetRecentMatches.mockResolvedValue([]);
      renderPage();

      await waitFor(() => expect(screen.getByTestId('player-stats-empty')).toBeInTheDocument());
      expect(screen.queryByTestId('course-filter')).not.toBeInTheDocument();
    });
  });

  it('warns when the index covers fewer rounds than were played', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('rounds-without-tee-note')).toHaveTextContent(
        'playerStats.roundsWithoutTee:8/10'
      );
    });
  });

  it('does not say "calculated over 0" when no round could be measured', async () => {
    /**
     * Visto en el navegador con datos reales: "Calculado sobre 0 de tus 1
     * vueltas" ademas de sonar mal, dice que hay un calculo donde no lo hay.
     */
    mockGetPlayerStats.mockResolvedValue(
      PlayerStats.fromPersistence({ roundsPlayed: 1, roundsWithDifferential: 0, scoringAvg: -3 })
    );
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('rounds-without-tee-note')).toHaveTextContent(
        'playerStats.noRoundsWithTee'
      );
    });
    expect(screen.getByTestId('rounds-without-tee-note')).not.toHaveTextContent(
      'playerStats.roundsWithoutTee'
    );
  });

  it('says nothing about missing rounds when every one counted', async () => {
    mockGetPlayerStats.mockResolvedValue(
      PlayerStats.fromPersistence({ roundsPlayed: 8, roundsWithDifferential: 8, estimatedIndex: 12 })
    );
    renderPage();

    await waitFor(() => expect(screen.getByTestId('stat-rounds')).toBeInTheDocument());
    expect(screen.queryByTestId('rounds-without-tee-note')).not.toBeInTheDocument();
  });

  it('states that the index is not the official handicap', async () => {
    /**
     * Quien lee esta pagina es justo quien puede confundir el indice con su
     * handicap de la federacion, asi que la advertencia va en la pantalla y no
     * solo en la documentacion de la API.
     */
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('playerStats.notOfficial')).toBeInTheDocument();
    });
  });

  it('shows an empty state instead of zeros for a player with no rounds', async () => {
    mockGetPlayerStats.mockResolvedValue(PlayerStats.empty());
    mockGetRecentMatches.mockResolvedValue([]);
    renderPage();

    await waitFor(() => expect(screen.getByTestId('player-stats-empty')).toBeInTheDocument());
    expect(screen.queryByTestId('stat-rounds')).not.toBeInTheDocument();
  });

  it('survives the stats request failing', async () => {
    mockGetPlayerStats.mockRejectedValue(new Error('Network error'));
    renderPage();

    await waitFor(() => expect(screen.getByTestId('player-stats-empty')).toBeInTheDocument());
  });
});
