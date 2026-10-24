import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import QuickMatchScorecardTable from './QuickMatchScorecardTable';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => (opts ? `${key} ${JSON.stringify(opts)}` : key),
    i18n: { language: 'en' },
  }),
}));

/**
 * La tarjeta horizontal de la partida rápida en escritorio (FE #938; Agustín,
 * 24 oct 2026): la ida y la vuelta son dos tablas y cada una medía sus columnas
 * por su cuenta, así que el hoyo 1 y el 10 no caían uno encima del otro. Las
 * dos comparten ahora el mismo reparto de columnas, y la vuelta acaba en
 * TOTAL, como la tarjeta de papel.
 *
 *   #   caso                                          | esperado
 *   ----|---------------------------------------------|-------------------------------------
 *   C1  ida y vuelta, mismas columnas                 | tabla fija y el mismo <colgroup>
 *   C2  la vuelta acaba en VUELTA | TOTAL             | par 72; golpes y cifra pequeña de los 18
 *   C3  la ida lleva el hueco del TOTAL               | una casilla vacía en cada fila
 *   C4  partida de 9 hoyos                            | IDA | TOTAL, la misma cifra
 *   C5  hoyos sin jugar                               | suma solo lo anotado; nada, «-»
 *   C6  match play y scratch                          | golpes brutos, sin cifra pequeña
 */
const dieciocho = Array.from({ length: 18 }, (_, i) => ({ holeNumber: i + 1, par: 4, strokeIndex: i + 1 }));
const nueve = dieciocho.slice(0, 9);
const participants = [{ participantId: 'p-1', name: 'Alice', handicap: 0, team: null, isGuest: false }];

const tablas = () => screen.getAllByTestId('vuelta-horizontal').map((d) => d.querySelector('table'));
const columnas = (tabla) => [...tabla.querySelectorAll('colgroup col')].map((c) => c.className);

const pintar = (props) =>
  render(
    <QuickMatchScorecardTable
      holes={dieciocho}
      holeScores={[]}
      participants={participants}
      currentParticipantId="p-1"
      scoringFormat="MEDAL"
      {...props}
    />
  );

describe('QuickMatchScorecardTable · columnas de la ida y la vuelta', () => {
  it('C1: las dos tablas son fijas y reparten las columnas igual', () => {
    pintar({ holeScores: [{ holeNumber: 1, participantId: 'p-1', score: 5 }] });

    const [ida, vuelta] = tablas();
    expect(ida).toHaveClass('table-fixed');
    expect(vuelta).toHaveClass('table-fixed');
    // Etiqueta + 9 hoyos + tramo + total
    expect(columnas(ida)).toHaveLength(12);
    expect(columnas(ida)).toEqual(columnas(vuelta));
    for (const tabla of [ida, vuelta]) {
      for (const fila of tabla.querySelectorAll('tr')) {
        expect(fila.children).toHaveLength(12);
      }
    }
  });

  it('C2: la vuelta acaba en TOTAL, con el par, los golpes y el neto de los 18', () => {
    pintar({
      holeScores: [
        { holeNumber: 1, participantId: 'p-1', score: 5 },
        { holeNumber: 10, participantId: 'p-1', score: 6 },
      ],
    });

    const [, vuelta] = tablas();
    expect(vuelta.querySelector('thead tr').lastElementChild).toHaveTextContent('scorecard.total');
    expect(screen.getByTestId('quick-match-total-par-p-1')).toHaveTextContent('72');
    const total = screen.getByTestId('quick-match-section-total-p-1-total');
    expect(within(total).getByTestId('subtotal-net-strokes')).toHaveTextContent('11');
    expect(total).toHaveTextContent(/^11/);
  });

  it('C3: la ida no lleva TOTAL, sino su hueco vacío', () => {
    pintar({ holeScores: [{ holeNumber: 1, participantId: 'p-1', score: 5 }] });

    const [ida] = tablas();
    expect(ida).not.toHaveTextContent('scorecard.total');
    for (const fila of ida.querySelectorAll('tr')) {
      expect(fila.lastElementChild).toHaveTextContent('');
    }
    expect(within(ida).queryByTestId('quick-match-section-total-p-1-total')).not.toBeInTheDocument();
  });

  it('C4: con 9 hoyos, la ida acaba en IDA | TOTAL con la misma cifra', () => {
    pintar({
      holes: nueve,
      holeScores: [
        { holeNumber: 1, participantId: 'p-1', score: 5 },
        { holeNumber: 2, participantId: 'p-1', score: 4 },
      ],
    });

    const [ida, ...resto] = tablas();
    expect(resto).toHaveLength(0);
    expect(ida.querySelector('thead tr').lastElementChild).toHaveTextContent('scorecard.total');
    expect(screen.getByTestId('quick-match-total-par-p-1')).toHaveTextContent('36');
    expect(screen.getByTestId('quick-match-section-total-p-1-total')).toHaveTextContent(/^9/);
    expect(screen.getByTestId('quick-match-section-total-p-1-ida')).toHaveTextContent(/^9/);
  });

  it('C5: suma solo lo anotado, y sin nada anotado pinta «-»', () => {
    pintar({ holeScores: [{ holeNumber: 3, participantId: 'p-1', score: 7 }] });
    expect(screen.getByTestId('quick-match-section-total-p-1-total')).toHaveTextContent(/^7/);
  });

  it('C5: sin nada anotado, «-»', () => {
    pintar();
    expect(screen.getByTestId('quick-match-section-total-p-1-total')).toHaveTextContent('-');
  });

  it('C6: en match play, los golpes brutos sin cifra pequeña', () => {
    const dos = [
      { participantId: 'p-1', name: 'Alice', handicap: 0, team: null, isGuest: false },
      { participantId: 'p-2', name: 'Bob', handicap: 0, team: null, isGuest: false },
    ];
    pintar({
      participants: dos,
      scoringFormat: 'MATCH_PLAY',
      holeScores: [
        { holeNumber: 1, participantId: 'p-1', score: 5 },
        { holeNumber: 18, participantId: 'p-1', score: 3 },
      ],
    });

    const total = screen.getByTestId('quick-match-section-total-p-1-total');
    expect(total).toHaveTextContent('8');
    expect(within(total).queryByTestId('subtotal-net-strokes')).not.toBeInTheDocument();
    expect(within(total).queryByTestId('subtotal-points')).not.toBeInTheDocument();
  });

  it('C6: en scratch tampoco lleva cifra pequeña', () => {
    pintar({
      playMode: 'SCRATCH',
      scoringFormat: 'MATCH_PLAY',
      holeScores: [{ holeNumber: 1, participantId: 'p-1', score: 5 }],
    });

    const total = screen.getByTestId('quick-match-section-total-p-1-total');
    expect(total).toHaveTextContent('5');
    expect(within(total).queryByTestId('subtotal-net-strokes')).not.toBeInTheDocument();
  });
});
