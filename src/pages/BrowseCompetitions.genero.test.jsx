import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
vi.mock('../hooks/useAuth', () => ({ useAuth: () => SESION }));

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
  browseJoinableCompetitionsUseCase: { execute: vi.fn().mockResolvedValue([COMPETICION]) },
  browseExploreCompetitionsUseCase: { execute: vi.fn().mockResolvedValue([]) },
  requestEnrollmentUseCase: { execute: (...a) => mockPedir(...a) },
}));

const BrowseCompetitions = (await import('./BrowseCompetitions')).default;

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
});
