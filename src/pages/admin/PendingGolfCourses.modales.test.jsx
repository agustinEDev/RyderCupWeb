import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

/**
 * Los dos modales de los campos pendientes (detalle y rechazo) pasaron a
 * `ModalShell` el 4 oct 2026: se anuncian con su título, Escape los cierra
 * —antes no— y pulsar fuera sigue sin cerrarlos.
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
}));
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, exit, transition, ...resto }) => {
      void initial; void animate; void exit; void transition;
      return <div {...resto}>{children}</div>;
    },
  },
}));
// El usuario, UNO para toda la prueba: la página carga la lista en un efecto
// que depende de `user`, y un objeto nuevo en cada render la recargaba sin fin.
// Mientras recarga, el modal se desmonta y se vuelve a montar, y con carga un
// Escape caía en ese hueco y se perdía (FE #624)
vi.mock('../../hooks/useAuth', () => {
  const user = { id: 'a-1', is_admin: true };
  return { useAuth: () => ({ user, loading: false }) };
});
vi.mock('../../components/layout/HeaderAuth', () => ({ default: () => null }));
vi.mock('../../utils/toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../utils/countryUtils', () => ({ CountryFlag: () => null }));
vi.mock('../../services/countries', () => ({ formatCountryName: () => 'España' }));
vi.mock('../../components/golf_course/TeeColorBadge', () => ({ default: () => null }));
// La tabla, reducida a los dos botones que abren los modales
vi.mock('../../components/golf_course/GolfCourseTable', () => ({
  default: ({ courses, onView, onReject }) => (
    <div>
      {courses.map((c) => (
        <div key={c.id}>
          <button onClick={() => onView(c)}>ver {c.name}</button>
          <button onClick={() => onReject(c)}>rechazar {c.name}</button>
        </div>
      ))}
    </div>
  ),
}));
const rechazar = vi.fn();
vi.mock('../../composition', () => ({
  listPendingGolfCoursesUseCase: {
    execute: vi.fn().mockResolvedValue([
      {
        id: 'g-1',
        name: 'Campo Pendiente',
        countryCode: 'ES',
        courseType: 'STANDARD_18',
        totalPar: 72,
        originalGolfCourseId: null,
        tees: [],
        holes: [],
      },
    ]),
  },
  approveGolfCourseUseCase: { execute: vi.fn() },
  rejectGolfCourseUseCase: { execute: (...a) => rechazar(...a) },
  approveGolfCourseUpdateUseCase: { execute: vi.fn() },
  rejectGolfCourseUpdateUseCase: { execute: vi.fn() },
  fetchCountriesUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));

const { default: PendingGolfCourses } = await import('./PendingGolfCourses');
const { fetchCountriesUseCase } = await import('../../composition');

// La página carga la lista y los países por su cuenta. Si la carga de los
// países llega en mitad de la prueba, su render cae fuera del `act` y se cruza
// con el cierre: se espera a que la página haya terminado de cargar
const abrirPagina = async () => {
  render(<PendingGolfCourses embedded />);
  await waitFor(() => expect(fetchCountriesUseCase.execute).toHaveBeenCalled());
  await act(async () => {});
};

const pulsarFuera = () => {
  const fondo = screen.getByRole('dialog');
  fireEvent.mouseDown(fondo);
  fireEvent.click(fondo);
};

describe('PendingGolfCourses · sus modales', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchCountriesUseCase.execute.mockResolvedValue([]);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('el detalle se anuncia con el nombre del campo y se cierra con Escape', async () => {
    await abrirPagina();
    fireEvent.click(await screen.findByText('ver Campo Pendiente'));

    expect(await screen.findByRole('dialog')).toHaveAccessibleName('Campo Pendiente');
    pulsarFuera();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('el rechazo se anuncia con su título y Escape lo descarta sin rechazar', async () => {
    await abrirPagina();
    fireEvent.click(await screen.findByText('rechazar Campo Pendiente'));

    expect(await screen.findByRole('dialog')).toHaveAccessibleName('pages.pending.rejectModalTitle');
    pulsarFuera();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(rechazar).not.toHaveBeenCalled();
  });
});
