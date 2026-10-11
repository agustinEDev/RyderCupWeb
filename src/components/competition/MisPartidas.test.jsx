import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';

/**
 * Caso 5 de la PR 6 (FE #824): arriba de las franjas, «Tu partida» de cada
 * jornada, con la hora, los compañeros y a quién marca.
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, params) => (params ? `${clave} ${JSON.stringify(params)}` : clave),
    i18n: { language: 'es' },
  }),
}));

const mockMias = vi.fn();
vi.mock('react-router', () => ({
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
}));

vi.mock('../../composition', () => ({
  getMyTeeGroupsUseCase: { execute: (...a) => mockMias(...a) },
}));

const MisPartidas = (await import('./MisPartidas')).default;

const jugador = (userId, marks) => ({ userId, name: userId.toUpperCase(), marksUserId: marks });
const mia = (roundId, roundDate, sessionType, number, teeTime, players) => ({
  roundId,
  roundDate,
  sessionType,
  group: { id: `g-${roundId}`, number, teeTime, incomplete: players.length === 1, players },
});

describe('MisPartidas (FE #824, PR 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMias.mockReset();
  });

  it('5: una línea por jornada: franja, día, número, hora, compañeros y a quién marca', async () => {
    mockMias.mockResolvedValue([
      mia('r1', '2030-10-12', 'MORNING', 2, '08:10', [jugador('ana', 'bea'), jugador('bea', 'cris'), jugador('cris', 'ana')]),
      mia('r2', '2030-10-13', 'AFTERNOON', 1, '12:00', [jugador('ana', null)]),
    ]);
    render(<MisPartidas fecha={(d) => d} competitionId="c-1" userId="ana" version="v" />);

    const lineas = await screen.findAllByTestId(/^mi-partida-/);
    expect(mockMias).toHaveBeenCalledWith('c-1');
    expect(lineas[0]).toHaveTextContent('"franja":"sessions.MORNING"');
    expect(lineas[0]).toHaveTextContent('"numero":2,"hora":"08:10"');
    expect(lineas[0]).toHaveTextContent('"companeros":"BEA, CRIS"');
    expect(lineas[0]).toHaveTextContent('partidas.youMark {"jugador":"BEA"}');
    // Sola (por bajas): sin compañeros ni marcador
    expect(lineas[1]).toHaveTextContent('partidas.mineAlone');
    expect(lineas[1]).not.toHaveTextContent('partidas.youMark');
  });

  it('12 (QA del 11 oct 2026): si me han pasado a esta partida, se dice con su número y su hora', async () => {
    const yo = { ...jugador('yo', 'ana'), broughtIn: true };
    mockMias.mockResolvedValue([mia('r1', '2030-10-12', 'MORNING', 2, '09:10', [jugador('ana', 'yo'), yo])]);
    render(<MisPartidas fecha={(d) => d} competitionId="c-1" userId="yo" version="v" />);

    expect(await screen.findByTestId('traido-r1')).toHaveTextContent('partidas.broughtIn {"numero":2,"hora":"09:10"}');
  });

  it('21 (QA del 11 oct 2026): con varias categorías, la suya', async () => {
    mockMias.mockResolvedValue([mia('r1', '2030-10-12', 'MORNING', 2, '09:10', [jugador('ana', 'yo'), jugador('yo', 'ana')])]);
    render(<MisPartidas fecha={(d) => d} competitionId="c-1" userId="yo" version="v" categoria={2} />);

    expect(await screen.findByTestId('mi-categoria')).toHaveTextContent('partidas.yourCategory {"categoria":2}');
  });

  it('21: sin categoría (una sola, o aún sin cerrar), nada', async () => {
    mockMias.mockResolvedValue([mia('r1', '2030-10-12', 'MORNING', 2, '09:10', [jugador('ana', 'yo'), jugador('yo', 'ana')])]);
    render(<MisPartidas fecha={(d) => d} competitionId="c-1" userId="yo" version="v" categoria={null} />);

    await screen.findByTestId('mi-partida-r1');
    expect(screen.queryByTestId('mi-categoria')).toBeNull();
  });

  it('12: sin haber venido de otra, nada', async () => {
    mockMias.mockResolvedValue([mia('r1', '2030-10-12', 'MORNING', 2, '09:10', [jugador('ana', 'yo'), jugador('yo', 'ana')])]);
    render(<MisPartidas fecha={(d) => d} competitionId="c-1" userId="yo" version="v" />);

    await screen.findByTestId('mi-partida-r1');
    expect(screen.queryByTestId('traido-r1')).toBeNull();
  });

  it('cada línea lleva a anotar su partida, con la competición (PR 7)', async () => {
    mockMias.mockResolvedValue([mia('r1', '2030-10-12', 'MORNING', 2, '08:10', [jugador('ana', 'bea'), jugador('bea', 'ana')])]);
    render(<MisPartidas fecha={(d) => d} competitionId="c-1" userId="ana" version="v" />);

    const enlace = await screen.findByRole('link', { name: /partidas.score/ });
    expect(enlace).toHaveAttribute('href', '/player/groups/g-r1/scoring?competition=c-1');
  });

  it('sin partidas, o si no se pudieron leer, no se pinta nada', async () => {
    mockMias.mockResolvedValueOnce([]);
    const { container, rerender } = render(<MisPartidas fecha={(d) => d} competitionId="c-1" userId="ana" version="1" />);
    await waitFor(() => expect(mockMias).toHaveBeenCalledTimes(1));
    expect(container).toBeEmptyDOMElement();

    mockMias.mockRejectedValueOnce(new Error('sin cobertura'));
    rerender(<MisPartidas fecha={(d) => d} competitionId="c-1" userId="ana" version="2" />);
    await waitFor(() => expect(mockMias).toHaveBeenCalledTimes(2));
    expect(container).toBeEmptyDOMElement();
  });

  it('una lectura vieja que llega tarde no pisa a la nueva', async () => {
    let soltarLaVieja;
    mockMias.mockReturnValueOnce(new Promise((r) => (soltarLaVieja = r)));
    mockMias.mockResolvedValueOnce([mia('r2', '2030-10-13', 'AFTERNOON', 1, '12:00', [jugador('ana', 'bea'), jugador('bea', 'ana')])]);
    const { rerender } = render(<MisPartidas fecha={(d) => d} competitionId="c-1" userId="ana" version="1" />);
    rerender(<MisPartidas fecha={(d) => d} competitionId="c-1" userId="ana" version="2" />);
    expect(await screen.findByTestId('mi-partida-r2')).toBeInTheDocument();

    await act(async () => soltarLaVieja([mia('r1', '2030-10-12', 'MORNING', 2, '08:10', [jugador('ana', 'bea'), jugador('bea', 'ana')])]));

    expect(screen.getByTestId('mi-partida-r2')).toBeInTheDocument();
    expect(screen.queryByTestId('mi-partida-r1')).toBeNull();
  });

  it('se relee cuando cambia la versión (plazas, partidas)', async () => {
    mockMias.mockResolvedValue([]);
    const { rerender } = render(<MisPartidas fecha={(d) => d} competitionId="c-1" userId="ana" version="1" />);
    await waitFor(() => expect(mockMias).toHaveBeenCalledTimes(1));

    rerender(<MisPartidas fecha={(d) => d} competitionId="c-1" userId="ana" version="2" />);

    await waitFor(() => expect(mockMias).toHaveBeenCalledTimes(2));
  });
});
