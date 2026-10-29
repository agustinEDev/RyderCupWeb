import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

/**
 * Pedir plaza desde Explorar pregunta el género solo a quien no lo tiene y lo
 * guarda ANTES de pedirla (#710, 24 sep). Es el gemelo de la ficha.
 */
const t = (clave) => clave;
const traduccion = { t, i18n: { language: 'es' } };
vi.mock('react-i18next', () => ({ useTranslation: () => traduccion }));
vi.mock('framer-motion', () => {
  const DE_ANIMACION = new Set(['initial', 'animate', 'exit', 'transition']);
  const Div = ({ children, ...props }) => (
    <div {...Object.fromEntries(Object.entries(props).filter(([k]) => !DE_ANIMACION.has(k)))}>
      {children}
    </div>
  );
  return { motion: new Proxy({}, { get: () => Div }) };
});
vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));
vi.mock('../utils/toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
const SESION = { user: { id: 'p1' }, loading: false };
let userCambiante = false;
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => (userCambiante ? { ...SESION, user: { id: 'p1' } } : SESION),
}));
const mockUnirse = vi.fn();
const mockExplorar = vi.fn().mockResolvedValue([]);

const orden = [];
const mockPedir = vi.fn(async () => orden.push('plaza'));
const mockGuardarGenero = vi.fn(async () => orden.push('genero'));
const mockRefrescarSesion = vi.fn(async () => orden.push('sesion'));
let faltaGenero = true;
vi.mock('../hooks/useGeneroParaApuntarse', () => ({
  useGeneroParaApuntarse: () => ({
    falta: faltaGenero,
    guardar: mockGuardarGenero,
    refrescar: mockRefrescarSesion,
  }),
}));

const COMPETICION = {
  id: 'c1',
  name: 'Ryder del club',
  startDate: '2030-06-01',
  endDate: '2030-06-02',
  status: 'ACTIVE',
  creator: { firstName: 'Ana', lastName: 'Alba' },
  enrolledCount: 2,
  maxPlayers: 12,
  countries: [],
  visibility: 'PUBLIC',
};
vi.mock('../composition', () => ({
  browseJoinableCompetitionsUseCase: {
    execute: (...a) => mockUnirse(...a),
  },
  browseExploreCompetitionsUseCase: { execute: (...a) => mockExplorar(...a) },
  requestEnrollmentUseCase: { execute: (...a) => mockPedir(...a) },
}));

const BrowseCompetitions = (await import('./BrowseCompetitions')).default;
const customToast = (await import('../utils/toast')).default;

const pintar = () =>
  render(
    <MemoryRouter>
      <BrowseCompetitions />
    </MemoryRouter>
  );

describe('BrowseCompetitions · el género al pedir plaza', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orden.length = 0;
    mockUnirse.mockResolvedValue([COMPETICION]);
  });

  it('X3: un user nuevo con el mismo id no vuelve a cargar la lista', async () => {
    userCambiante = true;
    pintar();
    await screen.findByText('browse.card.request-to-join');
    await new Promise((r) => setTimeout(r, 200));

    expect(mockUnirse).toHaveBeenCalledTimes(1);
    userCambiante = false;
  });

  it('X1: sin género se pregunta, se guarda y luego se pide la plaza', async () => {
    faltaGenero = true;
    pintar();

    fireEvent.click(await screen.findByText('browse.card.request-to-join'));
    fireEvent.change(await screen.findByTestId('selector-de-genero'), {
      target: { value: 'FEMALE' },
    });
    fireEvent.click(screen.getByText('competitions:enrollment.confirm'));

    await waitFor(() => expect(mockPedir).toHaveBeenCalled());
    expect(mockGuardarGenero).toHaveBeenCalledWith('FEMALE');
    await waitFor(() => expect(orden).toEqual(['genero', 'plaza', 'sesion']));
  });

  it('X2: con género no se pregunta', async () => {
    faltaGenero = false;
    pintar();

    fireEvent.click(await screen.findByText('browse.card.request-to-join'));

    expect(screen.queryByTestId('selector-de-genero')).not.toBeInTheDocument();
  });

  it('X4: el motivo del servidor se lee en el modal, que sigue abierto (#710)', async () => {
    faltaGenero = false;
    mockPedir.mockRejectedValueOnce(
      Object.assign(new Error('El torneo ya ha empezado.'), { status: 400 })
    );
    pintar();

    fireEvent.click(await screen.findByText('browse.card.request-to-join'));
    fireEvent.click(screen.getByText('competitions:enrollment.confirm'));

    expect(await screen.findByTestId('apuntarse-error')).toHaveTextContent('ya ha empezado');
  });

  it('X7: las fechas de la tarjeta salen en el idioma de quien mira (#710)', async () => {
    pintar();

    expect(await screen.findByText('1 jun 2030 - 2 jun 2030')).toBeInTheDocument();
  });

  it('X8: una privada (la ve un admin) no ofrece pedir plaza, que el servidor rechaza (FE #734)', async () => {
    mockUnirse.mockResolvedValue([{ ...COMPETICION, visibility: 'PRIVATE' }]);
    pintar();

    expect(await screen.findByText('browse.card.view-details')).toBeInTheDocument();
    expect(screen.queryByText('browse.card.request-to-join')).not.toBeInTheDocument();
  });

  it('X9: una pública en juego, en la otra lista, se ve y no se pide (FE #734)', async () => {
    mockUnirse.mockResolvedValue([]);
    mockExplorar.mockResolvedValueOnce([
      { ...COMPETICION, id: 'c2', name: 'En juego', status: 'IN_PROGRESS' },
    ]);
    pintar();

    expect(await screen.findByText('browse.card.view-details')).toBeInTheDocument();
    expect(screen.queryByText('browse.card.request-to-join')).not.toBeInTheDocument();
  });

  it('X5: una llena se ve «LLENO» y no deja pedir plaza (#710)', async () => {
    mockUnirse.mockResolvedValue([{ ...COMPETICION, enrolledCount: 4, maxPlayers: 4 }]);
    pintar();

    const boton = await screen.findByText('browse.card.full', { selector: 'button' });
    expect(boton).toBeDisabled();
    expect(screen.queryByText('browse.card.request-to-join')).not.toBeInTheDocument();
  });

  it('X6: ya inscrito (409): se cierra, se dice y se quita de la lista (revisión local)', async () => {
    // El mensaje del servidor no lleva «409»: se decide por el estado
    faltaGenero = false;
    mockPedir.mockRejectedValueOnce(
      Object.assign(new Error('User x is already enrolled in competition y.'), { status: 409 })
    );
    pintar();

    fireEvent.click(await screen.findByText('browse.card.request-to-join'));
    fireEvent.click(screen.getByText('competitions:enrollment.confirm'));

    await waitFor(() =>
      expect(customToast.error).toHaveBeenCalledWith('browse.errors.alreadyEnrolled')
    );
    expect(screen.queryByTestId('apuntarse-error')).not.toBeInTheDocument();
    expect(screen.queryByText('browse.card.request-to-join')).not.toBeInTheDocument();
  });

  it('X7: el resultado de una petición no va al modal de otra competición (CodeRabbit)', async () => {
    faltaGenero = false;
    let terminaLaDeA;
    mockUnirse.mockResolvedValue([
      COMPETICION,
      { ...COMPETICION, id: 'c2', name: 'Otra Ryder' },
    ]);
    mockPedir.mockImplementationOnce(() => new Promise((listo) => { terminaLaDeA = listo; }));
    pintar();

    // Pide plaza en la primera, cierra antes de que conteste y abre la segunda
    const botones = await screen.findAllByText('browse.card.request-to-join');
    fireEvent.click(botones[0]);
    fireEvent.click(screen.getByText('competitions:enrollment.confirm'));
    fireEvent.click(screen.getByText('competitions:enrollment.cancel'));
    fireEvent.click(screen.getAllByText('browse.card.request-to-join').at(-1));
    await act(async () => { terminaLaDeA({}); });

    // El modal de la segunda sigue abierto
    expect(screen.getByText('competitions:enrollment.confirm')).toBeInTheDocument();
  });
});

describe('BrowseCompetitions · sin hándicap en un Stableford (FE #824, PR 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    faltaGenero = false;
  });

  it('H1: en un stroke play no se abre aquí: la ficha lo pide al apuntarse (release social 3)', async () => {
    mockUnirse.mockResolvedValue([{ ...COMPETICION, hasTeams: false, tournamentType: 'STABLEFORD' }]);
    pintar();

    fireEvent.click(await screen.findByText('browse.card.request-to-join'));

    expect(screen.queryByTestId('falta-handicap')).toBeNull();
    expect(mockPedir).not.toHaveBeenCalled();
  });

  it('H2: en una Ryder no se pide', async () => {
    mockUnirse.mockResolvedValue([{ ...COMPETICION, hasTeams: true }]);
    pintar();

    fireEvent.click(await screen.findByText('browse.card.request-to-join'));

    await screen.findByText('competitions:enrollment.confirm');
    expect(screen.queryByTestId('falta-handicap')).toBeNull();
  });
});

/**
 * Inscripción directa (release social 3, 28 oct 2026): en un stroke play la
 * franja se elige en la ficha, así que «Apuntarme» lleva a ella; en una Ryder
 * se apunta aquí mismo. Y en un stroke play no manda el máximo de jugadores.
 */
describe('BrowseCompetitions · apuntarse (release social 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    faltaGenero = false;
  });

  const conRutas = () =>
    render(
      <MemoryRouter initialEntries={['/browse']}>
        <Routes>
          <Route path="/browse" element={<BrowseCompetitions />} />
          <Route path="/competitions/:id" element={<div data-testid="la-ficha" />} />
        </Routes>
      </MemoryRouter>
    );

  it('en un stroke play lleva a la ficha, donde se elige la franja', async () => {
    mockUnirse.mockResolvedValue([{ ...COMPETICION, hasTeams: false }]);
    conRutas();

    fireEvent.click(await screen.findByText('browse.card.request-to-join'));

    expect(await screen.findByTestId('la-ficha')).toBeInTheDocument();
    expect(mockPedir).not.toHaveBeenCalled();
  });

  it('en un stroke play con el máximo lleno no se bloquea: mandan las franjas', async () => {
    mockUnirse.mockResolvedValue([
      { ...COMPETICION, hasTeams: false, enrolledCount: 12, maxPlayers: 12 },
    ]);
    conRutas();

    expect(await screen.findByText('browse.card.request-to-join')).not.toBeDisabled();
  });

  it('con la sala de draft abierta se dice en el diálogo y no se quita la tarjeta (revisor)', async () => {
    mockUnirse.mockResolvedValue([COMPETICION]);
    mockPedir.mockRejectedValueOnce(
      Object.assign(new Error('x'), { status: 409, errorCode: 'DRAFT_IN_PROGRESS' })
    );
    conRutas();

    fireEvent.click(await screen.findByText('browse.card.request-to-join'));
    fireEvent.click(screen.getByText('competitions:enrollment.confirm'));

    expect(await screen.findByTestId('apuntarse-error')).toHaveTextContent(
      'detail.errors.draftInProgress'
    );
    expect(screen.getByText('browse.card.request-to-join')).toBeInTheDocument();
  });

  it('en un stroke play no se pinta el máximo: mandan las franjas (revisor)', async () => {
    mockUnirse.mockResolvedValue([
      { ...COMPETICION, hasTeams: false, enrolledCount: 14, maxPlayers: 12 },
    ]);
    conRutas();

    await screen.findByText('browse.card.request-to-join');
    expect(screen.queryByText(/14\s*\/\s*12/)).not.toBeInTheDocument();
  });

  it('en una Ryder se apunta aquí y se le dice que ya está dentro', async () => {
    mockUnirse.mockResolvedValue([COMPETICION]);
    mockPedir.mockResolvedValueOnce({ status: 'APPROVED', waiting: false });
    conRutas();

    fireEvent.click(await screen.findByText('browse.card.request-to-join'));
    fireEvent.click(screen.getByText('competitions:enrollment.confirm'));

    await waitFor(() => expect(customToast.success).toHaveBeenCalledWith('browse.success.enrolled'));
  });

  it('si la respuesta dice que espera, se le dice (code-review)', async () => {
    mockUnirse.mockResolvedValue([COMPETICION]);
    mockPedir.mockResolvedValueOnce({ status: 'APPROVED', waiting: true });
    conRutas();

    fireEvent.click(await screen.findByText('browse.card.request-to-join'));
    fireEvent.click(screen.getByText('competitions:enrollment.confirm'));

    await waitFor(() =>
      expect(customToast.success).toHaveBeenCalledWith('detail.success.joinedWaitingList')
    );
  });
});
