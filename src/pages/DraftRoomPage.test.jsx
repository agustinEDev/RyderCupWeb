import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * La sala de draft (FE #653).
 *
 * La ceremonia la ve todo el grupo, no solo los dos capitanes: esta pantalla
 * tiene que decir bien tres cosas distintas según quién mire —el que elige, el
 * que espera su turno y el que solo mira— y no ofrecer botones que el servidor
 * vaya a rechazar.
 */
// `t` y el objeto de `useTranslation`, ESTABLES: la pantalla carga en un
// `useCallback` que depende de ellos, y uno nuevo por render la recarga sin
// parar (nos pasó el 22 sep en dos pantallas)
const t = (clave, params) => {
  if (params?.name) return `${clave}_${params.name}`;
  if (params?.team) return `${clave}_${params.team}`;
  return clave;
};
const traduccion = { i18n: { language: 'es' }, t };
vi.mock('react-i18next', () => ({ useTranslation: () => traduccion }));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => ({ children, ...props }) => <div {...props}>{children}</div> }),
}));
const mockCabecera = vi.fn();
vi.mock('../components/layout/HeaderAuth', () => ({
  default: (props) => {
    mockCabecera(props);
    return null;
  },
}));
vi.mock('../components/ui/FullScreenLoader', () => ({ default: () => null }));

const SESION = { user: { id: 'ana' }, loading: false };
vi.mock('../hooks/useAuth', () => ({ useAuth: () => SESION }));

const mockSala = vi.fn();
const mockAbrir = vi.fn();
const mockElegir = vi.fn();
const mockDetalle = vi.fn();

vi.mock('../hooks/useDraftRoom', () => ({ default: () => mockSala() }));
vi.mock('../composition', () => ({
  getCompetitionDetailUseCase: { execute: (...a) => mockDetalle(...a) },
}));

const DraftRoomPage = (await import('./DraftRoomPage')).default;

const COMPETICION = {
  id: 'comp-1',
  name: 'Ryder de los amigos',
  creatorId: 'ana',
  team1Name: 'Europa',
  team2Name: 'América',
};

const SALA = {
  id: 's1',
  competitionId: 'comp-1',
  status: 'IN_PROGRESS',
  firstPick: 'A',
  currentTeam: 'A',
  turnStartedAt: '2030-06-01T10:00:00',
  secondsPerTurn: 60,
  serverTime: '2030-06-01T10:00:20',
  teamACaptainId: 'ana',
  teamBCaptainId: 'bea',
  teamACaptainName: 'Ana Alba',
  teamBCaptainName: 'Bea Blanco',
  teamA: ['ana'],
  teamB: ['bea'],
  picks: [],
  availablePlayers: [
    { userId: 'carla', name: 'Carla Cruz', handicap: 8 },
    { userId: 'dani', name: 'Dani Díaz', handicap: 20 },
  ],
};

const estado = (extra = {}) => ({
  sala: SALA,
  cargando: false,
  error: null,
  segundosRestantes: 40,
  esMiTurno: true,
  refrescar: vi.fn(),
  abrirSala: mockAbrir,
  elegir: mockElegir,
  ...extra,
});

const pintar = () =>
  render(
    <MemoryRouter initialEntries={['/competitions/comp-1/draft']}>
      <Routes>
        <Route path="/competitions/:id/draft" element={<DraftRoomPage />} />
      </Routes>
    </MemoryRouter>
  );

describe('DraftRoomPage · la sala en directo (FE #653)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDetalle.mockResolvedValue(COMPETICION);
    // El doble tiene que devolver una promesa, como la función de verdad: la
    // pantalla hace `abrirSala().catch(...)` para no dejar el rechazo suelto, y
    // con un `undefined` eso revienta dentro del `onClick`. Vitest lo cuenta
    // como «1 error» con todos los tests en verde, y el CI se cae
    mockAbrir.mockResolvedValue(undefined);
    mockSala.mockReturnValue(estado());
  });

  it('D1: al que le toca se lo dice, con el tiempo que le queda', async () => {
    pintar();

    expect(await screen.findByTestId('mi-turno')).toBeInTheDocument();
    expect(screen.getByTestId('contador')).toHaveTextContent('0:40');
  });

  it('D2: y puede elegir a cualquiera de los disponibles', async () => {
    pintar();

    fireEvent.click(await screen.findByTestId('elegir-carla'));

    await waitFor(() => expect(mockElegir).toHaveBeenCalledWith('carla'));
  });

  it('D3: al capitán que espera no se le ofrece elegir', async () => {
    mockSala.mockReturnValue(estado({ esMiTurno: false }));
    pintar();

    await screen.findByTestId('sala-de-draft');
    expect(screen.queryByTestId('elegir-carla')).not.toBeInTheDocument();
    // Pero sigue viendo de quién es el turno, con su nombre
    expect(screen.getByTestId('turno-de')).toHaveTextContent('Ana Alba');
  });

  it('D4: los dos equipos se ven llenándose, con el capitán el primero', async () => {
    mockSala.mockReturnValue(
      estado({
        sala: {
          ...SALA,
          teamA: ['ana', 'carla'],
          picks: [{ userId: 'carla', name: 'Carla Cruz', team: 'A', order: 1, automatic: false }],
          availablePlayers: [{ userId: 'dani', name: 'Dani Díaz', handicap: 20 }],
        },
      })
    );
    pintar();

    const equipoA = await screen.findByTestId('equipo-A');
    expect(within(equipoA).getByText('Ana Alba')).toBeInTheDocument();
    expect(within(equipoA).getByText('Carla Cruz')).toBeInTheDocument();
    expect(within(screen.getByTestId('equipo-B')).getByText('Bea Blanco')).toBeInTheDocument();
  });

  it('D5: lo que eligió la aplicación se dice, no se disimula', async () => {
    // Al capitán que vuelve le tiene que quedar claro por qué tiene a ese
    mockSala.mockReturnValue(
      estado({
        sala: {
          ...SALA,
          teamA: ['ana', 'carla'],
          picks: [{ userId: 'carla', name: 'Carla Cruz', team: 'A', order: 1, automatic: true }],
        },
      })
    );
    pintar();

    const equipoA = await screen.findByTestId('equipo-A');
    expect(within(equipoA).getByTestId('automatica-carla')).toBeInTheDocument();
  });

  it('D5b: el último que entra solo no se cuenta como minuto agotado', async () => {
    // Nadie lo eligió: ni el capitán ni la app por un minuto que no se agotó
    mockSala.mockReturnValue(
      estado({
        sala: {
          ...SALA,
          status: 'COMPLETED',
          currentTeam: null,
          teamA: ['ana', 'carla'],
          availablePlayers: [],
          picks: [
            { userId: 'carla', name: 'Carla Cruz', team: 'A', order: 1, automatic: false, lastRemaining: true },
          ],
        },
        segundosRestantes: null,
        esMiTurno: false,
      })
    );
    pintar();

    const equipoA = await screen.findByTestId('equipo-A');
    expect(within(equipoA).queryByTestId('automatica-carla')).not.toBeInTheDocument();
  });

  /**
   * FE #723 (decidido por Agustín, 26 sep): sin etiqueta «Último». Solo el
   * capitán del equipo que lo recibe lee, debajo de los equipos, que ese jugador
   * entró al ser la última elección.
   *
   *   U1  lo mira el capitán que lo recibe     | la línea con el nombre, sin etiqueta
   *   U2  lo mira el otro capitán              | nada
   *   U3  lo mira quien no capitanea           | nada
   */
  describe('el último jugador (FE #723)', () => {
    const conUltimo = () =>
      mockSala.mockReturnValue(
        estado({
          sala: {
            ...SALA,
            status: 'COMPLETED',
            currentTeam: null,
            teamA: ['ana', 'carla'],
            availablePlayers: [],
            picks: [
              { userId: 'carla', name: 'Carla Cruz', team: 'A', order: 1, automatic: false, lastRemaining: true },
            ],
          },
          segundosRestantes: null,
          esMiTurno: false,
        })
      );

    afterEach(() => {
      SESION.user = { id: 'ana' };
    });

    it('U1: el capitán que lo recibe lo lee debajo de los equipos, sin etiqueta', async () => {
      conUltimo();
      pintar();

      expect(await screen.findByTestId('ultimo-incluido')).toHaveTextContent(
        'draft.lastIncluded_Carla Cruz'
      );
      expect(screen.queryByText('draft.lastRemaining')).not.toBeInTheDocument();
    });

    it.each([
      ['U2: el otro capitán', 'bea'],
      ['U3: quien no capitanea', 'dani'],
    ])('%s no lo lee', async (_caso, quien) => {
      SESION.user = { id: quien };
      conUltimo();
      pintar();

      await screen.findByTestId('equipo-A');
      expect(screen.queryByTestId('ultimo-incluido')).not.toBeInTheDocument();
      expect(screen.queryByText('draft.lastRemaining')).not.toBeInTheDocument();
    });
  });

  it('D6: sin sala, el organizador puede lanzar el sorteo', async () => {
    mockSala.mockReturnValue(estado({ sala: null, segundosRestantes: null, esMiTurno: false }));
    pintar();

    fireEvent.click(await screen.findByTestId('lanzar-sorteo'));

    await waitFor(() => expect(mockAbrir).toHaveBeenCalled());
  });

  it('D7: y el resto solo espera: no se le ofrece un botón que el servidor rechaza', async () => {
    mockDetalle.mockResolvedValue({ ...COMPETICION, creatorId: 'otro' });
    mockSala.mockReturnValue(estado({ sala: null, segundosRestantes: null, esMiTurno: false }));
    pintar();

    expect(await screen.findByTestId('sin-sorteo')).toBeInTheDocument();
    expect(screen.queryByTestId('lanzar-sorteo')).not.toBeInTheDocument();
  });

  it('D8: terminada, lo dice y ya no ofrece elegir', async () => {
    mockSala.mockReturnValue(
      estado({
        sala: { ...SALA, status: 'COMPLETED', currentTeam: null, availablePlayers: [] },
        segundosRestantes: null,
        esMiTurno: false,
      })
    );
    pintar();

    expect(await screen.findByTestId('draft-terminado')).toBeInTheDocument();
    expect(screen.queryByTestId('mi-turno')).not.toBeInTheDocument();
  });

  it('D9: el turno perdido se explica, no sale un error a secas', async () => {
    mockSala.mockReturnValue(estado({ error: 'turnoPerdido' }));
    pintar();

    expect(await screen.findByText('draft.turnLost')).toBeInTheDocument();
  });

  it('D9b: si con su minuto agotado la sala terminó, no le manda a esperar al otro', async () => {
    mockSala.mockReturnValue(
      estado({
        error: 'turnoPerdidoYTerminado',
        sala: { ...SALA, status: 'COMPLETED', currentTeam: null, availablePlayers: [] },
        segundosRestantes: null,
        esMiTurno: false,
      })
    );
    pintar();

    expect(await screen.findByText('draft.turnLostDraftOver')).toBeInTheDocument();
    expect(screen.queryByText('draft.turnLost')).not.toBeInTheDocument();
    expect(screen.queryByText('turnoPerdidoYTerminado')).not.toBeInTheDocument();
  });

  it('D9c: el texto lo decide el hook, no el estado de la sala al pintar', async () => {
    mockSala.mockReturnValue(
      estado({
        error: 'turnoPerdido',
        sala: { ...SALA, status: 'COMPLETED', currentTeam: null, availablePlayers: [] },
        segundosRestantes: null,
        esMiTurno: false,
      })
    );
    pintar();

    expect(await screen.findByText('draft.turnLost')).toBeInTheDocument();
  });

  it('D10b: un error que se llama como algo del prototipo sigue siendo un error', async () => {
    mockSala.mockReturnValue(estado({ error: 'toString' }));
    pintar();

    expect(await screen.findByText('toString')).toBeInTheDocument();
  });

  it('D10: y cualquier otro fallo se enseña tal cual', async () => {
    mockSala.mockReturnValue(estado({ error: 'Boom', sala: null }));
    pintar();

    expect(await screen.findByText('Boom')).toBeInTheDocument();
  });

  it('D12: sin contador no se pinta un turno perdido en rojo', async () => {
    // `null <= 10` es cierto: la sala en marcha sin reloj enseñaba «0:00» en
    // rojo de alarma, dando por vencido un turno del que no se sabe nada
    mockSala.mockReturnValue(estado({ segundosRestantes: null, esMiTurno: false }));
    pintar();

    const contador = await screen.findByTestId('contador');
    expect(contador.className).not.toContain('text-red-600');
  });

  it('D13: sin saber quién mira, no se ofrece lanzar el sorteo', async () => {
    // `undefined === undefined` es cierto: con la ficha sin cargar y la sesión
    // sin hidratar, el botón salía para cualquiera y el servidor lo rechazaba
    mockDetalle.mockRejectedValue(new Error('Boom'));
    SESION.user = null;
    mockSala.mockReturnValue(estado({ sala: null, segundosRestantes: null, esMiTurno: false }));
    try {
      pintar();

      expect(await screen.findByTestId('sin-sorteo')).toBeInTheDocument();
      expect(screen.queryByTestId('lanzar-sorteo')).not.toBeInTheDocument();
    } finally {
      SESION.user = { id: 'ana' };
    }
  });

  it('D14: un sorteo rechazado no deja una promesa sin capturar', async () => {
    // `abrirSala` relanza tras guardar el aviso: sin capturarlo, el 400 acaba
    // en Sentry como error no controlado además de pintarse en pantalla
    const fallo = new Error('La sala de draft ya estaba abierta');
    mockAbrir.mockRejectedValue(fallo);
    mockSala.mockReturnValue(estado({ sala: null, segundosRestantes: null, esMiTurno: false }));
    const sinCapturar = vi.fn();
    globalThis.addEventListener('unhandledrejection', sinCapturar);
    try {
      pintar();

      fireEvent.click(await screen.findByTestId('lanzar-sorteo'));

      await waitFor(() => expect(mockAbrir).toHaveBeenCalled());
      await new Promise((r) => setTimeout(r, 10));
      expect(sinCapturar).not.toHaveBeenCalled();
    } finally {
      globalThis.removeEventListener('unhandledrejection', sinCapturar);
    }
  });

  it('D15: sin la ficha cargada, los equipos se llaman por su letra', async () => {
    // El nombre de equipo no puede venir de un `||`: el mapper de la ficha ya
    // rellena «Team 1» y «Team 2» cuando faltan, así que ese respaldo nunca
    // entraba y la sala enseñaba inglés con la app en español
    mockDetalle.mockRejectedValue(new Error('Boom'));
    pintar();

    const equipoA = await screen.findByTestId('equipo-A');
    expect(within(equipoA).getByText('draft.teamA')).toBeInTheDocument();
  });

  it('D11: cada disponible se ve con su hándicap, que es con lo que se elige', async () => {
    pintar();

    const fila = await screen.findByTestId('disponible-carla');
    expect(within(fila).getByText('Carla Cruz')).toBeInTheDocument();
    expect(within(fila).getByText('8')).toBeInTheDocument();
  });
});

/**
 * LA TABLA de la sala en el bloque 3 de la FE #710.
 *
 *   #    caso                                  | qué pasa
 *   -----|-------------------------------------|---------------------------------------
 *   DR1  la cabecera                           | recibe la sesión: iniciales e insignia, no «?»
 *   DR2  «Por elegir»                          | por hándicap, de menor a mayor; sin él, al final
 *   DR3  nombres largos en los equipos a 360   | se parten en líneas, no se cortan
 *   DR4  el organizador, antes del sorteo      | no lee «el organizador todavía no…» junto a su botón
 */
describe('DraftRoomPage · lo que se lee (FE #710)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDetalle.mockResolvedValue(COMPETICION);
    mockSala.mockReturnValue(estado());
  });

  it('DR1: la cabecera recibe la sesión', async () => {
    pintar();

    await screen.findByTestId('sala-de-draft');
    expect(mockCabecera).toHaveBeenLastCalledWith(expect.objectContaining({ user: SESION.user }));
  });

  it('DR2: «Por elegir» va por hándicap, y sin él al final', async () => {
    mockSala.mockReturnValue(
      estado({
        sala: {
          ...SALA,
          availablePlayers: [
            { userId: 'dani', name: 'Dani Díaz', handicap: 20 },
            { userId: 'eva', name: 'Eva Esteve', handicap: null },
            { userId: 'carla', name: 'Carla Cruz', handicap: 8 },
            { userId: 'fer', name: 'Fer Fuentes', handicap: 15.4 },
          ],
        },
      })
    );
    pintar();

    await screen.findByTestId('sala-de-draft');
    const orden = screen
      .getAllByTestId(/^disponible-/)
      .map((fila) => fila.dataset.testid.replace('disponible-', ''));
    expect(orden).toEqual(['carla', 'fer', 'dani', 'eva']);
  });

  it('DR3: en los equipos los nombres se parten, no se cortan', async () => {
    mockSala.mockReturnValue(
      estado({
        sala: {
          ...SALA,
          picks: [{ userId: 'carla', name: 'Carla Cruz', team: 'A', lastRemaining: true }],
        },
      })
    );
    pintar();

    const equipo = await screen.findByTestId('equipo-A');
    expect(within(equipo).getByText('Ana Alba').className).not.toContain('truncate');
    expect(within(equipo).getByText('Carla Cruz').className).not.toContain('truncate');
  });

  it.each([
    ['DR4: el organizador lee que lo lanza él', 'ana', 'draft.notStartedYouLaunch'],
    ['DR4b: los demás, que lo lanzará el organizador', 'bea', 'draft.notStarted'],
  ])('%s', async (_caso, creador, texto) => {
    mockDetalle.mockResolvedValue({ ...COMPETICION, creatorId: creador });
    mockSala.mockReturnValue(estado({ sala: null }));
    pintar();

    await waitFor(() => expect(screen.getByTestId('sin-sorteo')).toHaveTextContent(texto));
    expect(screen.getByTestId('sin-sorteo').textContent).toBe(texto);
  });
});
