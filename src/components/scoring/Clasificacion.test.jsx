import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';

/**
 * La tabla de clasificación (FE #824, PR 8 y pasada): columnas estilo
 * leaderboard (POS · JUGADOR · PTS/PAR · HOYO), la regla del torneo, la fila
 * de quien mira fijada debajo si queda fuera del corte, releer cada `cada` y
 * al cambiar la versión.
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, params) => (params ? `${clave} ${JSON.stringify(params)}` : clave),
    i18n: { language: 'es' },
  }),
}));

const Clasificacion = (await import('./Clasificacion')).default;

const fila = (userId, extra = {}) => ({
  position: 1, tied: false, userId, name: userId.toUpperCase(), category: 2, handicap: 10, value: 36, cards: 2, thru: 18, status: 'CLASIFICADO', ...extra,
});
const clasificacion = (rows, extra = {}) => ({ tournamentType: 'STABLEFORD', scale: 'NETA', rule: 'ACCUMULATED', category: null, rows, me: null, ...extra });

describe('Clasificacion · general y scratch (FE #824, PR 8)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('2 (pasada): columnas como en los circuitos, POS · JUGADOR · PTS · THRU, en una línea; y la regla arriba', async () => {
    const pedir = vi.fn().mockResolvedValue(clasificacion([fila('ana', { position: 3, tied: true, thru: 14 })], { rule: 'BEST_CARD' }));
    render(<Clasificacion pedir={pedir} userId="x" activa conRegla />);

    const ana = await screen.findByTestId('fila-ana');
    expect(screen.getAllByRole('columnheader').map((c) => c.textContent)).toEqual([
      'partida.colPos',
      'partida.colPlayer',
      'partida.colPoints',
      'partida.colThru',
    ]);
    const celdas = [...ana.querySelectorAll('td')].map((c) => c.textContent);
    expect(celdas).toEqual(['T3', 'ANA', '36', '14']);
    expect(screen.getByText('partida.rule.BEST_CARD')).toBeInTheDocument();
  });

  it('QA 3 (12 oct 2026): sin haber jugado, sin «Tu posición» fijada', async () => {
    const pedir = vi.fn().mockResolvedValue(clasificacion([fila('ana')], { me: fila('yo', { position: null, value: null, status: 'SIN_EMPEZAR', thru: 0 }) }));
    render(<Clasificacion pedir={pedir} userId="yo" activa />);

    await screen.findByTestId('fila-ana');
    expect(screen.queryByTestId('fila-fuera-del-corte')).toBeNull();
    expect(screen.queryByText('partida.yourPosition')).toBeNull();
  });

  it('Medal: la columna es al par', async () => {
    const pedir = vi.fn().mockResolvedValue(clasificacion([fila('ana', { value: -4 })], { tournamentType: 'MEDAL' }));
    render(<Clasificacion pedir={pedir} userId="x" activa />);

    await screen.findByTestId('fila-ana');
    expect(screen.getAllByRole('columnheader')[2]).toHaveTextContent('partida.colToPar');
    expect(screen.getByTestId('fila-ana')).toHaveTextContent('-4');
  });

  it('accesible (revisor): la tabla tiene nombre, los códigos su nombre entero y los nombres cortados su texto completo', async () => {
    const pedir = vi.fn().mockResolvedValue(clasificacion([fila('ana', { position: null, value: null, status: 'NR', thru: 9 })], { me: fila('yo', { position: 31 }) }));
    render(<Clasificacion pedir={pedir} userId="yo" activa />);

    await screen.findByTestId('fila-ana');
    expect(screen.getByRole('table', { name: 'partida.standingsTable' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'partida.yourPosition' })).toBeInTheDocument();
    const codigo = screen.getByTestId('fila-ana').querySelector('abbr');
    expect(codigo).toHaveAttribute('title', 'partida.status.NR');
    expect(codigo).toHaveTextContent('partida.statusShort.NR');
    expect(screen.getByTestId('fila-ana').querySelectorAll('td')[1]).toHaveAttribute('title', 'ANA');
  });

  it('Medal en cero: PAR; un Stableford con 0 puntos, 0', async () => {
    const medal = vi.fn().mockResolvedValue(clasificacion([fila('ana', { value: 0 })], { tournamentType: 'MEDAL' }));
    const { unmount } = render(<Clasificacion pedir={medal} userId="x" activa />);
    expect((await screen.findByTestId('fila-ana')).querySelectorAll('td')[2]).toHaveTextContent('PAR');
    unmount();

    const stb = vi.fn().mockResolvedValue(clasificacion([fila('ana', { value: 0, thru: 0 })]));
    render(<Clasificacion pedir={stb} userId="x" activa />);
    const celdas = (await screen.findByTestId('fila-ana')).querySelectorAll('td');
    expect(celdas[2]).toHaveTextContent(/^0$/);
    expect(celdas[3]).toHaveTextContent(/^0$/);
  });

  it('23 (QA del 11 oct 2026): un retirado en Stableford conserva su puesto y en HOYO va «R»', async () => {
    const pedir = vi.fn().mockResolvedValue(clasificacion([fila('ana', { position: 4, value: 9, thru: 5, retired: true })]));
    render(<Clasificacion pedir={pedir} userId="x" activa />);

    const celdas = (await screen.findByTestId('fila-ana')).querySelectorAll('td');
    expect(celdas[0]).toHaveTextContent('4');
    expect(celdas[2]).toHaveTextContent('9');
    const r = celdas[3].querySelector('abbr');
    expect(r).toHaveTextContent('partida.statusShort.RETIRADO');
    expect(r).toHaveAttribute('title', 'partida.status.RETIRADO');
  });

  it('QA 2 (12 oct 2026): el nombre entero, en dos líneas si no cabe; no «Helena Pru…»', async () => {
    const pedir = vi.fn().mockResolvedValue(clasificacion([fila('ana')]));
    render(<Clasificacion pedir={pedir} userId="x" activa />);

    const nombre = (await screen.findByTestId('fila-ana')).querySelectorAll('td')[1];
    expect(nombre).not.toHaveClass('truncate');
    expect(nombre).toHaveClass('break-words');
  });

  it('3 (QA del 11 oct 2026): POS cabe «T22» sin pegarse al nombre', async () => {
    const pedir = vi.fn().mockResolvedValue(clasificacion([fila('ana', { position: 22, tied: true })]));
    render(<Clasificacion pedir={pedir} userId="x" activa />);

    const celda = (await screen.findByTestId('fila-ana')).querySelectorAll('td')[0];
    expect(celda).toHaveClass('w-12', 'pr-2');
    expect(screen.getAllByRole('columnheader')[0]).toHaveClass('w-12');
  });

  it('/code-review: el guion de puesto y valor también pasa por t()', async () => {
    const pedir = vi.fn().mockResolvedValue(clasificacion([fila('ana', { position: null, value: null, status: 'NP', thru: 0 })]));
    render(<Clasificacion pedir={pedir} userId="x" activa />);

    const celdas = (await screen.findByTestId('fila-ana')).querySelectorAll('td');
    expect(celdas[0]).toHaveTextContent('partida.none');
    expect(celdas[2]).toHaveTextContent('partida.none');
  });

  it('sin valor (sin empezar, NR, NP), un guion en su columna', async () => {
    const pedir = vi.fn().mockResolvedValue(clasificacion([fila('ana', { position: null, value: null, status: 'NP', thru: 0 })]));
    render(<Clasificacion pedir={pedir} userId="x" activa />);

    const ana = await screen.findByTestId('fila-ana');
    expect([...ana.querySelectorAll('td')].map((c) => c.textContent)).toEqual(['partida.none', 'ANA', 'partida.none', 'partida.statusShort.NP']);
  });

  it('ni la categoría ni las tarjetas debajo del nombre (pasada: estilo leaderboard)', async () => {
    const pedir = vi.fn().mockResolvedValue(clasificacion([fila('ana')]));
    render(<Clasificacion pedir={pedir} userId="x" activa />);

    const ana = await screen.findByTestId('fila-ana');
    expect(ana).not.toHaveTextContent('partida.categoryShort');
    expect(ana).not.toHaveTextContent('partida.cards');
    expect(screen.queryByText(/partida.rule/)).toBeNull();
  });

  it('4: quien queda fuera del corte (scratch) tiene su fila fijada debajo, destacada', async () => {
    const pedir = vi.fn().mockResolvedValue(clasificacion([fila('ana')], { scale: 'SCRATCH', me: fila('yo', { position: 31 }) }));
    render(<Clasificacion pedir={pedir} userId="yo" activa />);

    const mia = await screen.findByTestId('fila-fuera-del-corte');
    expect(mia).toHaveTextContent('31');
    expect(mia).toHaveTextContent('YO');
    expect(mia).toHaveAttribute('data-yo', 'true');
  });

  it('sin filtro (scratch), aunque las filas traigan su categoría (revisor)', async () => {
    const pedir = vi.fn().mockResolvedValue(clasificacion([fila('ana', { category: 1 }), fila('bea', { category: 2, position: 2 })]));
    render(<Clasificacion pedir={pedir} userId="x" activa filtrable={false} />);

    await screen.findByTestId('fila-ana');
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('se relee cuando cambia la versión (se cerró la franja: lo sin acabar pasa a NR/NP; pasada)', async () => {
    const pedir = vi.fn().mockResolvedValue(clasificacion([fila('ana')]));
    const { rerender } = render(<Clasificacion pedir={pedir} userId="x" activa version={0} />);
    await screen.findByTestId('fila-ana');

    rerender(<Clasificacion pedir={pedir} userId="x" activa version={1} />);

    await waitFor(() => expect(pedir).toHaveBeenCalledTimes(2));
  });

  it('al dejar de releerse (acaba la competición), una última lectura (revisor)', async () => {
    const pedir = vi.fn().mockResolvedValue(clasificacion([fila('ana')]));
    const { rerender } = render(<Clasificacion pedir={pedir} userId="x" activa cada={60000} />);
    await screen.findByTestId('fila-ana');

    rerender(<Clasificacion pedir={pedir} userId="x" activa cada={null} />);

    await waitFor(() => expect(pedir).toHaveBeenCalledTimes(2));
  });

  it('la fila fijada debajo tiene su rótulo visible (revisor)', async () => {
    const pedir = vi.fn().mockResolvedValue(clasificacion([fila('ana')], { me: fila('yo', { position: 31 }) }));
    render(<Clasificacion pedir={pedir} userId="yo" activa />);

    expect(await screen.findByText('partida.yourPosition')).toBeInTheDocument();
  });

  it('7: si una lectura posterior falla, se dice, con lo de antes debajo (/code-review)', async () => {
    const pedir = vi.fn()
      .mockResolvedValueOnce(clasificacion([fila('ana', { category: 1 }), fila('bea', { category: 2, position: 2 })]))
      .mockRejectedValueOnce(new Error('x'));
    render(<Clasificacion pedir={pedir} userId="x" activa />);
    await screen.findByTestId('fila-ana');

    fireEvent.change(screen.getByRole('combobox', { name: 'partida.category' }), { target: { value: '2' } });

    expect(await screen.findByRole('alert')).toHaveTextContent('partida.standingsNotLoaded');
    expect(screen.getByRole('button', { name: 'partida.retry' })).toBeInTheDocument();
  });

  it('3: al cambiar de categoría, no se enseñan las filas de antes mientras llega la nueva (/code-review)', async () => {
    let soltar;
    const pedir = vi.fn()
      .mockResolvedValueOnce(clasificacion([fila('ana', { category: 1 }), fila('bea', { category: 2, position: 2 })]))
      .mockReturnValueOnce(new Promise((r) => (soltar = r)));
    render(<Clasificacion pedir={pedir} userId="x" activa />);
    await screen.findByTestId('fila-ana');

    fireEvent.change(screen.getByRole('combobox', { name: 'partida.category' }), { target: { value: '2' } });

    expect(await screen.findByText('partida.loadingStandings')).toBeInTheDocument();
    expect(screen.queryByTestId('fila-ana')).toBeNull();
    await act(async () => soltar(clasificacion([fila('bea', { category: 2 })], { category: 2 })));
    expect(screen.getByTestId('fila-bea')).toBeInTheDocument();
    expect(screen.queryByText('partida.loadingStandings')).toBeNull();
  });

  it('6: con `cada`, se relee; sin él, una lectura', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const pedir = vi.fn().mockResolvedValue(clasificacion([fila('ana')]));
      const { unmount } = render(<Clasificacion pedir={pedir} userId="x" activa cada={60000} />);
      await screen.findByTestId('fila-ana');
      await act(async () => {});
      await act(async () => vi.advanceTimersByTime(60000));
      expect(pedir).toHaveBeenCalledTimes(2);
      unmount();

      const unaVez = vi.fn().mockResolvedValue(clasificacion([fila('ana')]));
      render(<Clasificacion pedir={unaVez} userId="x" activa />);
      await screen.findByTestId('fila-ana');
      await act(async () => {});
      await act(async () => vi.advanceTimersByTime(120000));
      expect(unaVez).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('8: sin resultados, el texto que se le dé', async () => {
    const pedir = vi.fn().mockResolvedValue(clasificacion([]));
    render(<Clasificacion pedir={pedir} userId="x" activa vacia="partida.noResultsYet" />);

    expect(await screen.findByText('partida.noResultsYet')).toBeInTheDocument();
  });
});
