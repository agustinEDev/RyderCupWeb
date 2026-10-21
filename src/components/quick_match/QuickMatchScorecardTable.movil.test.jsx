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

// La pieza de verdad, con un espía para ver lo que le llega
vi.mock('../scoring/TarjetaVertical', async (importOriginal) => {
  const real = await importOriginal();
  return { default: vi.fn(real.default) };
});

const QuickMatchScorecardTable = (await import('./QuickMatchScorecardTable')).default;
const TarjetaVertical = (await import('../scoring/TarjetaVertical')).default;

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

    // Ronda 2 de pruebas · los puntos en su columna, no apilados bajo la figura:
    // hay sitio, y la fila queda más baja
    const celda = within(fila('p-1', 1)).getByTestId('extra');
    expect(within(celda).getByTestId('hole-points')).toHaveTextContent('2');
    expect(within(celda).queryByTestId('golf-figure')).toBeNull();
    // Y solo ahí: no repetidos bajo la figura
    expect(within(fila('p-1', 1)).getAllByTestId('hole-points')).toHaveLength(1);
    expect(screen.getAllByText('scoring.scorecard.pointsShort').length).toBeGreaterThan(0);
  });

  it('X2: en Medal, el neto en su columna', () => {
    const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: 5 }];
    render(
      <QuickMatchScorecardTable
        holes={holes}
        holeScores={holeScores}
        participants={participants}
        currentParticipantId="p-1"
        scoringFormat="MEDAL"
      />
    );

    const celda = within(fila('p-1', 1)).getByTestId('extra');
    expect(within(celda).getByTestId('hole-net-strokes')).toHaveTextContent('5');
    expect(screen.getAllByText('scoring.scorecard.netShort').length).toBeGreaterThan(0);
  });

  it('X3: en match play no hay columna extra', () => {
    const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: 4 }];
    render(<QuickMatchScorecardTable holes={holes} holeScores={holeScores} participants={participants} currentParticipantId="p-1" />);

    expect(within(fila('p-1', 1)).queryByTestId('extra')).toBeNull();
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

/**
 * Subtotales de puntos y de neto (Agustín, 22 oct: «en la tarjeta hay
 * sumatorio de golpes por vuelta y sumatorio total; que lo haya también para
 * los puntos»). En el móvil van en la columna extra de las filas de suma.
 */
describe('QuickMatchScorecardTable · en el móvil, subtotales de puntos y de neto', () => {
  beforeEach(() => {
    pantalla.movil = true;
  });

  // Hándicap 18 sin barras: un golpe en cada hoyo
  const conGolpes = [{ participantId: 'p-1', name: 'Alice', handicap: 18, team: null, isGuest: false }];
  // 1: par 4 con 5 -> neto 4, 2 puntos · 2: par 3 recogido -> 0 puntos, neto 5
  // (doble bogey neto 6 menos el golpe) · 10: par 4 con 3 -> neto 2, 4 puntos
  const anotados = [
    { holeNumber: 1, participantId: 'p-1', score: 5 },
    { holeNumber: 2, participantId: 'p-1', score: null },
    { holeNumber: 10, participantId: 'p-1', score: 3 },
  ];
  const sumaExtra = (nombre) =>
    within(screen.getByTestId('quick-match-player-card-p-1')).getByTestId(`suma-extra-${nombre}`);

  const pinta = (props) =>
    render(
      <QuickMatchScorecardTable
        holes={holes}
        holeScores={anotados}
        participants={conGolpes}
        currentParticipantId="p-1"
        {...props}
      />
    );

  it('S1/S2: en Stableford, puntos de la ida, la vuelta y el total; la raya suma cero', () => {
    pinta({ scoringFormat: 'STABLEFORD' });

    expect(within(sumaExtra('ida')).getByTestId('subtotal-points')).toHaveTextContent(/^2$/);
    expect(within(sumaExtra('vuelta')).getByTestId('subtotal-points')).toHaveTextContent(/^4$/);
    expect(within(sumaExtra('total')).getByTestId('subtotal-points')).toHaveTextContent(/^6$/);
    // Los golpes de las filas de suma siguen donde estaban
    expect(screen.getByTestId('suma-total')).toHaveTextContent(/^13$/);
  });

  it('A1: el subtotal de puntos se lee como los del hoyo', () => {
    pinta({ scoringFormat: 'STABLEFORD' });

    expect(within(sumaExtra('total')).getByTestId('subtotal-points')).toHaveAttribute(
      'title',
      'scoring.scorecard.subtotalPoints {"count":6}'
    );
  });

  it('S4: en Medal, el neto de la ida, la vuelta y el total, con la raya a doble bogey neto', () => {
    pinta({ scoringFormat: 'MEDAL' });

    expect(within(sumaExtra('ida')).getByTestId('subtotal-net-strokes')).toHaveTextContent(/^9$/);
    expect(within(sumaExtra('vuelta')).getByTestId('subtotal-net-strokes')).toHaveTextContent(/^2$/);
    const total = within(sumaExtra('total')).getByTestId('subtotal-net-strokes');
    expect(total).toHaveTextContent(/^11$/);
    expect(total).toHaveAttribute('title', 'scoring.scorecard.subtotalNetStrokes {"count":11}');
  });

  it('S2: una vuelta sin hoyos jugados no enseña subtotal', () => {
    pinta({ scoringFormat: 'MEDAL', holeScores: [{ holeNumber: 1, participantId: 'p-1', score: 5 }] });

    expect(within(sumaExtra('ida')).getByTestId('subtotal-net-strokes')).toHaveTextContent(/^4$/);
    // Una raya, como la casilla de golpes de al lado; no una casilla vacía
    expect(sumaExtra('vuelta')).toHaveTextContent(/^-$/);
    expect(screen.getByTestId('suma-vuelta')).toHaveTextContent(/^-$/);
  });

  it('S3: un campo de 9 hoyos solo tiene el total', () => {
    pinta({ scoringFormat: 'STABLEFORD', holes: holes.slice(0, 9) });

    const tarjeta = screen.getByTestId('quick-match-player-card-p-1');
    expect(within(tarjeta).queryByTestId('suma-extra-ida')).toBeNull();
    expect(within(tarjeta).queryByTestId('suma-extra-vuelta')).toBeNull();
    expect(within(sumaExtra('total')).getByTestId('subtotal-points')).toHaveTextContent(/^2$/);
  });

  it('S3b: con 9 hoyos ni se calculan los subtotales de ida y vuelta', () => {
    TarjetaVertical.mockClear();
    pinta({ scoringFormat: 'STABLEFORD', holes: holes.slice(0, 9) });

    const { sumas, sumasExtra } = TarjetaVertical.mock.calls.at(-1)[0];
    expect(sumas.ida).toBeUndefined();
    expect(sumasExtra.ida).toBeUndefined();
    expect(sumasExtra.vuelta).toBeUndefined();
    expect(sumasExtra.total).not.toBeNull();
  });

  it('S5: en match play no hay columna extra ni subtotales', () => {
    pinta({ matchFormat: 'SINGLES' });

    expect(screen.queryAllByTestId(/^suma-extra-/)).toHaveLength(0);
    expect(screen.queryByTestId('subtotal-points')).toBeNull();
    expect(screen.queryByTestId('subtotal-net-strokes')).toBeNull();
  });

  it('S6: el subtotal lleva la letra pequeña del hoyo y no ensancha la columna', () => {
    pinta({ scoringFormat: 'STABLEFORD' });

    const subtotal = within(sumaExtra('total')).getByTestId('subtotal-points');
    expect(subtotal.className).toContain('text-[10px]');
    expect(sumaExtra('total').className).not.toMatch(/min-w|whitespace-nowrap|px-[3-9]/);
  });
});
