import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import NextMatchBanner from './NextMatchBanner';

const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => (options?.opponents ? `${key}:${options.opponents}` : key),
    i18n: { language: 'es' },
  }),
}));

const match = {
  id: 'match-1',
  competitionName: 'Ryder Cup Amigos',
  matchFormat: 'SINGLES',
  roundDate: '2026-08-10',
  sessionType: 'MORNING',
  golfCourseName: 'St Andrews',
  partnerNames: [],
  opponentNames: ['Ana Soto'],
};

const renderBanner = (props = {}) =>
  render(
    <MemoryRouter>
      <NextMatchBanner {...props} />
    </MemoryRouter>
  );

describe('NextMatchBanner', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the tournament and who the match is against', () => {
    renderBanner({ match });

    expect(screen.getByTestId('next-match-banner')).toHaveTextContent('Ryder Cup Amigos');
    expect(screen.getByText('nextMatch.versus:Ana Soto')).toBeInTheDocument();
  });

  it('shows where and when it is played', () => {
    renderBanner({ match });

    expect(screen.getByTestId('next-match-banner')).toHaveTextContent('St Andrews');
    expect(screen.getByTestId('next-match-banner')).toHaveTextContent('nextMatch.session.MORNING');
  });

  it('opens the scoring page for that match', () => {
    renderBanner({ match });

    fireEvent.click(screen.getByTestId('next-match-banner'));

    expect(mockNavigate).toHaveBeenCalledWith('/player/matches/match-1/scoring');
  });

  describe('with no match scheduled', () => {
    /**
     * El punto del fallback: la mayoria de la gente no esta metida en un
     * torneo, asi que este seria su estado de siempre. Un hueco en mitad del
     * panel se lee como que algo ha fallado.
     */
    it('turns into the quick match call to action instead of disappearing', () => {
      renderBanner({ match: null });

      expect(screen.getByTestId('next-match-empty-cta')).toBeInTheDocument();
      expect(screen.queryByTestId('next-match-banner')).not.toBeInTheDocument();
    });

    it('starts a quick match when pressed', () => {
      const onCreateQuickMatch = vi.fn();
      renderBanner({ match: null, onCreateQuickMatch });

      fireEvent.click(screen.getByTestId('next-match-empty-cta'));

      expect(onCreateQuickMatch).toHaveBeenCalled();
    });
  });

  it('shows a placeholder while loading, not the empty state', () => {
    // Enseñar el CTA de partida rapida antes de saber si hay partido seria
    // decirle que no tiene ninguno sin haberlo comprobado
    renderBanner({ match: null, isLoading: true });

    expect(screen.getByTestId('next-match-banner')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByTestId('next-match-empty-cta')).not.toBeInTheDocument();
  });

  it('survives a match with no opponents named', () => {
    renderBanner({ match: { ...match, opponentNames: [] } });

    expect(screen.getByTestId('next-match-banner')).toBeInTheDocument();
  });
});
