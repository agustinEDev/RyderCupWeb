import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import CompetitionDetail from './CompetitionDetail';

/**
 * Nombrar a los capitanes desde la ficha (FE #692).
 *
 * Nadie quiere pulsar «Cerrar inscripciones»; nombrar a los capitanes sí es algo
 * que el organizador quiere hacer, y en el servidor es lo que cierra las
 * inscripciones (RyderCupAM#320). Así que el botón sustituye al viejo. Con un
 * número impar el servidor avisa y deja seguir: aquí se enseña el aviso y no se
 * intenta el reparto automático, que con impares fallaría.
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'es' },
    t: (key, params) => {
      if (params?.count !== undefined) return `${key}_${params.count}`;
      if (params?.team !== undefined) return `${key}_${params.team}`;
      return key;
    },
  }),
}));

const mockAuthUser = { id: 'org', first_name: 'Olga', last_name: 'Organiza' };
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockAuthUser, loading: false }),
}));

let mockRoles = { isAdmin: false, isCreator: true, isLoading: false };
vi.mock('../hooks/useUserRoles', () => ({ useUserRoles: () => mockRoles }));

vi.mock('../components/layout/HeaderAuth', () => ({ default: () => <div /> }));
vi.mock('../components/competition/CompetitionGolfCoursesSection', () => ({
  default: () => <div />,
}));

const mockGetCompetitionDetail = vi.fn();
const mockListEnrollments = vi.fn();
const mockNameCaptains = vi.fn();
const mockAssignTeams = vi.fn();
const mockCloseEnrollments = vi.fn();

vi.mock('../composition', () => ({
  getCompetitionDetailUseCase: { execute: (...a) => mockGetCompetitionDetail(...a) },
  getCompetitionGolfCoursesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  // Una sesión: sin ninguna, iniciar no se ofrece (FE #710)
  getScheduleUseCase: {
    execute: vi.fn().mockResolvedValue({
      teamAssignment: null,
      rounds: [{ id: 'r1', roundDate: '2026-10-03', sessionType: 'MORNING', matchFormat: 'SINGLES', status: 'PENDING_TEAMS', matches: [] }],
    }),
  },
  activateCompetitionUseCase: { execute: vi.fn() },
  closeEnrollmentsUseCase: { execute: (...a) => mockCloseEnrollments(...a) },
  nameCaptainsUseCase: { execute: (...a) => mockNameCaptains(...a) },
  startCompetitionUseCase: { execute: vi.fn() },
  completeCompetitionUseCase: { execute: vi.fn() },
  cancelCompetitionUseCase: { execute: vi.fn() },
  deleteCompetitionUseCase: { execute: vi.fn() },
  reopenEnrollmentsUseCase: { execute: vi.fn() },
  revertCompetitionStatusUseCase: { execute: vi.fn() },
  revertCompetitionToInProgressUseCase: { execute: vi.fn() },
  listEnrollmentsUseCase: { execute: (...a) => mockListEnrollments(...a) },
  requestEnrollmentUseCase: { execute: vi.fn() },
  approveEnrollmentUseCase: { execute: vi.fn() },
  rejectEnrollmentUseCase: { execute: vi.fn() },
  assignTeamsUseCase: { execute: (...a) => mockAssignTeams(...a) },
  setCustomHandicapUseCase: { execute: vi.fn() },
  removeCustomHandicapUseCase: { execute: vi.fn() },
  setNamePreferenceUseCase: { execute: vi.fn() },
}));

vi.mock('../utils/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
import customToast from '../utils/toast';

const inscrito = (userId, userName) => ({
  id: `enr-${userId}`,
  userId,
  status: 'APPROVED',
  userName,
  userHandicap: 10,
  hasCustomHandicap: false,
  customHandicap: null,
  team: null,
});

const INSCRITOS = [
  inscrito('org', 'Olga Organiza'),
  inscrito('ana', 'Ana Alba'),
  inscrito('bea', 'Bea Blanco'),
  inscrito('carla', 'Carla Cruz'),
];

const competicion = (extra = {}) => ({
  id: 'comp-1',
  name: 'Ryder de los amigos',
  status: 'ACTIVE',
  creatorId: 'org',
  maxPlayers: 20,
  countries: [],
  team1Name: 'Europa',
  team2Name: 'América',
  teamAssignment: 'MANUAL',
  captains: { teamA: null, teamB: null, viceTeamA: null, viceTeamB: null },
  ...extra,
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/competitions/comp-1']}>
      <Routes>
        <Route path="/competitions/:id" element={<CompetitionDetail />} />
      </Routes>
    </MemoryRouter>
  );


// Desde FE #705 la ficha ofrece UNA acción y el resto vive en el menú «···»:
// para tocarlas hay que abrirlo primero. Tolerante a que no exista, porque
// algunos casos comprueban justo que la acción NO se ofrece
const abrirMenuDeAcciones = () => {
  for (const boton of screen.queryAllByTestId('menu-acciones')) {
    if (boton.getAttribute('aria-expanded') === 'false') fireEvent.click(boton);
  }
};

const abrirModal = async (boton = 'detail.actions.nameCaptains') => {
  // La acción puede ser la principal o vivir en el menú: se espera a que la
  // ficha haya cargado y se abre el menú por si acaso
  try {
    await screen.findByTestId('menu-acciones');
  } catch {
    // Una ficha sin menú: la acción estará suelta, o no estará
  }
  abrirMenuDeAcciones();
  fireEvent.click(await screen.findByText(boton));
  return screen.findByRole('dialog');
};

const elegir = (modal, equipo, userId) =>
  fireEvent.change(within(modal).getByLabelText(`detail.captains.teamLabel_${equipo}`), {
    target: { value: userId },
  });

const confirmar = (modal) =>
  fireEvent.click(within(modal).getByRole('button', { name: 'detail.captains.confirm' }));

describe('CompetitionDetail · nombrar a los capitanes (FE #692)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoles = { isAdmin: false, isCreator: true, isLoading: false };
    mockGetCompetitionDetail.mockResolvedValue(competicion());
    mockListEnrollments.mockResolvedValue(INSCRITOS);
    mockNameCaptains.mockResolvedValue({
      id: 'comp-1',
      status: 'CLOSED',
      captains: { teamA: 'ana', teamB: 'bea' },
      totalPlayers: 4,
      unevenTeams: false,
    });
    mockAssignTeams.mockResolvedValue({});
  });

  it('K1: con las inscripciones abiertas, «Nombrar capitanes» sustituye a «Cerrar inscripciones»', async () => {
    renderPage();

    await screen.findByTestId('menu-acciones');
    abrirMenuDeAcciones();
    abrirMenuDeAcciones();
    expect(screen.getByText('detail.actions.nameCaptains')).toBeInTheDocument();
    abrirMenuDeAcciones();
    expect(screen.queryByText('detail.actions.close-enrollments')).not.toBeInTheDocument();
  });

  it('K1b: los desplegables llevan el hándicap que cuenta en la competición (#710)', async () => {
    mockListEnrollments.mockResolvedValue([
      { ...inscrito('ana', 'Ana Alba'), userHandicap: 18 },
      { ...inscrito('bea', 'Bea Blanco'), userHandicap: 30, hasCustomHandicap: true, customHandicap: 5 },
      { ...inscrito('carla', 'Carla Cruz'), userHandicap: null },
    ]);
    renderPage();
    const modal = await abrirModal();

    const desplegable = within(modal).getByLabelText('detail.captains.teamLabel_Europa');
    const textos = within(desplegable).getAllByRole('option').slice(1).map((o) => o.textContent);
    expect(textos).toEqual(['Bea Blanco (5.0)', 'Ana Alba (18.0)', 'Carla Cruz']);
  });

  it.each([
    ['K1c: con plazas libres (4 de 20), lo principal es invitar', () => {}, 'detail.actions.manageInvitations'],
    [
      'K1d: sin la lista de inscritos no se sabe si quedan: nombrarlos, como antes',
      () => mockListEnrollments.mockRejectedValue(new Error('boom')),
      'detail.actions.nameCaptains',
    ],
  ])('%s (#710)', async (_caso, montar, principal) => {
    montar();
    renderPage();

    expect(await screen.findByTestId('accion-principal')).toHaveTextContent(principal);
  });

  it('K2: quien no organiza no lo ve', async () => {
    mockRoles = { isAdmin: false, isCreator: false, isLoading: false };
    mockGetCompetitionDetail.mockResolvedValue(competicion({ creatorId: 'otra' }));
    renderPage();

    await screen.findByText('Ryder de los amigos');
    abrirMenuDeAcciones();
    expect(screen.queryByText('detail.actions.nameCaptains')).not.toBeInTheDocument();
  });

  it('K3: el modal ofrece a los aprobados, el organizador incluido, con el nombre de cada equipo', async () => {
    renderPage();
    const modal = await abrirModal();

    const selectorA = within(modal).getByLabelText('detail.captains.teamLabel_Europa');
    const opciones = within(selectorA).getAllByRole('option').map((o) => o.textContent);
    // Con su hándicap detrás (#710)
    expect(opciones).toEqual(
      expect.arrayContaining(['Olga Organiza (10.0)', 'Ana Alba (10.0)', 'Bea Blanco (10.0)', 'Carla Cruz (10.0)'])
    );
    expect(within(modal).getByLabelText('detail.captains.teamLabel_América')).toBeInTheDocument();
  });

  it('K4: no se confirma hasta tener a los dos, y el elegido en un equipo no se ofrece en el otro', async () => {
    renderPage();
    const modal = await abrirModal();
    const boton = within(modal).getByRole('button', { name: 'detail.captains.confirm' });

    expect(boton).toBeDisabled();
    elegir(modal, 'Europa', 'ana');
    expect(boton).toBeDisabled();
    const anaEnB = within(within(modal).getByLabelText('detail.captains.teamLabel_América'))
      .getByRole('option', { name: 'Ana Alba (10.0)' });
    expect(anaEnB).toBeDisabled();
    elegir(modal, 'América', 'bea');
    expect(boton).toBeEnabled();
  });

  it('K4b: aunque se fuerce el mismo jugador en los dos, no se puede confirmar', async () => {
    renderPage();
    const modal = await abrirModal();
    elegir(modal, 'Europa', 'ana');
    elegir(modal, 'América', 'ana');

    expect(within(modal).getByRole('button', { name: 'detail.captains.confirm' })).toBeDisabled();
  });

  it('K5: con las inscripciones abiertas, avisa de que nombrarlos las cierra', async () => {
    renderPage();
    const modal = await abrirModal();

    expect(within(modal).getByText('detail.captains.closesEnrollment')).toBeInTheDocument();
  });

  it('K6: al confirmar los nombra, cierra y la ficha pasa a «Cambiar capitanes»', async () => {
    renderPage();
    const modal = await abrirModal();
    elegir(modal, 'Europa', 'ana');
    elegir(modal, 'América', 'bea');

    confirmar(modal);

    await waitFor(() =>
      expect(mockNameCaptains).toHaveBeenCalledWith('comp-1', { teamA: 'ana', teamB: 'bea' })
    );
    expect(customToast.success).toHaveBeenCalledWith('detail.success.captainsNamed');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await screen.findByTestId('menu-acciones');
    abrirMenuDeAcciones();
    abrirMenuDeAcciones();
    expect(screen.getByText('detail.actions.changeCaptains')).toBeInTheDocument();
    abrirMenuDeAcciones();
    expect(screen.queryByText('detail.actions.nameCaptains')).not.toBeInTheDocument();
    // Y la lista marca a las recién nombradas, sin esperar a recargar
    expect(screen.getByText('detail.captains.captainOf_Europa')).toBeInTheDocument();
    expect(screen.getByText('detail.captains.captainOf_América')).toBeInTheDocument();
  });

  it('K7: con impares enseña el aviso y no intenta el reparto automático', async () => {
    mockGetCompetitionDetail.mockResolvedValue(competicion({ teamAssignment: 'AUTOMATIC' }));
    mockNameCaptains.mockResolvedValue({
      id: 'comp-1',
      status: 'CLOSED',
      captains: { teamA: 'ana', teamB: 'bea' },
      totalPlayers: 5,
      unevenTeams: true,
    });
    renderPage();
    const modal = await abrirModal();
    elegir(modal, 'Europa', 'ana');
    elegir(modal, 'América', 'bea');

    confirmar(modal);

    await waitFor(() => expect(customToast.warning).toHaveBeenCalledWith('detail.captains.uneven_5'));
    expect(mockAssignTeams).not.toHaveBeenCalled();
  });

  it.each([
    ['AUTOMATIC', 1],
    ['MANUAL', 0],
  ])('K8: con números pares y reparto %s, se reparte solo si es automático', async (modo, veces) => {
    mockGetCompetitionDetail.mockResolvedValue(competicion({ teamAssignment: modo }));
    renderPage();
    const modal = await abrirModal();
    elegir(modal, 'Europa', 'ana');
    elegir(modal, 'América', 'bea');

    confirmar(modal);

    await waitFor(() => expect(customToast.success).toHaveBeenCalledWith('detail.success.captainsNamed'));
    expect(mockAssignTeams).toHaveBeenCalledTimes(veces);
    if (veces) expect(mockAssignTeams).toHaveBeenCalledWith('comp-1', { mode: 'AUTOMATIC' });
  });

  it('K8c: el reparto automático lo decide el modo configurado, no el que se hizo', async () => {
    // Una automática rehecha a mano: al reabrir y volver a cerrar, los que
    // entraron después también tienen que quedar repartidos
    mockGetCompetitionDetail.mockResolvedValue(
      competicion({ teamAssignment: 'AUTOMATIC', actualTeamAssignment: 'MANUAL' })
    );
    renderPage();
    const modal = await abrirModal();
    elegir(modal, 'Europa', 'ana');
    elegir(modal, 'América', 'bea');

    confirmar(modal);

    await waitFor(() => expect(mockAssignTeams).toHaveBeenCalledWith('comp-1', { mode: 'AUTOMATIC' }));
  });

  it('K8e: al volver a cerrar una reabierta, también decide el modo configurado', async () => {
    // El botón de cerrar solo sale reabierta y con equipos: justo el caso en
    // que el reparto real puede ser MANUAL en una competición automática
    mockGetCompetitionDetail.mockResolvedValue(
      competicion({ teamAssignment: 'AUTOMATIC', actualTeamAssignment: 'MANUAL', teamsAssigned: true })
    );
    mockCloseEnrollments.mockResolvedValue({ id: 'comp-1', status: 'CLOSED' });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'detail.actions.close-enrollments' }));
    // Se confirma en el modal de la app (FE #730)
    fireEvent.click(await screen.findByTestId('confirm-modal-confirm'));

    await waitFor(() => expect(mockAssignTeams).toHaveBeenCalledWith('comp-1', { mode: 'AUTOMATIC' }));
  });

  it.each([
    ['con reparto hecho, enseña el que se hizo', { actualTeamAssignment: 'DRAFT' }, 'DRAFT'],
    ['sin reparto, enseña el configurado', { actualTeamAssignment: null }, 'MANUAL'],
  ])('K8d: %s', async (_caso, extra, esperado) => {
    mockGetCompetitionDetail.mockResolvedValue(competicion(extra));
    renderPage();

    const etiqueta = await screen.findByText('detail.settings.teamAssignment');
    expect(etiqueta.parentElement).toHaveTextContent(esperado);
  });

  it('K8b: si falla el reparto automático, los capitanes y el cierre se quedan', async () => {
    // Venía del botón viejo: el cierre del servidor no puede perderse por un
    // reparto que falla después en el navegador
    mockGetCompetitionDetail.mockResolvedValue(competicion({ teamAssignment: 'AUTOMATIC' }));
    mockAssignTeams.mockRejectedValue(new Error('assign failed'));
    renderPage();
    const modal = await abrirModal();
    elegir(modal, 'Europa', 'ana');
    elegir(modal, 'América', 'bea');

    confirmar(modal);

    await waitFor(() => expect(customToast.error).toHaveBeenCalledWith('assign failed'));
    expect(customToast.success).toHaveBeenCalledWith('detail.success.captainsNamed');
    // Con plazas libres «Nombrar» vive en el menú, que se cierra al pulsarlo (#710)
    await screen.findByTestId('menu-acciones');
    abrirMenuDeAcciones();
    expect(await screen.findByText('detail.actions.start-competition')).toBeInTheDocument();
    expect(screen.getByText('detail.actions.changeCaptains')).toBeInTheDocument();
  });

  it('K9: si el servidor lo rechaza, enseña su motivo y el modal sigue abierto', async () => {
    mockNameCaptains.mockRejectedValue(
      Object.assign(new Error('Los equipos ya estan repartidos'), { status: 400 })
    );
    renderPage();
    const modal = await abrirModal();
    elegir(modal, 'Europa', 'ana');
    elegir(modal, 'América', 'bea');

    confirmar(modal);

    await waitFor(() =>
      expect(customToast.error).toHaveBeenCalledWith('Los equipos ya estan repartidos')
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    abrirMenuDeAcciones();
    expect(screen.getByText('detail.actions.nameCaptains')).toBeInTheDocument();
  });

  it('K10: sin conexión no dice «Failed to fetch»', async () => {
    mockNameCaptains.mockRejectedValue(new TypeError('Failed to fetch'));
    renderPage();
    const modal = await abrirModal();
    elegir(modal, 'Europa', 'ana');
    elegir(modal, 'América', 'bea');

    confirmar(modal);

    await waitFor(() => expect(customToast.error).toHaveBeenCalledWith('common:sinConexion.mensaje'));
  });

  it('K11: ya cerrada se pueden cambiar, y el modal sale con los de ahora elegidos', async () => {
    mockGetCompetitionDetail.mockResolvedValue(
      competicion({
        status: 'CLOSED',
        captains: { teamA: 'ana', teamB: 'bea', viceTeamA: null, viceTeamB: null },
      })
    );
    renderPage();
    const modal = await abrirModal('detail.actions.changeCaptains');

    expect(within(modal).getByLabelText('detail.captains.teamLabel_Europa')).toHaveValue('ana');
    expect(within(modal).getByLabelText('detail.captains.teamLabel_América')).toHaveValue('bea');
    expect(within(modal).queryByText('detail.captains.closesEnrollment')).not.toBeInTheDocument();
  });

  it('K11b: cambiarlos ya cerrada no vuelve a repartir, y lo dice como cambio', async () => {
    mockGetCompetitionDetail.mockResolvedValue(
      competicion({
        status: 'CLOSED',
        teamAssignment: 'AUTOMATIC',
        captains: { teamA: 'ana', teamB: 'bea', viceTeamA: null, viceTeamB: null },
      })
    );
    mockNameCaptains.mockResolvedValue({
      id: 'comp-1',
      status: 'CLOSED',
      captains: { teamA: 'carla', teamB: 'bea' },
      totalPlayers: 4,
      unevenTeams: false,
    });
    renderPage();
    const modal = await abrirModal('detail.actions.changeCaptains');
    elegir(modal, 'Europa', 'carla');

    confirmar(modal);

    await waitFor(() => expect(customToast.success).toHaveBeenCalledWith('detail.success.captainsChanged'));
    expect(customToast.success).not.toHaveBeenCalledWith('detail.success.captainsNamed');
    expect(mockAssignTeams).not.toHaveBeenCalled();
  });

  it('K12: la lista de inscritos marca a cada capitán con su equipo', async () => {
    mockGetCompetitionDetail.mockResolvedValue(
      competicion({
        status: 'CLOSED',
        captains: { teamA: 'ana', teamB: 'bea', viceTeamA: 'carla', viceTeamB: null },
      })
    );
    renderPage();

    expect(await screen.findByText('detail.captains.captainOf_Europa')).toBeInTheDocument();
    expect(screen.getByText('detail.captains.captainOf_América')).toBeInTheDocument();
    expect(screen.getByText('detail.captains.viceCaptainOf_Europa')).toBeInTheDocument();
  });

  it('K13: reabierta con equipos, vuelve «Cerrar inscripciones»: los capitanes ya no se tocan', async () => {
    // Reabrir no deshace el reparto, y con equipos el servidor no deja nombrar
    // capitanes: sin este botón, la competición no se podría volver a cerrar
    mockGetCompetitionDetail.mockResolvedValue(
      competicion({
        teamsAssigned: true,
        captains: { teamA: 'ana', teamB: 'bea', viceTeamA: null, viceTeamB: null },
      })
    );
    renderPage();

    await screen.findByTestId('menu-acciones');
    abrirMenuDeAcciones();
    abrirMenuDeAcciones();
    expect(screen.getByText('detail.actions.close-enrollments')).toBeInTheDocument();
    abrirMenuDeAcciones();
    expect(screen.queryByText('detail.actions.nameCaptains')).not.toBeInTheDocument();
  });

  it('K14: cerrada con equipos no ofrece cambiar capitanes, que fallaría siempre', async () => {
    mockGetCompetitionDetail.mockResolvedValue(
      competicion({
        status: 'CLOSED',
        teamsAssigned: true,
        captains: { teamA: 'ana', teamB: 'bea', viceTeamA: null, viceTeamB: null },
      })
    );
    renderPage();

    await screen.findByTestId('menu-acciones');
    abrirMenuDeAcciones();
    // Iniciar la competición sí se ofrece; cambiar capitanes ya no
    expect(screen.getByText('detail.actions.start-competition')).toBeInTheDocument();
    expect(screen.queryByText('detail.actions.changeCaptains')).not.toBeInTheDocument();
  });

  it('K15: si el reparto automático sale bien, «Cambiar capitanes» desaparece', async () => {
    mockGetCompetitionDetail.mockResolvedValue(competicion({ teamAssignment: 'AUTOMATIC' }));
    renderPage();
    const modal = await abrirModal();
    elegir(modal, 'Europa', 'ana');
    elegir(modal, 'América', 'bea');

    confirmar(modal);

    await waitFor(() => expect(customToast.success).toHaveBeenCalledWith('detail.success.teamsAutoAssigned'));
    await screen.findByTestId('menu-acciones');
    abrirMenuDeAcciones();
    // Iniciar la competición sí se ofrece; cambiar capitanes ya no
    expect(screen.getByText('detail.actions.start-competition')).toBeInTheDocument();
    expect(screen.queryByText('detail.actions.changeCaptains')).not.toBeInTheDocument();
  });

  it('K16: si la lista de inscritos no cargó, el modal lo dice y no deja confirmar', async () => {
    mockListEnrollments.mockRejectedValue(new Error('boom'));
    renderPage();
    const modal = await abrirModal();

    expect(within(modal).getByText('detail.captains.playersUnavailable')).toBeInTheDocument();
    expect(within(modal).getByRole('button', { name: 'detail.captains.confirm' })).toBeDisabled();
  });

  it('K17: con capitanes y sin lista, no se puede confirmar lo que no se ve', async () => {
    // El modal arranca con los capitanes de ahora; si la lista no cargó, los
    // desplegables salen en blanco y confirmar mandaría lo que nadie ha elegido
    mockGetCompetitionDetail.mockResolvedValue(
      competicion({
        status: 'CLOSED',
        captains: { teamA: 'ana', teamB: 'bea', viceTeamA: null, viceTeamB: null },
      })
    );
    mockListEnrollments.mockRejectedValue(new Error('boom'));
    renderPage();
    const modal = await abrirModal('detail.actions.changeCaptains');

    expect(within(modal).getByText('detail.captains.playersUnavailable')).toBeInTheDocument();
    expect(within(modal).getByRole('button', { name: 'detail.captains.confirm' })).toBeDisabled();
  });

  it('K18: un capitán que ya no está inscrito hay que sustituirlo antes de confirmar', async () => {
    // Se retiró: sigue como capitán en la ficha, pero no está entre los inscritos
    mockGetCompetitionDetail.mockResolvedValue(
      competicion({
        status: 'CLOSED',
        captains: { teamA: 'quien-se-fue', teamB: 'bea', viceTeamA: null, viceTeamB: null },
      })
    );
    renderPage();
    const modal = await abrirModal('detail.actions.changeCaptains');
    const boton = within(modal).getByRole('button', { name: 'detail.captains.confirm' });

    expect(boton).toBeDisabled();
    elegir(modal, 'Europa', 'ana');
    expect(boton).toBeEnabled();
  });

  it('K19: y lo mismo si el que se fue es el capitán del otro equipo', async () => {
    mockGetCompetitionDetail.mockResolvedValue(
      competicion({
        status: 'CLOSED',
        captains: { teamA: 'ana', teamB: 'quien-se-fue', viceTeamA: null, viceTeamB: null },
      })
    );
    renderPage();
    const modal = await abrirModal('detail.actions.changeCaptains');
    const boton = within(modal).getByRole('button', { name: 'detail.captains.confirm' });

    expect(boton).toBeDisabled();
    elegir(modal, 'América', 'bea');
    expect(boton).toBeEnabled();
  });
});
