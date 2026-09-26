import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';

/**
 * FE #739 · la tarjeta en el móvil. A 360 px la horizontal no cabía (9 hoyos
 * a ~36 px más los nombres) y se desplazaba de lado dentro de su caja.
 * Decidido por Agustín el 26 sep: una tarjeta por participante, con los hoyos
 * del 1 al 18 de arriba abajo, que se pasan deslizando. En tablet y ordenador
 * sigue la horizontal.
 */
const pantalla = vi.hoisted(() => ({ movil: true }));
vi.mock('../../hooks/useEsMovil', () => ({ useEsMovil: () => pantalla.movil }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => (opts ? `${key} ${JSON.stringify(opts)}` : key),
    i18n: { language: 'es' },
  }),
}));

const ScorecardTable = (await import('./ScorecardTable')).default;

const holes = Array.from({ length: 18 }, (_, i) => ({
  holeNumber: i + 1,
  par: i === 1 ? 3 : 4,
  strokeIndex: 18 - i,
}));

const singles = [
  { userId: 'u1', userName: 'Nacho Noche', team: 'A' },
  { userId: 'u2', userName: 'Luna Noche', team: 'B' },
];

const golpes = (hoyo, porJugador, resultado) => ({
  holeNumber: hoyo,
  playerScores: Object.entries(porJugador).map(([userId, [own, net]]) => ({
    userId,
    ownScore: own,
    netScore: net ?? own,
    ownSubmitted: true,
  })),
  holeResult: resultado,
});

const fila = (tarjeta, hoyo) => screen.getByTestId(`fila-${tarjeta}-${hoyo}`);

describe('ScorecardTable · en el móvil, una tarjeta vertical por participante (#739)', () => {
  beforeEach(() => {
    pantalla.movil = true;
  });

  it('T1: individual, dos tarjetas de 18 hoyos y ninguna tabla horizontal', () => {
    render(<ScorecardTable holes={holes} players={singles} currentUserId="u1" matchFormat="SINGLES" />);

    expect(screen.getByTestId('carrusel-de-tarjetas')).toBeInTheDocument();
    expect(screen.getAllByRole('tabpanel')).toHaveLength(2);
    for (const tarjeta of ['u1', 'u2']) {
      for (let h = 1; h <= 18; h += 1) expect(fila(tarjeta, h)).toBeInTheDocument();
    }
    expect(screen.queryAllByTestId('vuelta-horizontal')).toHaveLength(0);
  });

  it('T2: cada fila dice el par, el HCP y los golpes de esa tarjeta', () => {
    const scores = [golpes(2, { u1: [2], u2: [4] }, { winner: 'A' })];
    render(<ScorecardTable holes={holes} players={singles} scores={scores} currentUserId="u1" matchFormat="SINGLES" />);

    const deNacho = fila('u1', 2);
    expect(within(deNacho).getByTestId('par')).toHaveTextContent('3');
    expect(within(deNacho).getByTestId('hcp')).toHaveTextContent('17');
    expect(within(deNacho).getByTestId('golf-figure')).toHaveTextContent('2');
    expect(within(fila('u2', 2)).getByTestId('golf-figure')).toHaveTextContent('4');
  });

  it('T3: el resultado del hoyo, visto desde cada tarjeta', () => {
    const scores = [
      golpes(1, { u1: [3], u2: [4] }, { winner: 'A' }),
      golpes(2, { u1: [3], u2: [3] }, { winner: 'HALVED' }),
    ];
    render(<ScorecardTable holes={holes} players={singles} scores={scores} currentUserId="u1" matchFormat="SINGLES" />);

    expect(within(fila('u1', 1)).getByTestId('resultado')).toHaveTextContent('scorecard.holeWon');
    expect(within(fila('u2', 1)).getByTestId('resultado')).toHaveTextContent('scorecard.holeLost');
    expect(within(fila('u1', 2)).getByTestId('resultado')).toHaveTextContent('scorecard.halved');
    // Un hoyo sin jugar no dice nada
    expect(within(fila('u1', 3)).getByTestId('resultado')).toHaveTextContent('');
  });

  it('T4: fourball, cuatro tarjetas y marcado el hoyo donde contó su bola', () => {
    const fourball = [
      { userId: 'a1', userName: 'Nacho', team: 'A' },
      { userId: 'a2', userName: 'Agustín', team: 'A' },
      { userId: 'b1', userName: 'Luna', team: 'B' },
      { userId: 'b2', userName: 'Óscar', team: 'B' },
    ];
    const scores = [
      golpes(1, { a1: [3], a2: [5], b1: [4], b2: [4] }, { winner: 'A', bestBallPlayerA: ['a1'], bestBallPlayerB: ['b1'] }),
    ];
    render(<ScorecardTable holes={holes} players={fourball} scores={scores} currentUserId="a1" matchFormat="FOURBALL" />);

    expect(screen.getAllByRole('tabpanel')).toHaveLength(4);
    expect(fila('a1', 1).dataset.mejorBola).toBe('true');
    expect(fila('a2', 1).dataset.mejorBola).toBe('false');
  });

  it('T5: foursomes, una tarjeta por pareja', () => {
    const foursomes = [
      { userId: 'a1', userName: 'Nacho', team: 'A' },
      { userId: 'a2', userName: 'Agustín', team: 'A' },
      { userId: 'b1', userName: 'Luna', team: 'B' },
      { userId: 'b2', userName: 'Óscar', team: 'B' },
    ];
    render(<ScorecardTable holes={holes} players={foursomes} currentUserId="a1" matchFormat="FOURSOMES" />);

    expect(screen.getAllByRole('tabpanel')).toHaveLength(2);
    expect(screen.getByRole('tab', { name: 'Nacho / Agustín' })).toBeInTheDocument();
  });

  it('T6: Ida, Vuelta y Total de cada tarjeta', () => {
    const scores = [
      golpes(1, { u1: [5], u2: [4] }, { winner: 'B' }),
      golpes(10, { u1: [3], u2: [4] }, { winner: 'A' }),
    ];
    render(<ScorecardTable holes={holes} players={singles} scores={scores} currentUserId="u1" matchFormat="SINGLES" />);

    const tarjeta = screen.getByTestId('tarjeta-vertical-u1');
    expect(within(tarjeta).getByTestId('suma-ida')).toHaveTextContent('5');
    expect(within(tarjeta).getByTestId('suma-vuelta')).toHaveTextContent('3');
    expect(within(tarjeta).getByTestId('suma-total')).toHaveTextContent('8');
  });

  it('T7: el interruptor bruto/neto también cambia los golpes en el móvil', () => {
    const conGolpes = singles.map((p) => ({ ...p, strokesReceived: p.userId === 'u1' ? [1] : [] }));
    const scores = [golpes(1, { u1: [5, 4], u2: [4] }, { winner: 'HALVED' })];
    render(<ScorecardTable holes={holes} players={conGolpes} scores={scores} currentUserId="u1" matchFormat="SINGLES" />);

    expect(within(fila('u1', 1)).getByTestId('golf-figure')).toHaveTextContent('5');
    fireEvent.click(screen.getByRole('switch'));
    expect(within(fila('u1', 1)).getByTestId('golf-figure')).toHaveTextContent('4');
  });

  it('T8: en tablet y ordenador, la tarjeta horizontal de siempre', () => {
    pantalla.movil = false;
    render(<ScorecardTable holes={holes} players={singles} currentUserId="u1" matchFormat="SINGLES" />);

    expect(screen.queryByTestId('carrusel-de-tarjetas')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('vuelta-horizontal')).toHaveLength(2);
  });
});
