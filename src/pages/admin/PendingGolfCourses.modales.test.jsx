import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';

/**
 * Los dos modales de los campos pendientes (detalle y rechazo) pasaron a
 * `ModalShell` el 4 oct 2026: se anuncian con su título, Escape los cierra
 * —antes no— y pulsar fuera sigue sin cerrarlos.
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave, o) => (o ? `${clave} ${JSON.stringify(o)}` : clave), i18n: { language: 'es' } }),
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
  default: ({ courses, onView, onReject, onApprove }) => (
    <div>
      {courses.map((c) => (
        <div key={c.id}>
          <button onClick={() => onView(c)}>ver {c.name}</button>
          <button onClick={() => onReject(c)}>rechazar {c.name}</button>
          <button onClick={() => onApprove(c)}>aprobar {c.name}</button>
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
        holes: [
          { holeNumber: 1, par: 4, strokeIndex: 7 },
          { holeNumber: 2, par: 3, strokeIndex: 15 },
        ],
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
const abrirPagina = async (props = {}) => {
  render(<PendingGolfCourses embedded {...props} />);
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

  it('F7: en el móvil los hoyos del detalle van en filas; en el ordenador, la tabla', async () => {
    await abrirPagina();
    fireEvent.click(await screen.findByText('ver Campo Pendiente'));
    const filas = screen.getByRole('list', { name: 'form.holes' });

    expect(filas).toHaveClass('md:hidden');
    expect(screen.getByRole('table').parentElement).toHaveClass('hidden', 'md:block');
    expect(within(filas).getAllByRole('listitem').map((f) => f.textContent)).toEqual([
      'form.holeRow {"hole":1,"par":4,"strokeIndex":7}',
      'form.holeRow {"hole":2,"par":3,"strokeIndex":15}',
    ]);
    // El total, fuera de la lista: un lector no cuenta 19 hoyos
    expect(filas.nextElementSibling).toHaveTextContent('form.totalPar 72');
    expect(filas.nextElementSibling).toHaveClass('md:hidden');
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
  // Panel de admin, 17 oct: el menú dice cuántas solicitudes quedan
  it('aprobar o rechazar avisa al panel para que recuente las solicitudes', async () => {
    const onCambio = vi.fn();
    vi.stubGlobal('confirm', () => true);
    await abrirPagina({ onCambio });
    fireEvent.click(await screen.findByText('aprobar Campo Pendiente'));
    await waitFor(() => expect(onCambio).toHaveBeenCalledTimes(1));

    fireEvent.click(await screen.findByText('rechazar Campo Pendiente'));
    fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'No es un campo de golf real' } });
    rechazar.mockResolvedValue();
    fireEvent.click(screen.getByRole('button', { name: 'pages.pending.confirmReject' }));
    await waitFor(() => expect(onCambio).toHaveBeenCalledTimes(2));
    vi.unstubAllGlobals();
  });

  it('si aprobar falla, no avisa', async () => {
    const onCambio = vi.fn();
    vi.stubGlobal('confirm', () => true);
    const { approveGolfCourseUseCase } = await import('../../composition');
    approveGolfCourseUseCase.execute.mockRejectedValueOnce(new Error('500'));
    await abrirPagina({ onCambio });
    fireEvent.click(await screen.findByText('aprobar Campo Pendiente'));
    await waitFor(() => expect(approveGolfCourseUseCase.execute).toHaveBeenCalled());
    await act(async () => {});
    expect(onCambio).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

/**
 * Nuevas y actualizaciones son pestañas de verdad (FE #658), con su propia
 * barra: vive dentro del panel de la sección del admin.
 */
describe('PendingGolfCourses · pestañas (FE #658)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchCountriesUseCase.execute.mockResolvedValue([]);
  });

  it('T1: barra con nombre, la tabla como panel de la abierta y las flechas', async () => {
    await abrirPagina();

    const barra = screen.getByRole('tablist', { name: 'pages.pending.tabsLabel' });
    const [nuevas, cambios] = within(barra).getAllByRole('tab');
    expect(nuevas).toHaveAccessibleName('pages.pending.tabNew (1)');
    expect(nuevas).toHaveAttribute('aria-selected', 'true');
    expect(cambios).toHaveAttribute('tabindex', '-1');
    const panel = screen.getByRole('tabpanel', { name: 'pages.pending.tabNew (1)' });
    expect(nuevas).toHaveAttribute('aria-controls', panel.id);
    expect(cambios).toHaveAttribute('aria-controls', panel.id);
    expect(within(panel).getByText('ver Campo Pendiente')).toBeInTheDocument();

    fireEvent.keyDown(nuevas, { key: 'ArrowRight' });

    expect(cambios).toHaveAttribute('aria-selected', 'true');
    expect(cambios).toHaveFocus();
    expect(screen.getByRole('tabpanel', { name: 'pages.pending.tabUpdates (0)' })).toBe(panel);
    expect(screen.queryByText('ver Campo Pendiente')).toBeNull();
  });
});
