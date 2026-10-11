import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';

/**
 * Lo que la general y la scratch añaden a la tabla de la franja (FE #824, PR 8,
 * casos 2, 4 y 6): categoría y tarjetas jugadas, la regla del torneo, la fila
 * de quien mira fijada debajo si queda fuera del corte, y releer cada `cada`.
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

  it('2: con las columnas de la general, la categoría y las tarjetas jugadas; y la regla arriba', async () => {
    const pedir = vi.fn().mockResolvedValue(clasificacion([fila('ana')], { rule: 'BEST_CARD' }));
    render(<Clasificacion pedir={pedir} userId="x" activa conCategoria conTarjetas conRegla />);

    const ana = await screen.findByTestId('fila-ana');
    expect(ana).toHaveTextContent('partida.categoryShort {"numero":2}');
    expect(ana).toHaveTextContent('partida.cards {"count":2}');
    expect(screen.getByText('partida.rule.BEST_CARD')).toBeInTheDocument();
  });

  it('la de la franja no las enseña', async () => {
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

  it('a 360 px: categoría, tarjetas y estado van debajo del nombre, no en la misma línea (revisor)', async () => {
    const pedir = vi.fn().mockResolvedValue(clasificacion([fila('ana')]));
    render(<Clasificacion pedir={pedir} userId="x" activa conCategoria conTarjetas />);

    const ana = await screen.findByTestId('fila-ana');
    const debajo = ana.querySelector('[data-detalle]');
    expect(debajo).toHaveTextContent('partida.categoryShort');
    expect(debajo).toHaveTextContent('partida.cards');
    expect(debajo).toHaveTextContent('partida.finished');
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
