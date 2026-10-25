import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import ScorecardTable from './ScorecardTable';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => (opts ? `${key} ${JSON.stringify(opts)}` : key),
    i18n: { language: 'en' },
  }),
}));

/**
 * La tarjeta horizontal del torneo en escritorio (FE #938; Agustín, 24 oct
 * 2026): la ida y la vuelta son dos tablas y cada una medía sus columnas por su
 * cuenta, así que el hoyo 1 y el 10 no caían uno encima del otro. Las dos
 * comparten ahora el mismo reparto de columnas, y la vuelta acaba en TOTAL,
 * como la tarjeta de papel.
 *
 *   #   caso                                          | esperado
 *   ----|---------------------------------------------|-------------------------------------
 *   C1  ida y vuelta, mismas columnas                 | tabla fija y el mismo <colgroup>
 *   C2  la vuelta acaba en VUELTA | TOTAL             | par 72; golpes de los 18
 *   C3  la ida lleva el hueco del TOTAL               | una casilla vacía en cada fila
 *   C4  campo de 9 hoyos                              | IDA | TOTAL, la misma cifra
 *   C5  hoyos sin jugar                               | suma solo lo anotado; nada, «-»
 *   C7  el TOTAL sigue al botón bruto/neto            | neto con el botón; foursomes, el bando
 */
const dieciocho = Array.from({ length: 18 }, (_, i) => ({ holeNumber: i + 1, par: 4, strokeIndex: i + 1 }));
const nueve = dieciocho.slice(0, 9);

const players = [
  { userId: 'u1', userName: 'Player A', team: 'A', strokesReceived: [1] },
  { userId: 'u2', userName: 'Player B', team: 'B' },
];

const golpe = (holeNumber, userId, ownScore, netScore = ownScore) => ({
  holeNumber,
  playerScores: [{ userId, ownScore, netScore, ownSubmitted: true }],
});

const tablas = () => screen.getAllByTestId('vuelta-horizontal').map((d) => d.querySelector('table'));
const columnas = (tabla) => [...tabla.querySelectorAll('colgroup col')].map((c) => c.className);

describe('ScorecardTable · columnas de la ida y la vuelta', () => {
  it('C1: las dos tablas son fijas y reparten las columnas igual', () => {
    render(<ScorecardTable holes={dieciocho} players={players} currentUserId="u1" />);

    const [ida, vuelta] = tablas();
    expect(ida).toHaveClass('table-fixed');
    expect(vuelta).toHaveClass('table-fixed');
    // Nombre + 9 hoyos + tramo + total
    expect(columnas(ida)).toHaveLength(12);
    expect(columnas(ida)).toEqual(columnas(vuelta));
    // Cada fila llena todas las columnas: si no, la última se descuadra
    for (const tabla of [ida, vuelta]) {
      for (const fila of tabla.querySelectorAll('tr')) {
        expect(fila.children).toHaveLength(12);
      }
    }
  });

  it('C1: con foursomes la columna del nombre es la misma en las dos', () => {
    const pareja = [
      { userId: 'u1', userName: 'Player A', team: 'A' },
      { userId: 'u3', userName: 'Player C', team: 'A' },
      { userId: 'u2', userName: 'Player B', team: 'B' },
      { userId: 'u4', userName: 'Player D', team: 'B' },
    ];
    render(<ScorecardTable holes={dieciocho} players={pareja} currentUserId="u1" matchFormat="FOURSOMES" />);

    const [ida, vuelta] = tablas();
    expect(columnas(ida)).toHaveLength(12);
    expect(columnas(ida)).toEqual(columnas(vuelta));
    for (const tabla of [ida, vuelta]) {
      for (const fila of tabla.querySelectorAll('tr')) {
        expect(fila.children).toHaveLength(12);
      }
    }
  });

  it('C2: la vuelta acaba en TOTAL, con el par y los golpes de los 18', () => {
    const scores = [golpe(1, 'u1', 5), golpe(10, 'u1', 6)];
    render(<ScorecardTable holes={dieciocho} players={players} scores={scores} currentUserId="u1" />);

    const [, vuelta] = tablas();
    const cabecera = vuelta.querySelector('thead tr');
    expect(cabecera.lastElementChild).toHaveTextContent('scorecard.total');
    expect(screen.getByTestId('scorecard-total-par')).toHaveTextContent(/^72$/);
    expect(screen.getByTestId('scorecard-total-u1')).toHaveTextContent(/^11$/);
  });

  it('C3: la ida no lleva TOTAL, sino su hueco vacío', () => {
    render(<ScorecardTable holes={dieciocho} players={players} scores={[golpe(1, 'u1', 5)]} currentUserId="u1" />);

    const [ida] = tablas();
    expect(ida).not.toHaveTextContent('scorecard.total');
    for (const fila of ida.querySelectorAll('tr')) {
      expect(fila.lastElementChild.textContent).toBe('');
    }
    expect(within(ida).queryByTestId('scorecard-total-u1')).not.toBeInTheDocument();
  });

  it('C4: con 9 hoyos, la ida acaba en IDA | TOTAL con la misma cifra', () => {
    render(<ScorecardTable holes={nueve} players={players} scores={[golpe(1, 'u1', 5), golpe(2, 'u1', 4)]} currentUserId="u1" />);

    const [ida, ...resto] = tablas();
    expect(resto).toHaveLength(0);
    expect(ida.querySelector('thead tr').lastElementChild).toHaveTextContent('scorecard.total');
    expect(screen.getByTestId('scorecard-total-par')).toHaveTextContent(/^36$/);
    expect(screen.getByTestId('scorecard-total-u1')).toHaveTextContent(/^9$/);
  });

  it('C5: suma solo lo anotado, y sin nada anotado pinta «-»', () => {
    render(<ScorecardTable holes={dieciocho} players={players} scores={[golpe(3, 'u1', 7)]} currentUserId="u1" />);

    expect(screen.getByTestId('scorecard-total-u1')).toHaveTextContent(/^7$/);
    expect(screen.getByTestId('scorecard-total-u2')).toHaveTextContent(/^-$/);
  });

  it('C7: con el botón en neto, el TOTAL suma el neto', () => {
    const scores = [golpe(1, 'u1', 5, 4), golpe(10, 'u1', 6, 6)];
    render(<ScorecardTable holes={dieciocho} players={players} scores={scores} currentUserId="u1" />);
    expect(screen.getByTestId('scorecard-total-u1')).toHaveTextContent(/^11$/);

    fireEvent.click(screen.getByRole('switch'));

    expect(screen.getByTestId('scorecard-total-u1')).toHaveTextContent(/^10$/);
  });

  it('C7: en foursomes la fila del bando lleva su TOTAL', () => {
    const pareja = [
      { userId: 'u1', userName: 'Player A', team: 'A' },
      { userId: 'u3', userName: 'Player C', team: 'A' },
      { userId: 'u2', userName: 'Player B', team: 'B' },
      { userId: 'u4', userName: 'Player D', team: 'B' },
    ];
    const scores = [golpe(1, 'u1', 5), golpe(12, 'u3', 4)];
    render(
      <ScorecardTable holes={dieciocho} players={pareja} scores={scores} currentUserId="u1" matchFormat="FOURSOMES" />
    );

    expect(screen.getByTestId('scorecard-total-team-a')).toHaveTextContent(/^9$/);
  });
});

describe('ScorecardTable · el nombre de la mejor bola, si no cabe', () => {
  // Agustín, 24 oct 2026: con las columnas fijas, a 768 px «Maximiliano R.»
  // no cabe en la casilla del hoyo y salen sus iniciales
  it('pinta las iniciales cuando el nombre no cabe en la casilla', () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      }
    );
    vi.spyOn(globalThis.HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function () {
      return this.dataset.medida === 'caja' ? 47 : 0;
    });
    vi.spyOn(globalThis.HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function () {
      return this.dataset.medida === 'nombre' ? 75 : 0;
    });
    const largos = [
      { userId: 'u1', userName: 'Maximiliano Rodríguez', team: 'A' },
      { userId: 'u2', userName: 'Ana Gil', team: 'B' },
    ];
    const scores = [{ holeNumber: 1, playerScores: [], holeResult: { winner: 'A', bestBallPlayerA: ['u1'] } }];

    try {
      render(<ScorecardTable holes={dieciocho} players={largos} scores={scores} currentUserId="u1" matchFormat="SINGLES" />);

      const [ida] = tablas();
      expect(within(ida).getByText('MR')).toHaveAttribute('title', 'Maximiliano R.');
      expect(within(ida).getByText('Maximiliano R.', { selector: '.sr-only' })).toBeInTheDocument();
    } finally {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    }
  });
});
