import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

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
