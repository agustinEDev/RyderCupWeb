import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, Link } from 'react-router';
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

const mockAuthUser = { id: 'creator-1', first_name: 'Test', last_name: 'Creator' };

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    loading: false,
  }),
}));

vi.mock('../hooks/useUserRoles', () => ({
  useUserRoles: () => ({
    isAdmin: false,
    isCreator: true,
    isLoading: false,
  }),
}));

vi.mock('../components/layout/HeaderAuth', () => ({
  default: ({ backTo }) => <div data-testid="header-auth" data-back-to={backTo}>Header</div>,
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
});

const mockCloseEnrollments = vi.fn();
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
  requestEnrollmentUseCase: { execute: vi.fn() },
  approveEnrollmentUseCase: { execute: vi.fn() },
  rejectEnrollmentUseCase: { execute: vi.fn() },
  assignTeamsUseCase: { execute: (...args) => mockAssignTeams(...args) },
  setCustomHandicapUseCase: { execute: (...args) => mockSetCustomHandicap(...args) },
  removeCustomHandicapUseCase: { execute: (...args) => mockRemoveCustomHandicap(...args) },
  setNamePreferenceUseCase: { execute: (...args) => mockSetNamePreference(...args) },
}));

vi.mock('../utils/toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import customToast from '../utils/toast';


// Desde FE #705 la ficha ofrece UNA acción y el resto vive en el menú «···»:
// para verlas hay que abrirlo. Tolerante a que no exista, porque algunos casos
// comprueban justo que la acción NO se ofrece
const abrirMenuDeAcciones = () => {
  for (const boton of screen.queryAllByTestId('menu-acciones')) {
    if (boton.getAttribute('aria-expanded') === 'false') fireEvent.click(boton);
  }
};

const renderPage = () => {
  return render(
    <MemoryRouter initialEntries={['/competitions/comp-1']}>
      <Routes>
        <Route path="/competitions/:id" element={<CompetitionDetail />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('CompetitionDetail - edición de hándicap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCompetitionDetail.mockResolvedValue({
      id: 'comp-1',
      name: 'Summer Cup',
      status: 'ACTIVE',
      creatorId: 'creator-1',
      maxPlayers: 20,
      countries: [],
    });
    mockListEnrollments.mockResolvedValue([
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
    mockSetCustomHandicap.mockResolvedValue({});
    mockRemoveCustomHandicap.mockResolvedValue({});
  });

  it('acepta coma como separador decimal y envía el punto al backend', async () => {
    renderPage();

    const editButton = await screen.findByTitle('detail.editHandicap');
    fireEvent.click(editButton);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '12,5' } });

    const saveButton = screen.getByTitle('detail.saveHandicap');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSetCustomHandicap).toHaveBeenCalledWith('comp-1', 'enrollment-1', 12.5);
    });
    expect(customToast.error).not.toHaveBeenCalled();
  });

  it('sigue aceptando el punto como separador decimal', async () => {
    renderPage();

    const editButton = await screen.findByTitle('detail.editHandicap');
    fireEvent.click(editButton);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '12.5' } });

    const saveButton = screen.getByTitle('detail.saveHandicap');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSetCustomHandicap).toHaveBeenCalledWith('comp-1', 'enrollment-1', 12.5);
    });
  });

  it('muestra error de validación si el valor no es un número tras normalizar', async () => {
    renderPage();

    const editButton = await screen.findByTitle('detail.editHandicap');
    fireEvent.click(editButton);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'abc' } });

    const saveButton = screen.getByTitle('detail.saveHandicap');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(customToast.error).toHaveBeenCalledWith('detail.invalidHandicap');
    });
    expect(mockSetCustomHandicap).not.toHaveBeenCalled();
  });

  it('no muestra el botón de editar hándicap si la competición está IN_PROGRESS', async () => {
    mockGetCompetitionDetail.mockResolvedValue({
      id: 'comp-1',
      name: 'Summer Cup',
      status: 'IN_PROGRESS',
      creatorId: 'creator-1',
      maxPlayers: 20,
      countries: [],
    });

    renderPage();

    await waitFor(() => expect(mockListEnrollments).toHaveBeenCalled());
    expect(screen.queryByTitle('detail.editHandicap')).not.toBeInTheDocument();
  });

  it('muestra el botón de revertir a RFEG solo para jugadores españoles con hándicap personalizado', async () => {
    mockListEnrollments.mockResolvedValue([
      {
        id: 'enrollment-1',
        status: 'APPROVED',
        userName: 'Jugador Uno',
        userHandicap: 18.4,
        hasCustomHandicap: true,
        customHandicap: 20.0,
        userCountryCode: 'ES',
        team: null,
      },
    ]);

    renderPage();

    const editButton = await screen.findByTitle('detail.editHandicap');
    fireEvent.click(editButton);

    expect(screen.getByTitle('detail.revertToRfegHandicap')).toBeInTheDocument();
  });

  it('no muestra el botón de revertir a RFEG para jugadores no españoles', async () => {
    mockListEnrollments.mockResolvedValue([
      {
        id: 'enrollment-1',
        status: 'APPROVED',
        userName: 'Jugador Uno',
        userHandicap: 18.4,
        hasCustomHandicap: true,
        customHandicap: 20.0,
        userCountryCode: 'FR',
        team: null,
      },
    ]);

    renderPage();

    const editButton = await screen.findByTitle('detail.editHandicap');
    fireEvent.click(editButton);

    expect(screen.queryByTitle('detail.revertToRfegHandicap')).not.toBeInTheDocument();
  });

  it('al revertir a RFEG llama al use case y recarga los enrollments', async () => {
    mockListEnrollments.mockResolvedValue([
      {
        id: 'enrollment-1',
        status: 'APPROVED',
        userName: 'Jugador Uno',
        userHandicap: 18.4,
        hasCustomHandicap: true,
        customHandicap: 20.0,
        userCountryCode: 'ES',
        team: null,
      },
    ]);

    renderPage();

    const editButton = await screen.findByTitle('detail.editHandicap');
    fireEvent.click(editButton);

    const revertButton = screen.getByTitle('detail.revertToRfegHandicap');
    fireEvent.click(revertButton);

    await waitFor(() => {
      expect(mockRemoveCustomHandicap).toHaveBeenCalledWith('comp-1', 'enrollment-1');
    });
    expect(customToast.error).not.toHaveBeenCalled();
  });
});

describe('CompetitionDetail - reabrir torneo completado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListEnrollments.mockResolvedValue([]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('muestra el botón de reabrir torneo solo cuando el estado es COMPLETED', async () => {
    mockGetCompetitionDetail.mockResolvedValue({
      id: 'comp-1',
      name: 'Summer Cup',
      status: 'COMPLETED',
      creatorId: 'creator-1',
      maxPlayers: 20,
      countries: [],
    });

    renderPage();

    await screen.findByTestId('menu-acciones');
    abrirMenuDeAcciones();
    abrirMenuDeAcciones();
    expect(screen.getByText('detail.actions.revert-to-in-progress')).toBeInTheDocument();
  });

  it('no muestra el botón de reabrir torneo si el estado no es COMPLETED', async () => {
    mockGetCompetitionDetail.mockResolvedValue({
      id: 'comp-1',
      name: 'Summer Cup',
      status: 'IN_PROGRESS',
      creatorId: 'creator-1',
      maxPlayers: 20,
      countries: [],
    });

    renderPage();

    await waitFor(() => expect(mockListEnrollments).toHaveBeenCalled());
    abrirMenuDeAcciones();
    expect(screen.queryByText('detail.actions.revert-to-in-progress')).not.toBeInTheDocument();
  });

  it('al reabrir el torneo llama al use case y actualiza el estado a IN_PROGRESS', async () => {
    mockGetCompetitionDetail.mockResolvedValue({
      id: 'comp-1',
      name: 'Summer Cup',
      status: 'COMPLETED',
      creatorId: 'creator-1',
      maxPlayers: 20,
      countries: [],
    });
    mockRevertToInProgress.mockResolvedValue({
      status: 'IN_PROGRESS',
      updatedAt: '2026-07-09T00:00:00Z',
    });

    renderPage();

    await screen.findByTestId('menu-acciones');
    abrirMenuDeAcciones();
    fireEvent.click(screen.getByText('detail.actions.revert-to-in-progress'));

    await waitFor(() => {
      expect(mockRevertToInProgress).toHaveBeenCalledWith('comp-1');
    });
    expect(customToast.success).toHaveBeenCalledWith('detail.success.revertedToInProgress');
    abrirMenuDeAcciones();
    expect(screen.getByText('detail.actions.complete')).toBeInTheDocument();
  });
});


// FE #571: elegir alias o nombre legal en ESTA competición
describe('CompetitionDetail - alias o nombre real', () => {
  const miInscripcion = (overrides = {}) => ({
    id: 'enrollment-mia',
    status: 'APPROVED',
    userId: 'creator-1',
    userName: 'Chuchi',
    userHandicap: 12.4,
    hasCustomHandicap: false,
    customHandicap: null,
    team: null,
    useRealName: true,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser.alias = 'Chuchi';
    mockAuthUser.first_name = 'Agustín';
    mockAuthUser.last_name = 'Estévez';
    mockGetCompetitionDetail.mockResolvedValue({
      id: 'comp-1',
      name: 'Summer Cup',
      status: 'ACTIVE',
      creatorId: 'creator-1',
      maxPlayers: 20,
      countries: [],
    });
    mockListEnrollments.mockResolvedValue([miInscripcion()]);
    mockSetNamePreference.mockResolvedValue({});
  });

  afterEach(() => {
    // El usuario del mock es compartido por todo el fichero: dejarlo tocado
    // haría pasar por casualidad a cualquier test que se añada detrás
    delete mockAuthUser.alias;
    mockAuthUser.first_name = 'Test';
    mockAuthUser.last_name = 'Creator';
  });

  const encuentraElInterruptor = () => {
    renderPage();
    return screen.findByRole('switch');
  };

  it('sale apagado de fábrica: la competición muestra el nombre legal', async () => {
    const interruptor = await encuentraElInterruptor();

    expect(interruptor).toHaveAttribute('aria-checked', 'false');
    expect(
      screen.getByText('detail.namePreference.helpUsingRealName')
    ).toBeInTheDocument();
  });

  it('sale encendido si el jugador pidió su alias para esta competición', async () => {
    mockListEnrollments.mockResolvedValue([miInscripcion({ useRealName: false })]);

    const interruptor = await encuentraElInterruptor();

    expect(interruptor).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('detail.namePreference.helpUsingAlias')).toBeInTheDocument();
  });

  it.each(['REJECTED', 'CANCELLED', 'WITHDRAWN'])(
    'no lo ofrece en una inscripción %s: ese nombre no se ve en ninguna pantalla',
    async (status) => {
      mockListEnrollments.mockResolvedValue([miInscripcion({ status })]);

      renderPage();

      await waitFor(() => expect(mockListEnrollments).toHaveBeenCalled());
      expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    }
  );

  it('no lo ofrece a quien no tiene alias: las dos opciones pintarían lo mismo', async () => {
    mockAuthUser.alias = null;

    renderPage();

    await waitFor(() => expect(mockListEnrollments).toHaveBeenCalled());
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('no lo ofrece si la inscripción propia no llegó en la lista: sin id no hay PUT', async () => {
    // `competition.enrollment_status` basta para saber que estás inscrito, pero
    // viene sin el id del enrollment
    mockGetCompetitionDetail.mockResolvedValue({
      id: 'comp-1',
      name: 'Summer Cup',
      status: 'ACTIVE',
      creatorId: 'creator-1',
      maxPlayers: 20,
      countries: [],
      enrollment_status: 'APPROVED',
    });
    mockListEnrollments.mockResolvedValue([]);

    renderPage();

    await waitFor(() => expect(mockListEnrollments).toHaveBeenCalled());
    expect(screen.getByText('detail.enrollmentStatus')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('no lo ofrece sobre la inscripción de otro jugador', async () => {
    mockListEnrollments.mockResolvedValue([
      miInscripcion({ id: 'enrollment-ajena', userId: 'otro-jugador', userName: 'Meis' }),
    ]);

    renderPage();

    await waitFor(() => expect(mockListEnrollments).toHaveBeenCalled());
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('guarda la elección y vuelve a pedir la lista, que es quien resuelve el nombre', async () => {
    mockSetNamePreference.mockResolvedValue({ useRealName: false });
    const interruptor = await encuentraElInterruptor();
    mockListEnrollments.mockResolvedValue([
      miInscripcion({ useRealName: false, userName: 'Chuchi' }),
    ]);

    fireEvent.click(interruptor);

    await waitFor(() => {
      expect(mockSetNamePreference).toHaveBeenCalledWith('enrollment-mia', false);
    });
    await waitFor(() => {
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    });
    expect(screen.getByText('Chuchi')).toBeInTheDocument();
    expect(customToast.error).not.toHaveBeenCalled();
  });

  it('si el guardado falla, avisa con el texto traducido y el interruptor se queda donde estaba', async () => {
    mockSetNamePreference.mockRejectedValue(new Error('403 Forbidden'));

    const interruptor = await encuentraElInterruptor();
    fireEvent.click(interruptor);

    await waitFor(() =>
      expect(customToast.error).toHaveBeenCalledWith('detail.namePreference.failed')
    );
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('si lo que falla es recargar la lista, no dice que no se guardó', async () => {
    // El PUT fue bien: el interruptor tiene que reflejarlo, y un aviso de
    // fallo mandaría al jugador a repetir el cambio y dejarlo como estaba
    mockSetNamePreference.mockResolvedValue({ useRealName: false });
    const interruptor = await encuentraElInterruptor();
    mockListEnrollments.mockRejectedValue(new Error('500 Internal Server Error'));

    fireEvent.click(interruptor);

    await waitFor(() => {
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    });
    expect(customToast.error).not.toHaveBeenCalled();
    expect(screen.getByRole('switch')).not.toBeDisabled();
  });

  it('se deshabilita mientras guarda, para que no salgan dos peticiones', async () => {
    let resuelve;
    mockSetNamePreference.mockReturnValue(new Promise((r) => { resuelve = r; }));

    const interruptor = await encuentraElInterruptor();
    fireEvent.click(interruptor);

    await waitFor(() => expect(screen.getByRole('switch')).toBeDisabled());
    fireEvent.click(screen.getByRole('switch'));
    expect(mockSetNamePreference).toHaveBeenCalledTimes(1);

    resuelve({ useRealName: false });
    await waitFor(() => expect(screen.getByRole('switch')).not.toBeDisabled());
  });
});

describe('CompetitionDetail - invitar desde el borrador (FE #660)', () => {
  const conEstado = (status, extra = {}) => {
    mockGetCompetitionDetail.mockResolvedValue({
      id: 'comp-1',
      name: 'Summer Cup',
      status,
      creatorId: 'creator-1',
      maxPlayers: 20,
      countries: [],
      ...extra,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockListEnrollments.mockResolvedValue([]);
  });

  it('en borrador se puede invitar: invitar es lo que abre el torneo', async () => {
    // El servidor ya lo permite (BE #319): la primera invitación abre las
    // inscripciones, así que esconder el botón dejaba el camino nuevo sin puerta
    conEstado('DRAFT');

    renderPage();

    await screen.findByTestId('menu-acciones');
    abrirMenuDeAcciones();
    abrirMenuDeAcciones();
    expect(screen.getByText('detail.actions.manageInvitations')).toBeInTheDocument();
  });

  it('y se avisa de lo que hace, porque no es evidente', async () => {
    conEstado('DRAFT');

    renderPage();

    expect(await screen.findByTestId('invitar-abre-inscripciones')).toBeInTheDocument();
  });

  it('en una competición cancelada no se invita', async () => {
    conEstado('CANCELLED');

    renderPage();

    await screen.findByText('Summer Cup');
    abrirMenuDeAcciones();
    expect(screen.queryByText('detail.actions.manageInvitations')).not.toBeInTheDocument();
  });

  it('con las inscripciones abiertas todavía se edita', async () => {
    // BE #323: la configuración se puede corregir mientras haya inscripciones
    // abiertas, así que «Editar» ya no desaparece al abrir el torneo
    conEstado('ACTIVE');

    renderPage();

    await screen.findByTestId('menu-acciones');
    abrirMenuDeAcciones();
    abrirMenuDeAcciones();
    expect(screen.getByText('detail.actions.edit')).toBeInTheDocument();
  });

  it('borrar no se ofrece si el servidor no lo permite, sea cual sea el estado', async () => {
    // Quién puede y cuándo lo decide el backend (can_delete, RyderCupAM#347):
    // la pantalla ya no copia la lista de estados (FE #667)
    conEstado('ACTIVE');

    renderPage();

    await screen.findByText('Summer Cup');
    abrirMenuDeAcciones();
    expect(screen.queryByText('detail.actions.delete')).not.toBeInTheDocument();
  });

  it('y al cerrarse las inscripciones ya no se edita', async () => {
    conEstado('CLOSED');

    renderPage();

    await screen.findByText('Summer Cup');
    abrirMenuDeAcciones();
    expect(screen.queryByText('detail.actions.edit')).not.toBeInTheDocument();
  });
});


describe('CompetitionDetail - de quién es el torneo (FE #664)', () => {
  const conVisibilidad = (visibility) => {
    mockGetCompetitionDetail.mockResolvedValue({
      id: 'comp-1',
      name: 'Summer Cup',
      status: 'ACTIVE',
      creatorId: 'creator-1',
      maxPlayers: 20,
      countries: [],
      visibility,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockListEnrollments.mockResolvedValue([]);
  });

  it('una privada lo dice: quien la mira tiene que saber si le pueden encontrar', async () => {
    conVisibilidad('PRIVATE');

    renderPage();

    expect(await screen.findByTestId('visibilidad-competicion')).toHaveTextContent(
      'detail.visibilityPrivate'
    );
  });

  it('y una pública también', async () => {
    conVisibilidad('PUBLIC');

    renderPage();

    expect(await screen.findByTestId('visibilidad-competicion')).toHaveTextContent(
      'detail.visibilityPublic'
    );
  });
});


describe('CompetitionDetail - cuándo abre una programada (FE #678)', () => {
  const programada = ({ status = 'DRAFT', dias = 5, creatorId = 'creator-1', isCreator = true } = {}) => {
    mockGetCompetitionDetail.mockResolvedValue({
      id: 'comp-1',
      name: 'Summer Cup',
      status,
      creatorId,
      isCreator,
      maxPlayers: 20,
      countries: [],
      visibility: 'PUBLIC',
      startDate: '2027-06-01',
      endDate: '2027-06-03',
      enrollmentOpensDaysBefore: dias,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockListEnrollments.mockResolvedValue([]);
  });

  it('D1: quien la mira desde fuera ve la fecha en que abre', async () => {
    // Un desconocido veía «Borrador» sin fecha y sin botón: no sabía si algún
    // día podría apuntarse. 5 días antes del 1 de junio es el 27 de mayo
    programada({ creatorId: 'otro', isCreator: false });

    renderPage();

    const aviso = await screen.findByTestId('apertura-programada');
    expect(aviso).toHaveTextContent('detail.enrollmentOpensOn');
    expect(aviso).toHaveTextContent('27');
    expect(aviso).toHaveTextContent(/mayo/);
  });

  it('D2: un borrador sin programar no enseña ninguna fecha', async () => {
    programada({ dias: null });

    renderPage();

    await screen.findByText('Summer Cup');
    expect(screen.queryByTestId('apertura-programada')).not.toBeInTheDocument();
  });

  it('D3: una que ya abrió tampoco, aunque guarde los días', async () => {
    programada({ status: 'ACTIVE' });

    renderPage();

    await screen.findByText('Summer Cup');
    expect(screen.queryByTestId('apertura-programada')).not.toBeInTheDocument();
  });

  it('D4: al creador se le dice que abre sola ese día, y que invitar la adelanta', async () => {
    // Invitar abre cualquier borrador, programado o no (CompetitionPolicy
    // mira solo el estado): el aviso de siempre era cierto, pero se comía la
    // fecha que el organizador acababa de elegir
    programada();

    renderPage();

    const nota = await screen.findByTestId('invitar-abre-inscripciones');
    expect(nota).toHaveTextContent('detail.invitingOpensScheduled');
    expect(nota).toHaveTextContent('27');
  });

  it('D5: y en un borrador sin programar, el aviso de siempre', async () => {
    programada({ dias: null });

    renderPage();

    expect(await screen.findByTestId('invitar-abre-inscripciones')).toHaveTextContent(
      'detail.invitingOpensEnrollment'
    );
  });
});


describe('CompetitionDetail - la vuelta lleva a donde se vino (FE #682)', () => {
  const desde = (state) => {
    mockGetCompetitionDetail.mockResolvedValue({
      id: 'comp-1',
      name: 'Summer Cup',
      status: 'ACTIVE',
      creatorId: 'otro',
      maxPlayers: 20,
      countries: [],
    });
    return render(
      <MemoryRouter initialEntries={[{ pathname: '/competitions/comp-1', state }]}>
        <Routes>
          <Route path="/competitions/:id" element={<CompetitionDetail />} />
          <Route path="/player/invitations" element={<div data-testid="en-invitaciones" />} />
          <Route path="/competitions" element={<div data-testid="en-competiciones" />} />
          <Route path="/browse-competitions" element={<div data-testid="en-explorar" />} />
        </Routes>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockListEnrollments.mockResolvedValue([]);
  });

  it('V1: desde invitaciones, vuelve a invitaciones', async () => {
    desde({ from: 'invitations' });

    fireEvent.click(await screen.findByText('detail.backToInvitations'));

    expect(await screen.findByTestId('en-invitaciones')).toBeInTheDocument();
  });

  it('V2: y la flecha de la cabecera móvil, también', async () => {
    desde({ from: 'invitations' });

    await screen.findByText('Summer Cup');
    expect(screen.getByTestId('header-auth')).toHaveAttribute('data-back-to', '/player/invitations');
  });

  it('V4: desde explorar, a explorar (ya lo hacía, pero no lo vigilaba nadie)', async () => {
    desde({ from: 'browse' });

    fireEvent.click(await screen.findByText('detail.backToBrowse'));

    expect(await screen.findByTestId('en-explorar')).toBeInTheDocument();
  });

  it('V3: sin origen, a competiciones como siempre', async () => {
    desde(undefined);

    fireEvent.click(await screen.findByText('detail.backToCompetitions'));

    expect(await screen.findByTestId('en-competiciones')).toBeInTheDocument();
  });
});


describe('CompetitionDetail - borrar con confirmación (FE #667)', () => {
  const ficha = (extra = {}) => {
    mockGetCompetitionDetail.mockResolvedValue({
      id: 'comp-1',
      name: 'Summer Cup',
      status: 'ACTIVE',
      creatorId: 'creator-1',
      maxPlayers: 20,
      countries: [],
      canDelete: true,
      ...extra,
    });
  };
  const inscritos = (...userIds) =>
    mockListEnrollments.mockResolvedValue(
      userIds.map((userId, i) => ({
        id: `enr-${i}`,
        userId,
        status: 'APPROVED',
        userName: `Jugador ${i}`,
        userHandicap: 10,
        hasCustomHandicap: false,
        customHandicap: null,
        team: null,
      }))
    );
  // Eliminar vive en el menú «···», al final y separado (FE #705)
  const botonEliminar = async () => {
    await screen.findByTestId('menu-acciones');
    abrirMenuDeAcciones();
    return screen.getByTestId('accion-delete');
  };

  // Con el menú ABIERTO: cerrado, «no está» se cumple siempre y el caso no
  // prueba nada (revisión de la FE #707). Si no hay menú es que no queda
  // ninguna acción, y entonces tampoco la de borrar
  const noOfreceEliminar = async () => {
    await screen.findByText('Summer Cup');
    abrirMenuDeAcciones();
    if (screen.queryAllByTestId('menu-acciones').length > 0) {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    }
    expect(screen.queryByTestId('accion-delete')).not.toBeInTheDocument();
  };

  beforeEach(() => {
    vi.clearAllMocks();
    inscritos('creator-1');
  });

  it('B1: si el servidor lo permite, se ofrece también en una abierta', async () => {
    ficha({ status: 'ACTIVE' });

    renderPage();

    expect(await botonEliminar()).toBeInTheDocument();
  });

  it('B1b: y en una cancelada', async () => {
    ficha({ status: 'CANCELLED' });

    renderPage();

    expect(await botonEliminar()).toBeInTheDocument();
  });

  it('B2: si no lo permite, no se ofrece aunque sea un borrador del creador', async () => {
    ficha({ status: 'DRAFT', canDelete: false });

    renderPage();

    await screen.findByText('Summer Cup');
    await noOfreceEliminar();
  });

  it('B3: pulsar «Eliminar» abre la confirmación y todavía no borra nada', async () => {
    ficha();

    renderPage();
    fireEvent.click(await botonEliminar());

    expect(await screen.findByText('detail.deleteModal.title')).toBeInTheDocument();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('B4: cancelar en la confirmación no borra', async () => {
    ficha();

    renderPage();
    fireEvent.click(await botonEliminar());
    fireEvent.click(await screen.findByRole('button', { name: 'detail.deleteModal.keep' }));

    await waitFor(() => expect(screen.queryByText('detail.deleteModal.title')).not.toBeInTheDocument());
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('B5: si no hay nadie más inscrito, lo dice así', async () => {
    ficha();
    inscritos('creator-1');

    renderPage();
    fireEvent.click(await botonEliminar());

    expect(await screen.findByText('detail.deleteModal.nobodyElse')).toBeInTheDocument();
  });

  it('B6: con más gente, dice cuántos pierden su plaza, sin contar a quien borra', async () => {
    // El creador está inscrito desde que la crea: contarlo inflaría el aviso
    ficha();
    inscritos('creator-1', 'jugador-2', 'jugador-3');

    renderPage();
    fireEvent.click(await botonEliminar());

    expect(await screen.findByText('detail.deleteModal.othersLosePlace_2')).toBeInTheDocument();
  });

  it.each([
    // FE #728: un admin que no está inscrito; «más» solo encaja si quien borra está dentro
    ['B6b: quien borra no está inscrito, sin «más»', ['jugador-2', 'jugador-3'], 'detail.deleteModal.playersLosePlace_2'],
    ['B5b: y si no hay nadie inscrito, lo dice así', [], 'detail.deleteModal.nobodyEnrolled'],
  ])('%s', async (_caso, ids, texto) => {
    ficha();
    inscritos(...ids);

    renderPage();
    fireEvent.click(await botonEliminar());

    expect(await screen.findByText(texto)).toBeInTheDocument();
  });

  it('B7: confirmar borra una sola vez, aunque se pulse dos veces', async () => {
    ficha();
    let terminar;
    mockDelete.mockReturnValue(new Promise((resolver) => { terminar = resolver; }));

    renderPage();
    fireEvent.click(await botonEliminar());
    const confirmar = await screen.findByRole('button', { name: 'detail.deleteModal.confirm' });
    fireEvent.click(confirmar);
    fireEvent.click(confirmar);
    terminar();

    await waitFor(() => expect(mockDelete).toHaveBeenCalledTimes(1));
  });

  it('B8: si el borrado falla, avisa con el motivo del servidor y la competición sigue', async () => {
    ficha();
    mockDelete.mockRejectedValue(
      Object.assign(new Error('No se puede eliminar una competición que ya tiene calendario'), { status: 400 })
    );

    renderPage();
    fireEvent.click(await botonEliminar());
    fireEvent.click(await screen.findByRole('button', { name: 'detail.deleteModal.confirm' }));

    await waitFor(() =>
      expect(customToast.error).toHaveBeenCalledWith(
        'No se puede eliminar una competición que ya tiene calendario'
      )
    );
    expect(screen.getByText('Summer Cup')).toBeInTheDocument();
  });

  it('B9: tras cambiar de estado, vuelve a preguntar si se puede borrar', async () => {
    // Las respuestas de los cambios de estado no traen can_delete: quedarse con
    // el de antes diría «se puede» de una que ya no, o al revés (RyderCupAM#347)
    ficha({ status: 'ACTIVE', canDelete: false });
    mockCancel.mockResolvedValue({ status: 'CANCELLED', updatedAt: '2026-09-22T10:00:00Z' });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderPage();
    await screen.findByText('Summer Cup');
    await noOfreceEliminar();

    ficha({ status: 'CANCELLED', canDelete: true });
    abrirMenuDeAcciones();
    fireEvent.click(screen.getByText('detail.actions.cancel'));

    expect(await botonEliminar()).toBeInTheDocument();
  });

  it('B10: si ese refresco falla, deja de ofrecerlo: no se ofrece lo que no se sabe', async () => {
    ficha({ status: 'ACTIVE', canDelete: true });
    mockCancel.mockResolvedValue({ status: 'CANCELLED', updatedAt: '2026-09-22T10:00:00Z' });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderPage();
    expect(await botonEliminar()).toBeInTheDocument();

    mockGetCompetitionDetail.mockRejectedValue(new TypeError('Sin conexión'));
    abrirMenuDeAcciones();
    fireEvent.click(screen.getByText('detail.actions.cancel'));

    await waitFor(noOfreceEliminar);
  });

  it('B11: si no se han podido cargar las inscripciones, no dice que no hay nadie más', async () => {
    // Afirmaría algo que no se ha podido comprobar, y el creador borraría
    // creyendo que no afecta a nadie
    ficha();
    mockListEnrollments.mockRejectedValue(new TypeError('Sin conexión'));

    renderPage();
    fireEvent.click(await botonEliminar());

    expect(await screen.findByText('detail.deleteModal.unknownOthers')).toBeInTheDocument();
    expect(screen.queryByText('detail.deleteModal.nobodyElse')).not.toBeInTheDocument();
  });

  it('B12: una respuesta atrasada del refresco no pisa el estado de ahora', async () => {
    // Dos cambios seguidos: la ficha pedida tras el primero llega tarde, con el
    // estado de entonces, y no puede decidir el botón del estado actual
    ficha({ status: 'ACTIVE', canDelete: false });
    mockCancel.mockResolvedValue({ status: 'CANCELLED', updatedAt: '2026-09-22T10:00:00Z' });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderPage();
    await screen.findByText('Summer Cup');

    // La ficha que llega es la de un estado que ya no es el actual
    mockGetCompetitionDetail.mockResolvedValue({
      id: 'comp-1', name: 'Summer Cup', status: 'CLOSED', creatorId: 'creator-1',
      maxPlayers: 20, countries: [], canDelete: true,
    });
    abrirMenuDeAcciones();
    fireEvent.click(screen.getByText('detail.actions.cancel'));

    await waitFor(() => expect(mockGetCompetitionDetail).toHaveBeenCalledTimes(2));
    await new Promise((r) => setTimeout(r, 50));
    await noOfreceEliminar();
  });

  it('B13: el aviso de «no se ha podido comprobar» no se queda pegado al pasar a otra que sí carga', async () => {
    ficha();
    mockListEnrollments.mockRejectedValueOnce(new TypeError('Sin conexión'));
    render(
      <MemoryRouter initialEntries={['/competitions/comp-1']}>
        <Routes>
          <Route
            path="/competitions/:id"
            element={
              <>
                <CompetitionDetail />
                <Link to="/competitions/comp-2">otra</Link>
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );
    await botonEliminar();

    inscritos('creator-1');
    fireEvent.click(screen.getByText('otra'));
    await waitFor(() => expect(mockListEnrollments).toHaveBeenCalledTimes(2));
    fireEvent.click(await botonEliminar());

    expect(await screen.findByText('detail.deleteModal.nobodyElse')).toBeInTheDocument();
  });
});
