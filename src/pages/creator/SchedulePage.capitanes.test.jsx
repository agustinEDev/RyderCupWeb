import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * Cubrir el puesto de un capitán desde el calendario (FE #692).
 *
 * Esta pantalla no tenía ningún test, así que la parte que une las piezas
 * —quiénes se ofrecen, con qué argumentos se llama y qué queda en la ficha—
 * era justo lo que nadie comprobaba. Un orden de argumentos equivocado pasaba
 * en verde.
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

import customToast from '../../utils/toast';
const SchedulePage = (await import('./SchedulePage')).default;

const COMPETICION = {
  id: 'comp-1',
  name: 'Ryder de los amigos',
  status: 'CLOSED',
  creatorId: 'org',
  team1Name: 'Europa',
  team2Name: 'América',
  maxPlayingHandicap: null,
  captains: { teamA: null, teamB: 'bea', viceTeamA: null, viceTeamB: null },
};

const AGENDA = {
  days: [],
  teamAssignment: {
    teamAPlayerIds: ['carla', 'dani'],
    teamBPlayerIds: ['bea', 'eva'],
  },
};

const INSCRITOS = [
  { userId: 'carla', userName: 'Carla Cruz', status: 'APPROVED' },
  { userId: 'dani', userName: 'Dani Díaz', status: 'WITHDRAWN' },
  { userId: 'bea', userName: 'Bea Blanco', status: 'APPROVED' },
  { userId: 'eva', userName: 'Eva Esteban', status: 'APPROVED' },
];

/**
 * Abre el modal pulsando el botón del equipo. Se vuelve a buscar justo antes
 * de pulsar: la pantalla termina de cargar en varios pasos y sustituye el nodo,
 * así que el que devuelve `findBy` puede estar ya fuera del documento.
 */
const abrirCubrir = async (equipo = 'A') => {
  await screen.findByTestId(`cubrir-capitan-${equipo}`);
  await waitFor(() => expect(screen.getByTestId(`cubrir-capitan-${equipo}`)).toBeInTheDocument());
  fireEvent.click(screen.getByTestId(`cubrir-capitan-${equipo}`));
  return screen.findByRole('dialog');
};

/**
 * Elige y confirma. Cada elemento se busca en el documento justo antes de
 * usarlo: la pantalla se vuelve a pintar entre medias y el diálogo entero
 * cambia de nodo, así que una referencia guardada queda fuera del documento y
 * el clic no llega a ninguna parte.
 */
const elegirYConfirmar = async (jugador) => {
  fireEvent.change(await screen.findByRole('combobox'), { target: { value: jugador } });
  fireEvent.click(await screen.findByRole('button', { name: 'teams.fillCaptainConfirm' }));
};

const pintar = () =>
  render(
    <MemoryRouter initialEntries={['/creator/competitions/comp-1/schedule']}>
      <Routes>
        <Route path="/creator/competitions/:id/schedule" element={<SchedulePage />} />
      </Routes>
    </MemoryRouter>
  );

describe('SchedulePage · cubrir el puesto de un capitán (FE #692)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockDetalle.mockResolvedValue(COMPETICION);
    mockAgenda.mockResolvedValue(AGENDA);
    mockInscripciones.mockResolvedValue(INSCRITOS);
    mockCubrir.mockResolvedValue({
      id: 'comp-1',
      captains: { teamA: 'carla', teamB: 'bea', viceTeamA: null, viceTeamB: null },
    });
  });

  it('P1: solo se ofrecen los de ese equipo que siguen inscritos', async () => {
    pintar();

    const modal = await abrirCubrir();
    const opciones = within(within(modal).getByRole('combobox'))
      .getAllByRole('option')
      .map((o) => o.textContent);
    // Dani se retiró, y Bea y Eva son del otro equipo
    expect(opciones).toEqual(['teams.fillCaptainChoose', 'Carla Cruz']);
  });

  it('P2: al confirmar llama con la competición, el equipo y el jugador', async () => {
    pintar();
    await abrirCubrir();

    await elegirYConfirmar('carla');

    await waitFor(() => expect(mockCubrir).toHaveBeenCalledWith('comp-1', 'A', 'carla'));
    expect(customToast.success).toHaveBeenCalledWith('success.captainFilled');
  });

  it('P3: y la pantalla queda con el capitán nuevo, sin recargar', async () => {
    pintar();
    await abrirCubrir();

    await elegirYConfirmar('carla');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByTestId('cubrir-capitan-A')).not.toBeInTheDocument();
    expect(screen.getAllByText('teams.captainTag').length).toBe(2);
  });

  it('P4: si el servidor lo rechaza, lo dice y el puesto sigue vacío', async () => {
    mockCubrir.mockRejectedValue(new Error('Ese equipo ya tiene capitán'));
    pintar();
    await abrirCubrir();

    await elegirYConfirmar('carla');

    await waitFor(() =>
      expect(customToast.error).toHaveBeenCalledWith('Ese equipo ya tiene capitán')
    );
    expect(await screen.findByTestId('cubrir-capitan-A')).toBeInTheDocument();
  });

  it('P5: y para el otro equipo se ofrecen los suyos, no los del primero', async () => {
    mockDetalle.mockResolvedValue({
      ...COMPETICION,
      captains: { teamA: 'carla', teamB: null, viceTeamA: null, viceTeamB: null },
    });
    pintar();

    const modal = await abrirCubrir('B');

    const opciones = within(within(modal).getByRole('combobox'))
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(opciones).toEqual(['teams.fillCaptainChoose', 'Bea Blanco', 'Eva Esteban']);
  });
});
