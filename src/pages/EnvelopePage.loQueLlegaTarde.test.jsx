import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router';

/**
 * El sobre, cuando lo pedido llega tarde o se cambia de ronda sin salir (T5):
 * el fallo de una carga que llega después de salir no avisa en otra pantalla,
 * y la ronda nueva empieza con el sobre limpio y sin la espera de pantalla
 * completa.
 */
const t = (clave) => clave;
const traduccion = { i18n: { language: 'es' }, t };
vi.mock('react-i18next', () => ({ useTranslation: () => traduccion }));
vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        () =>
        ({ children, ...props }) => <div {...props}>{children}</div>,
    },
  ),
}));
vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));
// Aquí la espera SÍ se pinta: es lo que se mira al cambiar de ronda
vi.mock('../components/ui/FullScreenLoader', () => ({
  default: () => <p data-testid="espera-de-pantalla" />,
}));

const SESION = { user: { id: 'ana' }, loading: false };
vi.mock('../hooks/useAuth', () => ({ useAuth: () => SESION }));

const mockVer = vi.fn();
const mockEntregar = vi.fn();
const mockAbrir = vi.fn();
const mockCompeticion = vi.fn();
vi.mock('../composition', () => ({
  getCompetitionDetailUseCase: { execute: (...a) => mockCompeticion(...a) },
  getEnvelopesUseCase: { execute: (...a) => mockVer(...a) },
  submitEnvelopeUseCase: { execute: (...a) => mockEntregar(...a) },
  revealEnvelopesUseCase: { execute: (...a) => mockAbrir(...a) },
}));
vi.mock('../utils/toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));
import customToast from '../utils/toast';

const EnvelopePage = (await import('./EnvelopePage')).default;

const JUGADORES = [
  { userId: 'ana', name: 'Ana Alba', handicap: 8 },
  { userId: 'bea', name: 'Bea Blanco', handicap: 14 },
];

const vista = (extra = {}) => ({
  roundId: 'ronda-1',
  revealed: false,
  teamASubmitted: false,
  teamBSubmitted: false,
  teamAAutomatic: false,
  teamBAutomatic: false,
  mine: null,
  rival: null,
  rivalSubmitted: false,
  matchups: [],
  canReveal: false,
  playersPerRow: 1,
  teamsFitFormat: true,
  rivalWantsEarly: false,
  revealScheduledAt: '2030-06-01T00:00:00+02:00',
  myPlayers: JUGADORES,
  playerNames: {
    ana: 'Ana Alba',
    bea: 'Bea Blanco',
    carla: 'Carla Cruz',
    dani: 'Dani Díaz',
  },
  ...extra,
});

let irA;
const Navegador = () => {
  irA = useNavigate();
  return null;
};

const pintar = () =>
  render(
    <MemoryRouter
      initialEntries={['/competitions/comp-1/rounds/ronda-1/envelope']}
    >
      <Navegador />
      <Routes>
        <Route
          path="/competitions/:id/rounds/:roundId/envelope"
          element={<EnvelopePage />}
        />
        <Route path="*" element={<p data-testid="otra-pantalla" />} />
      </Routes>
    </MemoryRouter>,
  );

// La ronda 2 tarda: se puede mirar la pantalla mientras llega
const rondaDosLenta = (laVista) => {
  let devolver;
  mockVer.mockImplementation((roundId) =>
    roundId === 'ronda-2'
      ? new Promise((resolve) => {
          devolver = () => resolve(laVista);
        })
      : Promise.resolve(vista()),
  );
  return () => devolver();
};

describe('EnvelopePage · lo que llega tarde y el cambio de ronda (T5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVer.mockResolvedValue(vista());
    mockCompeticion.mockResolvedValue({
      team1Name: 'Europa',
      team2Name: 'América',
    });
  });

  it('T5-12: la carga lenta que falla después de salir no avisa en la otra pantalla', async () => {
    let fallar;
    mockVer.mockImplementation(
      () =>
        new Promise((_, reject) => {
          fallar = () => reject(new Error('Boom'));
        }),
    );
    pintar();
    await waitFor(() => expect(fallar).toBeTypeOf('function'));

    await act(async () => {
      irA('/competitions/comp-1/schedule');
    });
    await act(async () => {
      fallar();
      await Promise.resolve();
    });

    expect(screen.getByTestId('otra-pantalla')).toBeInTheDocument();
    expect(customToast.error).not.toHaveBeenCalled();
  });

  it('T5-19: con el orden tocado en la ronda 1, la ronda 2 empieza limpia y sin la espera de pantalla', async () => {
    const devolverRondaDos = rondaDosLenta(vista({ roundId: 'ronda-2' }));
    pintar();
    fireEvent.click(await screen.findByTestId('jugador-bea'));
    fireEvent.click(screen.getByTestId('sin-esperar'));
    expect(screen.getByTestId('puesto-bea')).toHaveTextContent('1');

    await act(async () => {
      irA('/competitions/comp-1/rounds/ronda-2/envelope');
    });
    await waitFor(() => expect(mockVer).toHaveBeenCalledWith('ronda-2'));
    expect(screen.queryByTestId('espera-de-pantalla')).not.toBeInTheDocument();
    await act(async () => {
      devolverRondaDos();
      await Promise.resolve();
    });

    expect(screen.queryByTestId('espera-de-pantalla')).not.toBeInTheDocument();
    expect(await screen.findByTestId('jugador-bea')).toBeInTheDocument();
    expect(screen.queryByTestId('puesto-bea')).not.toBeInTheDocument();
    expect(screen.getByTestId('sin-esperar')).not.toBeChecked();
    expect(screen.getByTestId('deshacer')).toBeDisabled();
  });

  it('T5-19b: reordenando el entregado de la ronda 1, en la ronda 2 se ve su propio sobre entregado', async () => {
    // Cada ronda con su sobre: el de la 2 tiene otro orden
    mockVer.mockImplementation(async (roundId) =>
      roundId === 'ronda-2'
        ? vista({
            roundId,
            mine: {
              submitted: true,
              entries: [['bea'], ['ana']],
              revealWhenBothReady: false,
            },
          })
        : vista({
            mine: {
              submitted: true,
              entries: [['ana'], ['bea']],
              revealWhenBothReady: false,
            },
          }),
    );
    pintar();
    fireEvent.click(await screen.findByTestId('cambiar-sobre'));
    expect(await screen.findByTestId('entregar-sobre')).toBeInTheDocument();

    await act(async () => {
      irA('/competitions/comp-1/rounds/ronda-2/envelope');
    });
    await waitFor(() => expect(mockVer).toHaveBeenCalledWith('ronda-2'));

    const guardado = await screen.findByTestId('orden-guardado');
    expect(guardado.textContent).toBe('1Bea Blanco2Ana Alba');
    expect(screen.getByTestId('sobre-entregado')).toBeInTheDocument();
    expect(screen.queryByTestId('entregar-sobre')).not.toBeInTheDocument();
    expect(screen.queryByTestId('espera-de-pantalla')).not.toBeInTheDocument();
  });

  it('T5-19c: con el sobre de la ronda 1 entregado, la ronda 2 no enseña ese sobre mientras carga la suya', async () => {
    // Con la vista de la ronda 1, «dar permiso» en la 2 reenviaba el orden
    // de la 1 como si fuera el de la 2, y el servidor lo aceptaba
    let darLaRondaDos;
    mockVer.mockImplementation((roundId) =>
      roundId === 'ronda-2'
        ? new Promise((resolve) => {
            darLaRondaDos = () => resolve(vista({ roundId }));
          })
        : Promise.resolve(
            vista({
              mine: {
                submitted: true,
                entries: [['ana'], ['bea']],
                revealWhenBothReady: false,
              },
            }),
          ),
    );
    pintar();
    expect(await screen.findByTestId('dar-permiso')).toBeInTheDocument();

    await act(async () => {
      irA('/competitions/comp-1/rounds/ronda-2/envelope');
    });
    await waitFor(() => expect(darLaRondaDos).toBeTypeOf('function'));

    // Mientras llega la suya: ni el sobre de la 1 ni sus botones, y sin la
    // espera de pantalla completa
    expect(screen.queryByTestId('sobre-entregado')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dar-permiso')).not.toBeInTheDocument();
    expect(screen.queryByTestId('orden-guardado')).not.toBeInTheDocument();
    expect(screen.queryByTestId('espera-de-pantalla')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();

    await act(async () => {
      darLaRondaDos();
      await Promise.resolve();
    });

    // La de la 2: aún sin entregar, se ordena
    expect(await screen.findByTestId('jugador-ana')).toBeInTheDocument();
    expect(screen.queryByTestId('sobre-entregado')).not.toBeInTheDocument();
    expect(screen.getByTestId('entregar-sobre')).toBeDisabled();
    expect(mockEntregar).not.toHaveBeenCalled();
  });

  it('T5-19d: si la carga de la ronda 2 falla, se ve su error y nada de la ronda 1', async () => {
    mockVer.mockImplementation(async (roundId) => {
      if (roundId === 'ronda-2') throw new Error('Boom');
      return vista({
        revealed: true,
        teamASubmitted: true,
        teamBSubmitted: true,
        matchups: [
          [['ana'], ['carla']],
          [['bea'], ['dani']],
        ],
      });
    });
    pintar();
    expect(await screen.findByTestId('enfrentamiento-0')).toBeInTheDocument();

    await act(async () => {
      irA('/competitions/comp-1/rounds/ronda-2/envelope');
    });

    expect(await screen.findByTestId('sobre-no-disponible')).toHaveTextContent(
      'Boom',
    );
    expect(screen.queryByTestId('enfrentamiento-0')).not.toBeInTheDocument();
    expect(screen.queryByTestId('espera-de-pantalla')).not.toBeInTheDocument();
  });

  // Uno a la vez: mientras la recarga de una acción está en vuelo, el tic
  // del refresco no sale. Si saliera, sustituiría a la recarga, y con un fallo
  // del refresco el estado que dejó la acción no llegaría a la pantalla
  describe('la recarga tras dar el permiso, lenta, con el tic del refresco en medio', () => {
    const entregadoYEsperando = () =>
      vista({
        teamASubmitted: true,
        mine: {
          team: 'A',
          entries: [['ana'], ['bea']],
          submitted: true,
          automatic: false,
        },
      });
    const conElPermiso = () =>
      vista({
        teamASubmitted: true,
        mine: {
          team: 'A',
          entries: [['ana'], ['bea']],
          submitted: true,
          automatic: false,
          revealWhenBothReady: true,
        },
      });
    const abiertos = () =>
      vista({
        revealed: true,
        teamASubmitted: true,
        teamBSubmitted: true,
        matchups: [
          [['ana'], ['carla']],
          [['bea'], ['dani']],
        ],
        mine: {
          team: 'A',
          entries: [['ana'], ['bea']],
          submitted: true,
          automatic: false,
        },
      });

    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      mockEntregar.mockResolvedValue({
        team: 'A',
        entries: [['ana'], ['bea']],
        automatic: false,
      });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    // `despues`: lo que contestaría el refresco si saliera
    const darElPermisoConLaRecargaLenta = async (recargaLenta, despues) => {
      let terminarLaRecarga;
      mockVer
        .mockResolvedValueOnce(entregadoYEsperando())
        .mockImplementationOnce(
          () =>
            new Promise((resolve, reject) => {
              terminarLaRecarga = () => recargaLenta(resolve, reject);
            }),
        )
        .mockImplementation(despues);
      pintar();
      fireEvent.click(await screen.findByTestId('dar-permiso'));
      await waitFor(() => expect(terminarLaRecarga).toBeTypeOf('function'));
      // El tic del refresco llega con la recarga aún en vuelo: no sale
      await act(async () => {
        await vi.advanceTimersByTimeAsync(11000);
      });
      expect(mockVer).toHaveBeenCalledTimes(2);
      await act(async () => {
        terminarLaRecarga();
        await Promise.resolve();
      });
    };

    it('T5-10b: el tic no sale y lo que trae la recarga llega a la pantalla', async () => {
      await darElPermisoConLaRecargaLenta(
        (resolve) => resolve(conElPermiso()),
        async () => abiertos(),
      );

      expect(await screen.findByTestId('retirar-permiso')).toBeInTheDocument();
      expect(screen.queryByTestId('enfrentamiento-0')).not.toBeInTheDocument();
    });

    it('T5-10c: si la recarga falla, avisa una vez y el refresco siguiente lo arregla', async () => {
      await darElPermisoConLaRecargaLenta(
        (_, reject) => reject(new Error('Boom')),
        async () => abiertos(),
      );

      expect(
        await screen.findByTestId('sobre-no-disponible'),
      ).toHaveTextContent('Boom');
      expect(customToast.error).toHaveBeenCalledTimes(1);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10000);
      });
      expect(await screen.findByTestId('enfrentamiento-0')).toBeInTheDocument();
      expect(
        screen.queryByTestId('sobre-no-disponible'),
      ).not.toBeInTheDocument();
      expect(customToast.error).toHaveBeenCalledTimes(1);
    });

    it('T5-10d: con un refresco que fallaría, el estado tras dar el permiso llega igual, sin avisos', async () => {
      await darElPermisoConLaRecargaLenta(
        (resolve) => resolve(conElPermiso()),
        async () => {
          throw new Error('Refresco caído');
        },
      );

      expect(await screen.findByTestId('retirar-permiso')).toBeInTheDocument();
      expect(
        screen.queryByTestId('sobre-no-disponible'),
      ).not.toBeInTheDocument();
      expect(customToast.error).not.toHaveBeenCalled();
    });
  });

  it('T5-19e: tras un refresco, si la carga de la ronda nueva falla, avisa igual', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const entregado = vista({
        teamASubmitted: true,
        mine: {
          team: 'A',
          entries: [['ana'], ['bea']],
          submitted: true,
          automatic: false,
        },
      });
      mockVer.mockImplementation(async (roundId) => {
        if (roundId === 'ronda-2') throw new Error('Boom');
        return entregado;
      });
      pintar();
      await screen.findByTestId('sobre-entregado');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(11000);
      });
      expect(mockVer).toHaveBeenCalledTimes(2);

      await act(async () => {
        irA('/competitions/comp-1/rounds/ronda-2/envelope');
      });

      expect(
        await screen.findByTestId('sobre-no-disponible'),
      ).toHaveTextContent('Boom');
      expect(customToast.error).toHaveBeenCalledWith('Boom');
    } finally {
      vi.useRealTimers();
    }
  });

  describe('T5-22: una entrega de la ronda 1 que vuelve ya en la ronda 2', () => {
    // Al volver, la entrega recargaba con la carga de la página, que ya es la
    // de la ronda 2: dejaba vieja su carga, y si esa recarga fallaba, la
    // ronda 2 enseñaba un error que no era suyo
    const entregarYPasarALaRonda2 = async (rondaDos) => {
      let terminarLaEntrega;
      mockEntregar.mockImplementation(
        () =>
          new Promise((resolve) => {
            terminarLaEntrega = () =>
              resolve({ team: 'A', entries: [['ana'], ['bea']] });
          }),
      );
      mockVer.mockImplementation((roundId) =>
        roundId === 'ronda-2' ? rondaDos() : Promise.resolve(vista()),
      );
      pintar();
      fireEvent.click(await screen.findByTestId('jugador-ana'));
      fireEvent.click(screen.getByTestId('jugador-bea'));
      fireEvent.click(screen.getByTestId('entregar-sobre'));
      await waitFor(() => expect(terminarLaEntrega).toBeTypeOf('function'));
      await act(async () => {
        irA('/competitions/comp-1/rounds/ronda-2/envelope');
      });
      await waitFor(() => expect(mockVer).toHaveBeenCalledWith('ronda-2'));
      return terminarLaEntrega;
    };
    it('en modo estricto (montar, desmontar y volver a montar), entregar sin cambiar de ronda sí recarga', async () => {
      mockEntregar.mockResolvedValue({
        team: 'A',
        entries: [['ana'], ['bea']],
      });
      render(
        <StrictMode>
          <MemoryRouter
            initialEntries={['/competitions/comp-1/rounds/ronda-1/envelope']}
          >
            <Routes>
              <Route
                path="/competitions/:id/rounds/:roundId/envelope"
                element={<EnvelopePage />}
              />
            </Routes>
          </MemoryRouter>
        </StrictMode>,
      );
      fireEvent.click(await screen.findByTestId('jugador-ana'));
      fireEvent.click(screen.getByTestId('jugador-bea'));
      const antes = mockVer.mock.calls.length;

      fireEvent.click(screen.getByTestId('entregar-sobre'));

      await waitFor(() => expect(mockVer.mock.calls.length).toBe(antes + 1));
    });

    const llamadasDeLaRonda2 = () =>
      mockVer.mock.calls.filter(([roundId]) => roundId === 'ronda-2').length;

    it('con la carga de la ronda 2 en vuelo, no la deja vieja: llega la suya', async () => {
      let darLaRonda2;
      const terminarLaEntrega = await entregarYPasarALaRonda2(
        () =>
          new Promise((resolve) => {
            darLaRonda2 = () =>
              resolve(
                vista({
                  roundId: 'ronda-2',
                  myPlayers: [
                    { userId: 'carla', name: 'Carla Cruz', handicap: 20 },
                  ],
                }),
              );
          }),
      );

      await act(async () => {
        terminarLaEntrega();
        await Promise.resolve();
      });
      await act(async () => {
        darLaRonda2();
        await Promise.resolve();
      });

      expect(await screen.findByTestId('jugador-carla')).toBeInTheDocument();
      expect(llamadasDeLaRonda2()).toBe(1);
    });

    it('con la ronda 2 ya cargada, no la recarga ni le pone un error que no es suyo', async () => {
      let veces = 0;
      const terminarLaEntrega = await entregarYPasarALaRonda2(() => {
        veces += 1;
        return veces === 1
          ? Promise.resolve(vista({ roundId: 'ronda-2' }))
          : Promise.reject(new Error('Boom'));
      });
      expect(await screen.findByTestId('jugador-ana')).toBeInTheDocument();

      await act(async () => {
        terminarLaEntrega();
        await Promise.resolve();
      });

      expect(llamadasDeLaRonda2()).toBe(1);
      expect(
        screen.queryByTestId('sobre-no-disponible'),
      ).not.toBeInTheDocument();
      expect(customToast.error).not.toHaveBeenCalled();
    });
  });

  it('T5-21: los nombres de los equipos, solo con un sobre automático, y su fallo no se nota', async () => {
    mockCompeticion.mockRejectedValue(new Error('Boom'));
    mockVer.mockResolvedValue(
      vista({
        revealed: true,
        teamAAutomatic: true,
        matchups: [[['ana'], ['carla']]],
      }),
    );
    pintar();

    expect(await screen.findByTestId('automatico')).toHaveTextContent(
      'envelope.filledByTheApp',
    );
    await waitFor(() => expect(mockCompeticion).toHaveBeenCalledWith('comp-1'));
    expect(customToast.error).not.toHaveBeenCalled();
    expect(screen.queryByTestId('sobre-no-disponible')).not.toBeInTheDocument();
  });

  it('T5-21b: sin sobre automático no se piden', async () => {
    pintar();
    await screen.findByTestId('jugador-ana');

    expect(mockCompeticion).not.toHaveBeenCalled();
  });
});
