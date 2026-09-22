import { describe, it, expect, vi, beforeEach } from 'vitest';
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
vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));
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

  it('D10: y cualquier otro fallo se enseña tal cual', async () => {
    mockSala.mockReturnValue(estado({ error: 'Boom', sala: null }));
    pintar();

    expect(await screen.findByText('Boom')).toBeInTheDocument();
  });

  it('D11: cada disponible se ve con su hándicap, que es con lo que se elige', async () => {
    pintar();

    const fila = await screen.findByTestId('disponible-carla');
    expect(within(fila).getByText('Carla Cruz')).toBeInTheDocument();
    expect(within(fila).getByText('8')).toBeInTheDocument();
  });
});
