import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';

/**
 * Elegir franja, esperar y colocar jugadores (FE #824, PR 4). La tabla
 * aprobada el 10 oct 2026:
 *
 *   #    caso                                            | qué pasa
 *   -----|---------------------------------------------------|---------------------------
 *   1    jugador inscrito                                 | «Juegas N de tus M jornadas»
 *   2    con sitio, día libre, jornadas libres            | «Coger plaza»
 *   3    con sitio, ya juega ese día                      | «Cambiarme aquí», directo
 *   4    con sitio, otro día, jornadas llenas             | «Cambiar por esta»; con varias, elige cuál deja
 *   5    la suya                                          | «Tienes plaza» y «Soltar»
 *   6    llena, día libre, jornadas libres                | «Apuntarme a la espera»
 *   7    espera en ella                                   | «Eres el 3.º en espera» y «Salir de la espera»
 *   8    inscripciones cerradas                           | ve su franja, sin botones
 *   9    no inscrito                                      | sin botones
 *   10   el servidor rechaza                              | su motivo
 *   11   desplegar una franja                             | quién juega y quién espera, con su nombre
 *   12   organizador: mover                               | a una franja con sitio, en un paso
 *   13   organizador: quitar                              | solo con las inscripciones abiertas
 *   14   organizador: «Sin franja»                        | los aprobados sin ninguna, con «Colocar en…»
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

describe('FranjasDeLaCompeticion · plazas y esperas (FE #824, PR 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCoger.mockResolvedValue({});
    mockSoltar.mockResolvedValue();
    mockEsperar.mockResolvedValue({});
    mockDejarDeEsperar.mockResolvedValue();
  });

  describe('el jugador', () => {
    it('1: dice cuántas jornadas juega de las que puede', async () => {
      mockLeer.mockResolvedValue({ rounds: [franja('m', '2030-10-12', 'MORNING', { playerIds: [YO], placesTaken: 1 })] });
      pinta({ maxMatchdaysPerPlayer: 2 });

      expect(await screen.findByTestId('franjas-mis-jornadas')).toHaveTextContent('franjas.myDays {"count":2,"juega":1}');
    });

    it('2: con sitio coge plaza', async () => {
      mockLeer.mockResolvedValue({ rounds: [franja('m', '2030-10-12', 'MORNING')] });
      pinta();

      fireEvent.click((await en('m')).getByRole('button', { name: 'franjas.take' }));

      await waitFor(() => expect(mockCoger).toHaveBeenCalledWith('m', {}));
      expect(mockToast.success).toHaveBeenCalledWith('franjas.took');
    });

    it('3: ya jugando ese día, se cambia directamente', async () => {
      mockLeer.mockResolvedValue({
        rounds: [
          franja('m', '2030-10-12', 'MORNING', { playerIds: [YO], placesTaken: 1 }),
          franja('t', '2030-10-12', 'AFTERNOON'),
        ],
      });
      pinta();

      fireEvent.click((await en('t')).getByRole('button', { name: 'franjas.switchHere' }));

      await waitFor(() => expect(mockCoger).toHaveBeenCalledWith('t', { insteadOfRoundId: 'm' }));
    });

    it('4: con las jornadas llenas y otro día, cambiar por esta', async () => {
      mockLeer.mockResolvedValue({
        rounds: [
          franja('m', '2030-10-12', 'MORNING', { playerIds: [YO], placesTaken: 1 }),
          franja('d', '2030-10-13', 'MORNING'),
        ],
      });
      pinta();

      fireEvent.click((await en('d')).getByRole('button', { name: 'franjas.switchFor' }));

      await waitFor(() => expect(mockCoger).toHaveBeenCalledWith('d', { insteadOfRoundId: 'm' }));
    });

    it('4b: con varias suyas, pregunta cuál deja', async () => {
      mockLeer.mockResolvedValue({
        rounds: [
          franja('a', '2030-10-12', 'MORNING', { playerIds: [YO], placesTaken: 1 }),
          franja('b', '2030-10-13', 'MORNING', { playerIds: [YO], placesTaken: 1 }),
          franja('c', '2030-10-14', 'MORNING'),
        ],
      });
      pinta({ endDate: '2030-10-14', maxMatchdaysPerPlayer: 2 });

      fireEvent.click((await en('c')).getByRole('button', { name: 'franjas.switchFor' }));
      expect(mockCoger).not.toHaveBeenCalled();
      fireEvent.click(
        (await en('c')).getByRole('button', { name: /^franjas\.leaveThis.*"franja":"sessions\.MORNING".*13/ })
      );

      await waitFor(() => expect(mockCoger).toHaveBeenCalledWith('c', { insteadOfRoundId: 'b' }));
    });

    it('5: la suya dice que tiene plaza y deja soltarla (con confirmación)', async () => {
      mockLeer.mockResolvedValue({ rounds: [franja('m', '2030-10-12', 'MORNING', { playerIds: [YO], placesTaken: 1 })] });
      pinta();

      const fila = await en('m');
      expect(fila.getByText('franjas.mine')).toBeInTheDocument();
      fireEvent.click(fila.getByRole('button', { name: 'franjas.release' }));
      expect(mockSoltar).not.toHaveBeenCalled();
      fireEvent.click(fila.getByRole('button', { name: 'franjas.releaseYes' }));

      await waitFor(() => expect(mockSoltar).toHaveBeenCalledWith('m', YO));
    });

    it('6: llena, se apunta a la espera', async () => {
      mockLeer.mockResolvedValue({
        rounds: [franja('m', '2030-10-12', 'MORNING', { capacity: 2, placesTaken: 2, playerIds: ['ana', 'bea'] })],
      });
      pinta();

      fireEvent.click((await en('m')).getByRole('button', { name: 'franjas.wait' }));

      await waitFor(() => expect(mockEsperar).toHaveBeenCalledWith('m'));
    });

    it('7: esperando, su posición y salir de la espera', async () => {
      mockLeer.mockResolvedValue({
        rounds: [
          franja('m', '2030-10-12', 'MORNING', {
            capacity: 2,
            placesTaken: 2,
            playerIds: ['ana', 'bea'],
            waitingIds: ['sin', 'x', YO],
          }),
        ],
      });
      pinta();

      const fila = await en('m');
      expect(fila.getByText('franjas.waitingPosition {"count":3}')).toBeInTheDocument();
      fireEvent.click(fila.getByRole('button', { name: 'franjas.leaveWaiting' }));

      await waitFor(() => expect(mockDejarDeEsperar).toHaveBeenCalledWith('m', YO));
    });

    it('8: con las inscripciones cerradas ve su franja, sin botones', async () => {
      mockLeer.mockResolvedValue({
        rounds: [
          franja('m', '2030-10-12', 'MORNING', { playerIds: [YO], placesTaken: 1 }),
          franja('t', '2030-10-12', 'AFTERNOON'),
        ],
      });
      pinta({ puedeElegir: false });

      expect((await en('m')).getByText('franjas.mine')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^franjas\.(take|release|switchHere|wait)/ })).toBeNull();
    });

    it('9: quien no está inscrito no tiene botones ni cuenta de jornadas', async () => {
      mockLeer.mockResolvedValue({ rounds: [franja('m', '2030-10-12', 'MORNING')] });
      pinta({ estoyInscrito: false });

      await en('m');
      expect(screen.queryByRole('button', { name: 'franjas.take' })).toBeNull();
      expect(screen.queryByTestId('franjas-mis-jornadas')).toBeNull();
    });

    it('10b: si tras una acción no se puede releer, no se enseña su situación vieja (/code-review)', async () => {
      mockLeer.mockResolvedValue({ rounds: [franja('m', '2030-10-12', 'MORNING')] });
      pinta();
      const fila = await en('m');
      mockLeer.mockRejectedValue(new Error('429'));

      fireEvent.click(fila.getByRole('button', { name: 'franjas.take' }));

      expect(await screen.findByRole('button', { name: 'franjas.retry' })).toBeInTheDocument();
      expect(screen.queryByTestId('franjas-mis-jornadas')).toBeNull();
    });

    it('10: si el servidor lo rechaza, su motivo', async () => {
      mockCoger.mockRejectedValue(new Error('La franja está llena.'));
      mockLeer.mockResolvedValue({ rounds: [franja('m', '2030-10-12', 'MORNING')] });
      pinta();

      fireEvent.click((await en('m')).getByRole('button', { name: 'franjas.take' }));

      await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('La franja está llena.'));
    });
  });

  describe('los nombres', () => {
    it('11: desplegada, quién juega y quién espera, en orden', async () => {
      mockLeer.mockResolvedValue({
        rounds: [
          franja('m', '2030-10-12', 'MORNING', {
            capacity: 2,
            placesTaken: 2,
            playerIds: ['ana', 'bea'],
            waitingIds: ['sin'],
          }),
        ],
      });
      pinta();

      const fila = await en('m');
      fireEvent.click(fila.getByRole('button', { name: /^franjas\.showPlayers/ }));

      const jugadores = fila.getByTestId('jugadores-m');
      expect(within(jugadores).getByText('Ana Alba')).toBeInTheDocument();
      expect(within(jugadores).getByText('Bea Blanco')).toBeInTheDocument();
      expect(within(fila.getByTestId('espera-m')).getByText('Sin Franja')).toBeInTheDocument();
    });
  });

  describe('el organizador', () => {
    const organizador = (extra = {}) =>
      pinta({ canManage: true, puedeColocar: true, puedeQuitar: true, estoyInscrito: false, ...extra });

    beforeEach(() => {
      mockLeer.mockResolvedValue({
        rounds: [
          franja('m', '2030-10-12', 'MORNING', { playerIds: ['ana'], placesTaken: 1 }),
          franja('t', '2030-10-12', 'AFTERNOON'),
          franja('x', '2030-10-13', 'MORNING', { capacity: 1, placesTaken: 1, playerIds: ['bea'] }),
        ],
      });
    });

    it('12: mueve a un jugador a otra franja con sitio, en un paso', async () => {
      organizador();
      const fila = await en('m');
      fireEvent.click(fila.getByRole('button', { name: /^franjas\.showPlayers/ }));

      const mover = fila.getByLabelText('franjas.moveTo {"jugador":"Ana Alba"}');
      // Solo las que tienen sitio: la «x» está llena
      expect([...mover.options].map((o) => o.value).filter(Boolean)).toEqual(['t']);
      fireEvent.change(mover, { target: { value: 't' } });

      await waitFor(() => expect(mockCoger).toHaveBeenCalledWith('t', { userId: 'ana', insteadOfRoundId: 'm' }));
    });

    it('13: quita a un jugador con las inscripciones abiertas', async () => {
      organizador();
      const fila = await en('m');
      fireEvent.click(fila.getByRole('button', { name: /^franjas\.showPlayers/ }));

      fireEvent.click(fila.getByRole('button', { name: 'franjas.removePlayer {"jugador":"Ana Alba"}' }));
      fireEvent.click(fila.getByRole('button', { name: 'franjas.removePlayerYes' }));

      await waitFor(() => expect(mockSoltar).toHaveBeenCalledWith('m', 'ana'));
    });

    it('13c: quitar pide confirmación: la plaza la coge al momento el primero de la espera (/code-review)', async () => {
      organizador();
      const fila = await en('m');
      fireEvent.click(fila.getByRole('button', { name: /^franjas\.showPlayers/ }));

      fireEvent.click(fila.getByRole('button', { name: 'franjas.removePlayer {"jugador":"Ana Alba"}' }));
      expect(mockSoltar).not.toHaveBeenCalled();
      fireEvent.click(fila.getByRole('button', { name: 'franjas.removePlayerYes' }));

      await waitFor(() => expect(mockSoltar).toHaveBeenCalledWith('m', 'ana'));
    });

    it('13b: cerradas, ya no se quita (se mueve)', async () => {
      organizador({ puedeQuitar: false });
      const fila = await en('m');
      fireEvent.click(fila.getByRole('button', { name: /^franjas\.showPlayers/ }));

      expect(fila.queryByRole('button', { name: /^franjas\.removePlayer/ })).toBeNull();
      expect(fila.getByLabelText('franjas.moveTo {"jugador":"Ana Alba"}')).toBeInTheDocument();
    });

    it('14: «Sin franja» lista a los aprobados sin ninguna y los coloca', async () => {
      organizador();

      const bloque = await screen.findByTestId('sin-franja');
      expect(within(bloque).getByText('Sin Franja')).toBeInTheDocument();
      expect(within(bloque).getByText('Yo Mismo')).toBeInTheDocument();
      expect(within(bloque).queryByText('Ana Alba')).toBeNull();
      fireEvent.change(within(bloque).getByLabelText('franjas.placeIn {"jugador":"Sin Franja"}'), {
        target: { value: 't' },
      });

      await waitFor(() => expect(mockCoger).toHaveBeenCalledWith('t', { userId: 'sin' }));
    });

    it('12b: «Mover a…» no ofrece franjas de un día en que el jugador ya juega en otra', async () => {
      mockLeer.mockResolvedValue({
        rounds: [
          franja('m', '2030-10-12', 'MORNING', { playerIds: ['ana'], placesTaken: 1 }),
          franja('t', '2030-10-12', 'AFTERNOON'),
          franja('d', '2030-10-13', 'MORNING', { playerIds: ['ana'], placesTaken: 1 }),
          franja('e', '2030-10-13', 'AFTERNOON'),
        ],
      });
      organizador({ maxMatchdaysPerPlayer: 2 });
      const fila = await en('m');
      fireEvent.click(fila.getByRole('button', { name: /^franjas\.showPlayers/ }));

      const mover = fila.getByLabelText('franjas.moveTo {"jugador":"Ana Alba"}');
      // Del mismo día sí (es cambiarse); del 13, donde ya juega, no
      expect([...mover.options].map((o) => o.value).filter(Boolean)).toEqual(['t']);
    });

    it('si tras una acción no se puede releer, no quedan acciones sobre datos viejos', async () => {
      organizador();
      await en('m');
      mockLeer.mockRejectedValue(new Error('429'));

      fireEvent.change(within(await screen.findByTestId('sin-franja')).getByLabelText('franjas.placeIn {"jugador":"Sin Franja"}'), {
        target: { value: 't' },
      });

      expect(await screen.findByRole('button', { name: 'franjas.retry' })).toBeInTheDocument();
      expect(screen.queryByTestId('sin-franja')).toBeNull();
      expect(screen.getByTestId('franja-m')).toBeInTheDocument();
      fireEvent.click(within(screen.getByTestId('franja-m')).getByRole('button', { name: /^franjas\.showPlayers/ }));
      expect(screen.queryByLabelText(/^franjas\.moveTo/)).toBeNull();
    });

    it('14b: con todos colocados, no hay bloque', async () => {
      organizador({ inscritos: INSCRITOS.filter((i) => ['ana', 'bea'].includes(i.userId)) });

      await en('m');
      expect(screen.queryByTestId('sin-franja')).toBeNull();
    });

    it('sin poder colocar (en juego), ni mover ni el bloque', async () => {
      organizador({ puedeColocar: false, puedeQuitar: false });
      const fila = await en('m');
      fireEvent.click(fila.getByRole('button', { name: /^franjas\.showPlayers/ }));

      expect(fila.queryByLabelText(/^franjas\.moveTo/)).toBeNull();
      expect(screen.queryByTestId('sin-franja')).toBeNull();
    });
  });
});
