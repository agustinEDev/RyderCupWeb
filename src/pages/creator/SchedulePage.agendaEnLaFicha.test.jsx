import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * La agenda se cambia en la ficha, no aquí (FE #654).
 *
 * «Gestionar Calendario» pedía seis campos por sesión, una a una. La agenda
 * vive ahora en la ficha de la competición; esta pantalla se queda con los
 * equipos, los partidos y los sobres, y lleva a la agenda en vez de repetirla.
 *
 *   #    caso                                           | qué pasa
 *   -----|----------------------------------------------|---------------------------
 *   AF1  el organizador                                 | sin «Crear Ronda»
 *   AF2  y en su lugar                                  | un enlace a la agenda de la ficha
 *   AF3  las sesiones                                   | sin editar ni borrar aquí
 *   AF4  quien solo mira                                | sin el enlace: no puede cambiar nada
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

describe('SchedulePage · la agenda vive en la ficha (FE #654)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDetalle.mockResolvedValue(COMPETICION);
    mockAgenda.mockResolvedValue(AGENDA);
    mockInscripciones.mockResolvedValue(INSCRITOS);
  });

  it('AF1: no se crean sesiones aquí', async () => {
    pintar();

    await screen.findByTestId('agenda-en-la-ficha');
    expect(screen.queryByText('rounds.create')).not.toBeInTheDocument();
  });

  it('AF2: se lleva a la agenda de la ficha', async () => {
    pintar();

    expect(await screen.findByTestId('agenda-en-la-ficha')).toHaveAttribute(
      'href',
      '/competitions/comp-1'
    );
  });

  it('AF3: las sesiones no se editan ni se borran aquí', async () => {
    pintar();

    await screen.findByTestId('agenda-en-la-ficha');
    expect(screen.queryByTitle('rounds.edit')).not.toBeInTheDocument();
    expect(screen.queryByTitle('rounds.delete')).not.toBeInTheDocument();
  });

  it('AF4: a quien solo mira no se le ofrece cambiar la agenda (CodeRabbit)', async () => {
    // Capitanes y jugadores entran aquí por la ruta pública, y en la ficha no
    // tienen nada que cambiar: el enlace les prometía algo que no pueden hacer
    ROLES.isCreator = false;
    mockDetalle.mockResolvedValue({ ...COMPETICION, creatorId: 'otra-persona' });
    try {
      pintar();

      await screen.findByText('Ryder de los amigos');
      expect(screen.queryByTestId('agenda-en-la-ficha')).not.toBeInTheDocument();
    } finally {
      ROLES.isCreator = true;
    }
  });
});

