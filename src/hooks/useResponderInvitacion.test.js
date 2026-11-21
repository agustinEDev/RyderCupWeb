import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResponderInvitacion } from './useResponderInvitacion';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('../utils/toast', () => ({ default: toast }));
vi.mock('./useGeneroParaApuntarse', () => ({
  useGeneroParaApuntarse: () => ({
    falta: false,
    guardar: vi.fn(),
    refrescar: vi.fn(),
  }),
}));
const responder = vi.hoisted(() => vi.fn());
vi.mock('../composition', () => ({
  respondToInvitationUseCase: { execute: (...a) => responder(...a) },
}));

const barras = vi.hoisted(() => ({
  general: vi.fn(),
}));
vi.mock('../composition/cargarBarras', () => ({
  cargarBarras: () =>
    Promise.resolve({
      changeEnrollmentTeeUseCase: { execute: (...a) => barras.general(...a) },
    }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  responder.mockReturnValue(new Promise(() => {}));
  barras.general.mockResolvedValue({ id: 'e-1', teeColor: 'YELLOW' });
});

// Aceptar pide antes la barra general (barras por campo): se abre el modal
// y se confirma con la barra
const aceptaCon = async (result, id, barra = 'YELLOW') => {
  act(() => {
    result.current.aceptar(id);
  });
  // Sin esperar a que acabe: hay respuestas que no llegan nunca a propósito
  await act(async () => {
    const respuesta = result.current.preguntaDeLaBarra.onConfirm(barra, null);
    await Promise.race([respuesta, new Promise((r) => setTimeout(r, 0))]);
  });
};
const acciones = {
  aceptar: (result, id) => aceptaCon(result, id),
  rechazar: (result, id) =>
    act(async () => {
      await result.current.rechazar(id);
    }),
};

describe('useResponderInvitacion — /code-review', () => {
  it('dice qué se está respondiendo; un segundo toque ignorado no lo cambia', async () => {
    const { result } = renderHook(() =>
      useResponderInvitacion({ alAceptar: vi.fn(), alCambiar: vi.fn() }),
    );

    await aceptaCon(result, 'inv-1');
    act(() => {
      result.current.rechazar('inv-1');
    });

    expect(result.current.accionEnCurso('inv-1')).toBe('ACCEPT');
    expect(result.current.accionEnCurso('inv-2')).toBeNull();
  });

  it('al aceptar, sigue en curso hasta que la pantalla se ha releído', async () => {
    responder.mockResolvedValue({});
    let releida;
    const alAceptar = vi.fn(
      () =>
        new Promise((r) => {
          releida = r;
        }),
    );
    const { result } = renderHook(() =>
      useResponderInvitacion({ alAceptar, alCambiar: vi.fn() }),
    );

    await aceptaCon(result, 'inv-1');
    expect(alAceptar).toHaveBeenCalled();
    expect(result.current.seEstaRespondiendo('inv-1')).toBe(true);

    await act(async () => releida());
    expect(result.current.seEstaRespondiendo('inv-1')).toBe(false);
  });

  it.each([
    ['rechazar', 'rechazar', 'alCambiar'],
    ['aceptar', 'aceptar', 'alAceptar'],
  ])(
    '%s bien y que falle la recarga no dice que no se pudo responder',
    async (_, accion, quien) => {
      responder.mockResolvedValue({});
      const falla = vi.fn().mockRejectedValue(new Error('sin red'));
      const opciones = {
        alAceptar: vi.fn(),
        alCambiar: vi.fn(),
        [quien]: falla,
      };
      const { result } = renderHook(() => useResponderInvitacion(opciones));

      await acciones[accion](result, 'inv-1');

      expect(falla).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledTimes(1);
      expect(toast.error).not.toHaveBeenCalled();
      expect(result.current.seEstaRespondiendo('inv-1')).toBe(false);
    },
  );
});

describe('useResponderInvitacion — el candado es de cada invitación (revisor de la PR 3)', () => {
  it('con una en curso, otra se responde', async () => {
    const { result } = renderHook(() =>
      useResponderInvitacion({ alAceptar: vi.fn(), alCambiar: vi.fn() }),
    );

    act(() => {
      result.current.rechazar('inv-1');
    });
    await aceptaCon(result, 'inv-2');

    expect(responder.mock.calls).toEqual([
      ['inv-1', 'DECLINE'],
      ['inv-2', 'ACCEPT'],
    ]);
  });
});

describe('useResponderInvitacion — I10: dos toques antes de pintar el botón desactivado', () => {
  it.each([
    ['aceptar', 'aceptar'],
    ['rechazar', 'rechazar'],
    ['aceptar y rechazar', 'aceptar', 'rechazar'],
  ])('%s: una sola respuesta', async (_, primero, segundo = primero) => {
    const { result } = renderHook(() =>
      useResponderInvitacion({ alAceptar: vi.fn(), alCambiar: vi.fn() }),
    );

    // La primera sigue en curso (la respuesta no llega): la segunda, ignorada
    const sinEsperar = (accion) =>
      accion === 'aceptar'
        ? aceptaCon(result, 'inv-1')
        : act(() => {
            result.current.rechazar('inv-1');
          });
    await sinEsperar(primero);
    await sinEsperar(segundo);

    expect(responder).toHaveBeenCalledTimes(1);
  });
});

describe('useResponderInvitacion — equipos formados (29 oct 2026, F3)', () => {
  it('aceptar con los equipos formados: se dice y se relee la pantalla', async () => {
    responder.mockRejectedValue(
      Object.assign(new Error('x'), { status: 409, errorCode: 'TEAMS_FORMED' }),
    );
    const alCambiar = vi.fn();
    const { result } = renderHook(() =>
      useResponderInvitacion({ alAceptar: vi.fn(), alCambiar }),
    );

    await aceptaCon(result, 'inv-1');

    expect(toast.error).toHaveBeenCalledWith('errors.teamsFormed');
    expect(alCambiar).toHaveBeenCalledTimes(1);
  });
});

/**
 * F1 · aceptar con la barra general (barras por campo): se guarda en la
 * inscripción que crea la aceptación y, si algún campo no la tiene, se pide.
 */
describe('useResponderInvitacion — la barra al aceptar', () => {
  it('aceptar abre la pregunta de la barra y no responde aún', () => {
    const { result } = renderHook(() =>
      useResponderInvitacion({ alAceptar: vi.fn(), alCambiar: vi.fn() }),
    );
    act(() => {
      result.current.aceptar('inv-1');
    });
    expect(result.current.preguntaDeLaBarra.isOpen).toBe(true);
    expect(responder).not.toHaveBeenCalled();
    act(() => result.current.preguntaDeLaBarra.onClose());
    expect(result.current.preguntaDeLaBarra.isOpen).toBe(false);
  });

  it('guarda la barra en su inscripción y entrega el resultado a quien pide las de los campos', async () => {
    responder.mockResolvedValue({ status: 'ACCEPTED', enrollmentId: 'e-1' });
    const alAceptar = vi.fn();
    const { result } = renderHook(() =>
      useResponderInvitacion({ alAceptar, alCambiar: vi.fn() }),
    );

    await aceptaCon(result, 'inv-1', 'BLUE');

    expect(responder).toHaveBeenCalledWith('inv-1', 'ACCEPT');
    expect(barras.general).toHaveBeenCalledWith('e-1', 'BLUE');
    expect(alAceptar).toHaveBeenCalledWith({
      status: 'ACCEPTED',
      enrollmentId: 'e-1',
    });
  });

  it('si la barra no se guarda, la invitación sigue aceptada, se dice por qué y se sigue', async () => {
    responder.mockResolvedValue({ status: 'ACCEPTED', enrollmentId: 'e-1' });
    barras.general.mockRejectedValue(
      Object.assign(new Error('422'), {
        status: 422,
        errorCode: 'TEE_NOT_ON_PENDING_COURSE',
      }),
    );
    const alAceptar = vi.fn();
    const { result } = renderHook(() =>
      useResponderInvitacion({ alAceptar, alCambiar: vi.fn() }),
    );

    await aceptaCon(result, 'inv-1');

    expect(toast.success).toHaveBeenCalledWith('success.accepted');
    // Arriba, como en los modales de barras; sin decir la modalidad, la Ryder
    expect(toast.error).toHaveBeenCalledWith(
      'competitions:tees.errors.TEE_NOT_ON_PENDING_COURSE',
      { position: 'top-center' },
    );
    // La ficha sigue y pide la de los campos
    expect(alAceptar).toHaveBeenCalledWith({
      status: 'ACCEPTED',
      enrollmentId: 'e-1',
    });
  });

  it('en stroke play (conEquipos false), el fallo de la barra habla de partidas', async () => {
    responder.mockResolvedValue({ status: 'ACCEPTED', enrollmentId: 'e-1' });
    barras.general.mockRejectedValue(
      Object.assign(new Error('422'), {
        status: 422,
        errorCode: 'TEE_NOT_ON_PENDING_COURSE',
      }),
    );
    const { result } = renderHook(() =>
      useResponderInvitacion({
        alAceptar: vi.fn(),
        alCambiar: vi.fn(),
        conEquipos: false,
      }),
    );

    await aceptaCon(result, 'inv-1');

    expect(toast.error).toHaveBeenCalledWith(
      'competitions:tees.errorsStrokePlay.TEE_NOT_ON_PENDING_COURSE',
      { position: 'top-center' },
    );
  });

  it('2+3: en lista de espera (sin plaza), ni se guarda la barra', async () => {
    responder.mockResolvedValue({ status: 'ON_HOLD', enrollmentId: 'e-1' });
    const alAceptar = vi.fn();
    const { result } = renderHook(() =>
      useResponderInvitacion({ alAceptar, alCambiar: vi.fn() }),
    );

    await aceptaCon(result, 'inv-1');

    expect(toast.success).toHaveBeenCalledWith('success.accepted');
    expect(barras.general).not.toHaveBeenCalled();
    expect(alAceptar).toHaveBeenCalled();
  });
});
