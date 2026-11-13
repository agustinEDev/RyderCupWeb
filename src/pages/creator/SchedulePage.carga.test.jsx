import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * La carga de la agenda vive en su efecto: lo de siempre, y lo que llega
 * tarde ya no toca nada.
 *
 *   #      caso                                         | qué pasa
 *   -------|--------------------------------------------|------------------------------
 *   T1-11  la competición no se puede cargar           | el aviso, y a la ficha
 *   T1-12  cambiar de idioma con la agenda cargada     | se pide otra vez (como hoy)
 *   T1-13  se vuelve a pedir antes de que llegue la vieja | la vieja no pisa ni avisa ni navega
 *   T1-14  se sale con la carga pidiéndose y falla     | ni aviso ni se lleva a nadie a la ficha
 */
// `t` estable salvo cuando la prueba cambia de idioma: con uno nuevo en cada
// pintado la carga, que depende de `t`, se relanzaría sin parar
const tBase = (clave, params) => {
  if (params?.team) return `${clave}_${params.team}`;
  if (params?.count !== undefined) return `${clave}_${params.count}`;
  return clave;
};
const IDIOMA = { actual: { i18n: { language: 'es' }, t: tBase } };
vi.mock('react-i18next', () => ({ useTranslation: () => IDIOMA.actual }));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => ({ children, ...props }) => <div {...props}>{children}</div> }),
}));

vi.mock('../../components/layout/HeaderAuth', () => ({ default: () => null }));
// Constantes, no objetos nuevos en cada render: la carga de esta pantalla
// depende del usuario, así que devolver uno distinto cada vez la relanza sin
// parar (ya nos pasó el 22 sep con `useAuth` en otra pantalla)
const SESION = { user: { id: 'org' }, loading: false };
const ROLES = { isAdmin: false, isCreator: true, isLoading: false };
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => SESION }));
vi.mock('../../hooks/useUserRoles', () => ({ useUserRoles: () => ROLES }));
vi.mock('../../components/ui/FullScreenLoader', () => ({ default: () => null }));
vi.mock('../../utils/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn(), dismiss: vi.fn() },
}));

const mockDetalle = vi.fn();
const mockAgenda = vi.fn();
const mockInscripciones = vi.fn();
const mockCubrir = vi.fn();
const mockRehacer = vi.fn();

vi.mock('../../composition', () => ({
  getCompetitionDetailUseCase: { execute: (...a) => mockDetalle(...a) },
  getScheduleUseCase: { execute: (...a) => mockAgenda(...a) },
  getCompetitionGolfCoursesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  listEnrollmentsUseCase: { execute: (...a) => mockInscripciones(...a) },
  assignTeamsUseCase: { execute: vi.fn() },
  fillCaptainUseCase: { execute: (...a) => mockCubrir(...a) },
  createRoundUseCase: { execute: vi.fn() },
  updateRoundUseCase: { execute: vi.fn() },
  deleteRoundUseCase: { execute: vi.fn() },
  generateMatchesUseCase: { execute: vi.fn() },
  updateMatchStatusUseCase: { execute: vi.fn() },
  declareWalkoverUseCase: { execute: vi.fn() },
  reassignPlayersUseCase: { execute: vi.fn() },
  getMatchDetailUseCase: { execute: vi.fn() },
  resetEnvelopesUseCase: { execute: (...a) => mockRehacer(...a) },
}));

const SchedulePage = (await import('./SchedulePage')).default;
const { default: customToast } = await import('../../utils/toast');

const COMPETICION = {
  id: 'comp-1',
  name: 'Ryder de los amigos',
  status: 'CLOSED',
  creatorId: 'org',
  team1Name: 'Europa',
  team2Name: 'América',
  maxPlayingHandicap: null,
  setupMode: 'RYDER_CUP',
  captains: { teamA: 'org', teamB: 'bea', viceTeamA: null, viceTeamB: null },
};

const RONDA = {
  id: 'ronda-1',
  roundNumber: 1,
  roundDate: '2026-06-01',
  sessionType: 'MORNING',
  matchFormat: 'SINGLES',
  status: 'PENDING_MATCHES',
  matches: [],
};

const AGENDA = {
  days: [{ date: '2026-06-01', rounds: [RONDA] }],
  rounds: [RONDA],
  teamAssignment: { teamAPlayerIds: ['org', 'carla'], teamBPlayerIds: ['bea', 'eva'] },
};

const INSCRITOS = [
  { userId: 'org', userName: 'Olga Organiza', status: 'APPROVED' },
  { userId: 'carla', userName: 'Carla Cruz', status: 'APPROVED' },
  { userId: 'bea', userName: 'Bea Blanco', status: 'APPROVED' },
  { userId: 'eva', userName: 'Eva Esteban', status: 'APPROVED' },
];

const arbol = () => (
  <MemoryRouter initialEntries={['/competitions/comp-1/schedule']}>
    <Routes>
      <Route path="/competitions/:id/schedule" element={<SchedulePage />} />
      <Route path="/competitions/:id" element={<p>LA FICHA</p>} />
    </Routes>
  </MemoryRouter>
);

// Una respuesta que llega cuando la prueba quiere
const aMano = () => {
  let resolver;
  let rechazar;
  const promesa = new Promise((res, rej) => {
    resolver = res;
    rechazar = rej;
  });
  return { promesa, resolver, rechazar };
};

describe('SchedulePage · la carga de la agenda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    IDIOMA.actual = { i18n: { language: 'es' }, t: tBase };
    mockDetalle.mockResolvedValue(COMPETICION);
    mockAgenda.mockResolvedValue(AGENDA);
    mockInscripciones.mockResolvedValue(INSCRITOS);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('T1-11: si la competición no se puede cargar, lo dice y lleva a su ficha', async () => {
    // Given la competición falla
    mockDetalle.mockRejectedValue(new Error('sin red'));

    // When se abre la agenda
    render(arbol());

    // Then el aviso y a la ficha
    expect(await screen.findByText('LA FICHA')).toBeInTheDocument();
    expect(customToast.error).toHaveBeenCalledWith('errors.failedToLoadSchedule');
  });

  it('T1-12: cambiar de idioma vuelve a pedir la agenda (como hoy)', async () => {
    // Given la agenda cargada
    const { rerender } = render(arbol());
    await screen.findByText('Ryder de los amigos');
    expect(mockDetalle).toHaveBeenCalledTimes(1);

    // When cambia el idioma
    IDIOMA.actual = { i18n: { language: 'en' }, t: (...a) => tBase(...a) };
    rerender(arbol());

    // Then se pide otra vez
    await waitFor(() => expect(mockDetalle).toHaveBeenCalledTimes(2));
    expect(mockAgenda).toHaveBeenCalledTimes(2);
    expect(mockInscripciones).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('Ryder de los amigos')).toBeInTheDocument();
  });

  it('T1-13: con la agenda pidiéndose otra vez, la anterior que llega tarde no la pisa', async () => {
    const { rerender } = render(arbol());
    await screen.findByText('Ryder de los amigos');
    const vieja = aMano();
    const nueva = aMano();
    mockDetalle.mockReturnValueOnce(vieja.promesa).mockReturnValueOnce(nueva.promesa);
    IDIOMA.actual = { i18n: { language: 'en' }, t: (...a) => tBase(...a) };
    rerender(arbol());
    await waitFor(() => expect(mockDetalle).toHaveBeenCalledTimes(2));
    IDIOMA.actual = { i18n: { language: 'es' }, t: (...a) => tBase(...a) };
    rerender(arbol());
    await waitFor(() => expect(mockDetalle).toHaveBeenCalledTimes(3));

    await act(async () => nueva.resolver({ ...COMPETICION, name: 'Ryder Nueva' }));
    expect(await screen.findByText('Ryder Nueva')).toBeInTheDocument();
    await act(async () => vieja.rechazar(new Error('vieja')));

    expect(screen.getByText('Ryder Nueva')).toBeInTheDocument();
    expect(screen.queryByText('LA FICHA')).toBeNull();
    expect(customToast.error).not.toHaveBeenCalled();
  });

  it('T1-13: y si la anterior llega bien pero tarde, tampoco la pisa', async () => {
    const { rerender } = render(arbol());
    await screen.findByText('Ryder de los amigos');
    const vieja = aMano();
    const nueva = aMano();
    mockDetalle.mockReturnValueOnce(vieja.promesa).mockReturnValueOnce(nueva.promesa);
    IDIOMA.actual = { i18n: { language: 'en' }, t: (...a) => tBase(...a) };
    rerender(arbol());
    await waitFor(() => expect(mockDetalle).toHaveBeenCalledTimes(2));
    IDIOMA.actual = { i18n: { language: 'es' }, t: (...a) => tBase(...a) };
    rerender(arbol());
    await waitFor(() => expect(mockDetalle).toHaveBeenCalledTimes(3));

    await act(async () => nueva.resolver({ ...COMPETICION, name: 'Ryder Nueva' }));
    expect(await screen.findByText('Ryder Nueva')).toBeInTheDocument();
    await act(async () => vieja.resolver({ ...COMPETICION, name: 'Ryder Vieja' }));

    expect(screen.getByText('Ryder Nueva')).toBeInTheDocument();
    expect(screen.queryByText('Ryder Vieja')).toBeNull();
  });

  it('T1-14: si se sale con la carga pidiéndose y luego falla, ni avisa ni navega', async () => {
    // Given la competición pidiéndose
    const tarde = aMano();
    mockDetalle.mockReturnValueOnce(tarde.promesa);
    const { unmount } = render(arbol());
    await waitFor(() => expect(mockDetalle).toHaveBeenCalledTimes(1));

    // When se sale y luego falla
    unmount();
    await act(async () => tarde.rechazar(new Error('tarde')));

    // Then no toca nada
    expect(customToast.error).not.toHaveBeenCalled();
  });
});
