import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';

/**
 * Las partidas en las franjas de la ficha (FE #824, PR 6): el montaje. Lo de
 * dentro de cada franja está en `PartidasEnLaFranja.test.jsx`.
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, params) => (params ? `${clave} ${JSON.stringify(params)}` : clave),
    i18n: { language: 'es' },
  }),
}));

const mockToast = { error: vi.fn(), success: vi.fn() };
vi.mock('../../utils/toast', () => ({ default: mockToast }));

const mockLeer = vi.fn();
const mockCoger = vi.fn();
const mockSoltar = vi.fn();
const mockEsperar = vi.fn();
const mockDejarDeEsperar = vi.fn();
const mockPartidas = vi.fn();
const mockMias = vi.fn();
const mockGenerar = vi.fn();
vi.mock('../../composition', () => ({
  getScheduleUseCase: { execute: (...a) => mockLeer(...a) },
  getCompetitionGolfCoursesUseCase: {
    execute: vi.fn().mockResolvedValue([
      { golf_course: { id: 'g-1', name: 'La Resina', country_code: 'ES', approval_status: 'APPROVED' } },
    ]),
  },
  createRoundUseCase: { execute: vi.fn() },
  updateRoundUseCase: { execute: vi.fn() },
  deleteRoundUseCase: { execute: vi.fn() },
  takeTeeWindowPlaceUseCase: { execute: (...a) => mockCoger(...a) },
  releaseTeeWindowPlaceUseCase: { execute: (...a) => mockSoltar(...a) },
  joinWaitingListUseCase: { execute: (...a) => mockEsperar(...a) },
  leaveWaitingListUseCase: { execute: (...a) => mockDejarDeEsperar(...a) },
  getTeeGroupsUseCase: { execute: (...a) => mockPartidas(...a) },
  getMyTeeGroupsUseCase: { execute: (...a) => mockMias(...a) },
  generateTeeGroupsUseCase: { execute: (...a) => mockGenerar(...a) },
  moveTeeGroupPlayerUseCase: { execute: vi.fn() },
  reorderTeeGroupsUseCase: { execute: vi.fn() },
  setTeeGroupMarkersUseCase: { execute: vi.fn() },
  deleteTeeGroupsUseCase: { execute: vi.fn() },
}));

const FranjasDeLaCompeticion = (await import('./FranjasDeLaCompeticion')).default;

const YO = 'yo';
const hoja = (extra = {}) => ({
  firstTeeTime: '08:00',
  lastTeeTime: '11:50',
  intervalMinutes: 10,
  groupSize: 4,
  teeTimes: [],
  capacity: 4,
  placesTaken: 0,
  playerIds: [],
  waitingIds: [],
  ...extra,
});
const franja = (id, dia, sesion, extra = {}) => ({
  id,
  golfCourseId: 'g-1',
  roundDate: dia,
  sessionType: sesion,
  status: 'PENDING_MATCHES',
  matches: [],
  teeSheet: hoja(extra),
});

const INSCRITOS = [
  { userId: YO, userName: 'Yo Mismo' },
  { userId: 'ana', userName: 'Ana Alba' },
  { userId: 'bea', userName: 'Bea Blanco' },
  { userId: 'sin', userName: 'Sin Franja' },
];

const pinta = (props = {}) =>
  render(
    <FranjasDeLaCompeticion
      competitionId="c-1"
      startDate="2030-10-12"
      endDate="2030-10-13"
      canManage={false}
      maxPlayers={100}
      userId={YO}
      estoyInscrito
      puedeElegir
      maxMatchdaysPerPlayer={1}
      inscritos={INSCRITOS}
      {...props}
    />
  );

const en = async (id) => within(await screen.findByTestId(`franja-${id}`));
const VACIA = { roundId: 'm', editable: true, unassignedPlayers: [], groups: [] };
const MIA = {
  roundId: 'm',
  roundDate: '2030-10-12',
  sessionType: 'MORNING',
  group: { id: 'g1', number: 1, teeTime: '08:00', incomplete: false, players: [{ userId: YO, name: 'Yo', handicap: 10, playingHandicap: 9, marksUserId: 'ana' }, { userId: 'ana', name: 'Ana', handicap: 12, playingHandicap: 11, marksUserId: YO }] },
};

describe('FranjasDeLaCompeticion · partidas (FE #824, PR 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPartidas.mockReset();
    mockMias.mockReset();
    mockPartidas.mockResolvedValue(VACIA);
    mockGenerar.mockResolvedValue({ ...VACIA, groups: [MIA.group] });
    mockMias.mockResolvedValue([MIA]);
    mockCoger.mockResolvedValue({});
    mockLeer.mockResolvedValue({
      rounds: [franja('m', '2030-10-12', 'MORNING', { playerIds: [YO, 'ana'], placesTaken: 2 }), franja('t', '2030-10-13', 'AFTERNOON')],
    });
  });

  it('cerrada: cada franja con hoja tiene «Partidas», y arriba «Tu partida»', async () => {
    pinta({ verPartidas: true, puedeElegir: false });

    expect((await en('m')).getByRole('button', { name: /partidas.show/ })).toBeInTheDocument();
    expect((await en('t')).getByRole('button', { name: /partidas.show/ })).toBeInTheDocument();
    expect(await screen.findByTestId('mi-partida-m')).toBeInTheDocument();
  });

  it('1: con las inscripciones abiertas no hay partidas que ver ni se piden las mías', async () => {
    pinta();

    await en('m');
    expect(screen.queryByRole('button', { name: /partidas.show/ })).toBeNull();
    expect(mockMias).not.toHaveBeenCalled();
  });

  it('quien no está inscrito ni organiza no las ve', async () => {
    pinta({ verPartidas: true, puedeElegir: false, estoyInscrito: false });

    await en('m');
    expect(screen.queryByRole('button', { name: /partidas.show/ })).toBeNull();
    expect(mockMias).not.toHaveBeenCalled();
  });

  it('el organizador, aunque no juegue, las ve y las organiza', async () => {
    pinta({ verPartidas: true, puedeVerPartidas: true, organizaPartidas: true, puedeElegir: false, estoyInscrito: false });

    fireEvent.click((await en('m')).getByRole('button', { name: /partidas.show/ }));

    expect(await screen.findByRole('button', { name: 'partidas.generate' })).toBeInTheDocument();
    expect(mockMias).not.toHaveBeenCalled();
  });

  it('acabada, el organizador que no juega las ve sin organizarlas (CodeRabbit)', async () => {
    pinta({ verPartidas: true, puedeVerPartidas: true, organizaPartidas: false, puedeElegir: false, estoyInscrito: false });

    fireEvent.click((await en('m')).getByRole('button', { name: /partidas.show/ }));

    expect(await screen.findByText('partidas.empty')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'partidas.generate' })).toBeNull();
  });

  it('el jugador no las organiza', async () => {
    pinta({ verPartidas: true, puedeElegir: false });

    fireEvent.click((await en('m')).getByRole('button', { name: /partidas.show/ }));

    expect(await screen.findByText('partidas.empty')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'partidas.generate' })).toBeNull();
  });

  it('tras un cambio en las partidas, «Tu partida» se relee (el organizador también juega)', async () => {
    pinta({ verPartidas: true, organizaPartidas: true, puedeElegir: false });
    fireEvent.click((await en('m')).getByRole('button', { name: /partidas.show/ }));
    await waitFor(() => expect(mockMias).toHaveBeenCalledTimes(1));

    fireEvent.click(await screen.findByRole('button', { name: 'partidas.generate' }));

    await waitFor(() => expect(mockGenerar).toHaveBeenCalled());
    await waitFor(() => expect(mockMias).toHaveBeenCalledTimes(2));
  });

  it('17: si el organizador mueve plazas, las partidas desplegadas y las mías se releen', async () => {
    pinta({ verPartidas: true, organizaPartidas: true, puedeColocar: true, canManage: true, puedeElegir: false });
    const fila = await en('m');
    fireEvent.click(fila.getByRole('button', { name: /partidas.show/ }));
    await waitFor(() => expect(mockPartidas).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockMias).toHaveBeenCalledTimes(1));

    fireEvent.click(fila.getByRole('button', { name: /^franjas\.showPlayers/ }));
    fireEvent.change(fila.getByLabelText('franjas.moveTo {"jugador":"Ana Alba"}'), { target: { value: 't' } });

    await waitFor(() => expect(mockPartidas).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockMias).toHaveBeenCalledTimes(2));
  });
});
