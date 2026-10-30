import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

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
const mockFormar = vi.fn();
const mockDeshacer = vi.fn();

vi.mock('../../composition', () => ({
  getCompetitionDetailUseCase: { execute: (...a) => mockDetalle(...a) },
  getScheduleUseCase: { execute: (...a) => mockAgenda(...a) },
  getCompetitionGolfCoursesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  listEnrollmentsUseCase: { execute: (...a) => mockInscripciones(...a) },
  assignTeamsUseCase: { execute: (...a) => mockFormar(...a) },
  undoTeamsUseCase: { execute: (...a) => mockDeshacer(...a) },
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

import customToast from '../../utils/toast';
const SchedulePage = (await import('./SchedulePage')).default;

const COMPETICION = {
  hasTeams: true,
  id: 'comp-1',
  name: 'Ryder de los amigos',
  status: 'CLOSED',
  creatorId: 'org',
  team1Name: 'Europa',
  team2Name: 'América',
  maxPlayingHandicap: null,
  captains: { teamA: null, teamB: null, viceTeamA: null, viceTeamB: null },
};
const EQUIPOS = { teamAPlayerIds: ['ana'], teamBPlayerIds: ['bea'], mode: 'DRAFT' };
const INSCRITOS = [
  { userId: 'ana', userName: 'Ana Alba', status: 'APPROVED' },
  { userId: 'bea', userName: 'Bea Blanco', status: 'APPROVED' },
];
const CON_PARTIDOS = [{ id: 'r1', matches: [{ id: 'm1' }] }];

const pintar = () =>
  render(
    <MemoryRouter initialEntries={['/creator/competitions/comp-1/schedule']}>
      <Routes>
        <Route path="/creator/competitions/:id/schedule" element={<SchedulePage />} />
      </Routes>
    </MemoryRouter>
  );

const fallo = (errorCode) => Object.assign(new Error('x'), { status: 409, errorCode });

/**
 * Con los equipos formados, quedan así (decidido el 29-30 oct 2026, tabla aprobada).
 *
 * | #  | Qué                                              | Pasa                                       |
 * |----|--------------------------------------------------|--------------------------------------------|
 * | F4 | Con equipos y sin partidos                       | «Deshacer equipos»; con partidos, no       |
 * | F5 | Formar con el draft abierto (DRAFT_IN_PROGRESS)  | «Espera a que termine el draft»            |
 * | F3 | Formar con equipos ya formados (TEAMS_FORMED)    | Aviso y la agenda se relee                 |
 * | F7 | Deshacer: confirmar                              | Se deshacen, se dice y se relee            |
 * | F7 | Deshacer: no confirmar                           | Nada                                       |
 * | F7 | Deshacer con partidos (TEAMS_LOCKED)             | «Ya hay partidos…» y se relee              |
 */
describe('SchedulePage · equipos formados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDetalle.mockResolvedValue(COMPETICION);
    mockAgenda.mockResolvedValue({ days: [], rounds: [], teamAssignment: EQUIPOS });
    mockInscripciones.mockResolvedValue(INSCRITOS);
    mockDeshacer.mockResolvedValue(undefined);
  });

  it('F4: con equipos y sin partidos, el organizador puede deshacerlos', async () => {
    pintar();

    expect(await screen.findByTestId('deshacer-equipos')).toBeInTheDocument();
  });

  it('F4: con partidos, ya no', async () => {
    mockAgenda.mockResolvedValue({ days: [], rounds: CON_PARTIDOS, teamAssignment: EQUIPOS });
    pintar();

    await screen.findByText('Ana Alba');
    expect(screen.queryByTestId('deshacer-equipos')).not.toBeInTheDocument();
  });

  it('F4: en juego, tampoco', async () => {
    mockDetalle.mockResolvedValue({ ...COMPETICION, status: 'IN_PROGRESS' });
    pintar();

    await screen.findByText('Ana Alba');
    expect(screen.queryByTestId('deshacer-equipos')).not.toBeInTheDocument();
  });

  describe('formar equipos', () => {
    beforeEach(() => {
      mockAgenda.mockResolvedValue({ days: [], rounds: [], teamAssignment: null });
    });

    const formar = async () => {
      fireEvent.click(await screen.findByText('teams.assign'));
      const dialogo = await screen.findByRole('dialog');
      fireEvent.click(within(dialogo).getAllByText('teams.assign').at(-1));
    };

    it('F5: con el draft abierto, que espere', async () => {
      mockFormar.mockRejectedValueOnce(fallo('DRAFT_IN_PROGRESS'));
      pintar();

      await formar();

      await waitFor(() => expect(customToast.error).toHaveBeenCalledWith('errors.waitForDraft'));
    });

    it('F3: si ya estaban formados, se dice y se relee', async () => {
      mockFormar.mockRejectedValueOnce(fallo('TEAMS_FORMED'));
      pintar();
      await screen.findByText('teams.assign');
      const lecturas = mockAgenda.mock.calls.length;

      await formar();

      await waitFor(() => expect(customToast.error).toHaveBeenCalledWith('errors.teamsFormed'));
      await waitFor(() => expect(mockAgenda.mock.calls.length).toBeGreaterThan(lecturas));
    });
  });

  describe('F7 · deshacer', () => {
    const pulsarDeshacer = async () => {
      fireEvent.click(await screen.findByTestId('deshacer-equipos'));
      return screen.findByText('teams.undoConfirm.body');
    };

    it('confirmando, se deshacen, se dice y se relee', async () => {
      pintar();
      await pulsarDeshacer();
      const lecturas = mockAgenda.mock.calls.length;

      fireEvent.click(screen.getByText('teams.undoConfirm.confirm'));

      await waitFor(() => expect(mockDeshacer).toHaveBeenCalledWith('comp-1'));
      await waitFor(() => expect(customToast.success).toHaveBeenCalledWith('success.teamsUndone'));
      await waitFor(() => expect(mockAgenda.mock.calls.length).toBeGreaterThan(lecturas));
    });

    it('la confirmación dice qué se borra', async () => {
      pintar();
      await pulsarDeshacer();

      expect(screen.getByText('teams.undoConfirm.title')).toBeInTheDocument();
      expect(screen.getByText('teams.undoConfirm.keep')).toBeInTheDocument();
    });

    it('sin confirmar, nada', async () => {
      pintar();
      await pulsarDeshacer();

      fireEvent.click(screen.getByText('teams.undoConfirm.keep'));

      await waitFor(() =>
        expect(screen.queryByText('teams.undoConfirm.body')).not.toBeInTheDocument()
      );
      expect(mockDeshacer).not.toHaveBeenCalled();
    });

    it('si ya hay partidos, se dice y se relee', async () => {
      mockDeshacer.mockRejectedValueOnce(fallo('TEAMS_LOCKED'));
      pintar();
      await pulsarDeshacer();
      const lecturas = mockAgenda.mock.calls.length;

      fireEvent.click(screen.getByText('teams.undoConfirm.confirm'));

      await waitFor(() => expect(customToast.error).toHaveBeenCalledWith('errors.teamsLocked'));
      await waitFor(() => expect(mockAgenda.mock.calls.length).toBeGreaterThan(lecturas));
    });
  });
});
