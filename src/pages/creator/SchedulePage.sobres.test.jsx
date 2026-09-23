import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * El acceso al sobre desde el calendario (FE #655).
 *
 * El capitán entra por aquí a poner su orden para cada sesión, y esta pantalla
 * la ven también los que no organizan: la ruta pública `/competitions/:id/schedule`
 * monta el mismo componente. Quien no capitanea nada no tiene sobre que
 * entregar, así que no se le ofrece.
 */
// `t` y el objeto que devuelve `useTranslation`, ESTABLES: la carga de la
// pantalla es un `useCallback` que depende de `t`, así que devolviendo una
// función nueva en cada render se recargaba sin parar —247 veces en 400 ms— y
// el diálogo se volvía a montar entre dos pulsaciones
const t = (clave, params) => {
  if (params?.team) return `${clave}_${params.team}`;
  if (params?.count !== undefined) return `${clave}_${params.count}`;
  return clave;
};
const traduccion = { i18n: { language: 'es' }, t };
vi.mock('react-i18next', () => ({ useTranslation: () => traduccion }));

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
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

const mockDetalle = vi.fn();
const mockAgenda = vi.fn();
const mockInscripciones = vi.fn();
const mockCubrir = vi.fn();

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
}));

const SchedulePage = (await import('./SchedulePage')).default;

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

const pintar = () =>
  render(
    <MemoryRouter initialEntries={['/competitions/comp-1/schedule']}>
      <Routes>
        <Route path="/competitions/:id/schedule" element={<SchedulePage />} />
      </Routes>
    </MemoryRouter>
  );

describe('SchedulePage · el acceso al sobre (FE #655)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockDetalle.mockResolvedValue(COMPETICION);
    mockAgenda.mockResolvedValue(AGENDA);
    mockInscripciones.mockResolvedValue(INSCRITOS);
  });

  it('O1: el capitán tiene su sobre a un toque desde cada sesión', async () => {
    pintar();

    const enlace = await screen.findByTestId('ir-al-sobre-ronda-1');
    expect(enlace).toHaveAttribute('href', '/competitions/comp-1/rounds/ronda-1/envelope');
  });

  it('O2: quien ni capitanea ni organiza no tiene sobre que entregar', async () => {
    mockDetalle.mockResolvedValue({
      ...COMPETICION,
      creatorId: 'otro',
      captains: { teamA: 'carla', teamB: 'bea', viceTeamA: null, viceTeamB: null },
    });
    pintar();

    await screen.findByText('Ryder de los amigos');
    await waitFor(() =>
      expect(screen.queryByTestId('ir-al-sobre-ronda-1')).not.toBeInTheDocument()
    );
  });

  it('O2b: el organizador también entra: es quien los abre si un capitán no aparece', async () => {
    mockDetalle.mockResolvedValue({
      ...COMPETICION,
      captains: { teamA: 'carla', teamB: 'bea', viceTeamA: null, viceTeamB: null },
      creatorId: 'org',
    });
    pintar();

    expect(await screen.findByTestId('ir-al-sobre-ronda-1')).toBeInTheDocument();
  });

  it('O2c: en una sesión de parejas todavía no: el sobre de parejas no está hecho', async () => {
    // Ofrecerlo mandaría filas de un jugador a una sesión que pide dos, y el
    // capitán se llevaría un error sin entender nada
    mockAgenda.mockResolvedValue({
      ...AGENDA,
      days: [{ date: '2026-06-01', rounds: [{ ...RONDA, matchFormat: 'FOURBALL' }] }],
      rounds: [{ ...RONDA, matchFormat: 'FOURBALL' }],
    });
    pintar();

    await screen.findByText('Ryder de los amigos');
    await waitFor(() =>
      expect(screen.queryByTestId('ir-al-sobre-ronda-1')).not.toBeInTheDocument()
    );
  });

  it('O3: en modo manual no hay sobres', async () => {
    mockDetalle.mockResolvedValue({ ...COMPETICION, setupMode: 'MANUAL' });
    pintar();

    await screen.findByText('Ryder de los amigos');
    await waitFor(() =>
      expect(screen.queryByTestId('ir-al-sobre-ronda-1')).not.toBeInTheDocument()
    );
  });

  it('O4: y sin equipos repartidos tampoco: primero se reparten', async () => {
    mockAgenda.mockResolvedValue({ ...AGENDA, teamAssignment: null });
    pintar();

    await screen.findByText('Ryder de los amigos');
    await waitFor(() =>
      expect(screen.queryByTestId('ir-al-sobre-ronda-1')).not.toBeInTheDocument()
    );
  });
});
