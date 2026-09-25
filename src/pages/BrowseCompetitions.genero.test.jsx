import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

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
};
vi.mock('../composition', () => ({
  browseJoinableCompetitionsUseCase: {
    execute: (...a) => mockUnirse(...a),
  },
  browseExploreCompetitionsUseCase: { execute: vi.fn().mockResolvedValue([]) },
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
