import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import PlayerStatsCards from './PlayerStatsCards';
import PlayerStats from '../../domain/entities/PlayerStats';

const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return { ...actual, useNavigate: () => mockNavigate };
});

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
    playingAvg: 16.4,
    roundsWithDifferential: 8,
  });

  it('shows the handicap next to the level actually being played', () => {
    /**
     * La media, no el indice. El indice mira solo las mejores vueltas —con
     * tres, literalmente la mejor— asi que decia "juegas a 14.1" a un jugador
     * que venia jugando a 18.9. Visto en produccion.
     */
    render(
      <MemoryRouter>
        <PlayerStatsCards stats={fullStats} />
      </MemoryRouter>
    );

    expect(screen.getByText('14.2')).toBeInTheDocument();
    expect(screen.getByText('16.4')).toBeInTheDocument();
    expect(screen.queryByText('12.8')).not.toBeInTheDocument();
  });

  it('shows how many rounds the average was calculated over', () => {
    render(
      <MemoryRouter>
        <PlayerStatsCards stats={fullStats} />
      </MemoryRouter>
    );

    expect(screen.getByText('statistics.overRounds:8')).toBeInTheDocument();
  });

  it('shows the trend as an absolute number, since the arrow gives direction', () => {
    render(
      <MemoryRouter>
        <PlayerStatsCards stats={fullStats} />
      </MemoryRouter>
    );

    // -0.4 se enseña como 0.4: el signo lo dice la flecha
    expect(screen.getByTestId('handicap-trend')).toHaveTextContent('0.4');
    expect(screen.getByTestId('handicap-trend')).not.toHaveTextContent('-0.4');
  });

  it('names the direction of the trend for screen readers', () => {
    render(
      <MemoryRouter>
        <PlayerStatsCards stats={fullStats} />
      </MemoryRouter>
    );

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
    render(
      <MemoryRouter>
        <PlayerStatsCards stats={PlayerStats.fromPersistence({ handicapTrend: 0 })} />
      </MemoryRouter>
    );

    expect(screen.getByText('statistics.trendSteady')).toBeInTheDocument();
  });

  it('hides the trend entirely while there is none', () => {
    render(
      <MemoryRouter>
        <PlayerStatsCards stats={PlayerStats.empty()} />
      </MemoryRouter>
    );

    expect(screen.queryByTestId('handicap-trend')).not.toBeInTheDocument();
  });

  it('shows dashes rather than zeros on an empty account', () => {
    render(
      <MemoryRouter>
        <PlayerStatsCards stats={PlayerStats.empty()} />
      </MemoryRouter>
    );

    // Un 0.0 aquí se leería como "juega al par", que es lo contrario de la verdad
    const handicapCard = screen.getByTestId('stat-card-handicap');
    const playingCard = screen.getByTestId('stat-card-playing-to');
    expect(handicapCard).toHaveTextContent('--');
    expect(playingCard).toHaveTextContent('--');
    expect(screen.getByText('statistics.needsMoreRounds')).toBeInTheDocument();
  });

  it('still counts tournaments from zero, where zero is the answer', () => {
    render(
      <MemoryRouter>
        <PlayerStatsCards stats={PlayerStats.empty()} />
      </MemoryRouter>
    );

    expect(screen.getByTestId('stat-card-tournaments')).toHaveTextContent('0');
    expect(screen.getByText('statistics.activeCount:0')).toBeInTheDocument();
  });

  it('says nothing about active tournaments when the summary never arrived', () => {
    /**
     * Visto en pantalla antes de que nadie lo señalara: la tarjeta decia "1
     * torneo / 0 activos" mientras el endpoint fallaba, y el valor real era 1
     * activo. El total lo sabe la pagina; cuantos estan activos, no. Un cero
     * ahi no es un hueco, es una cifra falsa.
     */
    render(
      <MemoryRouter>
        <PlayerStatsCards stats={null} fallbackTournaments={1} />
      </MemoryRouter>
    );

    expect(screen.getByTestId('stat-card-tournaments')).toHaveTextContent('1');
    expect(screen.queryByText('statistics.activeCount:0')).not.toBeInTheDocument();
  });

  it('says nothing about active tournaments while still loading', () => {
    render(
      <MemoryRouter>
        <PlayerStatsCards stats={fullStats} isLoading fallbackTournaments={1} />
      </MemoryRouter>
    );

    expect(screen.queryByText(/statistics.activeCount/)).not.toBeInTheDocument();
  });

  it('makes no claim about missing rounds while still loading', () => {
    render(
      <MemoryRouter>
        <PlayerStatsCards stats={null} isLoading />
      </MemoryRouter>
    );

    expect(screen.queryByText('statistics.needsMoreRounds')).not.toBeInTheDocument();
  });

  it('holds back only the figures that need the request, while loading', () => {
    render(
      <MemoryRouter>
        <PlayerStatsCards stats={fullStats} isLoading />
      </MemoryRouter>
    );

    // El indice y la tendencia solo existen en el resumen: hasta que llega, no
    // hay nada honesto que enseñar en su lugar
    expect(screen.getByTestId('stat-card-playing-to')).toHaveTextContent('--');
    expect(screen.queryByTestId('handicap-trend')).not.toBeInTheDocument();
  });

  it('survives stats being null, which is what a failed request leaves', () => {
    render(
      <MemoryRouter>
        <PlayerStatsCards stats={null} />
      </MemoryRouter>
    );

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
      render(
      <MemoryRouter>
        <PlayerStatsCards stats={null} fallbackHandicap={18} />
      </MemoryRouter>
    );

      expect(screen.getByTestId('stat-card-handicap')).toHaveTextContent('18.0');
    });

    it('shows the competitions already loaded when stats are missing', () => {
      render(
      <MemoryRouter>
        <PlayerStatsCards stats={null} fallbackTournaments={3} />
      </MemoryRouter>
    );

      expect(screen.getByTestId('stat-card-tournaments')).toHaveTextContent('3');
    });

    it('prefers the stats over the fallback once they arrive', () => {
      const stats = PlayerStats.fromPersistence({ handicap: 14.2, tournamentsTotal: 5 });

      render(
      <MemoryRouter>
        <PlayerStatsCards stats={stats} fallbackHandicap={18} fallbackTournaments={3} />
      </MemoryRouter>
    );

      expect(screen.getByTestId('stat-card-handicap')).toHaveTextContent('14.2');
      expect(screen.getByTestId('stat-card-tournaments')).toHaveTextContent('5');
    });

    it('does not blink through dashes while the stats are loading', () => {
      render(
      <MemoryRouter>
        <PlayerStatsCards stats={null} isLoading fallbackHandicap={18} />
      </MemoryRouter>
    );

      // Ir de "--" a "18" al llegar la respuesta se ve como un fallo
      expect(screen.getByTestId('stat-card-handicap')).toHaveTextContent('18.0');
    });

    it('still shows dashes when nobody knows the handicap', () => {
      render(
      <MemoryRouter>
        <PlayerStatsCards stats={null} />
      </MemoryRouter>
    );

      expect(screen.getByTestId('stat-card-handicap')).toHaveTextContent('--');
    });
  });

  describe('linking to the full statistics', () => {
    it('opens the stats page from the handicap card', () => {
      render(
        <MemoryRouter>
          <PlayerStatsCards stats={fullStats} />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('stat-card-handicap'));

      expect(mockNavigate).toHaveBeenCalledWith('/stats');
    });

    it('opens the stats page from the playing-to card', () => {
      render(
        <MemoryRouter>
          <PlayerStatsCards stats={fullStats} />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('stat-card-playing-to'));

      expect(mockNavigate).toHaveBeenCalledWith('/stats');
    });

    it('makes the linking cards real buttons, reachable by keyboard', () => {
      render(
        <MemoryRouter>
          <PlayerStatsCards stats={fullStats} />
        </MemoryRouter>
      );

      // Un div con onClick deja fuera al teclado y a los lectores de pantalla
      expect(screen.getByTestId('stat-card-handicap').tagName).toBe('BUTTON');
      expect(screen.getByTestId('stat-card-handicap')).toHaveAttribute('aria-label');
    });

    it('leaves the tournaments card as plain content', () => {
      // Su detalle no vive en estadisticas, vive en Mis Torneos
      render(
        <MemoryRouter>
          <PlayerStatsCards stats={fullStats} />
        </MemoryRouter>
      );

      expect(screen.getByTestId('stat-card-tournaments').tagName).not.toBe('BUTTON');
    });
  });

  it('lays the three cards out in three columns on mobile', () => {
    render(
      <MemoryRouter>
        <PlayerStatsCards stats={fullStats} />
      </MemoryRouter>
    );

    // El punto de la issue: en una columna, tres cifras ocupaban tres pantallas
    expect(screen.getByTestId('player-stats-cards').className).toContain('grid-cols-3');
  });
});
