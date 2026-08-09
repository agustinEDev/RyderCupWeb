import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PlayerStatsCards from './PlayerStatsCards';
import PlayerStats from '../../domain/entities/PlayerStats';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      // Imita el plural de i18next lo justo para poder afirmar sobre el texto
      if (options && typeof options.count === 'number') {
        return `${key}:${options.count}`;
      }
      return key;
    },
  }),
}));

describe('PlayerStatsCards', () => {
  const fullStats = PlayerStats.fromPersistence({
    handicap: 14.2,
    handicapTrend: -0.4,
    roundsPlayed: 12,
    tournamentsTotal: 3,
    tournamentsActive: 1,
    estimatedIndex: 12.8,
    roundsWithDifferential: 8,
  });

  it('shows the handicap and the index side by side', () => {
    render(<PlayerStatsCards stats={fullStats} />);

    expect(screen.getByText('14.2')).toBeInTheDocument();
    expect(screen.getByText('12.8')).toBeInTheDocument();
  });

  it('shows how many rounds the index was calculated over', () => {
    render(<PlayerStatsCards stats={fullStats} />);

    expect(screen.getByText('statistics.overRounds:8')).toBeInTheDocument();
  });

  it('shows the trend as an absolute number, since the arrow gives direction', () => {
    render(<PlayerStatsCards stats={fullStats} />);

    // -0.4 se enseña como 0.4: el signo lo dice la flecha
    expect(screen.getByTestId('handicap-trend')).toHaveTextContent('0.4');
    expect(screen.getByTestId('handicap-trend')).not.toHaveTextContent('-0.4');
  });

  it('names the direction of the trend for screen readers', () => {
    render(<PlayerStatsCards stats={fullStats} />);

    // El color y la flecha no dicen nada a quien no los ve
    expect(screen.getByText('statistics.trendImproving')).toBeInTheDocument();
  });

  it('calls a worsening trend by its name', () => {
    render(
      <PlayerStatsCards stats={PlayerStats.fromPersistence({ handicapTrend: 1.2 })} />
    );

    expect(screen.getByText('statistics.trendWorsening')).toBeInTheDocument();
  });

  it('treats an unchanged trend as its own case, not as improvement', () => {
    render(<PlayerStatsCards stats={PlayerStats.fromPersistence({ handicapTrend: 0 })} />);

    expect(screen.getByText('statistics.trendSteady')).toBeInTheDocument();
  });

  it('hides the trend entirely while there is none', () => {
    render(<PlayerStatsCards stats={PlayerStats.empty()} />);

    expect(screen.queryByTestId('handicap-trend')).not.toBeInTheDocument();
  });

  it('shows dashes rather than zeros on an empty account', () => {
    render(<PlayerStatsCards stats={PlayerStats.empty()} />);

    // Un 0.0 aquí se leería como "juega al par", que es lo contrario de la verdad
    const handicapCard = screen.getByTestId('stat-card-handicap');
    const playingCard = screen.getByTestId('stat-card-playing-to');
    expect(handicapCard).toHaveTextContent('--');
    expect(playingCard).toHaveTextContent('--');
    expect(screen.getByText('statistics.needsMoreRounds')).toBeInTheDocument();
  });

  it('still counts tournaments from zero, where zero is the answer', () => {
    render(<PlayerStatsCards stats={PlayerStats.empty()} />);

    expect(screen.getByTestId('stat-card-tournaments')).toHaveTextContent('0');
    expect(screen.getByText('statistics.activeCount:0')).toBeInTheDocument();
  });

  it('holds back only the figures that need the request, while loading', () => {
    render(<PlayerStatsCards stats={fullStats} isLoading />);

    // El indice y la tendencia solo existen en el resumen: hasta que llega, no
    // hay nada honesto que enseñar en su lugar
    expect(screen.getByTestId('stat-card-playing-to')).toHaveTextContent('--');
    expect(screen.queryByTestId('handicap-trend')).not.toBeInTheDocument();
  });

  it('survives stats being null, which is what a failed request leaves', () => {
    render(<PlayerStatsCards stats={null} />);

    expect(screen.getByTestId('player-stats-cards')).toBeInTheDocument();
    expect(screen.getByTestId('stat-card-playing-to')).toHaveTextContent('--');
  });

  describe('falling back to what the page already knows', () => {
    /**
     * Encontrado verificando en el navegador: la tarjeta decia "Handicap --"
     * mientras la de perfil, justo debajo, decia "Handicap: 18". El resumen
     * fallaba y con el se iba un dato que la pagina ya tenia.
     */
    it('shows the profile handicap when the stats request brought none', () => {
      render(<PlayerStatsCards stats={null} fallbackHandicap={18} />);

      expect(screen.getByTestId('stat-card-handicap')).toHaveTextContent('18.0');
    });

    it('shows the competitions already loaded when stats are missing', () => {
      render(<PlayerStatsCards stats={null} fallbackTournaments={3} />);

      expect(screen.getByTestId('stat-card-tournaments')).toHaveTextContent('3');
    });

    it('prefers the stats over the fallback once they arrive', () => {
      const stats = PlayerStats.fromPersistence({ handicap: 14.2, tournamentsTotal: 5 });

      render(<PlayerStatsCards stats={stats} fallbackHandicap={18} fallbackTournaments={3} />);

      expect(screen.getByTestId('stat-card-handicap')).toHaveTextContent('14.2');
      expect(screen.getByTestId('stat-card-tournaments')).toHaveTextContent('5');
    });

    it('does not blink through dashes while the stats are loading', () => {
      render(<PlayerStatsCards stats={null} isLoading fallbackHandicap={18} />);

      // Ir de "--" a "18" al llegar la respuesta se ve como un fallo
      expect(screen.getByTestId('stat-card-handicap')).toHaveTextContent('18.0');
    });

    it('still shows dashes when nobody knows the handicap', () => {
      render(<PlayerStatsCards stats={null} />);

      expect(screen.getByTestId('stat-card-handicap')).toHaveTextContent('--');
    });
  });

  it('lays the three cards out in three columns on mobile', () => {
    render(<PlayerStatsCards stats={fullStats} />);

    // El punto de la issue: en una columna, tres cifras ocupaban tres pantallas
    expect(screen.getByTestId('player-stats-cards').className).toContain('grid-cols-3');
  });
});
