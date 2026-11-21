import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import CompetitionDetail from './CompetitionDetail';

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

const mockAuthUser = {
  id: 'player-1',
  first_name: 'Test',
  last_name: 'Player',
};

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
  default: ({ backTo }) => (
    <div data-testid="header-auth" data-back-to={backTo}>
      Header
    </div>
  ),
}));

// El cuadro, con sus casos, se prueba aparte: aquí, cuándo sale y qué recarga
vi.mock('../components/invitation/InvitacionEnLaFicha', () => ({
  default: ({ invitacion, alCambiar, alAceptar }) =>
    invitacion ? (
      <>
        <button
          type="button"
          data-testid="cuadro-invitacion"
          data-id={invitacion.id}
          onClick={alCambiar}
        />
        {/* Aceptarla: el resultado trae la inscripción que crea */}
        <button
          type="button"
          data-testid="aceptar-invitacion"
          onClick={() =>
            alAceptar({
              status: mockEstadoAlAceptar.valor,
              enrollmentId: 'mia-1',
            })
          }
        />
      </>
    ) : null,
}));
// Cómo queda la invitación al aceptarla: dentro, o en lista de espera
const mockEstadoAlAceptar = vi.hoisted(() => ({ valor: 'ACCEPTED' }));
// Las barras de mi inscripción (barras por campo): un campo sin la general
const mockLeerBarras = vi.fn();
vi.mock('../composition/cargarBarras', () => ({
  cargarBarras: () =>
    Promise.resolve({
      getEnrollmentTeesUseCase: { execute: (...a) => mockLeerBarras(...a) },
      changeEnrollmentCourseTeeUseCase: { execute: vi.fn() },
      changeEnrollmentTeeUseCase: { execute: vi.fn() },
      setCompetitionCourseTeeUseCase: { execute: vi.fn() },
    }),
}));
const SIN_BARRA_EN_ALTEA = {
  generalTee: 'YELLOW',
  defaultTee: 'YELLOW',
  courses: [
    {
      golfCourseId: 'g2',
      golfCourseName: 'Altea',
      tee: null,
      source: 'NONE',
      options: ['WHITE'],
    },
  ],
};

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
  getCompetitionDetailUseCase: {
    execute: (...args) => mockGetCompetitionDetail(...args),
  },
  getCompetitionGolfCoursesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  activateCompetitionUseCase: { execute: vi.fn() },
  closeEnrollmentsUseCase: {
    execute: (...args) => mockCloseEnrollments(...args),
  },
  startCompetitionUseCase: { execute: vi.fn() },
  completeCompetitionUseCase: { execute: vi.fn() },
  cancelCompetitionUseCase: { execute: (...args) => mockCancel(...args) },
  deleteCompetitionUseCase: { execute: (...args) => mockDelete(...args) },
  reopenEnrollmentsUseCase: { execute: vi.fn() },
  revertCompetitionStatusUseCase: { execute: vi.fn() },
  revertCompetitionToInProgressUseCase: {
    execute: (...args) => mockRevertToInProgress(...args),
  },
  listEnrollmentsUseCase: {
    execute: (...args) => mockListEnrollments(...args),
  },
  requestEnrollmentUseCase: { execute: (...args) => mockRequest(...args) },
  approveEnrollmentUseCase: { execute: vi.fn() },
  rejectEnrollmentUseCase: { execute: vi.fn() },
  assignTeamsUseCase: { execute: (...args) => mockAssignTeams(...args) },
  setCustomHandicapUseCase: {
    execute: (...args) => mockSetCustomHandicap(...args),
  },
  removeCustomHandicapUseCase: {
    execute: (...args) => mockRemoveCustomHandicap(...args),
  },
  setNamePreferenceUseCase: {
    execute: (...args) => mockSetNamePreference(...args),
  },
}));

vi.mock('../utils/toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

// El estado de navegación, a la vista: la marca de las barras se quita
const VerEstado = () => (
  <output data-testid="estado-de-navegacion">
    {JSON.stringify(useLocation().state ?? null)}
  </output>
);

const renderPage = (estado) => {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: '/competitions/comp-1', state: estado }]}
    >
      <Routes>
        <Route
          path="/competitions/:id"
          element={
            <>
              <CompetitionDetail />
              <VerEstado />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
};

/**
 * El cuadro de mi invitación pendiente en la ficha (release social 2, I1/I2/I12).
 */
const FICHA = {
  id: 'comp-1',
  name: 'Summer Cup',
  status: 'ACTIVE',
  creatorId: 'creator-1',
  maxPlayers: 20,
  countries: [],
  visibility: 'PRIVATE',
  myPendingInvitation: null,
};

describe('CompetitionDetail · mi invitación pendiente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    faltaGenero = false;
  });

  it('I1: con ella, el cuadro con su id', async () => {
    mockGetCompetitionDetail.mockResolvedValue({
      ...FICHA,
      myPendingInvitation: { id: 'inv-1', expiresAt: null },
    });

    renderPage();

    expect(await screen.findByTestId('cuadro-invitacion')).toHaveAttribute(
      'data-id',
      'inv-1',
    );
  });

  it('I2: sin ella, nada', async () => {
    mockGetCompetitionDetail.mockResolvedValue(FICHA);

    renderPage();

    await screen.findByText('Summer Cup');
    expect(screen.queryByTestId('cuadro-invitacion')).not.toBeInTheDocument();
  });

  it('pública con invitación pendiente: el cuadro, y no «Pedir plaza» (/code-review, decidido el 27 oct)', async () => {
    mockGetCompetitionDetail.mockResolvedValue({
      ...FICHA,
      visibility: 'PUBLIC',
      myPendingInvitation: { id: 'inv-1', expiresAt: null },
    });

    renderPage();

    await screen.findByTestId('cuadro-invitacion');
    expect(
      screen.queryByText('detail.actions.request-to-join'),
    ).not.toBeInTheDocument();
  });

  it('pública sin invitación: «Pedir plaza» como siempre', async () => {
    mockGetCompetitionDetail.mockResolvedValue({
      ...FICHA,
      visibility: 'PUBLIC',
    });

    renderPage();

    expect(
      await screen.findByText('detail.actions.request-to-join'),
    ).toBeInTheDocument();
  });

  it('I3/I12: al responder, la ficha se relee; ya sin invitación, el cuadro se va', async () => {
    mockGetCompetitionDetail
      .mockResolvedValueOnce({
        ...FICHA,
        myPendingInvitation: { id: 'inv-1', expiresAt: null },
      })
      .mockResolvedValue({ ...FICHA, enrollment_status: 'APPROVED' });
    renderPage();

    fireEvent.click(await screen.findByTestId('cuadro-invitacion'));

    await waitFor(() =>
      expect(screen.queryByTestId('cuadro-invitacion')).not.toBeInTheDocument(),
    );
    expect(mockGetCompetitionDetail).toHaveBeenCalledTimes(2);
  });
});

/**
 * Tras aceptar, la ficha pide la barra de los campos que no tienen la general
 * (barras por campo, F1): es la pantalla que queda a la vista. Dos vías:
 * aceptando en su cuadro, o llegando de «Mis invitaciones».
 */
describe('CompetitionDetail · las barras que faltan tras aceptar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    faltaGenero = false;
    mockEstadoAlAceptar.valor = 'ACCEPTED';
    mockLeerBarras.mockResolvedValue(SIN_BARRA_EN_ALTEA);
  });

  it('2+3: aceptada pero en lista de espera, no se pregunta ni se leen', async () => {
    mockEstadoAlAceptar.valor = 'ON_HOLD';
    mockGetCompetitionDetail.mockResolvedValue({
      ...FICHA,
      myPendingInvitation: { id: 'inv-1', expiresAt: null },
    });
    renderPage();

    fireEvent.click(await screen.findByTestId('aceptar-invitacion'));

    await waitFor(() =>
      expect(mockGetCompetitionDetail).toHaveBeenCalledTimes(2),
    );
    expect(mockLeerBarras).not.toHaveBeenCalledWith('mia-1');
  });

  it('aceptando en su cuadro: relee la ficha y pregunta por el campo', async () => {
    mockGetCompetitionDetail.mockResolvedValue({
      ...FICHA,
      myPendingInvitation: { id: 'inv-1', expiresAt: null },
    });
    renderPage();

    fireEvent.click(await screen.findByTestId('aceptar-invitacion'));

    expect(
      await screen.findByText('competitions:tees.chooseOnCourse', {
        selector: 'h2#barra-pendiente-titulo',
      }),
    ).toBeInTheDocument();
    expect(mockLeerBarras).toHaveBeenCalledWith('mia-1');
    expect(mockGetCompetitionDetail).toHaveBeenCalledTimes(2);
  });

  it('llegando de «Mis invitaciones»: pregunta por el campo, una vez', async () => {
    mockGetCompetitionDetail.mockResolvedValue({
      ...FICHA,
      enrollment_status: 'APPROVED',
    });
    mockListEnrollments.mockResolvedValue([
      { id: 'mia-1', userId: 'player-1', status: 'APPROVED' },
    ]);
    renderPage({ from: 'invitations', preguntarBarras: true });

    expect(
      await screen.findByText('competitions:tees.chooseOnCourse', {
        selector: 'h2#barra-pendiente-titulo',
      }),
    ).toBeInTheDocument();
    expect(
      mockLeerBarras.mock.calls.filter(([id]) => id === 'mia-1').length,
    ).toBeGreaterThanOrEqual(1);
    // «Ahora no»: no vuelve a salir
    fireEvent.click(screen.getByText('competitions:tees.notNow'));
    await waitFor(() =>
      expect(
        screen.queryByText('competitions:tees.chooseOnCourse', {
          selector: 'h2#barra-pendiente-titulo',
        }),
      ).not.toBeInTheDocument(),
    );
  });

  it('sin la marca de navegación, no se pregunta nada', async () => {
    mockGetCompetitionDetail.mockResolvedValue({
      ...FICHA,
      enrollment_status: 'APPROVED',
    });
    mockListEnrollments.mockResolvedValue([
      { id: 'mia-1', userId: 'player-1', status: 'APPROVED' },
    ]);
    renderPage();

    await screen.findByText('Summer Cup');
    expect(
      screen.queryByText('competitions:tees.chooseOnCourse', {
        selector: 'h2#barra-pendiente-titulo',
      }),
    ).not.toBeInTheDocument();
  });

  it('8: la marca se quita siempre al llegar, también sin nada que preguntar', async () => {
    mockGetCompetitionDetail.mockResolvedValue(FICHA);
    mockListEnrollments.mockResolvedValue([]);
    renderPage({ from: 'invitations', preguntarBarras: true });

    await screen.findByText('Summer Cup');
    await waitFor(() =>
      expect(
        screen.getByTestId('estado-de-navegacion').textContent,
      ).not.toContain('preguntarBarras'),
    );
    expect(screen.getByTestId('estado-de-navegacion').textContent).toContain(
      'invitations',
    );
    expect(mockLeerBarras).not.toHaveBeenCalled();
  });

  it('8: con la marca en falso (en lista de espera), tampoco se pregunta y se quita', async () => {
    mockGetCompetitionDetail.mockResolvedValue({
      ...FICHA,
      enrollment_status: 'APPROVED',
    });
    mockListEnrollments.mockResolvedValue([
      { id: 'mia-1', userId: 'player-1', status: 'APPROVED' },
    ]);
    renderPage({ from: 'invitations', preguntarBarras: false });

    await screen.findByText('Summer Cup');
    await waitFor(() =>
      expect(
        screen.getByTestId('estado-de-navegacion').textContent,
      ).not.toContain('preguntarBarras'),
    );
    expect(
      screen.queryByText('competitions:tees.chooseOnCourse', {
        selector: 'h2#barra-pendiente-titulo',
      }),
    ).not.toBeInTheDocument();
  });

  it('6: cerrar las barras de OTRO jugador no relee las mías', async () => {
    mockGetCompetitionDetail.mockResolvedValue({
      ...FICHA,
      creatorId: 'player-1',
      enrollment_status: 'APPROVED',
    });
    mockListEnrollments.mockResolvedValue([
      { id: 'mia-1', userId: 'player-1', status: 'APPROVED' },
      { id: 'otra-1', userId: 'otra', userName: 'Otra', status: 'APPROVED' },
    ]);
    renderPage();

    await screen.findByTestId('mis-barras');
    const mias = () =>
      mockLeerBarras.mock.calls.filter(([id]) => id === 'mia-1').length;
    const antes = mias();
    fireEvent.click(await screen.findByTestId('barras-de-otra'));
    await waitFor(() => expect(mockLeerBarras).toHaveBeenCalledWith('otra-1'));
    fireEvent.click(screen.getByText('competitions:tees.close'));
    await new Promise((r) => setTimeout(r, 20));
    expect(mias()).toBe(antes);
  });

  it.each(['COMPLETED', 'CANCELLED'])(
    'cerrada (%s): ni se pregunta por los campos ni «Mis barras» avisa',
    async (status) => {
      mockGetCompetitionDetail.mockResolvedValue({
        ...FICHA,
        status,
        enrollment_status: 'APPROVED',
      });
      mockListEnrollments.mockResolvedValue([
        { id: 'mia-1', userId: 'player-1', status: 'APPROVED' },
      ]);
      renderPage({ from: 'invitations', preguntarBarras: true });

      await screen.findByTestId('mis-barras');
      await waitFor(() =>
        expect(
          screen.getByTestId('estado-de-navegacion').textContent,
        ).not.toContain('preguntarBarras'),
      );
      expect(
        screen.queryByText('competitions:tees.chooseOnCourse', {
          selector: 'h2#barra-pendiente-titulo',
        }),
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId('elige-barra-g2')).not.toBeInTheDocument();
    },
  );
});
