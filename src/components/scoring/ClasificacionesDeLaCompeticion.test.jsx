import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

/**
 * La sección «Clasificación» de la ficha de un Stableford o un Medal (FE #824,
 * PR 8; casos 2-8, decididos con Agustín el 11 oct 2026): pestañas General y
 * Scratch, y releer cada 60 s solo con la competición en juego.
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, params) => (params ? `${clave} ${JSON.stringify(params)}` : clave),
    i18n: { language: 'es' },
  }),
}));

const mockGeneral = vi.fn();
const mockScratch = vi.fn();
vi.mock('../../composition', () => ({
  getCompetitionStandingsUseCase: { execute: (...a) => mockGeneral(...a) },
  getScratchStandingsUseCase: { execute: (...a) => mockScratch(...a) },
}));

const ClasificacionesDeLaCompeticion = (await import('./ClasificacionesDeLaCompeticion')).default;

const fila = (userId, extra = {}) => ({
  position: 1, tied: false, userId, name: userId.toUpperCase(), category: 1, handicap: 10, value: 36, cards: 1, thru: 18, status: 'CLASIFICADO', ...extra,
});
const clasificacion = (rows, extra = {}) => ({ tournamentType: 'STABLEFORD', scale: 'NETA', rule: 'ACCUMULATED', category: null, rows, me: null, ...extra });

describe('ClasificacionesDeLaCompeticion (FE #824, PR 8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGeneral.mockResolvedValue(clasificacion([fila('ana')]));
    // Como el backend: las filas de la scratch también traen su categoría
    mockScratch.mockResolvedValue(clasificacion([fila('bea', { category: 2 }), fila('cris', { category: 1, position: 2 })], { scale: 'SCRATCH' }));
  });

  it('2: abre en la general, con categoría, tarjetas y la regla; la scratch no se pide hasta abrirla', async () => {
    render(<ClasificacionesDeLaCompeticion competitionId="c-1" userId="ana" enJuego={false} />);

    const ana = await screen.findByTestId('fila-ana');
    expect(mockGeneral).toHaveBeenCalledWith('c-1', undefined);
    expect(ana).toHaveTextContent('partida.categoryShort');
    expect(screen.getByText('partida.rule.ACCUMULATED')).toBeInTheDocument();
    expect(mockScratch).not.toHaveBeenCalled();
  });

  it('4: la scratch, al abrir su pestaña', async () => {
    render(<ClasificacionesDeLaCompeticion competitionId="c-1" userId="ana" enJuego={false} />);
    await screen.findByTestId('fila-ana');

    fireEvent.click(screen.getByRole('tab', { name: 'partida.scratch' }));

    expect(await screen.findByTestId('fila-bea')).toBeInTheDocument();
    expect(mockScratch).toHaveBeenCalledWith('c-1');
    // Sin filtro ni tarjetas: la scratch no tiene categorías
    expect(screen.getByRole('tabpanel', { name: 'partida.scratch' })).not.toHaveTextContent('partida.cards');
    expect(screen.queryAllByRole('combobox').filter((c) => !c.closest('[hidden]'))).toHaveLength(0);
    expect(screen.getByRole('tab', { name: 'partida.scratch' })).toHaveAttribute('aria-selected', 'true');
  });

  it('las pestañas tienen nombre de grupo (revisor)', async () => {
    render(<ClasificacionesDeLaCompeticion competitionId="c-1" userId="ana" enJuego={false} />);

    expect(screen.getByRole('tablist', { name: 'partida.standingsTitle' })).toBeInTheDocument();
    await screen.findByTestId('fila-ana');
  });

  it('8: sin resultados todavía', async () => {
    mockGeneral.mockResolvedValue(clasificacion([]));
    render(<ClasificacionesDeLaCompeticion competitionId="c-1" userId="ana" enJuego={false} />);

    expect(await screen.findByText('partida.noResultsYet')).toBeInTheDocument();
  });

  it.each([
    [true, 2],
    [false, 1],
  ])('6: en juego (%s) se relee cada 60 s', async (enJuego, lecturas) => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      render(<ClasificacionesDeLaCompeticion competitionId="c-1" userId="ana" enJuego={enJuego} />);
      await screen.findByTestId('fila-ana');
      await act(async () => {});
      await act(async () => vi.advanceTimersByTime(60000));
      await waitFor(() => expect(mockGeneral).toHaveBeenCalledTimes(lecturas));
    } finally {
      vi.useRealTimers();
    }
  });
});
