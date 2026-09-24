import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * El acceso al sobre desde el calendario (FE #655).
 *
 * El capitán entra por aquí a poner su orden para cada sesión, y esta pantalla
 * la ven también los que no organizan: la ruta pública `/competitions/:id/schedule`
 * monta el mismo componente. Quien no capitanea nada no tiene sobre que
 * entregar, así que no se le ofrece.
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
vi.mock('framer-motion', () => {
  const Div = ({ children, initial: _i, animate: _a, exit: _e, transition: _t, ...props }) => (
    <div {...props}>{children}</div>
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
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
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
const customToast = (await import('../../utils/toast')).default;

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

describe('SchedulePage · el acceso al sobre (FE #655)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockDetalle.mockResolvedValue(COMPETICION);
    mockAgenda.mockResolvedValue(AGENDA);
    mockInscripciones.mockResolvedValue(INSCRITOS);
  });

  it('O1: el capitán tiene su sobre a un toque desde cada sesión', async () => {
    pintar();

    const enlace = await screen.findByTestId('ir-al-sobre-ronda-1');
    expect(enlace).toHaveAttribute('href', '/competitions/comp-1/rounds/ronda-1/envelope');
  });

  it('O2: quien ni capitanea ni organiza no tiene sobre que entregar', async () => {
    mockDetalle.mockResolvedValue({
      ...COMPETICION,
      creatorId: 'otro',
      captains: { teamA: 'carla', teamB: 'bea', viceTeamA: null, viceTeamB: null },
    });
    pintar();

    await screen.findByText('Ryder de los amigos');
    await waitFor(() =>
      expect(screen.queryByTestId('ir-al-sobre-ronda-1')).not.toBeInTheDocument()
    );
  });

  it('O2b: el organizador también entra: es quien los abre si un capitán no aparece', async () => {
    mockDetalle.mockResolvedValue({
      ...COMPETICION,
      captains: { teamA: 'carla', teamB: 'bea', viceTeamA: null, viceTeamB: null },
      creatorId: 'org',
    });
    pintar();

    expect(await screen.findByTestId('ir-al-sobre-ronda-1')).toBeInTheDocument();
  });

  it('O2c: y también en una sesión de parejas, donde se forman las parejas', async () => {
    // Estuvo capado a individuales mientras el sobre solo sabía mandar filas
    // de un jugador. Desde el 23 sep la pantalla agrupa de dos en dos
    mockAgenda.mockResolvedValue({
      ...AGENDA,
      days: [{ date: '2026-06-01', rounds: [{ ...RONDA, matchFormat: 'FOURBALL' }] }],
      rounds: [{ ...RONDA, matchFormat: 'FOURBALL' }],
    });
    pintar();

    expect(await screen.findByTestId('ir-al-sobre-ronda-1')).toBeInTheDocument();
  });

  it('O3: en modo manual no hay sobres', async () => {
    mockDetalle.mockResolvedValue({ ...COMPETICION, setupMode: 'MANUAL' });
    pintar();

    await screen.findByText('Ryder de los amigos');
    await waitFor(() =>
      expect(screen.queryByTestId('ir-al-sobre-ronda-1')).not.toBeInTheDocument()
    );
  });

  it('O4: y sin equipos repartidos tampoco: primero se reparten', async () => {
    mockAgenda.mockResolvedValue({ ...AGENDA, teamAssignment: null });
    pintar();

    await screen.findByText('Ryder de los amigos');
    await waitFor(() =>
      expect(screen.queryByTestId('ir-al-sobre-ronda-1')).not.toBeInTheDocument()
    );
  });

  it('R1: el organizador puede rehacer los sobres de una sesión', async () => {
    // Cuando un capitán no llega a tiempo, lo que viene después no es editar
    // el resultado: es rehacer el proceso
    mockRehacer.mockResolvedValue({ envelopesRemoved: 2, matchesRemoved: 6 });
    pintar();

    fireEvent.click(await screen.findByTestId('rehacer-sobres-ronda-1'));
    fireEvent.click(await screen.findByTestId('confirmar-rehacer-sobres'));

    await waitFor(() => expect(mockRehacer).toHaveBeenCalledWith('ronda-1'));
  });

  it('R2: y se pregunta antes, que se lleva los partidos por delante', async () => {
    pintar();

    fireEvent.click(await screen.findByTestId('rehacer-sobres-ronda-1'));

    expect(screen.getByTestId('modal-rehacer-sobres')).toBeInTheDocument();
    expect(mockRehacer).not.toHaveBeenCalled();
  });

  it('R3: a un capitán que no organiza no se le ofrece', async () => {
    // El que entregó a tiempo no le tira la lista al otro: arbitra el
    // organizador
    mockDetalle.mockResolvedValue({ ...COMPETICION, creatorId: 'otra' });
    ROLES.isCreator = false;
    pintar();

    await screen.findByTestId('ir-al-sobre-ronda-1');
    expect(screen.queryByTestId('rehacer-sobres-ronda-1')).not.toBeInTheDocument();
    ROLES.isCreator = true;
  });

  it('G4: en modo Ryder, sin abrir los sobres, no se ofrece «Generar» (FE #711)', async () => {
    pintar();
    await screen.findByTestId('ir-al-sobre-ronda-1');

    expect(screen.queryByTitle('matches.generate')).not.toBeInTheDocument();
  });

  it('G4b: en modo manual, sí', async () => {
    mockDetalle.mockResolvedValue({ ...COMPETICION, setupMode: 'MANUAL' });
    pintar();

    expect(await screen.findByTitle('matches.generate')).toBeInTheDocument();
  });

  // «Generar» que falla por un motivo que la sesión sabe contar (BE #360): el
  // servidor lo apunta en ella, en claves, y la tarjeta lo pinta en su idioma.
  // Enseñar además la frase del servidor era repetirlo en español
  const bloqueado = () =>
    Object.assign(new Error('No se pueden generar los partidos: Eva'), {
      status: 400,
      errorCode: 'MATCH_GENERATION_BLOCKED',
    });

  const generarEnManual = async () => {
    mockDetalle.mockResolvedValue({ ...COMPETICION, setupMode: 'MANUAL' });
    pintar();
    fireEvent.click(await screen.findByTitle('matches.generate'));
    fireEvent.click(await screen.findByTestId('generate-submit'));
  };

  it('G7: si no se pudieron generar, el modal sigue abierto y enseña el motivo recién apuntado', async () => {
    // Abierto: en modo manual, cerrarlo tiraba los emparejamientos hechos a mano
    mockGenerar.mockRejectedValue(bloqueado());
    const conMotivo = { ...RONDA, matchGenerationBlock: { reason: 'NOT_ENOUGH_PLAYERS', players: [] } };
    mockAgenda
      .mockResolvedValueOnce(AGENDA)
      .mockResolvedValue({ ...AGENDA, rounds: [conMotivo], days: [{ date: '2026-06-01', rounds: [conMotivo] }] });
    await generarEnManual();

    await waitFor(() =>
      expect(
        within(screen.getByTestId('generate-matches-modal')).getByTestId('bloqueo-de-partidos')
      ).toHaveTextContent(
        'generationBlock.reason.NOT_ENOUGH_PLAYERS'
      )
    );
    expect(screen.getByTestId('generate-submit')).toBeInTheDocument();
    expect(customToast.error).not.toHaveBeenCalled();
  });

  it('G7e: y los emparejamientos hechos a mano siguen ahí para reintentar', async () => {
    mockGenerar.mockRejectedValue(bloqueado());
    mockDetalle.mockResolvedValue({ ...COMPETICION, setupMode: 'MANUAL' });
    pintar();
    fireEvent.click(await screen.findByTitle('matches.generate'));
    const modal = await screen.findByTestId('generate-matches-modal');
    fireEvent.click(within(modal).getByDisplayValue('manual'));
    const [ladoA, ladoB] = await within(modal).findAllByRole('combobox');
    fireEvent.change(ladoA, { target: { value: 'carla' } });
    fireEvent.change(ladoB, { target: { value: 'eva' } });

    fireEvent.click(screen.getByTestId('generate-submit'));
    await waitFor(() => expect(mockGenerar).toHaveBeenCalled());
    await waitFor(() => expect(mockAgenda.mock.calls.length).toBeGreaterThan(1));

    const [a2, b2] = within(screen.getByTestId('generate-matches-modal')).getAllByRole('combobox');
    expect([a2.value, b2.value]).toEqual(['carla', 'eva']);
  });

  it('G7c: y relee las inscripciones: un retirado deja de ofrecerse', async () => {
    mockGenerar.mockRejectedValue(bloqueado());
    mockInscripciones
      .mockResolvedValueOnce(INSCRITOS)
      .mockResolvedValue(
        INSCRITOS.map((i) => (i.userId === 'carla' ? { ...i, status: 'WITHDRAWN' } : i))
      );
    await generarEnManual();
    await waitFor(() => expect(mockInscripciones).toHaveBeenCalledTimes(2));

    const modal = screen.getByTestId('generate-matches-modal');
    fireEvent.click(within(modal).getByDisplayValue('manual'));

    // Primero que hay opciones: si no, «no está Carla» pasaría en vacío
    await waitFor(() => expect(within(modal).getAllByRole('option').length).toBeGreaterThan(1));
    expect(within(modal).queryByRole('option', { name: 'Carla Cruz' })).not.toBeInTheDocument();
  });

  it('G7d: si la recarga falla, dice lo que dijo el servidor, que nombra a quién', async () => {
    mockGenerar.mockRejectedValue(bloqueado());
    mockAgenda.mockResolvedValueOnce(AGENDA).mockRejectedValue(new Error('sin red'));
    await generarEnManual();

    await waitFor(() =>
      expect(customToast.error).toHaveBeenCalledWith('No se pueden generar los partidos: Eva')
    );
  });

  it('G7b: cualquier otro fallo se cuenta como antes', async () => {
    mockGenerar.mockRejectedValue(Object.assign(new Error('Boom'), { status: 400 }));
    await generarEnManual();

    await waitFor(() => expect(customToast.error).toHaveBeenCalledWith('Boom'));
  });

  it('G6: con las inscripciones reabiertas, la página no ofrece «Generar»', async () => {
    mockDetalle.mockResolvedValue({ ...COMPETICION, status: 'ACTIVE', setupMode: 'MANUAL' });
    pintar();
    await waitFor(() => expect(mockAgenda).toHaveBeenCalled());
    expect(screen.queryByTitle('matches.generate')).not.toBeInTheDocument();
  });
});

