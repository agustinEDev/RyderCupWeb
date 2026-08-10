import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import RecentMatches from './RecentMatches';
import RecentMatch from '../../domain/entities/RecentMatch';

const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) =>
      options && typeof options.count === 'number' ? `${key}:${options.count}` : key,
    i18n: { language: 'es' },
  }),
}));

const tournamentWin = RecentMatch.fromPersistence({
  id: 'match-1',
  date: '2026-08-01',
  matchFormat: 'SINGLES',
  tournamentName: 'Ryder Cup Amigos',
  golfCourseName: 'St Andrews',
  result: 'WON',
  score: '3&2',
  opponents: ['Ana Soto'],
});

const stablefordRound = RecentMatch.fromPersistence({
  id: 'qm-1',
  date: '2026-08-05',
  scoringFormat: 'STABLEFORD',
  golfCourseName: 'Valderrama',
  stablefordPoints: 34,
});

const renderList = (props = {}) =>
  render(
    <MemoryRouter>
      <RecentMatches {...props} />
    </MemoryRouter>
  );

describe('RecentMatches', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows a row per match with its course', () => {
    renderList({ matches: [tournamentWin, stablefordRound] });

    expect(screen.getByTestId('recent-match-match-1')).toHaveTextContent('St Andrews');
    expect(screen.getByTestId('recent-match-qm-1')).toHaveTextContent('Valderrama');
  });

  it('names the format, which is what tells two similar rows apart', () => {
    /**
     * Visto en el navegador: tres partidas contra el mismo rival, en el mismo
     * campo y el mismo dia se veian identicas. Lo unico que las distinguia era
     * el marcador, y el formato explica por que uno dice "1UP" y otro "-1".
     */
    renderList({ matches: [tournamentWin, stablefordRound] });

    expect(screen.getByTestId('recent-match-match-1')).toHaveTextContent(
      'recentMatches.format.SINGLES'
    );
    expect(screen.getByTestId('recent-match-qm-1')).toHaveTextContent(
      'recentMatches.format.STABLEFORD'
    );
  });

  it('still shows the opponent as the headline', () => {
    renderList({ matches: [tournamentWin] });

    expect(screen.getByTestId('recent-match-match-1')).toHaveTextContent('Ana Soto');
  });

  it('badges a match play result and spells it out for screen readers', () => {
    renderList({ matches: [tournamentWin] });

    expect(screen.getByTestId('result-badge')).toHaveTextContent('recentMatches.resultShort.WON');
    expect(screen.getByText('recentMatches.result.WON')).toBeInTheDocument();
  });

  it('does not badge a round nobody won', () => {
    // Medal y Stableford tienen marcador, pero no rival al que ganar
    renderList({ matches: [stablefordRound] });

    expect(screen.queryByTestId('result-badge')).not.toBeInTheDocument();
  });

  it('shows stableford points as points, and match play as its score', () => {
    renderList({ matches: [tournamentWin, stablefordRound] });

    expect(screen.getByText('3&2')).toBeInTheDocument();
    expect(screen.getByText('recentMatches.points:34')).toBeInTheDocument();
  });

  it('shows zero stableford points rather than hiding the score', () => {
    const blank = RecentMatch.fromPersistence({ id: 'qm-2', stablefordPoints: 0 });
    renderList({ matches: [blank] });

    expect(screen.getByText('recentMatches.points:0')).toBeInTheDocument();
  });

  it('opens each match where it can be reviewed', () => {
    renderList({ matches: [tournamentWin, stablefordRound] });

    fireEvent.click(screen.getByTestId('recent-match-match-1'));
    expect(mockNavigate).toHaveBeenCalledWith('/player/matches/match-1/scoring');

    fireEvent.click(screen.getByTestId('recent-match-qm-1'));
    expect(mockNavigate).toHaveBeenCalledWith('/quick-matches/qm-1/scoring');
  });

  describe('with nothing played yet', () => {
    it('invites the player to start a quick match', () => {
      renderList({ matches: [] });

      expect(screen.getByTestId('recent-matches-empty')).toBeInTheDocument();
    });

    it('starts one when pressed', () => {
      const onCreateQuickMatch = vi.fn();
      renderList({ matches: [], onCreateQuickMatch });

      fireEvent.click(screen.getByTestId('recent-matches-empty-cta'));

      expect(onCreateQuickMatch).toHaveBeenCalled();
    });
  });

  it('shows placeholders while loading, not the empty state', () => {
    renderList({ matches: [], isLoading: true });

    expect(screen.getByTestId('recent-matches')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByTestId('recent-matches-empty')).not.toBeInTheDocument();
  });
});
