import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';

/**
 * Caso 11 de la PR 7 (FE #824): la clasificación de la franja, con filtro de
 * categoría, empates «T3», «tras N» y NR/NP al final (los da el servidor).
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, params) => (params ? `${clave} ${JSON.stringify(params)}` : clave),
    i18n: { language: 'es' },
  }),
}));

const mockLeer = vi.fn();
vi.mock('../../composition', () => ({
  getTeeWindowStandingsUseCase: { execute: (...a) => mockLeer(...a) },
}));

const ClasificacionDeLaFranja = (await import('./ClasificacionDeLaFranja')).default;

const fila = (userId, extra = {}) => ({
  position: 1, tied: false, userId, name: userId.toUpperCase(), category: 1, handicap: 10, value: 36, cards: 1, thru: 18, status: 'CLASIFICADO', ...extra,
});
const clasificacion = (rows, extra = {}) => ({ tournamentType: 'STABLEFORD', scale: 'NETA', rule: 'ACCUMULATED', category: null, rows, me: null, ...extra });

describe('ClasificacionDeLaFranja (FE #824, PR 7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLeer.mockReset();
  });

  it('sin abrir la pestaña no se pide', () => {
    render(<ClasificacionDeLaFranja roundId="r-1" userId="ana" activa={false} />);

    expect(mockLeer).not.toHaveBeenCalled();
  });

  it('11: puesto (T3 si empata), nombre, puntos y «tras N»; quien mira, destacado', async () => {
    mockLeer.mockResolvedValue(clasificacion([
      fila('ana', { position: 1, value: 38 }),
      fila('bea', { position: 2, tied: true, value: 35, thru: 12 }),
      fila('cris', { position: 2, tied: true, value: 35 }),
    ]));
    render(<ClasificacionDeLaFranja roundId="r-1" userId="bea" activa />);

    const bea = await screen.findByTestId('fila-bea');
    expect(mockLeer).toHaveBeenCalledWith('r-1', undefined);
    expect(bea).toHaveTextContent('T2');
    expect(bea).toHaveTextContent('BEA');
    expect(bea).toHaveTextContent('35');
    expect(bea).toHaveTextContent('partida.thru {"count":12}');
    expect(bea).toHaveAttribute('data-yo', 'true');
    expect(screen.getByTestId('fila-ana')).toHaveTextContent('1');
    expect(screen.getByTestId('fila-ana')).toHaveTextContent('partida.finished');
    expect(screen.getByTestId('fila-ana')).toHaveAttribute('data-yo', 'false');
  });

  it('Medal: respecto al par, PAR en cero', async () => {
    mockLeer.mockResolvedValue(clasificacion([fila('ana', { value: -2 }), fila('bea', { value: 0, position: 2 }), fila('cris', { value: 3, position: 3 })], { tournamentType: 'MEDAL' }));
    render(<ClasificacionDeLaFranja roundId="r-1" userId="x" activa />);

    expect(await screen.findByTestId('fila-ana')).toHaveTextContent('-2');
    expect(screen.getByTestId('fila-bea')).toHaveTextContent('PAR');
    expect(screen.getByTestId('fila-cris')).toHaveTextContent('+3');
  });

  it('NR, NP y sin empezar: sin puesto ni valor, con su estado', async () => {
    mockLeer.mockResolvedValue(clasificacion([
      fila('ana'),
      fila('bea', { position: null, value: null, status: 'NR', thru: 9 }),
      fila('cris', { position: null, value: null, status: 'NP', thru: 0 }),
      fila('dani', { position: null, value: null, status: 'SIN_EMPEZAR', thru: 0 }),
    ]));
    render(<ClasificacionDeLaFranja roundId="r-1" userId="x" activa />);

    expect(await screen.findByTestId('fila-bea')).toHaveTextContent('partida.status.NR');
    expect(screen.getByTestId('fila-cris')).toHaveTextContent('partida.status.NP');
    expect(screen.getByTestId('fila-dani')).toHaveTextContent('partida.status.SIN_EMPEZAR');
    expect(screen.getByTestId('fila-bea')).not.toHaveTextContent('partida.thru');
  });

  it('con varias categorías, se filtra por una (se pide al servidor)', async () => {
    mockLeer.mockResolvedValueOnce(clasificacion([fila('ana', { category: 1 }), fila('bea', { category: 2, position: 2 })]));
    mockLeer.mockResolvedValueOnce(clasificacion([fila('bea', { category: 2 })], { category: 2 }));
    render(<ClasificacionDeLaFranja roundId="r-1" userId="x" activa />);

    const filtro = await screen.findByRole('combobox', { name: 'partida.category' });
    expect(within(filtro).getAllByRole('option').map((o) => o.value)).toEqual(['', '1', '2']);
    fireEvent.change(filtro, { target: { value: '2' } });

    await waitFor(() => expect(mockLeer).toHaveBeenLastCalledWith('r-1', 2));
    await waitFor(() => expect(screen.queryByTestId('fila-ana')).toBeNull());
    // Las categorías no desaparecen al filtrar
    expect(within(screen.getByRole('combobox', { name: 'partida.category' })).getAllByRole('option')).toHaveLength(3);
  });

  it.each([
    ['ninguna', null],
    ['una sola', 1],
  ])('con %s categoría, no hay filtro', async (_caso, categoria) => {
    mockLeer.mockResolvedValue(clasificacion([fila('ana', { category: categoria }), fila('bea', { category: categoria, position: 2 })]));
    render(<ClasificacionDeLaFranja roundId="r-1" userId="x" activa />);

    await screen.findByTestId('fila-ana');
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('una lectura vieja que llega tarde no pisa a la nueva (cambiar de categoría deprisa)', async () => {
    let soltarLaVieja;
    mockLeer.mockResolvedValueOnce(clasificacion([fila('ana', { category: 1 }), fila('bea', { category: 2, position: 2 })]));
    mockLeer.mockReturnValueOnce(new Promise((r) => (soltarLaVieja = r)));
    mockLeer.mockResolvedValueOnce(clasificacion([fila('bea', { category: 2 })], { category: 2 }));
    render(<ClasificacionDeLaFranja roundId="r-1" userId="x" activa />);
    const filtro = await screen.findByRole('combobox', { name: 'partida.category' });

    fireEvent.change(filtro, { target: { value: '1' } });
    fireEvent.change(filtro, { target: { value: '2' } });
    await waitFor(() => expect(screen.queryByTestId('fila-ana')).toBeNull());

    await act(async () => soltarLaVieja(clasificacion([fila('ana', { category: 1 })], { category: 1 })));
    expect(screen.queryByTestId('fila-ana')).toBeNull();
    expect(screen.getByTestId('fila-bea')).toBeInTheDocument();
  });

  it('sin nadie todavía, lo dice', async () => {
    mockLeer.mockResolvedValue(clasificacion([]));
    render(<ClasificacionDeLaFranja roundId="r-1" userId="x" activa />);

    expect(await screen.findByText('partida.standingsEmpty')).toBeInTheDocument();
  });

  it('si no se pudo leer, aviso y reintentar', async () => {
    mockLeer.mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(clasificacion([fila('ana')]));
    render(<ClasificacionDeLaFranja roundId="r-1" userId="x" activa />);

    fireEvent.click(await screen.findByRole('button', { name: 'partida.retry' }));

    expect(await screen.findByTestId('fila-ana')).toBeInTheDocument();
  });
});
