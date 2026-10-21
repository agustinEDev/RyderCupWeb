import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';

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

  it('2: abre en la general, en columnas y con la regla; la scratch no se pide hasta abrirla', async () => {
    render(<ClasificacionesDeLaCompeticion competitionId="c-1" userId="ana" enJuego={false} />);

    await screen.findByTestId('fila-ana');
    expect(mockGeneral).toHaveBeenCalledWith('c-1', undefined);
    expect(screen.getAllByRole('columnheader')[2]).toHaveTextContent('partida.colPoints');
    expect(screen.getByText('partida.rule.ACCUMULATED')).toBeInTheDocument();
    expect(mockScratch).not.toHaveBeenCalled();
  });

  it('4: la scratch, al abrir su pestaña', async () => {
    render(<ClasificacionesDeLaCompeticion competitionId="c-1" userId="ana" enJuego={false} />);
    await screen.findByTestId('fila-ana');

    fireEvent.click(screen.getByRole('tab', { name: 'partida.scratch' }));

    expect(await screen.findByTestId('fila-bea')).toBeInTheDocument();
    expect(mockScratch).toHaveBeenCalledWith('c-1');
    // Sin filtro: la scratch no tiene categorías
    expect(screen.queryAllByRole('combobox').filter((c) => !c.closest('[hidden]'))).toHaveLength(0);
    expect(screen.getByRole('tab', { name: 'partida.scratch' })).toHaveAttribute('aria-selected', 'true');
  });

  it('las pestañas tienen nombre de grupo (revisor)', async () => {
    render(<ClasificacionesDeLaCompeticion competitionId="c-1" userId="ana" enJuego={false} />);

    expect(screen.getByRole('tablist', { name: 'partida.standingsTitle' })).toBeInTheDocument();
    await screen.findByTestId('fila-ana');
  });

  it('FE #658: las flechas cambian de clasificación; las dos siguen montadas, la cerrada oculta', async () => {
    render(<ClasificacionesDeLaCompeticion competitionId="c-1" userId="ana" enJuego={false} />);
    await screen.findByTestId('fila-ana');

    const [general, scratch] = within(screen.getByRole('tablist', { name: 'partida.standingsTitle' })).getAllByRole('tab');
    expect(general).toHaveAttribute('tabindex', '0');
    expect(scratch).toHaveAttribute('tabindex', '-1');
    const panelGeneral = screen.getByRole('tabpanel', { name: 'partida.overall' });
    expect(general).toHaveAttribute('aria-controls', panelGeneral.id);

    fireEvent.keyDown(general, { key: 'ArrowRight' });

    expect(scratch).toHaveAttribute('aria-selected', 'true');
    expect(scratch).toHaveFocus();
    const panelScratch = screen.getByRole('tabpanel', { name: 'partida.scratch' });
    await screen.findByTestId('fila-bea');
    expect(within(panelScratch).getByTestId('fila-bea')).toBeInTheDocument();
    expect(panelGeneral).toHaveAttribute('hidden');
    expect(panelGeneral).toBeInTheDocument();
    expect(mockScratch).toHaveBeenCalledWith('c-1');

    fireEvent.keyDown(scratch, { key: 'Home' });
    expect(general).toHaveAttribute('aria-selected', 'true');
    expect(panelScratch).toHaveAttribute('hidden');
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

describe('ClasificacionesDeLaCompeticion · me lleva a mi fila (14 oct 2026)', () => {
  let centra;
  beforeEach(() => {
    vi.clearAllMocks();
    centra = vi.fn();
    globalThis.Element.prototype.scrollIntoView = centra;
    mockGeneral.mockResolvedValue(clasificacion([fila('ana'), fila('yo', { position: 2 })]));
    mockScratch.mockResolvedValue(clasificacion([fila('yo', { position: 1 }), fila('ana', { position: 2 })], { scale: 'SCRATCH' }));
  });
  afterEach(() => delete globalThis.Element.prototype.scrollIntoView);

  it('G4: la general me centra al abrir la página, la scratch la primera vez que se abre, y volver a la general no', async () => {
    render(<ClasificacionesDeLaCompeticion competitionId="c-1" userId="yo" enJuego={false} />);
    await waitFor(() => expect(centra).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('tab', { name: 'partida.scratch' }));
    await waitFor(() => expect(centra).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('tab', { name: 'partida.overall' }));
    await act(async () => {});

    expect(centra).toHaveBeenCalledTimes(2);
  });
});

describe('ClasificacionesDeLaCompeticion · en su propia página (14 oct 2026, FE #865)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGeneral.mockResolvedValue(clasificacion([fila('ana')]));
  });

  it('N1: sin tarjeta ni título propios: la tabla usa todo el ancho de su página (a 360 px los nombres no caben en 125 px)', async () => {
    render(<ClasificacionesDeLaCompeticion competitionId="c-1" userId="yo" enJuego={false} />);
    await screen.findByTestId('fila-ana');

    const seccion = screen.getByTestId('clasificaciones');
    // Nada que la estreche otra vez: tarjeta, rellenos, márgenes, anchos máximos o fondo propio
    expect(seccion.className).not.toMatch(/\b(border|shadow|rounded|ring|bg-|max-w-|[pm][xytblr]?-(\d|\[))/);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: 'partida.standingsTitle' })).toBeInTheDocument();
  });
});
