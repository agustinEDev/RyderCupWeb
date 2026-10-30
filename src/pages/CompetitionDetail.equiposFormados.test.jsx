import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import CompetitionDetail from './CompetitionDetail';
import es from '../i18n/locales/es/competitions.json';
import en from '../i18n/locales/en/competitions.json';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'es' },
    t: (key, params) => {
      if (params?.count !== undefined) return `${key}_${params.count}`;
      if (params?.handicap !== undefined) return `${key}_${params.handicap}`;
      if (params?.fecha !== undefined) return `${key}_${params.fecha}`;
      return key;
    },
  }),
}));

const mockAuthUser = { id: 'org-1', first_name: 'Org', last_name: 'Aniza' };

// Refrescar la sesión crea un `user` nuevo con el mismo id: se simula dando
// uno nuevo en cada render (CodeRabbit en la #720)
let userCambiante = false;
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: userCambiante ? { ...mockAuthUser } : mockAuthUser,
    loading: false,
  }),
}));

vi.mock('../hooks/useUserRoles', () => ({
  useUserRoles: () => ({
    isAdmin: false,
    isCreator: false,
    isLoading: false,
  }),
}));

vi.mock('../components/layout/HeaderAuth', () => ({
  default: ({ backTo }) => <div data-testid="header-auth" data-back-to={backTo}>Header</div>,
}));

const mockVersionDeFranjas = vi.fn();
vi.mock('../components/competition/FranjasDeLaCompeticion', () => ({
  default: ({ version }) => {
    mockVersionDeFranjas(version);
    return <div data-testid="franjas" />;
  },
}));

vi.mock('../components/competition/CompetitionGolfCoursesSection', () => ({
  default: () => <div data-testid="golf-courses-section" />,
}));

const mockGetCompetitionDetail = vi.fn().mockResolvedValue({
  id: 'comp-1',
  name: 'Summer Cup',
  status: 'ACTIVE',
  creatorId: 'creator-1',
  maxPlayers: 20,
  countries: [],
  visibility: 'PUBLIC',
});

const mockCloseEnrollments = vi.fn();
const orden = [];
const mockRequest = vi.fn(async () => orden.push('plaza'));
const mockGuardarGenero = vi.fn(async () => orden.push('genero'));
const mockRefrescarSesion = vi.fn(async () => orden.push('sesion'));
let faltaGenero = true;
vi.mock('../hooks/useGeneroParaApuntarse', () => ({
  useGeneroParaApuntarse: () => ({
    falta: faltaGenero,
    guardar: mockGuardarGenero,
    refrescar: mockRefrescarSesion,
  }),
}));
const mockDelete = vi.fn();
const mockCancel = vi.fn();
const mockAssignTeams = vi.fn();
const mockRevertToInProgress = vi.fn();

const mockListEnrollments = vi.fn().mockResolvedValue([
  {
    id: 'enrollment-1',
    status: 'APPROVED',
    userName: 'Jugador Uno',
    userHandicap: 18.4,
    hasCustomHandicap: false,
    customHandicap: null,
    team: null,
  },
]);

const mockSetNamePreference = vi.fn().mockResolvedValue({});
const mockSetCustomHandicap = vi.fn().mockResolvedValue({});
const mockRemoveCustomHandicap = vi.fn().mockResolvedValue({});

vi.mock('../composition', () => ({
  getCompetitionDetailUseCase: { execute: (...args) => mockGetCompetitionDetail(...args) },
  getCompetitionGolfCoursesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  activateCompetitionUseCase: { execute: vi.fn() },
  closeEnrollmentsUseCase: { execute: (...args) => mockCloseEnrollments(...args) },
  startCompetitionUseCase: { execute: vi.fn() },
  completeCompetitionUseCase: { execute: vi.fn() },
  cancelCompetitionUseCase: { execute: (...args) => mockCancel(...args) },
  deleteCompetitionUseCase: { execute: (...args) => mockDelete(...args) },
  reopenEnrollmentsUseCase: { execute: vi.fn() },
  revertCompetitionStatusUseCase: { execute: vi.fn() },
  revertCompetitionToInProgressUseCase: { execute: (...args) => mockRevertToInProgress(...args) },
  listEnrollmentsUseCase: { execute: (...args) => mockListEnrollments(...args) },
  requestEnrollmentUseCase: { execute: (...args) => mockRequest(...args) },
  approveEnrollmentUseCase: { execute: (...args) => mockAprobar(...args) },
  rejectEnrollmentUseCase: { execute: vi.fn() },
  removeEnrolledPlayerUseCase: { execute: (...args) => mockQuitar(...args) },
  assignTeamsUseCase: { execute: (...args) => mockAssignTeams(...args) },
  setCustomHandicapUseCase: { execute: (...args) => mockSetCustomHandicap(...args) },
  removeCustomHandicapUseCase: { execute: (...args) => mockRemoveCustomHandicap(...args) },
  setNamePreferenceUseCase: { execute: (...args) => mockSetNamePreference(...args) },
}));

const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('../utils/toast', () => ({ default: mockToast }));
const mockQuitar = vi.fn();
const mockAprobar = vi.fn();



const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/competitions/comp-1']}>
      <Routes>
        <Route path="/competitions/:id" element={<CompetitionDetail />} />
      </Routes>
    </MemoryRouter>
  );

/**
 * Con los equipos formados, quedan así (decidido el 29-30 oct 2026, tabla aprobada).
 *
 * | #  | Quién y qué                                    | Ve                                          |
 * |----|------------------------------------------------|---------------------------------------------|
 * | F1 | Jugador inscrito (no el organizador)           | «Si no puedes jugar, avisa al organizador»  |
 * | F2 | Jugador sin inscribir, pública abierta         | Sin «Pedir plaza»: «ya están formados»      |
 * | F3 | 409 TEAMS_FORMED al apuntarse                  | Aviso y la ficha se relee                   |
 * | F3 | 409 TEAMS_FORMED al aprobar una solicitud      | Aviso para el organizador y se relee        |
 * | F6 | Texto de quitar con equipos                    | Equipos, draft y sobres; repetir el draft   |
 */
const FICHA = {
  id: 'comp-1',
  name: 'Copa X',
  status: 'ACTIVE',
  creatorId: 'org-1',
  maxPlayers: 20,
  countries: [],
  visibility: 'PUBLIC',
  teamsAssigned: true,
};

const pinta = async ({ ficha = {}, usuario = 'u-pedro', inscritos = [] } = {}) => {
  Object.assign(mockAuthUser, { id: usuario });
  mockGetCompetitionDetail.mockResolvedValue({ ...FICHA, ...ficha });
  mockListEnrollments.mockResolvedValue(inscritos);
  renderPage();
  await screen.findByText('Copa X');
};

const fallo = (errorCode) => Object.assign(new Error('x'), { status: 409, errorCode });

describe('CompetitionDetail · equipos formados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    faltaGenero = false;
  });

  describe('F1 · el inscrito', () => {
    it('ve que avise al organizador si no puede jugar', async () => {
      await pinta({ ficha: { enrollment_status: 'APPROVED' } });

      expect(screen.getByText('detail.teamsFormed.enrolled')).toBeInTheDocument();
    });

    it.each(['REQUESTED', 'REJECTED', 'WITHDRAWN', 'CANCELLED'])(
      'con la inscripción %s, no: no está dentro (revisor)',
      async (estado) => {
        await pinta({ ficha: { enrollment_status: estado } });

        expect(screen.queryByText('detail.teamsFormed.enrolled')).not.toBeInTheDocument();
      }
    );

    it('sin equipos formados, no', async () => {
      await pinta({ ficha: { enrollment_status: 'APPROVED', teamsAssigned: false } });

      expect(screen.queryByText('detail.teamsFormed.enrolled')).not.toBeInTheDocument();
    });

    it('el organizador inscrito, tampoco: él es quien quita', async () => {
      await pinta({ usuario: 'org-1', ficha: { enrollment_status: 'APPROVED' } });

      expect(screen.queryByText('detail.teamsFormed.enrolled')).not.toBeInTheDocument();
    });
  });

  describe('F2 · quien no está dentro', () => {
    it('no puede pedir plaza: se le dice que ya están formados', async () => {
      await pinta();

      expect(screen.queryByText('detail.actions.request-to-join')).not.toBeInTheDocument();
      expect(screen.getByText('detail.teamsFormed.closed')).toBeInTheDocument();
    });

    it('sin equipos formados, pide plaza como siempre', async () => {
      await pinta({ ficha: { teamsAssigned: false } });

      expect(screen.getByText('detail.actions.request-to-join')).toBeInTheDocument();
      expect(screen.queryByText('detail.teamsFormed.closed')).not.toBeInTheDocument();
    });
  });

  describe('F3 · el 409 TEAMS_FORMED', () => {
    it('al apuntarse: aviso y se relee la ficha', async () => {
      mockRequest.mockRejectedValueOnce(fallo('TEAMS_FORMED'));
      // La ficha estaba vieja: se veía sin equipos
      await pinta({ ficha: { teamsAssigned: false } });
      fireEvent.click(screen.getByText('detail.actions.request-to-join'));
      const confirmar = await screen.findByText('competitions:enrollment.confirm');
      const lecturas = mockGetCompetitionDetail.mock.calls.length;

      fireEvent.click(confirmar);

      await waitFor(() =>
        expect(mockToast.error).toHaveBeenCalledWith('detail.errors.teamsFormed')
      );
      await waitFor(() =>
        expect(mockGetCompetitionDetail.mock.calls.length).toBeGreaterThan(lecturas)
      );
    });

    it('al aprobar una solicitud: aviso para el organizador y se relee', async () => {
      mockAprobar.mockRejectedValueOnce(fallo('TEAMS_FORMED'));
      await pinta({
        usuario: 'org-1',
        inscritos: [
          { id: 'enr-ana', userId: 'u-ana', status: 'REQUESTED', userName: 'Ana Ruiz', team: null },
        ],
      });
      const aprobar = await screen.findByTitle('detail.approve');
      const lecturas = mockGetCompetitionDetail.mock.calls.length;

      fireEvent.click(aprobar);

      await waitFor(() =>
        expect(mockToast.error).toHaveBeenCalledWith('detail.errors.teamsFormedOrganizer')
      );
      await waitFor(() =>
        expect(mockGetCompetitionDetail.mock.calls.length).toBeGreaterThan(lecturas)
      );
    });
  });

  it('F6: quitar con equipos avisa de que se borran equipos, draft y sobres', () => {
    expect(es.detail.confirmDialogs.removeWithTeams.body).toContain(
      'Se borrarán los equipos, el draft y los sobres; habrá que repetir el draft.'
    );
    expect(en.detail.confirmDialogs.removeWithTeams.body).toContain('the draft and the envelopes');
  });
});
