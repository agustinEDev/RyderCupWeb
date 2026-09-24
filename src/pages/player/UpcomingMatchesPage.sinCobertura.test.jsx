/**
 * LA TABLA — «Mis próximos partidos» cuando no se puede preguntar (FE #615).
 *
 *   #   caso                                          | qué se ve
 *   ----|---------------------------------------------|--------------------------------
 *   1   con red                                       | la lista; se guarda y se precarga
 *   2   sin red, con lista guardada                   | lo guardado, y el aviso ámbar
 *   3   sin red, programado y de hoy                  | «Anotar»
 *   3b  con red, programado                           | sin «Anotar», como siempre
 *   4   sin red y nada guardado                       | que no se pudo preguntar; NO
 *       |                                             | «no tienes próximos partidos»
 *
 * La regla de cada caso vive en `partidosSinCobertura` y se prueba allí; esto
 * solo comprueba que la pantalla la usa.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const mockLee = vi.fn();
const mockVista = vi.fn();
vi.mock('../../composition', () => ({
  getUpcomingMatchesUseCase: { executeWithCompleteness: (...a) => mockLee(...a) },
  getScoringViewUseCase: { execute: (...a) => mockVista(...a) },
}));

// El MISMO objeto en cada render: uno nuevo recrea `loadMatches` y el efecto
// vuelve a cargar sin parar
const sesion = { user: { id: 'u-1' }, loading: false };
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => sesion }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'es' } }),
}));

vi.mock('../../components/layout/HeaderAuth', () => ({ default: () => null }));

const { recuerdaLosPartidos, losUltimosPartidos, loQueSeSupo, olvidaTodo } = await import('../../services/loUltimoConocido');
const { olvidaLasPrecargas } = await import('../../services/partidosSinCobertura');
const UpcomingMatchesPage = (await import('./UpcomingMatchesPage')).default;

const HOY = '2026-09-17';

const partido = (extra = {}) => ({
  id: 'm-1',
  competitionId: 'c-1',
  competitionName: 'Ryder Amigos',
  roundDate: HOY,
  sessionType: 'MORNING',
  matchFormat: 'SINGLES',
  status: 'SCHEDULED',
  matchNumber: 1,
  teamAPlayerNames: ['Yo'],
  teamBPlayerNames: ['Rival'],
  ...extra,
});

const pinta = () => render(<MemoryRouter><UpcomingMatchesPage /></MemoryRouter>);

describe('Mis próximos partidos sin cobertura', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 17, 8, 0));
    const guardado = new Map();
    globalThis.localStorage = {
      getItem: (k) => (guardado.has(k) ? guardado.get(k) : null),
      setItem: (k, v) => guardado.set(k, String(v)),
      removeItem: (k) => guardado.delete(k),
    };
    olvidaTodo();
    olvidaLasPrecargas();
    mockLee.mockReset();
    mockVista.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('con red: pinta la lista, la guarda y precarga el partido de hoy', async () => {
    mockLee.mockResolvedValue({ matches: [partido()], complete: true });
    mockVista.mockResolvedValue({ matchId: 'm-1', players: [{ userId: 'u-1' }] });

    pinta();

    expect(await screen.findByTestId('upcoming-match-card')).toBeInTheDocument();
    expect(losUltimosPartidos()).toHaveLength(1);
    await vi.waitFor(() => expect(loQueSeSupo('m-1')).not.toBeNull());
  });

  it('con red, un partido programado no se anota: manda el servidor', async () => {
    mockLee.mockResolvedValue({ matches: [partido()], complete: true });
    mockVista.mockResolvedValue({ matchId: 'm-1', players: [] });

    pinta();

    await screen.findByTestId('upcoming-match-card');
    expect(screen.queryByText('upcomingMatches.scoreMatch')).not.toBeInTheDocument();
    expect(screen.queryByTestId('upcoming-matches-desde-memoria')).not.toBeInTheDocument();
  });

  it('cuando llega la hora de apertura, el botón sale solo (`/code-review`)', async () => {
    // El jugador abre la lista esperando a que abra la anotación. La página se
    // pinta UNA vez y no vuelve a hacerlo: sin un despertador, a la hora en
    // punto el botón sigue sin estar y hay que recargar —en el tee y con mala
    // cobertura—. Aquí la apertura se pone a dos segundos y el despertador de la
    // página, con su segundo de margen, lo dispara el reloj simulado: esperarlo
    // de verdad eran 3 s de un límite de 5, y en el CI con cobertura no cabían.
    // `setInterval` se queda real: es con lo que `findBy` va preguntando. Y el
    // reloj simulado avanza también solo (`shouldAdvanceTime`): Testing Library
    // cierra cada `findBy` con un `setTimeout(0)` que solo adelanta con Jest
    vi.useFakeTimers({
      toFake: ['Date', 'setTimeout', 'clearTimeout'],
      shouldAdvanceTime: true,
    });
    vi.setSystemTime(new Date(2026, 8, 17, 8, 0));
    const abre = new Date(Date.now() + 2000).toISOString();
    mockLee.mockResolvedValue({ matches: [partido({ scoringOpensAt: abre })], complete: true });
    mockVista.mockResolvedValue({ matchId: 'm-1', players: [{ userId: 'u-1' }] });

    pinta();

    await screen.findByTestId('upcoming-match-card');
    expect(screen.queryByText('upcomingMatches.scoreMatch')).not.toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(3000));

    expect(await screen.findByText('upcomingMatches.scoreMatch')).toBeInTheDocument();
  });

  it('sin red y con lista guardada: la enseña, lo avisa y deja anotar el de hoy', async () => {
    recuerdaLosPartidos([partido()]);
    mockLee.mockRejectedValue(new TypeError('Failed to fetch'));

    pinta();

    expect(await screen.findByTestId('upcoming-match-card')).toBeInTheDocument();
    expect(screen.getByTestId('upcoming-matches-desde-memoria')).toHaveTextContent('upcomingMatches.desdeMemoria');
    expect(screen.getByText('upcomingMatches.scoreMatch').closest('a')).toHaveAttribute(
      'href',
      '/player/matches/m-1/scoring'
    );
  });

  it('sin red y sin nada guardado: que no se pudo preguntar, no que no hay partidos', async () => {
    mockLee.mockRejectedValue(new TypeError('Failed to fetch'));

    pinta();

    expect(await screen.findByText('upcomingMatches.sinRespuesta')).toBeInTheDocument();
    expect(screen.queryByText('upcomingMatches.noMatches')).not.toBeInTheDocument();
  });
});
