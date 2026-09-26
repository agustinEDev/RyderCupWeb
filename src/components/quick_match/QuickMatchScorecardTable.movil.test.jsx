import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';

/**
 * FE #739 · la tarjeta de la partida rápida en el móvil, igual que la de
 * competición (Agustín, 26 sep: «aplícalo a partida rápida también»): una por
 * participante, con los hoyos de arriba abajo, que se pasan deslizando.
 */
const pantalla = vi.hoisted(() => ({ movil: true }));
vi.mock('../../hooks/useEsMovil', () => ({ useEsMovil: () => pantalla.movil }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => (opts ? `${key} ${JSON.stringify(opts)}` : key),
    i18n: { language: 'es' },
  }),
}));

const QuickMatchScorecardTable = (await import('./QuickMatchScorecardTable')).default;

const holes = Array.from({ length: 18 }, (_, i) => ({
  holeNumber: i + 1,
  par: i === 1 ? 3 : 4,
  strokeIndex: 18 - i,
}));

const participants = [
  { participantId: 'p-1', name: 'Alice', handicap: 0, team: null, isGuest: false },
  { participantId: 'p-2', name: 'Bob', handicap: 0, team: null, isGuest: false },
];

const fila = (tarjeta, hoyo) => screen.getByTestId(`fila-${tarjeta}-${hoyo}`);

describe('QuickMatchScorecardTable · en el móvil, tarjetas verticales deslizables (#739)', () => {
  beforeEach(() => {
    pantalla.movil = true;
  });

  it('Q1: una tarjeta por participante, una fila por hoyo y ninguna tabla horizontal', () => {
    render(<QuickMatchScorecardTable holes={holes} holeScores={[]} participants={participants} currentParticipantId="p-1" />);

    expect(screen.getByTestId('carrusel-de-tarjetas')).toBeInTheDocument();
    expect(screen.getAllByRole('tabpanel')).toHaveLength(2);
    expect(screen.getByRole('tab', { name: 'Alice' })).toBeInTheDocument();
    for (let h = 1; h <= 18; h += 1) expect(fila('p-2', h)).toBeInTheDocument();
    expect(screen.queryAllByTestId('vuelta-horizontal')).toHaveLength(0);
  });

  it('Q2: cada fila dice el par, el HCP y los golpes', () => {
    const holeScores = [{ holeNumber: 2, participantId: 'p-1', score: 2 }];
    render(<QuickMatchScorecardTable holes={holes} holeScores={holeScores} participants={participants} currentParticipantId="p-1" />);

    const deAlice = fila('p-1', 2);
    expect(within(deAlice).getByTestId('par')).toHaveTextContent('3');
    expect(within(deAlice).getByTestId('hcp')).toHaveTextContent('17');
    expect(within(deAlice).getByTestId('golf-figure')).toHaveTextContent('2');
  });

  it('Q3: en Stableford, los puntos de cada hoyo en su fila', () => {
    const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: 4 }];
    render(
      <QuickMatchScorecardTable
        holes={holes}
        holeScores={holeScores}
        participants={participants}
        currentParticipantId="p-1"
        scoringFormat="STABLEFORD"
      />
    );

    expect(within(fila('p-1', 1)).getByTestId('hole-points')).toHaveTextContent('2');
  });

  it('Q4: Ida, Vuelta y Total de cada tarjeta', () => {
    const holeScores = [
      { holeNumber: 1, participantId: 'p-1', score: 5 },
      { holeNumber: 10, participantId: 'p-1', score: 3 },
    ];
    render(<QuickMatchScorecardTable holes={holes} holeScores={holeScores} participants={participants} currentParticipantId="p-1" />);

    const tarjeta = screen.getByTestId('quick-match-player-card-p-1');
    expect(within(tarjeta).getByTestId('suma-ida')).toHaveTextContent('5');
    expect(within(tarjeta).getByTestId('suma-vuelta')).toHaveTextContent('3');
    expect(within(tarjeta).getByTestId('suma-total')).toHaveTextContent('8');
  });

  it('Q5: en foursomes, una tarjeta por bando', () => {
    const cuatro = [
      { participantId: 'p-1', name: 'Alice', handicap: 0, team: 'A', isGuest: false },
      { participantId: 'p-2', name: 'Bob', handicap: 0, team: 'A', isGuest: false },
      { participantId: 'p-3', name: 'Carla', handicap: 0, team: 'B', isGuest: false },
      { participantId: 'p-4', name: 'Dani', handicap: 0, team: 'B', isGuest: false },
    ];
    render(
      <QuickMatchScorecardTable
        holes={holes}
        holeScores={[]}
        participants={cuatro}
        currentParticipantId="p-1"
        matchFormat="FOURSOMES"
      />
    );

    expect(screen.getAllByRole('tabpanel')).toHaveLength(2);
    expect(screen.getByRole('tab', { name: 'Alice & Bob' })).toBeInTheDocument();
  });

  it('Q6: en tablet y ordenador, como hoy', () => {
    pantalla.movil = false;
    render(<QuickMatchScorecardTable holes={holes} holeScores={[]} participants={participants} currentParticipantId="p-1" />);

    expect(screen.queryByTestId('carrusel-de-tarjetas')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('vuelta-horizontal').length).toBeGreaterThan(0);
  });
});
