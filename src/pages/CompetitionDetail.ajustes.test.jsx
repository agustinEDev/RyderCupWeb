import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

/**
 * La configuración de la competición, escrita en cristiano (FE #705).
 *
 * Visto en el Kind el 23 sep: «Modo de Juego: HANDICAP» y «Asignación de
 * Equipos: MANUAL». Los valores del backend salían tal cual, en mayúsculas y
 * en inglés, en una pantalla que está en español.
 */

const CLAVES = {
  'detail.settings.playMode': 'Modo de Juego:',
  'detail.settings.teamAssignment': 'Asignación de Equipos:',
  'create.handicap': 'Hándicap',
  'create.scratch': 'Scratch',
  'detail.settings.assignment.MANUAL': 'Manual',
  'detail.settings.assignment.AUTOMATIC': 'Automática',
  'detail.settings.assignment.DRAFT': 'Draft de capitanes',
};
// Como el de i18next: si no encuentra la clave devuelve el `defaultValue`, y
// si ese tampoco vale, LA CLAVE. Un doble más benévolo escondía justo el
// defecto que este fichero comprueba
const t = (clave, params) => CLAVES[clave] ?? params?.defaultValue ?? clave;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t, i18n: { language: 'es' } }),
}));
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => ({ children, ...p }) => <div {...p}>{children}</div> }),
}));
vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));
vi.mock('../components/ui/FullScreenLoader', () => ({ default: () => null }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'creator-1' }, loading: false }) }));
let roles = { isAdmin: false, isCreator: true, isLoading: false };
vi.mock('../hooks/useUserRoles', () => ({ useUserRoles: () => roles }));
vi.mock('../utils/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

const mockDetalle = vi.fn();
vi.mock('../composition', () => ({
  getCompetitionDetailUseCase: { execute: (...a) => mockDetalle(...a) },
  listEnrollmentsUseCase: { execute: vi.fn().mockResolvedValue([]) },
  getCompetitionGolfCoursesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  deleteCompetitionUseCase: { execute: vi.fn() },
  updateCompetitionStatusUseCase: { execute: vi.fn() },
  assignTeamsUseCase: { execute: vi.fn() },
  nameCaptainsUseCase: { execute: vi.fn() },
  fillCaptainUseCase: { execute: vi.fn() },
  setNamePreferenceUseCase: { execute: vi.fn() },
  setCustomHandicapUseCase: { execute: vi.fn() },
  removeCustomHandicapUseCase: { execute: vi.fn() },
  handleEnrollmentUseCase: { execute: vi.fn() },
  requestEnrollmentUseCase: { execute: vi.fn() },
  withdrawEnrollmentUseCase: { execute: vi.fn() },
}));

const CompetitionDetail = (await import('./CompetitionDetail')).default;

const pintar = () =>
  render(
    <MemoryRouter initialEntries={['/competitions/comp-1']}>
      <Routes>
        <Route path="/competitions/:id" element={<CompetitionDetail />} />
      </Routes>
    </MemoryRouter>
  );

const ficha = (extra = {}) =>
  mockDetalle.mockResolvedValue({
    id: 'comp-1',
    name: 'Prueba',
    status: 'CLOSED',
    creatorId: 'creator-1',
    maxPlayers: 12,
    countries: [],
    playMode: 'HANDICAP',
    teamAssignment: 'MANUAL',
    ...extra,
  });

describe('CompetitionDetail · la configuración, en cristiano', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    roles = { isAdmin: false, isCreator: true, isLoading: false };
  });

  it('C1: el modo de juego no sale en mayúsculas y en inglés', async () => {
    ficha();
    pintar();

    expect(await screen.findByText('Hándicap')).toBeInTheDocument();
    expect(screen.queryByText('HANDICAP')).not.toBeInTheDocument();
  });

  it('C2: ni el reparto de equipos', async () => {
    ficha();
    pintar();

    expect(await screen.findByText('Manual')).toBeInTheDocument();
    expect(screen.queryByText('MANUAL')).not.toBeInTheDocument();
  });

  it('C3: un valor que no conozcamos sale tal cual, no como clave', async () => {
    ficha({ teamAssignment: 'LO_QUE_VENGA' });
    pintar();

    expect(await screen.findByText('LO_QUE_VENGA')).toBeInTheDocument();
    expect(screen.queryByText(/detail\.settings\.assignment/)).not.toBeInTheDocument();
  });

  it('C4: al organizador la clasificación no se le ofrece dos veces', async () => {
    // Es su acción principal en un torneo en juego, y el botón de abajo
    // —que está para TODO el mundo— se la repetía
    ficha({ status: 'IN_PROGRESS' });
    pintar();

    await screen.findByTestId('accion-principal');
    expect(screen.getAllByText('detail.actions.leaderboard')).toHaveLength(1);
  });

  it('C5: y a quien solo mira le sigue saliendo', async () => {
    roles = { isAdmin: false, isCreator: false, isLoading: false };
    ficha({ status: 'IN_PROGRESS', creatorId: 'otra-persona' });
    pintar();

    expect(await screen.findByText('detail.actions.leaderboard')).toBeInTheDocument();
  });

  it('C6: sin modo de juego no se pinta media clave', async () => {
    // `create.` con el valor vacío: i18next devuelve la clave y salía tal cual
    ficha({ playMode: null });
    pintar();

    await screen.findByText('Modo de Juego:');
    expect(screen.queryByText('create.')).not.toBeInTheDocument();
  });

  it('C7: ni «assignment.undefined» sin reparto', async () => {
    ficha({ teamAssignment: null });
    pintar();

    await screen.findByText('Asignación de Equipos:');
    expect(screen.queryByText(/assignment\.undefined/)).not.toBeInTheDocument();
  });
});
