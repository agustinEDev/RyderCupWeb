import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return { ...actual, useNavigate: () => mockNavigate };
});

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

const CUATRO = [
  ...JUGADORES,
  { userId: 'carla', name: 'Carla Cruz', handicap: 20 },
  { userId: 'dani', name: 'Dani Díaz', handicap: 26 },
];

const enParejas = (extra = {}) =>
  vista({ playersPerRow: 2, myPlayers: CUATRO, ...extra });

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
      // Sin marcar la casilla: se espera a la hora
      expect(mockEntregar).toHaveBeenCalledWith('ronda-1', [['bea'], ['ana']], false)
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

  it('V11b: abiertos y sin partidos, dice por qué (BE #361)', async () => {
    // Los partidos se crean al abrirse: si no pudieron, los enfrentamientos
    // están a la vista y no hay nada que jugar, y hay que decir a quién le falta qué
    mockVer.mockResolvedValue(
      vista({
        revealed: true,
        teamASubmitted: true,
        teamBSubmitted: true,
        matchups: [[['bea'], ['carla']]],
        matchGenerationBlock: {
          reason: 'PLAYERS_WITHOUT_TEE',
          players: [{ userId: 'bea', name: 'Bea Blanco', missing: 'GENDER', teeColor: null }],
        },
      })
    );
    pintar();

    expect(await screen.findByTestId('bloqueo-de-partidos')).toHaveTextContent('Bea Blanco');
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

  it('V12d: mientras se reordena no se ofrece abrir: abriría el orden anterior', async () => {
    // El servidor sigue teniendo el sobre de antes, así que abrir ahí revela
    // ese, y el orden que el capitán está montando se pierde sin avisar
    mockVer.mockResolvedValue(
      vista({
        teamASubmitted: true,
        rivalSubmitted: true,
        canReveal: true,
        mine: { team: 'A', entries: [['bea'], ['ana']], submitted: true, automatic: false },
      })
    );
    pintar();
    expect(await screen.findByTestId('abrir-sobres')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('cambiar-sobre'));

    expect(screen.queryByTestId('abrir-sobres')).not.toBeInTheDocument();
  });

  it('V17: sin plazo que vencer, al organizador se le avisa de lo que va a pasar', async () => {
    // Un campo sin zona horaria no da hora, así que esos sobres no se abren
    // solos nunca y el organizador conserva la llave. Con el botón a secas
    // abriría sin saber que el sobre que falta lo va a rellenar la aplicación
    mockVer.mockResolvedValue(
      vista({ canReveal: true, revealScheduledAt: null, teamASubmitted: true })
    );
    pintar();

    expect(await screen.findByTestId('abrir-sobres')).toBeInTheDocument();
    expect(screen.getByTestId('sin-plazo')).toBeInTheDocument();
  });

  it('V17b: con plazo y los dos sobres dentro no hay aviso que dar', async () => {
    mockVer.mockResolvedValue(
      vista({ canReveal: true, teamASubmitted: true, teamBSubmitted: true })
    );
    pintar();

    expect(await screen.findByTestId('abrir-sobres')).toBeInTheDocument();
    expect(screen.queryByTestId('sin-plazo')).not.toBeInTheDocument();
  });

  it('V16: mientras falte un sobre no se ofrece abrir a nadie', async () => {
    // Visto en el Kind: «Abrir los sobres» salía arriba del todo y en verde,
    // ANTES de entregar. Un toque ahí rellena los dos sobres automáticamente y
    // tira por la borda lo que el capitán venía a hacer.
    //
    // Desde el 23 sep hacen falta los dos sobres dentro sea quien sea —abrir es
    // lo que desvela el orden de juego—, así que el servidor manda `canReveal`
    // en falso y la pantalla no lo ofrece ni al organizador
    mockVer.mockResolvedValue(vista({ canReveal: false }));
    pintar();

    await screen.findByTestId('entregar-sobre');
    expect(screen.queryByTestId('abrir-sobres')).not.toBeInTheDocument();
  });

  it('V17: entregado el suyo, ya sí puede abrirlos', async () => {
    mockVer.mockResolvedValue(
      vista({
        teamASubmitted: true,
        rivalSubmitted: true,
        canReveal: true,
        mine: { team: 'A', entries: [['bea'], ['ana']], submitted: true, automatic: false },
      })
    );
    pintar();

    expect(await screen.findByTestId('abrir-sobres')).toBeInTheDocument();
  });

  it('V18: y quien solo organiza lo tiene desde el principio', async () => {
    // No capitanea, así que no tiene sobre que entregar: abrir es su único
    // gesto aquí, y es la salida cuando un capitán no aparece
    mockVer.mockResolvedValue(vista({ myPlayers: [], canReveal: true }));
    pintar();

    expect(await screen.findByTestId('abrir-sobres')).toBeInTheDocument();
  });

  it('V19: se puede pedir que no esperen a la hora, y va apagado por defecto', async () => {
    pintar();
    const casilla = await screen.findByTestId('sin-esperar');

    expect(casilla).not.toBeChecked();
    fireEvent.click(casilla);
    expect(casilla).toBeChecked();
  });

  it('V20: y al entregar se manda lo que el capitán marcó', async () => {
    pintar();
    fireEvent.click(await screen.findByTestId('sin-esperar'));
    for (const j of ['bea', 'ana']) fireEvent.click(screen.getByTestId(`jugador-${j}`));

    fireEvent.click(screen.getByTestId('entregar-sobre'));

    await waitFor(() =>
      expect(mockEntregar).toHaveBeenCalledWith('ronda-1', [['bea'], ['ana']], true)
    );
  });

  it('V21: entregado, se dice si el rival también lo pidió', async () => {
    // Para que el capitán sepa si solo falta que lo marque el otro
    mockVer.mockResolvedValue(
      vista({
        teamASubmitted: true,
        rivalSubmitted: true,
        rivalWantsEarly: false,
        mine: {
          team: 'A',
          entries: [['bea'], ['ana']],
          submitted: true,
          automatic: false,
          revealWhenBothReady: true,
        },
      })
    );
    pintar();

    expect(await screen.findByTestId('falta-que-lo-marque-el-rival')).toBeInTheDocument();
  });

  it('V22: y cuando los dos lo han pedido no se anuncia que falte nadie', async () => {
    mockVer.mockResolvedValue(
      vista({
        teamASubmitted: true,
        rivalSubmitted: true,
        rivalWantsEarly: true,
        mine: {
          team: 'A',
          entries: [['bea'], ['ana']],
          submitted: true,
          automatic: false,
          revealWhenBothReady: true,
        },
      })
    );
    pintar();

    await screen.findByTestId('sobre-entregado');
    expect(screen.queryByTestId('falta-que-lo-marque-el-rival')).not.toBeInTheDocument();
  });

  it('V23: y se dice a qué hora se abren solos, que es el plazo', async () => {
    pintar();

    expect(await screen.findByTestId('plazo')).toBeInTheDocument();
  });

  it('V24: al cambiar el orden, la casilla conserva lo que el capitán pidió', async () => {
    // El servidor reescribe el flag en CADA entrega: si la casilla sale
    // apagada, corregir la lista retira la petición sin que nadie lo diga, un
    // segundo después de leer «tú has pedido abrirlos sin esperar»
    mockVer.mockResolvedValue(
      vista({
        teamASubmitted: true,
        mine: {
          team: 'A',
          entries: [['bea'], ['ana']],
          submitted: true,
          automatic: false,
          revealWhenBothReady: true,
        },
      })
    );
    pintar();

    fireEvent.click(await screen.findByTestId('cambiar-sobre'));

    expect(await screen.findByTestId('sin-esperar')).toBeChecked();
  });

  it('V25: y al volver a entregar se manda esa misma petición', async () => {
    mockVer.mockResolvedValue(
      vista({
        teamASubmitted: true,
        mine: {
          team: 'A',
          entries: [['bea'], ['ana']],
          submitted: true,
          automatic: false,
          revealWhenBothReady: true,
        },
      })
    );
    pintar();
    fireEvent.click(await screen.findByTestId('cambiar-sobre'));
    for (const j of ['ana', 'bea']) fireEvent.click(await screen.findByTestId(`jugador-${j}`));

    fireEvent.click(screen.getByTestId('entregar-sobre'));

    await waitFor(() =>
      expect(mockEntregar).toHaveBeenCalledWith('ronda-1', [['ana'], ['bea']], true)
    );
  });

  it('V24: al cambiar el orden, la casilla conserva lo que el capitán pidió', async () => {
    // El servidor reescribe el flag en CADA entrega: si la casilla sale
    // apagada, corregir la lista retira la petición sin que nadie lo diga, un
    // segundo después de leer «tú has pedido abrirlos sin esperar»
    mockVer.mockResolvedValue(
      vista({
        teamASubmitted: true,
        mine: {
          team: 'A',
          entries: [['bea'], ['ana']],
          submitted: true,
          automatic: false,
          revealWhenBothReady: true,
        },
      })
    );
    pintar();

    fireEvent.click(await screen.findByTestId('cambiar-sobre'));

    expect(await screen.findByTestId('sin-esperar')).toBeChecked();
  });

  it('V25: y al volver a entregar se manda esa misma petición', async () => {
    mockVer.mockResolvedValue(
      vista({
        teamASubmitted: true,
        mine: {
          team: 'A',
          entries: [['bea'], ['ana']],
          submitted: true,
          automatic: false,
          revealWhenBothReady: true,
        },
      })
    );
    pintar();
    fireEvent.click(await screen.findByTestId('cambiar-sobre'));
    for (const j of ['ana', 'bea']) fireEvent.click(await screen.findByTestId(`jugador-${j}`));

    fireEvent.click(screen.getByTestId('entregar-sobre'));

    await waitFor(() =>
      expect(mockEntregar).toHaveBeenCalledWith('ronda-1', [['ana'], ['bea']], true)
    );
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

  it('P1: en parejas, los dos primeros toques son la MISMA pareja', async () => {
    // El número es el de la pareja, no el del jugador: dos con el 1 juegan
    // juntos. Arrastrar para agrupar se pelea con el scroll igual que ordenar
    mockVer.mockResolvedValue(enParejas());
    pintar();

    fireEvent.click(await screen.findByTestId('jugador-bea'));
    fireEvent.click(screen.getByTestId('jugador-ana'));

    expect(screen.getByTestId('puesto-bea')).toHaveTextContent('1');
    expect(screen.getByTestId('puesto-ana')).toHaveTextContent('1');
  });

  it('P2: el tercer toque abre ya la pareja siguiente', async () => {
    mockVer.mockResolvedValue(enParejas());
    pintar();

    fireEvent.click(await screen.findByTestId('jugador-bea'));
    fireEvent.click(screen.getByTestId('jugador-ana'));
    fireEvent.click(screen.getByTestId('jugador-carla'));

    expect(screen.getByTestId('puesto-carla')).toHaveTextContent('2');
  });

  it('P3: al entregar se mandan las parejas, no cuatro filas de uno', async () => {
    mockVer.mockResolvedValue(enParejas());
    pintar();

    fireEvent.click(await screen.findByTestId('jugador-bea'));
    fireEvent.click(screen.getByTestId('jugador-ana'));
    fireEvent.click(screen.getByTestId('jugador-carla'));
    fireEvent.click(screen.getByTestId('jugador-dani'));
    fireEvent.click(screen.getByTestId('entregar-sobre'));

    await waitFor(() =>
      expect(mockEntregar).toHaveBeenCalledWith(
        'ronda-1',
        [
          ['bea', 'ana'],
          ['carla', 'dani'],
        ],
        false
      )
    );
  });

  it('P4: con la pareja a medias todavía no se puede entregar', async () => {
    mockVer.mockResolvedValue(enParejas());
    pintar();

    fireEvent.click(await screen.findByTestId('jugador-bea'));
    fireEvent.click(screen.getByTestId('jugador-ana'));
    fireEvent.click(screen.getByTestId('jugador-carla'));

    expect(screen.getByTestId('entregar-sobre')).toBeDisabled();
  });

  it('P5: un equipo impar en parejas se dice ANTES de entregar', async () => {
    // Si no, el capitán coloca a los cinco y se lleva un 400 del servidor:
    // alguien se quedaría fuera y el cruce va por posición. Lo decide el
    // servidor, que mira los DOS equipos: el mío puede ser par y el rival no
    mockVer.mockResolvedValue(
      enParejas({
        teamsFitFormat: false,
        myPlayers: [...CUATRO, { userId: 'eva', name: 'Eva Egea', handicap: 30 }],
      })
    );
    pintar();

    expect(await screen.findByTestId('equipo-impar')).toBeInTheDocument();
    expect(screen.getByTestId('entregar-sobre')).toBeDisabled();
  });

  it('P6: el equipo impar se lo dice también a quien NO capitanea', async () => {
    // El organizador es quien puede arreglarlo —cambiar el formato o rehacer
    // los equipos— y no tiene sobre: sin esto la sesión se atasca en silencio
    mockVer.mockResolvedValue(vista({ myPlayers: [], teamsFitFormat: false }));
    pintar();

    expect(await screen.findByTestId('equipo-impar')).toBeInTheDocument();
  });

  it('P7: y también después de entregar, si el equipo se queda impar', async () => {
    mockVer.mockResolvedValue(
      enParejas({
        teamsFitFormat: false,
        teamASubmitted: true,
        mine: { team: 'A', entries: [['bea', 'ana']], submitted: true, automatic: false },
      })
    );
    pintar();

    expect(await screen.findByTestId('equipo-impar')).toBeInTheDocument();
  });

  it('P8: una pareja a medias dice qué falta, en vez de apagar el botón sin más', async () => {
    mockVer.mockResolvedValue(enParejas());
    pintar();

    fireEvent.click(await screen.findByTestId('jugador-bea'));
    fireEvent.click(screen.getByTestId('jugador-ana'));
    fireEvent.click(screen.getByTestId('jugador-carla'));

    expect(screen.getByTestId('pareja-a-medias')).toBeInTheDocument();
  });

  it('P9: con las parejas completas no sobra ningún aviso', async () => {
    mockVer.mockResolvedValue(enParejas());
    pintar();

    fireEvent.click(await screen.findByTestId('jugador-bea'));
    fireEvent.click(screen.getByTestId('jugador-ana'));

    expect(screen.queryByTestId('pareja-a-medias')).not.toBeInTheDocument();
  });

  it('V18: volver lleva al calendario, que es de donde se viene', async () => {
    // El sobre se abre desde la agenda de la competición, así que devolver a
    // la ficha obliga a volver a entrar en el calendario para la sesión
    // siguiente
    pintar();

    fireEvent.click(await screen.findByTestId('volver-al-calendario'));

    expect(mockNavigate).toHaveBeenCalledWith('/competitions/comp-1/schedule');
  });
});
