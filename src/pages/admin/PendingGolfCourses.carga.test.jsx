import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';

/**
 * La lista de pendientes se pide dentro de su efecto: lo de siempre, y lo que
 * llega tarde ya no toca nada.
 *
 *   #      caso                                         | qué pasa
 *   -------|--------------------------------------------|------------------------------
 *   T1-1   cambiar de idioma con la lista cargada      | no se pide otra vez
 *   T1-2   la sesión trae otro objeto de usuario       | se pide otra vez, con la espera
 *   T1-6   la lista no se puede cargar                 | el aviso, y se quita la espera
 *   T1-7   rechazar (o aprobar) con éxito              | se pide otra vez, con la espera
 *   T1-8   aprobar una nueva o una actualización       | se pide otra vez
 *   T1-14  se sale con la lista pidiéndose             | su respuesta no toca nada
 */
// Lo que devuelven ahora `useTranslation` y `useAuth`: el mismo objeto salvo
// cuando una prueba cambia de idioma o trae otro objeto de usuario
const { ACTUAL, TRADUCCION, ADMIN } = vi.hoisted(() => ({
  ACTUAL: { traduccion: null, user: null },
  TRADUCCION: { t: (clave) => clave, i18n: { language: 'es' } },
  ADMIN: { id: 'a-1', is_admin: true },
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ACTUAL.traduccion ?? TRADUCCION,
}));
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, exit, transition, ...resto }) => {
      void initial;
      void animate;
      void exit;
      void transition;
      return <div {...resto}>{children}</div>;
    },
  },
}));
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: ACTUAL.user ?? ADMIN, loading: false }),
}));
vi.mock('../../components/layout/HeaderAuth', () => ({ default: () => null }));
vi.mock('../../utils/toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('../../components/ui/CountryFlag', () => ({ CountryFlag: () => null }));
vi.mock('../../services/countries', () => ({
  formatCountryName: () => 'España',
}));
vi.mock('../../components/golf_course/TeeColorBadge', () => ({
  default: () => null,
}));
// La tabla, reducida a sus botones
vi.mock('../../components/golf_course/GolfCourseTable', () => ({
  default: ({ courses, onReject, onApprove }) => (
    <div>
      {courses.map((c) => (
        <div key={c.id}>
          <button onClick={() => onReject(c)}>rechazar {c.name}</button>
          <button onClick={() => onApprove(c)}>aprobar {c.name}</button>
        </div>
      ))}
    </div>
  ),
}));

const mockListar = vi.fn();
const mockAprobar = vi.fn();
const mockRechazar = vi.fn();
const mockAprobarCambio = vi.fn();
vi.mock('../../composition', () => ({
  listPendingGolfCoursesUseCase: { execute: (...a) => mockListar(...a) },
  approveGolfCourseUseCase: { execute: (...a) => mockAprobar(...a) },
  rejectGolfCourseUseCase: { execute: (...a) => mockRechazar(...a) },
  approveGolfCourseUpdateUseCase: {
    execute: (...a) => mockAprobarCambio(...a),
  },
  rejectGolfCourseUpdateUseCase: { execute: vi.fn() },
  fetchCountriesUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));

const { default: PendingGolfCourses } = await import('./PendingGolfCourses');
const { default: customToast } = await import('../../utils/toast');

const NUEVO = {
  id: 'g-1',
  name: 'Campo Pendiente',
  originalGolfCourseId: null,
  tees: [],
  holes: [],
};
const CAMBIO = {
  id: 'g-2',
  name: 'Campo Cambiado',
  originalGolfCourseId: 'g-0',
  tees: [],
  holes: [],
};
const OTRO = {
  id: 'g-3',
  name: 'Campo Otro',
  originalGolfCourseId: null,
  tees: [],
  holes: [],
};

// Una respuesta que llega cuando la prueba quiere
const aMano = () => {
  let resolver;
  let rechazar;
  const promesa = new Promise((res, rej) => {
    resolver = res;
    rechazar = rej;
  });
  return { promesa, resolver, rechazar };
};

const abrirCargada = async () => {
  const vista = render(<PendingGolfCourses embedded />);
  await screen.findByText('aprobar Campo Pendiente');
  return vista;
};

describe('PendingGolfCourses · la carga de la lista', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ACTUAL.traduccion = null;
    ACTUAL.user = null;
    mockListar.mockResolvedValue([NUEVO, CAMBIO]);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('confirm', () => true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('T1-1: cambiar de idioma no vuelve a pedir la lista', async () => {
    // Given la lista cargada
    const { rerender } = await abrirCargada();

    // When cambia el idioma
    ACTUAL.traduccion = { t: (clave) => clave, i18n: { language: 'en' } };
    rerender(<PendingGolfCourses embedded />);
    await act(async () => {});

    // Then no se pide otra vez
    expect(mockListar).toHaveBeenCalledTimes(1);
  });

  it('T1-2: con otro objeto de usuario se pide otra vez, con la espera mientras', async () => {
    const { rerender } = await abrirCargada();
    const segunda = aMano();
    mockListar.mockReturnValueOnce(segunda.promesa);

    ACTUAL.user = { ...ADMIN };
    rerender(<PendingGolfCourses embedded />);

    await waitFor(() => expect(mockListar).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('status')).toBeInTheDocument();
    await act(async () => segunda.resolver([OTRO]));
    expect(await screen.findByText('aprobar Campo Otro')).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('T1-6: si la lista no se puede cargar, lo dice y quita la espera', async () => {
    // Given la lista falla
    mockListar.mockRejectedValue(new Error('sin red'));

    // When se abre la página
    render(<PendingGolfCourses embedded />);

    // Then el aviso, y sin la espera
    await waitFor(() =>
      expect(customToast.error).toHaveBeenCalledWith('sin red'),
    );
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('T1-6: sin mensaje, el aviso es el suyo', async () => {
    mockListar.mockRejectedValue(new Error(''));

    render(<PendingGolfCourses embedded />);

    await waitFor(() =>
      expect(customToast.error).toHaveBeenCalledWith(
        'pages.pending.errorLoading',
      ),
    );
  });

  it('T1-7: tras rechazar, la lista se pide otra vez con la espera', async () => {
    // Given un rechazo que sale bien
    mockRechazar.mockResolvedValue();
    await abrirCargada();
    const segunda = aMano();
    mockListar.mockReturnValueOnce(segunda.promesa);
    fireEvent.click(screen.getByText('rechazar Campo Pendiente'));
    fireEvent.change(await screen.findByRole('textbox'), {
      target: { value: 'No es un campo de golf real' },
    });

    // When se confirma
    fireEvent.click(
      screen.getByRole('button', { name: 'pages.pending.confirmReject' }),
    );

    // Then se pide otra vez y se espera
    await waitFor(() => expect(mockListar).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('status')).toBeInTheDocument();
    await act(async () => segunda.resolver([OTRO]));
    expect(await screen.findByText('aprobar Campo Otro')).toBeInTheDocument();
    expect(screen.queryByText('aprobar Campo Pendiente')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('T1-8: tras aprobar una nueva, la lista se pide otra vez con la espera', async () => {
    // Given una solicitud nueva
    mockAprobar.mockResolvedValue();
    await abrirCargada();
    const segunda = aMano();
    mockListar.mockReturnValueOnce(segunda.promesa);

    // When se aprueba
    fireEvent.click(screen.getByText('aprobar Campo Pendiente'));

    // Then se pide otra vez
    await waitFor(() => expect(mockListar).toHaveBeenCalledTimes(2));
    expect(mockAprobar).toHaveBeenCalledWith('g-1');
    expect(screen.getByRole('status')).toBeInTheDocument();
    await act(async () => segunda.resolver([CAMBIO]));
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    expect(customToast.success).toHaveBeenCalledWith(
      'pages.pending.approveSuccess',
    );
  });

  it('T1-8: tras aprobar una actualización, la lista se pide otra vez', async () => {
    mockAprobarCambio.mockResolvedValue();
    await abrirCargada();
    fireEvent.click(
      screen.getByRole('tab', { name: /pages.pending.tabUpdates/ }),
    );

    fireEvent.click(await screen.findByText('aprobar Campo Cambiado'));

    await waitFor(() => expect(mockListar).toHaveBeenCalledTimes(2));
    expect(mockAprobarCambio).toHaveBeenCalledWith('g-2');
  });

  it('T1-13: pedida dos veces seguidas, la vieja que llega tarde no pisa la nueva', async () => {
    const { rerender } = await abrirCargada();
    const vieja = aMano();
    const nueva = aMano();
    mockListar
      .mockReturnValueOnce(vieja.promesa)
      .mockReturnValueOnce(nueva.promesa);
    ACTUAL.user = { ...ADMIN };
    rerender(<PendingGolfCourses embedded />);
    await waitFor(() => expect(mockListar).toHaveBeenCalledTimes(2));
    ACTUAL.user = { ...ADMIN };
    rerender(<PendingGolfCourses embedded />);
    await waitFor(() => expect(mockListar).toHaveBeenCalledTimes(3));

    await act(async () =>
      vieja.resolver([{ ...NUEVO, id: 'g-v', name: 'Campo Viejo' }]),
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    await act(async () => nueva.resolver([OTRO]));
    expect(await screen.findByText('aprobar Campo Otro')).toBeInTheDocument();
    expect(screen.queryByText('aprobar Campo Viejo')).toBeNull();
  });

  it('T1-13: y si la vieja llega después, tampoco', async () => {
    const { rerender } = await abrirCargada();
    const vieja = aMano();
    const nueva = aMano();
    mockListar
      .mockReturnValueOnce(vieja.promesa)
      .mockReturnValueOnce(nueva.promesa);
    ACTUAL.user = { ...ADMIN };
    rerender(<PendingGolfCourses embedded />);
    await waitFor(() => expect(mockListar).toHaveBeenCalledTimes(2));
    ACTUAL.user = { ...ADMIN };
    rerender(<PendingGolfCourses embedded />);
    await waitFor(() => expect(mockListar).toHaveBeenCalledTimes(3));

    await act(async () => nueva.resolver([OTRO]));
    await screen.findByText('aprobar Campo Otro');
    await act(async () =>
      vieja.resolver([{ ...NUEVO, id: 'g-v', name: 'Campo Viejo' }]),
    );

    expect(screen.getByText('aprobar Campo Otro')).toBeInTheDocument();
    expect(screen.queryByText('aprobar Campo Viejo')).toBeNull();
  });

  it('T1-14: si se sale con la lista pidiéndose, su fallo no avisa de nada', async () => {
    // Given la lista pidiéndose
    const tarde = aMano();
    mockListar.mockReturnValueOnce(tarde.promesa);
    const { unmount } = render(<PendingGolfCourses embedded />);
    await waitFor(() => expect(mockListar).toHaveBeenCalledTimes(1));

    // When se sale y luego falla
    unmount();
    await act(async () => tarde.rechazar(new Error('tarde')));

    // Then no toca nada
    expect(customToast.error).not.toHaveBeenCalled();
  });
});
