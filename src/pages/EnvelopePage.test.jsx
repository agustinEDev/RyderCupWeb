import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * El sobre de un capitán (FE #655).
 *
 * Se ordena tocando: el primer toque es el primero que juega. En un teléfono
 * eso es lo único que funciona bien —arrastrar filas con el dedo se pelea con
 * el scroll— y además deja claro el orden mientras se construye.
 *
 * Lo que la pantalla no puede hacer: enseñar la lista del rival antes de que
 * se abran los sobres, ni ofrecer abrirlos a quien el servidor va a rechazar.
 */
const t = (clave, params) => {
  if (params?.count !== undefined) return `${clave}_${params.count}`;
  return clave;
};
const traduccion = { i18n: { language: 'es' }, t };
vi.mock('react-i18next', () => ({ useTranslation: () => traduccion }));
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => ({ children, ...props }) => <div {...props}>{children}</div> }),
}));
vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));
vi.mock('../components/ui/FullScreenLoader', () => ({ default: () => null }));

const SESION = { user: { id: 'ana' }, loading: false };
vi.mock('../hooks/useAuth', () => ({ useAuth: () => SESION }));

const mockVer = vi.fn();
const mockEntregar = vi.fn();
const mockAbrir = vi.fn();
vi.mock('../composition', () => ({
  getEnvelopesUseCase: { execute: (...a) => mockVer(...a) },
  submitEnvelopeUseCase: { execute: (...a) => mockEntregar(...a) },
  revealEnvelopesUseCase: { execute: (...a) => mockAbrir(...a) },
}));
vi.mock('../utils/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
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
  myPlayers: JUGADORES,
  playerNames: { ana: 'Ana Alba', bea: 'Bea Blanco', carla: 'Carla Cruz', dani: 'Dani Díaz' },
  ...extra,
});

const pintar = () =>
  render(
    <MemoryRouter initialEntries={['/competitions/comp-1/rounds/ronda-1/envelope']}>
      <Routes>
        <Route
          path="/competitions/:id/rounds/:roundId/envelope"
          element={<EnvelopePage />}
        />
      </Routes>
    </MemoryRouter>
  );

describe('EnvelopePage · el sobre del capitán (FE #655)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVer.mockResolvedValue(vista());
    mockEntregar.mockResolvedValue({ team: 'A', entries: [['bea'], ['ana']], automatic: false });
    mockAbrir.mockResolvedValue({ matchups: [], filledAutomatically: [] });
  });

  it('V1: el capitán ve a los suyos con su hándicap', async () => {
    pintar();

    const fila = await screen.findByTestId('jugador-ana');
    expect(within(fila).getByText('Ana Alba')).toBeInTheDocument();
    expect(within(fila).getByText('8')).toBeInTheDocument();
  });

  it('V2: el orden se construye tocando, y se ve el número de cada uno', async () => {
    pintar();

    fireEvent.click(await screen.findByTestId('jugador-bea'));

    expect(screen.getByTestId('puesto-bea')).toHaveTextContent('1');
    expect(screen.queryByTestId('puesto-ana')).not.toBeInTheDocument();
  });

  it('V3: no se entrega hasta que están todos', async () => {
    pintar();
    const entregar = async () => screen.findByTestId('entregar-sobre');

    expect(await entregar()).toBeDisabled();
    fireEvent.click(screen.getByTestId('jugador-bea'));
    expect(await entregar()).toBeDisabled();
    fireEvent.click(screen.getByTestId('jugador-ana'));
    expect(await entregar()).toBeEnabled();
  });

  it('V4: al entregar se manda el orden tocado, no el de la lista', async () => {
    pintar();
    fireEvent.click(await screen.findByTestId('jugador-bea'));
    fireEvent.click(screen.getByTestId('jugador-ana'));

    fireEvent.click(screen.getByTestId('entregar-sobre'));

    await waitFor(() =>
      expect(mockEntregar).toHaveBeenCalledWith('ronda-1', [['bea'], ['ana']])
    );
  });

  it('V5: se puede deshacer el último toque', async () => {
    pintar();
    fireEvent.click(await screen.findByTestId('jugador-bea'));
    fireEvent.click(screen.getByTestId('jugador-ana'));

    fireEvent.click(screen.getByTestId('deshacer'));

    expect(screen.queryByTestId('puesto-ana')).not.toBeInTheDocument();
    expect(screen.getByTestId('puesto-bea')).toHaveTextContent('1');
  });

  it('V6: entregado, se ve el orden guardado y se puede cambiar', async () => {
    mockVer.mockResolvedValue(
      vista({
        teamASubmitted: true,
        mine: { team: 'A', entries: [['bea'], ['ana']], submitted: true, automatic: false },
      })
    );
    pintar();

    expect(await screen.findByTestId('sobre-entregado')).toBeInTheDocument();
    expect(screen.getByTestId('orden-guardado')).toHaveTextContent('Bea Blanco');
    expect(screen.getByTestId('cambiar-sobre')).toBeInTheDocument();
  });

  it('V7: se dice si el rival ya entregó, pero NUNCA lo que puso', async () => {
    mockVer.mockResolvedValue(
      vista({
        teamASubmitted: true,
        rivalSubmitted: true,
        mine: { team: 'A', entries: [['bea'], ['ana']], submitted: true, automatic: false },
      })
    );
    pintar();

    expect(await screen.findByTestId('rival-entregado')).toBeInTheDocument();
    expect(screen.queryByTestId('orden-del-rival')).not.toBeInTheDocument();
  });

  it('V8: se ofrece abrirlos cuando el servidor dice que se puede', async () => {
    mockVer.mockResolvedValue(
      vista({
        teamASubmitted: true,
        rivalSubmitted: true,
        canReveal: true,
        mine: { team: 'A', entries: [['bea'], ['ana']], submitted: true, automatic: false },
      })
    );
    pintar();

    fireEvent.click(await screen.findByTestId('abrir-sobres'));

    await waitFor(() => expect(mockAbrir).toHaveBeenCalledWith('ronda-1'));
  });

  it('V9: y no se ofrece cuando dice que no', async () => {
    // El relleno automático es predecible, así que un capitán que abriera
    // antes de que el rival entregue podría armar su lista para ganar todos
    // los cruces. Quién puede, lo decide el servidor
    mockVer.mockResolvedValue(
      vista({
        teamASubmitted: true,
        rivalSubmitted: false,
        canReveal: false,
        mine: { team: 'A', entries: [['bea'], ['ana']], submitted: true, automatic: false },
      })
    );
    pintar();

    await screen.findByTestId('sobre-entregado');
    expect(screen.queryByTestId('abrir-sobres')).not.toBeInTheDocument();
  });

  it('V9b: el organizador puede abrirlos sin haber entregado ninguno', async () => {
    // Es la salida cuando un capitán no aparece: sin esto la sesión se
    // quedaba atascada y generar los partidos fallaba por sobres sin abrir
    mockVer.mockResolvedValue(vista({ myPlayers: [], canReveal: true }));
    pintar();

    fireEvent.click(await screen.findByTestId('abrir-sobres'));

    await waitFor(() => expect(mockAbrir).toHaveBeenCalledWith('ronda-1'));
  });

  it('V9c: dos toques seguidos no mandan dos aperturas', async () => {
    // La segunda se lleva un 400 «ya estaban abiertos» y el capitán ve un
    // error en rojo aunque todo fue bien
    mockVer.mockResolvedValue(vista({ myPlayers: [], canReveal: true }));
    mockAbrir.mockImplementation(() => new Promise(() => {}));
    pintar();
    const boton = await screen.findByTestId('abrir-sobres');

    fireEvent.click(boton);
    fireEvent.click(boton);

    expect(mockAbrir).toHaveBeenCalledTimes(1);
  });

  it('V10: abiertos, se ven los enfrentamientos con nombres', async () => {
    mockVer.mockResolvedValue(
      vista({
        revealed: true,
        teamASubmitted: true,
        teamBSubmitted: true,
        matchups: [[['bea'], ['carla']], [['ana'], ['dani']]],
      })
    );
    pintar();

    const primero = await screen.findByTestId('enfrentamiento-0');
    expect(within(primero).getByText('Bea Blanco')).toBeInTheDocument();
    expect(within(primero).getByText('Carla Cruz')).toBeInTheDocument();
  });

  it('V11: y se dice cuál lo rellenó la aplicación', async () => {
    mockVer.mockResolvedValue(
      vista({
        revealed: true,
        teamASubmitted: true,
        teamBSubmitted: true,
        teamBAutomatic: true,
        matchups: [[['bea'], ['carla']]],
      })
    );
    pintar();

    expect(await screen.findByTestId('automatico-B')).toBeInTheDocument();
    expect(screen.queryByTestId('automatico-A')).not.toBeInTheDocument();
  });

  it('V12: quien no capitanea no ve ninguna lista que ordenar', async () => {
    mockVer.mockResolvedValue(vista({ myPlayers: [] }));
    pintar();

    expect(await screen.findByTestId('solo-mirando')).toBeInTheDocument();
    expect(screen.queryByTestId('entregar-sobre')).not.toBeInTheDocument();
  });

  it('V12b: si la sesión no se puede cargar, se dice: no se finge normalidad', async () => {
    // Antes, un 403 o un 500 dejaban la pantalla de «esto lo entregan los
    // capitanes, aquí verás los enfrentamientos», que es tranquilizadora y
    // falsa
    mockVer.mockRejectedValue(new Error('No participas en esta competición'));
    pintar();

    expect(await screen.findByTestId('sobre-no-disponible')).toBeInTheDocument();
    expect(screen.queryByTestId('solo-mirando')).not.toBeInTheDocument();
  });

  it('V12c: cambiar el orden se puede cancelar', async () => {
    // Un toque sin querer no puede dejar al capitán sin su sobre entregado
    // —ni sin el botón de abrir— hasta que recargue
    mockVer.mockResolvedValue(
      vista({
        teamASubmitted: true,
        mine: { team: 'A', entries: [['bea'], ['ana']], submitted: true, automatic: false },
      })
    );
    pintar();
    fireEvent.click(await screen.findByTestId('cambiar-sobre'));

    fireEvent.click(await screen.findByTestId('cancelar-cambio'));

    expect(await screen.findByTestId('sobre-entregado')).toBeInTheDocument();
  });

  it('V13: un fallo al entregar se cuenta y el orden no se pierde', async () => {
    mockEntregar.mockRejectedValue(new Error('Faltan jugadores del equipo'));
    pintar();
    fireEvent.click(await screen.findByTestId('jugador-bea'));
    fireEvent.click(screen.getByTestId('jugador-ana'));

    fireEvent.click(screen.getByTestId('entregar-sobre'));

    await waitFor(() =>
      expect(customToast.error).toHaveBeenCalledWith('Faltan jugadores del equipo')
    );
    expect(screen.getByTestId('puesto-bea')).toHaveTextContent('1');
  });
});
