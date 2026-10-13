/**
 * LA TABLA — «Mis próximos partidos» con tarjetas compactas (FE #845),
 * aprobada el 13 oct 2026:
 *
 *   #   caso                                       | qué se ve
 *   ----|------------------------------------------|----------------------------------------
 *   1   partidos de la Ryder y partidas de stroke  | juntos, por día, franja y hora
 *   2   cada tarjeta                               | el tipo de torneo y el nombre, que lleva
 *       |                                          | a la competición; sin «Ver calendario»
 *   3   Ryder                                      | «Jue 24 sept · Tarde · Fourball»
 *   4   stroke play                                | «Sáb 12 oct · 08:10 · 2.ª partida»
 *   5   con quién                                  | «Tú y Nacho vs Luna y Óscar», «Tú vs
 *       |                                          | Luna»; «Con Bea, Cris y Dani»; solo,
 *       |                                          | «De momento sin compañeros»
 *   6   un único botón                             | «Anotar» si se puede; si no, «Ver tarjeta»
 *   7   estado                                     | solo «En juego»
 *   8   nada de nada                               | el aviso vacío de siempre
 *   9   la Ryder no contesta y no hay nada         | las partidas que sí llegaron; sin ellas,
 *       |                                          | «no se pudo preguntar»
 *   10  partido sin formato                        | no se pinta «formats.null»
 *
 * Y lo que añadió la revisión (Agustín, 13 oct):
 *
 *   6c  partida de stroke play de hoy, sin empezar | «Anotar», con red
 *   9   falla una lista y llega la otra            | lo que llegó, con el aviso de que
 *       |                                          | puede faltar alguno
 *   9c  solo una lista viene de memoria            | «algunos de» los que se vieron
 *   11  Ryder sin rivales todavía                  | «Tú y Nacho vs por decidir»
 *
 * Y lo que añadió `/code-review`:
 *
 *   9d  una lista llega a medias, con algo         | el mismo aviso de que puede faltar
 *   12  me pasaron de partida                      | «Te han pasado a la N.ª partida»
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const mockPartidos = vi.fn();
const mockPartidas = vi.fn();
vi.mock('../../composition', () => ({
  listUserCompetitionsUseCase: { execute: () => Promise.resolve([]) },
  getUpcomingMatchesUseCase: { executeWithCompleteness: (...a) => mockPartidos(...a) },
  getUpcomingTeeGroupsUseCase: { executeWithCompleteness: (...a) => mockPartidas(...a) },
  getScoringViewUseCase: { execute: vi.fn().mockResolvedValue(null) },
  getTeeGroupScoringViewUseCase: { execute: vi.fn().mockResolvedValue(null) },
}));

// El MISMO objeto en cada render: uno nuevo recrea la carga y no para
const sesion = { user: { id: 'u-1' }, loading: false };
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => sesion }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, p) => (p ? `${clave} ${JSON.stringify(p)}` : clave),
    i18n: { language: 'es' },
  }),
}));

vi.mock('../../components/layout/HeaderAuth', () => ({ default: () => null }));

const { olvidaTodo, recuerdaLasPartidas } = await import('../../services/loUltimoConocido');
const { olvidaLasPrecargas } = await import('../../services/partidosSinCobertura');
const UpcomingMatchesPage = (await import('./UpcomingMatchesPage')).default;

const partido = (extra = {}) => ({
  id: 'm-1',
  competitionId: 'c-1',
  competitionName: 'Ryder Amigos',
  tournamentType: 'RYDER_CUP',
  roundDate: '2026-09-24',
  sessionType: 'AFTERNOON',
  matchFormat: 'FOURBALL',
  status: 'SCHEDULED',
  matchNumber: 1,
  partnerNames: ['Nacho'],
  opponentNames: ['Luna', 'Óscar'],
  ...extra,
});

const partida = (extra = {}) => ({
  id: 'g-1',
  esPartidaDeFranja: true,
  competitionId: 'c-2',
  competitionName: 'Medal de otoño',
  tournamentType: 'MEDAL',
  roundDate: '2026-10-12',
  sessionType: 'MORNING',
  teeTime: '08:10',
  matchNumber: 2,
  status: 'SCHEDULED',
  partnerNames: ['Bea', 'Cris', 'Dani'],
  ...extra,
});

const responde = ({ partidos = [], partidas = [] } = {}) => {
  mockPartidos.mockResolvedValue({ matches: partidos, complete: true });
  mockPartidas.mockResolvedValue({ matches: partidas, complete: true });
};

const pinta = () => render(<MemoryRouter><UpcomingMatchesPage /></MemoryRouter>);
const tarjetas = async () => screen.findAllByTestId('upcoming-match-card');

describe('Mis próximos partidos · tarjetas (FE #845)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 20, 9, 0));
    const guardado = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k) => (guardado.has(k) ? guardado.get(k) : null),
      setItem: (k, v) => guardado.set(k, String(v)),
      removeItem: (k) => guardado.delete(k),
    });
    olvidaTodo();
    olvidaLasPrecargas();
    mockPartidos.mockReset();
    mockPartidas.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1 · partidos y partidas juntos, por día, franja y hora', async () => {
    responde({
      partidos: [partido({ id: 'ryder-tarde', roundDate: '2026-09-24', sessionType: 'AFTERNOON' })],
      partidas: [
        partida({ id: 'medal-pronto', roundDate: '2026-09-24', sessionType: 'MORNING', teeTime: '08:10' }),
        partida({ id: 'medal-antes', roundDate: '2026-09-22', sessionType: 'AFTERNOON', teeTime: '13:00' }),
      ],
    });

    pinta();

    expect((await tarjetas()).map((t) => t.dataset.id)).toEqual(['medal-antes', 'medal-pronto', 'ryder-tarde']);
  });

  it('2 · el tipo de torneo y el nombre, que lleva a la competición; sin «Ver calendario»', async () => {
    responde({ partidos: [partido()], partidas: [partida()] });

    pinta();

    const [ryder, medal] = await tarjetas();
    expect(within(ryder).getByTestId('tipo-de-torneo')).toHaveTextContent('create.type.RYDER_CUP.title');
    expect(within(medal).getByTestId('tipo-de-torneo')).toHaveTextContent('create.type.MEDAL.title');
    expect(within(ryder).getByRole('link', { name: 'Ryder Amigos' })).toHaveAttribute('href', '/competitions/c-1');
    expect(within(medal).getByRole('link', { name: 'Medal de otoño' })).toHaveAttribute('href', '/competitions/c-2');
    expect(screen.queryByText('upcomingMatches.viewSchedule')).not.toBeInTheDocument();
  });

  it('3 · Ryder: día, sesión y formato, sin hora', async () => {
    responde({ partidos: [partido()] });

    pinta();

    const [ryder] = await tarjetas();
    expect(within(ryder).getByTestId('cuando')).toHaveTextContent('Jue 24 sept · sessions.AFTERNOON · formats.FOURBALL');
  });

  it('4 · stroke play: día, hora y número de partida', async () => {
    responde({ partidas: [partida()] });

    pinta();

    const [medal] = await tarjetas();
    expect(within(medal).getByTestId('cuando')).toHaveTextContent('Lun 12 oct · 08:10 · upcomingMatches.teeGroup {"numero":2}');
  });

  it('4b · stroke play sin hora todavía: día y número', async () => {
    responde({ partidas: [partida({ teeTime: null })] });

    pinta();

    const [medal] = await tarjetas();
    expect(within(medal).getByTestId('cuando')).toHaveTextContent(/^Lun 12 oct · upcomingMatches\.teeGroup/);
  });

  it('5 · con quién: «Tú y Nacho vs Luna y Óscar»', async () => {
    responde({ partidos: [partido()] });

    pinta();

    const [ryder] = await tarjetas();
    expect(within(ryder).getByTestId('con-quien')).toHaveTextContent(
      'upcomingMatches.versus {"nosotros":"upcomingMatches.you y Nacho","ellos":"Luna y Óscar"}'
    );
  });

  it('5b · individual: «Tú vs Luna»', async () => {
    responde({ partidos: [partido({ matchFormat: 'SINGLES', partnerNames: [], opponentNames: ['Luna'] })] });

    pinta();

    const [ryder] = await tarjetas();
    expect(within(ryder).getByTestId('con-quien')).toHaveTextContent(
      'upcomingMatches.versus {"nosotros":"upcomingMatches.you","ellos":"Luna"}'
    );
  });

  it('5c · stroke play: «Con Bea, Cris y Dani»', async () => {
    responde({ partidas: [partida()] });

    pinta();

    const [medal] = await tarjetas();
    expect(within(medal).getByTestId('con-quien')).toHaveTextContent('upcomingMatches.with {"companeros":"Bea, Cris y Dani"}');
  });

  it('5d · solo en su partida: «De momento sin compañeros»', async () => {
    responde({ partidas: [partida({ partnerNames: [] })] });

    pinta();

    const [medal] = await tarjetas();
    expect(within(medal).getByTestId('con-quien')).toHaveTextContent('upcomingMatches.alone');
  });

  it('6 · en juego: un solo botón, «Anotar», a su pantalla', async () => {
    responde({
      partidos: [partido({ status: 'IN_PROGRESS' })],
      partidas: [partida({ status: 'IN_PROGRESS' })],
    });

    pinta();

    const [ryder, medal] = await tarjetas();
    expect(within(ryder).getByRole('link', { name: 'upcomingMatches.scoreMatch' })).toHaveAttribute('href', '/player/matches/m-1/scoring');
    expect(within(medal).getByRole('link', { name: 'upcomingMatches.scoreMatch' })).toHaveAttribute(
      'href',
      '/player/groups/g-1/scoring?competition=c-2'
    );
    expect(within(ryder).queryByText('upcomingMatches.viewCard')).not.toBeInTheDocument();
  });

  it('6b · sin poder anotar todavía: «Ver tarjeta», al mismo sitio', async () => {
    responde({ partidos: [partido()], partidas: [partida()] });

    pinta();

    const [ryder, medal] = await tarjetas();
    expect(within(ryder).getByRole('link', { name: 'upcomingMatches.viewCard' })).toHaveAttribute('href', '/player/matches/m-1/scoring');
    expect(within(medal).getByRole('link', { name: 'upcomingMatches.viewCard' })).toHaveAttribute(
      'href',
      '/player/groups/g-1/scoring?competition=c-2'
    );
    expect(within(ryder).queryByText('upcomingMatches.scoreMatch')).not.toBeInTheDocument();
  });

  it('6c · una partida de stroke play de hoy, sin empezar: «Anotar», con red', async () => {
    responde({ partidas: [partida({ roundDate: '2026-09-20' })] });

    pinta();

    const [medal] = await tarjetas();
    expect(within(medal).getByRole('link', { name: 'upcomingMatches.scoreMatch' })).toBeInTheDocument();
  });

  it('7 · solo se ve el estado «En juego»', async () => {
    responde({ partidos: [partido({ status: 'IN_PROGRESS' })], partidas: [partida()] });

    pinta();

    const [ryder, medal] = await tarjetas();
    expect(within(ryder).getByText('upcomingMatches.inPlay')).toBeInTheDocument();
    expect(within(medal).queryByText('upcomingMatches.inPlay')).not.toBeInTheDocument();
    expect(screen.queryByText(/status\.SCHEDULED/)).not.toBeInTheDocument();
  });

  it('8 · sin partidos ni partidas, el aviso vacío', async () => {
    responde();

    pinta();

    expect(await screen.findByText('upcomingMatches.noMatches')).toBeInTheDocument();
  });

  it('9 · la Ryder no contesta y nada guardado: se enseñan las partidas que sí llegaron', async () => {
    mockPartidos.mockRejectedValue(new TypeError('Failed to fetch'));
    mockPartidas.mockResolvedValue({ matches: [partida()], complete: true });

    pinta();

    expect(await tarjetas()).toHaveLength(1);
    expect(screen.queryByText('upcomingMatches.sinRespuesta')).not.toBeInTheDocument();
    expect(screen.getByTestId('upcoming-matches-incompleta')).toHaveTextContent('upcomingMatches.incompleta');
  });

  it('9 · y al revés: las partidas no contestan y los partidos sí', async () => {
    mockPartidos.mockResolvedValue({ matches: [partido()], complete: true });
    mockPartidas.mockRejectedValue(new TypeError('Failed to fetch'));

    pinta();

    expect(await tarjetas()).toHaveLength(1);
    expect(screen.getByTestId('upcoming-matches-incompleta')).toBeInTheDocument();
  });

  it('9 · contestan las dos: sin aviso', async () => {
    responde({ partidos: [partido()], partidas: [partida()] });

    pinta();

    await tarjetas();
    expect(screen.queryByTestId('upcoming-matches-incompleta')).not.toBeInTheDocument();
  });

  it('9c · solo las partidas vienen de memoria: «algunos de» los que se vieron', async () => {
    recuerdaLasPartidas([partida({ roundDate: '2026-09-21' })]);
    mockPartidos.mockResolvedValue({ matches: [partido()], complete: true });
    mockPartidas.mockRejectedValue(new TypeError('Failed to fetch'));

    pinta();

    expect(await tarjetas()).toHaveLength(2);
    expect(screen.getByTestId('upcoming-matches-desde-memoria')).toHaveTextContent('upcomingMatches.desdeMemoriaParcial');
    expect(screen.queryByTestId('upcoming-matches-incompleta')).not.toBeInTheDocument();
  });

  it('9d · una lista llega a medias, con algo: el mismo aviso', async () => {
    mockPartidos.mockResolvedValue({ matches: [partido()], complete: true });
    mockPartidas.mockResolvedValue({ matches: [partida()], complete: false });

    pinta();

    expect(await tarjetas()).toHaveLength(2);
    expect(screen.getByTestId('upcoming-matches-incompleta')).toBeInTheDocument();
  });

  it('9d · y si la que llega a medias es la de la Ryder, también', async () => {
    mockPartidos.mockResolvedValue({ matches: [partido()], complete: false });
    mockPartidas.mockResolvedValue({ matches: [partida()], complete: true });

    pinta();

    expect(await tarjetas()).toHaveLength(2);
    expect(screen.getByTestId('upcoming-matches-incompleta')).toBeInTheDocument();
  });

  it('9b · no contesta ninguno y nada guardado: no se pudo preguntar', async () => {
    mockPartidos.mockRejectedValue(new TypeError('Failed to fetch'));
    mockPartidas.mockRejectedValue(new TypeError('Failed to fetch'));

    pinta();

    expect(await screen.findByText('upcomingMatches.sinRespuesta')).toBeInTheDocument();
    expect(screen.queryByText('upcomingMatches.noMatches')).not.toBeInTheDocument();
    expect(screen.queryByTestId('upcoming-matches-incompleta')).not.toBeInTheDocument();
  });

  it('10 · un partido sin formato no pinta «formats.null»', async () => {
    responde({ partidos: [partido({ matchFormat: null })] });

    pinta();

    const [ryder] = await tarjetas();
    expect(within(ryder).getByTestId('cuando')).toHaveTextContent('Jue 24 sept · sessions.AFTERNOON');
    expect(within(ryder).getByTestId('cuando')).not.toHaveTextContent('formats');
  });

  it('11 · una Ryder sin rivales todavía: «por decidir», no «Tú vs »', async () => {
    responde({ partidos: [partido({ opponentNames: [] })] });

    pinta();

    const [ryder] = await tarjetas();
    expect(within(ryder).getByTestId('con-quien')).toHaveTextContent(
      'upcomingMatches.versus {"nosotros":"upcomingMatches.you y Nacho","ellos":"upcomingMatches.toBeDecided"}'
    );
  });
});

describe('Mis próximos partidos · me pasaron de partida (`/code-review`)', () => {
  beforeEach(() => {
    const guardado = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k) => (guardado.has(k) ? guardado.get(k) : null),
      setItem: (k, v) => guardado.set(k, String(v)),
      removeItem: (k) => guardado.delete(k),
    });
    olvidaTodo();
    olvidaLasPrecargas();
  });

  it('12 · se dice en la tarjeta, como en el panel; si no, nada', async () => {
    responde({ partidas: [partida({ broughtIn: true }), partida({ id: 'g-2', matchNumber: 3 })] });

    pinta();

    const [traida, otra] = await tarjetas();
    expect(within(traida).getByTestId('me-pasaron')).toHaveTextContent('nextMatch.broughtIn {"numero":2}');
    expect(within(otra).queryByTestId('me-pasaron')).not.toBeInTheDocument();
  });
});

describe('Mis próximos partidos · una sola lectura de competiciones (FE #845)', () => {
  it('las dos listas reciben las mismas competiciones, leídas una vez', async () => {
    const composicion = await import('../../composition');
    const lista = [{ id: 'c-1', status: 'CLOSED' }];
    const leer = vi.spyOn(composicion.listUserCompetitionsUseCase, 'execute').mockResolvedValue(lista);
    mockPartidos.mockResolvedValue({ matches: [], complete: true });
    mockPartidas.mockResolvedValue({ matches: [], complete: true });

    render(<MemoryRouter><UpcomingMatchesPage /></MemoryRouter>);

    await screen.findByText('upcomingMatches.noMatches');
    expect(leer).toHaveBeenCalledTimes(1);
    expect(mockPartidos).toHaveBeenCalledWith('u-1', lista);
    expect(mockPartidas).toHaveBeenCalledWith('u-1', lista);
  });
});
