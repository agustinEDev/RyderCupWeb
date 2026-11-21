import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  renderHook,
  screen,
  fireEvent,
  act,
} from '@testing-library/react';
import BarrasPendientesModal from './BarrasPendientesModal';
import { useBarrasPendientes } from './useBarrasPendientes';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, v) => (v ? `${clave} ${JSON.stringify(v)}` : clave),
  }),
}));
const mocks = vi.hoisted(() => ({
  leer: vi.fn(),
  fijar: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('../../composition/cargarBarras', () => ({
  cargarBarras: () =>
    Promise.resolve({
      getEnrollmentTeesUseCase: { execute: mocks.leer },
      changeEnrollmentCourseTeeUseCase: { execute: mocks.fijar },
    }),
}));
vi.mock('../../utils/toast', () => ({ default: mocks.toast }));
vi.mock('../../utils/registraElFallo', () => ({ registraElFallo: vi.fn() }));

const campo = (id, source, options = ['BLUE', 'RED']) => ({
  golfCourseId: id,
  golfCourseName: `Campo ${id}`,
  tee: null,
  source,
  options,
});

/**
 * F1 · tras apuntarse, los campos sin su barra se piden en el mismo flujo,
 * uno a uno; cerrarlo sin elegir no rompe nada.
 */
describe('useBarrasPendientes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('solo los campos en NONE con opciones, uno a uno', async () => {
    mocks.leer.mockResolvedValue({
      courses: [
        campo('g1', 'GENERAL'),
        campo('g2', 'NONE'),
        campo('g3', 'NONE', []),
        campo('g4', 'NONE'),
      ],
    });
    mocks.fijar.mockResolvedValue({ teeColor: 'RED' });
    const { result } = renderHook(() => useBarrasPendientes());

    await act(() => result.current.comprobar('e1'));
    expect(mocks.leer).toHaveBeenCalledWith('e1');
    expect(result.current.campo.golfCourseId).toBe('g2');

    await act(() => result.current.guardar('RED'));
    expect(mocks.fijar).toHaveBeenCalledWith('e1', 'g2', 'RED');
    expect(mocks.toast.success).toHaveBeenCalledWith('tees.saved');
    expect(result.current.campo.golfCourseId).toBe('g4');

    act(() => result.current.saltar());
    expect(result.current.campo).toBeNull();
  });

  it('sin campos en NONE, nada que pedir', async () => {
    mocks.leer.mockResolvedValue({ courses: [campo('g1', 'COURSE')] });
    const { result } = renderHook(() => useBarrasPendientes());
    await act(() => result.current.comprobar('e1'));
    expect(result.current.campo).toBeNull();
  });

  it('sin poder leerlas, ni se pide ni se avisa: lo dice la ficha', async () => {
    mocks.leer.mockRejectedValue(new Error('red'));
    const { result } = renderHook(() => useBarrasPendientes());
    await act(() => result.current.comprobar('e1'));
    expect(result.current.campo).toBeNull();
    expect(mocks.toast.error).not.toHaveBeenCalled();
  });

  it('un rechazo avisa con su texto y se queda en ese campo', async () => {
    mocks.leer.mockResolvedValue({ courses: [campo('g2', 'NONE')] });
    mocks.fijar.mockRejectedValue(
      Object.assign(new Error('422'), {
        status: 422,
        errorCode: 'TEE_NOT_AVAILABLE',
      }),
    );
    const { result } = renderHook(() => useBarrasPendientes());
    await act(() => result.current.comprobar('e1'));
    await act(() => result.current.guardar('RED'));
    expect(mocks.toast.error).toHaveBeenCalledWith(
      'competitions:tees.errors.TEE_NOT_AVAILABLE',
    );
    expect(result.current.campo.golfCourseId).toBe('g2');
    expect(result.current.guardando).toBe(false);
  });

  it('cerrar deja todos los demás', async () => {
    mocks.leer.mockResolvedValue({
      courses: [campo('g2', 'NONE'), campo('g4', 'NONE')],
    });
    const { result } = renderHook(() => useBarrasPendientes());
    await act(() => result.current.comprobar('e1'));
    act(() => result.current.cerrar());
    expect(result.current.campo).toBeNull();
  });
});

describe('BarrasPendientesModal', () => {
  const pinta = (props = {}) => {
    const fns = { onGuardar: vi.fn(), onSaltar: vi.fn(), onClose: vi.fn() };
    render(
      <BarrasPendientesModal
        campo={campo('g2', 'NONE')}
        guardando={false}
        {...fns}
        {...props}
      />,
    );
    return fns;
  };

  it('dice el campo, ofrece sus opciones y guarda la elegida', () => {
    const { onGuardar } = pinta();
    expect(
      screen.getByText(/competitions:tees.chooseOnCourse .*Campo g2/),
    ).toBeInTheDocument();
    expect(screen.getByText('competitions:tees.save')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('competitions:tees.label'), {
      target: { value: 'BLUE' },
    });
    fireEvent.click(screen.getByText('competitions:tees.save'));
    expect(onGuardar).toHaveBeenCalledWith('BLUE');
  });

  it('«Ahora no» pasa al siguiente; sin campo, nada', () => {
    const { onSaltar } = pinta();
    fireEvent.click(screen.getByText('competitions:tees.notNow'));
    expect(onSaltar).toHaveBeenCalled();
  });

  it('sin campo no se pinta', () => {
    const { container } = render(
      <BarrasPendientesModal
        campo={null}
        guardando={false}
        onGuardar={vi.fn()}
        onSaltar={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
