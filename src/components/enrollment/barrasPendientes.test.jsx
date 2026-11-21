import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  renderHook,
  screen,
  fireEvent,
  act,
  within,
} from '@testing-library/react';
import BarrasPendientesModal from './BarrasPendientesModal';
import { useBarrasPendientes } from '../../hooks/useBarrasPendientes';

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
    const alGuardar = vi.fn();
    const { result } = renderHook(() => useBarrasPendientes({ alGuardar }));

    await act(() => result.current.comprobar('e1'));
    expect(mocks.leer).toHaveBeenCalledWith('e1');
    expect(result.current.campo.golfCourseId).toBe('g2');

    await act(() => result.current.guardar('RED'));
    expect(mocks.fijar).toHaveBeenCalledWith('e1', 'g2', 'RED');
    expect(mocks.toast.success).toHaveBeenCalledWith('tees.saved');
    expect(alGuardar).toHaveBeenCalledTimes(1);
    expect(result.current.campo.golfCourseId).toBe('g4');

    act(() => result.current.saltar());
    expect(result.current.campo).toBeNull();
  });

  it('1: saltar mientras se guarda A no se come B', async () => {
    mocks.leer.mockResolvedValue({
      courses: [campo('gA', 'NONE'), campo('gB', 'NONE'), campo('gC', 'NONE')],
    });
    let termina;
    mocks.fijar.mockReturnValue(
      new Promise((r) => {
        termina = r;
      }),
    );
    const { result } = renderHook(() => useBarrasPendientes());
    await act(() => result.current.comprobar('e1'));

    let guardado;
    act(() => {
      guardado = result.current.guardar('RED');
    });
    await act(async () => {
      await Promise.resolve();
    });
    act(() => result.current.saltar());
    act(() => result.current.cerrar());
    await act(async () => {
      termina({ teeColor: 'RED' });
      await guardado;
    });

    expect(mocks.fijar).toHaveBeenCalledWith('e1', 'gA', 'RED');
    expect(result.current.campo.golfCourseId).toBe('gB');
  });

  it('1: mientras se guarda, saltar no cambia el campo de la pantalla', async () => {
    mocks.leer.mockResolvedValue({
      courses: [campo('gA', 'NONE'), campo('gB', 'NONE')],
    });
    mocks.fijar.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useBarrasPendientes());
    await act(() => result.current.comprobar('e1'));

    act(() => {
      result.current.guardar('RED');
    });
    await act(async () => {
      await Promise.resolve();
    });
    act(() => result.current.saltar());

    expect(result.current.campo.golfCourseId).toBe('gA');
  });

  it('1: si la lista cambia mientras se guarda, se quita el guardado, no el primero', async () => {
    mocks.leer.mockResolvedValueOnce({
      courses: [campo('gA', 'NONE'), campo('gB', 'NONE')],
    });
    let termina;
    mocks.fijar.mockReturnValue(
      new Promise((r) => {
        termina = r;
      }),
    );
    const { result } = renderHook(() => useBarrasPendientes());
    await act(() => result.current.comprobar('e1'));

    let guardado;
    act(() => {
      guardado = result.current.guardar('RED');
    });
    // Otra comprobación deja delante otro campo
    mocks.leer.mockResolvedValueOnce({
      courses: [campo('gB', 'NONE'), campo('gA', 'NONE')],
    });
    await act(() => result.current.comprobar('e1'));
    await act(async () => {
      termina({ teeColor: 'RED' });
      await guardado;
    });

    expect(result.current.campo.golfCourseId).toBe('gB');
  });

  it('1: guardando, «Ahora no» está desactivado', () => {
    render(
      <BarrasPendientesModal
        campo={campo('g2', 'NONE')}
        guardando
        onGuardar={vi.fn()}
        onSaltar={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('competitions:tees.notNow')).toBeDisabled();
  });

  it('CR4: una comprobación que llega tarde no pisa la última', async () => {
    let vieja;
    mocks.leer
      .mockReturnValueOnce(
        new Promise((r) => {
          vieja = r;
        }),
      )
      .mockResolvedValueOnce({ courses: [campo('gNueva', 'NONE')] });
    const { result } = renderHook(() => useBarrasPendientes());

    let primera;
    act(() => {
      primera = result.current.comprobar('e-vieja');
    });
    await act(() => result.current.comprobar('e-nueva'));
    expect(result.current.campo.golfCourseId).toBe('gNueva');

    await act(async () => {
      vieja({ courses: [campo('gVieja', 'NONE')] });
      await primera;
    });
    expect(result.current.campo.golfCourseId).toBe('gNueva');
  });

  it('CR5: el guardado de una inscripción no toca la cola de otra', async () => {
    mocks.leer.mockResolvedValueOnce({
      courses: [campo('gA', 'NONE'), campo('gB', 'NONE')],
    });
    let termina;
    mocks.fijar.mockReturnValue(
      new Promise((r) => {
        termina = r;
      }),
    );
    const { result } = renderHook(() => useBarrasPendientes());
    await act(() => result.current.comprobar('e1'));

    let guardado;
    act(() => {
      guardado = result.current.guardar('RED');
    });
    // Mientras, otra inscripción con el mismo campo pendiente
    mocks.leer.mockResolvedValueOnce({ courses: [campo('gA', 'NONE')] });
    await act(() => result.current.comprobar('e2'));
    await act(async () => {
      termina({ teeColor: 'RED' });
      await guardado;
    });

    expect(mocks.fijar).toHaveBeenCalledWith('e1', 'gA', 'RED');
    expect(result.current.campo?.golfCourseId).toBe('gA');
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

  it('9: guardando, no se manda otra vez', () => {
    const { onGuardar } = pinta({ guardando: true });
    fireEvent.change(screen.getByLabelText('competitions:tees.label'), {
      target: { value: 'BLUE' },
    });
    fireEvent.submit(screen.getByLabelText('competitions:tees.label').form);
    expect(onGuardar).not.toHaveBeenCalled();
  });

  it('CR3: «Cerrar» sale sin saltar el campo', () => {
    const { onClose, onSaltar } = pinta();
    fireEvent.click(screen.getByText('competitions:tees.close'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSaltar).not.toHaveBeenCalled();
  });

  it('CR3: guardando, «Cerrar» está desactivado', () => {
    pinta({ guardando: true });
    expect(screen.getByText('competitions:tees.close')).toBeDisabled();
  });

  it('E12: las opciones, en el orden de los selectores', () => {
    pinta({ campo: campo('g2', 'NONE', ['RED', 'BLACK', 'WHITE']) });
    expect(
      within(screen.getByLabelText('competitions:tees.label'))
        .getAllByRole('option')
        .map((o) => o.value),
    ).toEqual(['', 'BLACK', 'WHITE', 'RED']);
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
