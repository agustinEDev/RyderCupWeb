import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * Sin la lista de inscritos, «vacía» no es «no hay nadie» (31 oct 2026).
 *
 * | #  | Caso                                         | Queda                                   |
 * |----|----------------------------------------------|-----------------------------------------|
 * | E1 | Falla la lista al cargar la agenda           | Un toast de error                       |
 * | E2 | Abrir el reparto así                         | Manual desactivado; automático, sí      |
 * | E3 | Panel de equipos así                         | Sin «Nombrar capitán»; si falta uno, aviso de recargar |
 * | E4 | La lista carga bien                          | Ni toast ni aviso                       |
 * | E5 | Una recarga posterior la trae (la de la página o la de «Generar» bloqueado) | Vuelve todo y se va el toast |
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

// El mismo componente en cada acceso, como el de verdad: uno nuevo cada vez
// hacía que React volviera a montar el modal en cada render y perdiera su estado
// Las props de animación no son atributos del DOM: se quitan por nombre
vi.mock('framer-motion', () => {
  const DE_ANIMACION = new Set(['initial', 'animate', 'exit', 'transition']);
  const Div = ({ children, ...props }) => (
    <div {...Object.fromEntries(Object.entries(props).filter(([k]) => !DE_ANIMACION.has(k)))}>
      {children}
    </div>
  );
  return { motion: new Proxy({}, { get: () => Div }) };
});

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
const mockGenerar = vi.fn();

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
  generateMatchesUseCase: { execute: (...a) => mockGenerar(...a) },
  updateMatchStatusUseCase: { execute: vi.fn() },
  declareWalkoverUseCase: { execute: vi.fn() },
  reassignPlayersUseCase: { execute: vi.fn() },
  getMatchDetailUseCase: { execute: vi.fn() },
  resetEnvelopesUseCase: { execute: (...a) => mockRehacer(...a) },
}));

const SchedulePage = (await import('./SchedulePage')).default;
const customToast = (await import('../../utils/toast')).default;

const COMPETICION = {
  hasTeams: true,
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

const FALLO = new Error('Network Error');
const SIN_CAPITAN_A = { ...COMPETICION, captains: { ...COMPETICION.captains, teamA: null } };

describe('SchedulePage · sin poder cargar los inscritos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockDetalle.mockResolvedValue(COMPETICION);
    mockAgenda.mockResolvedValue(AGENDA);
    mockInscripciones.mockRejectedValue(FALLO);
  });

  it('E1: lo dice con un toast, una vez', async () => {
    pintar();

    await screen.findByTestId('deshacer-equipos');
    expect(customToast.error).toHaveBeenCalledTimes(1);
    expect(customToast.error).toHaveBeenCalledWith('errors.failedToLoadEnrollments', {
      id: 'inscritos-sin-cargar',
    });
  });

  it('E2: el reparto se abre con el manual desactivado y el automático disponible', async () => {
    mockAgenda.mockResolvedValue({ ...AGENDA, teamAssignment: null });
    pintar();

    fireEvent.click(await screen.findByRole('button', { name: 'teams.assign' }));
    const dialogo = await screen.findByRole('dialog');

    expect(within(dialogo).getByDisplayValue('manual')).toBeDisabled();
    expect(within(dialogo).getByDisplayValue('automatic')).not.toBeDisabled();
    expect(within(dialogo).getByTestId('reparto-inscritos-sin-cargar')).toHaveTextContent(
      'teams.enrollmentsNotLoaded'
    );
  });

  it('E3: con los dos capitanes, no se ofrece nombrar a nadie', async () => {
    pintar();

    await screen.findByTestId('deshacer-equipos');
    expect(screen.queryByTestId('cubrir-capitan-A')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cubrir-capitan-B')).not.toBeInTheDocument();
    expect(screen.queryByTestId('capitan-inscritos-sin-cargar-A')).not.toBeInTheDocument();
    expect(screen.queryByTestId('capitan-inscritos-sin-cargar-B')).not.toBeInTheDocument();
  });

  it('E3b: si falta uno de verdad, el aviso de recargar en vez del botón', async () => {
    mockDetalle.mockResolvedValue(SIN_CAPITAN_A);
    pintar();

    expect(await screen.findByTestId('capitan-inscritos-sin-cargar-A')).toHaveTextContent(
      'teams.fillCaptainNeedsEnrollments'
    );
    expect(screen.queryByTestId('cubrir-capitan-A')).not.toBeInTheDocument();
    expect(screen.queryByTestId('capitan-inscritos-sin-cargar-B')).not.toBeInTheDocument();
  });

  it('E4: si cargan, ni toast ni aviso, y el botón de siempre', async () => {
    mockDetalle.mockResolvedValue(SIN_CAPITAN_A);
    mockInscripciones.mockResolvedValue(INSCRITOS);
    pintar();

    expect(await screen.findByTestId('cubrir-capitan-A')).toBeInTheDocument();
    expect(customToast.error).not.toHaveBeenCalled();
    expect(screen.queryByTestId('capitan-inscritos-sin-cargar-A')).not.toBeInTheDocument();
  });

  it('E4b: y el reparto se abre con el manual disponible y sin aviso', async () => {
    mockAgenda.mockResolvedValue({ ...AGENDA, teamAssignment: null });
    mockInscripciones.mockResolvedValue(INSCRITOS);
    pintar();

    fireEvent.click(await screen.findByRole('button', { name: 'teams.assign' }));
    const dialogo = await screen.findByRole('dialog');

    expect(within(dialogo).getByDisplayValue('manual')).not.toBeDisabled();
    expect(within(dialogo).queryByTestId('reparto-inscritos-sin-cargar')).not.toBeInTheDocument();
  });

  it('E5: una recarga que sí los trae lo devuelve todo', async () => {
    mockDetalle.mockResolvedValue(SIN_CAPITAN_A);
    mockInscripciones.mockRejectedValueOnce(FALLO).mockResolvedValue(INSCRITOS);
    mockRehacer.mockResolvedValue({ envelopesRemoved: 0, matchesRemoved: 0 });
    pintar();
    await screen.findByTestId('capitan-inscritos-sin-cargar-A');

    // Rehacer los sobres recarga la página entera
    fireEvent.click(await screen.findByTestId('rehacer-sobres-ronda-1'));
    fireEvent.click(await screen.findByTestId('confirmar-rehacer-sobres'));

    expect(await screen.findByTestId('cubrir-capitan-A')).toBeInTheDocument();
    expect(screen.queryByTestId('capitan-inscritos-sin-cargar-A')).not.toBeInTheDocument();
    // Y el toast de «recarga la página» se va: ya no hace falta
    expect(customToast.dismiss).toHaveBeenCalledWith('inscritos-sin-cargar');
  });

  it('E5b: también la que hace «Generar» cuando vuelve bloqueado', async () => {
    // Esa recarga relee las inscripciones (G7c en los sobres)
    mockDetalle.mockResolvedValue({ ...SIN_CAPITAN_A, setupMode: 'MANUAL' });
    mockInscripciones.mockRejectedValueOnce(FALLO).mockResolvedValue(INSCRITOS);
    mockGenerar.mockRejectedValue(
      Object.assign(new Error('No se pueden generar'), { errorCode: 'MATCH_GENERATION_BLOCKED' })
    );
    pintar();
    await screen.findByTestId('capitan-inscritos-sin-cargar-A');

    fireEvent.click(await screen.findByTitle('matches.generate'));
    fireEvent.click(await screen.findByTestId('generate-submit'));

    expect(await screen.findByTestId('cubrir-capitan-A')).toBeInTheDocument();
    expect(screen.queryByTestId('capitan-inscritos-sin-cargar-A')).not.toBeInTheDocument();
    // Y el toast de «recarga la página» se va: ya no hace falta
    expect(customToast.dismiss).toHaveBeenCalledWith('inscritos-sin-cargar');
  });
});
