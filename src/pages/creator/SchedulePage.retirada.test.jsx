import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * El detalle del partido recibe el formato de su ronda (/code-review, 26 oct
 * 2026): el detalle no lo trae, y la retirada del organizador es solo de
 * fourball (F10). Sin él se leía la vista de anotar de cualquier partido.
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

// El detalle, reducido a lo que importa aquí: con qué formato se abre
vi.mock('../../components/schedule/MatchDetailModal', () => ({
  default: ({ matchId, matchFormat }) => <div data-testid="detalle">{`${matchId}:${matchFormat}`}</div>,
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

const COMPETICION = {
  hasTeams: true,
  id: 'comp-1',
  name: 'Ryder de los amigos',
  status: 'IN_PROGRESS',
  creatorId: 'org',
  team1Name: 'Europa',
  team2Name: 'América',
  maxPlayingHandicap: null,
  setupMode: 'RYDER_CUP',
  captains: { teamA: 'org', teamB: 'bea', viceTeamA: null, viceTeamB: null },
};

const partido = (id, numero) => ({
  id,
  roundId: null,
  matchNumber: numero,
  teamAPlayers: [{ userId: 'org' }, { userId: 'carla' }],
  teamBPlayers: [{ userId: 'bea' }, { userId: 'eva' }],
  status: 'IN_PROGRESS',
  handicapStrokesGiven: null,
  strokesGivenToTeam: null,
  result: null,
});

const ronda = (id, matchFormat, partidos) => ({
  id,
  roundNumber: 1,
  roundDate: '2026-06-01',
  sessionType: 'MORNING',
  matchFormat,
  status: 'IN_PROGRESS',
  matches: partidos,
});

const RONDAS = [ronda('r-1', 'FOURSOMES', [partido('m-1', 1)]), ronda('r-2', 'FOURBALL', [partido('m-2', 1)])];

describe('SchedulePage · el detalle sabe el formato de su ronda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockDetalle.mockResolvedValue(COMPETICION);
    mockAgenda.mockResolvedValue({
      days: [{ date: '2026-06-01', rounds: RONDAS }],
      rounds: RONDAS,
      teamAssignment: { teamAPlayerIds: ['org', 'carla'], teamBPlayerIds: ['bea', 'eva'] },
    });
    mockInscripciones.mockResolvedValue([]);
  });

  it('cada partido abre su detalle con el formato de SU ronda', async () => {
    render(
      <MemoryRouter initialEntries={['/competitions/comp-1/schedule']}>
        <Routes>
          <Route path="/competitions/:id/schedule" element={<SchedulePage />} />
        </Routes>
      </MemoryRouter>
    );

    // Las rondas salen plegadas: se despliegan las dos
    await screen.findByText('Ryder de los amigos');
    const rondas = await screen.findAllByRole('button', { expanded: false });
    for (const r of rondas) fireEvent.click(r);
    const botones = await screen.findAllByRole('button', { name: 'matches.viewDetail' });
    fireEvent.click(botones[1]);
    expect(await screen.findByTestId('detalle')).toHaveTextContent('m-2:FOURBALL');
  });
});
