/**
 * El cuadro de mi invitación pendiente en la ficha (release social 2, tabla
 * aprobada el 27 oct 2026).
 *
 * | #   | Caso                                         | Resultado                                         |
 * |-----|----------------------------------------------|---------------------------------------------------|
 * | I1  | Pendiente que se puede aceptar               | Cuadro con Aceptar / Rechazar y «Caduca el …»     |
 * | I3  | Aceptar                                      | «Invitación aceptada» y la ficha se recarga       |
 * | I4  | Aceptar sin género                           | Antes, la pregunta del género; guardado, acepta   |
 * | I5  | Aceptar sin plaza                            | «Sin plaza» y se recarga                          |
 * | I6  | Aceptar ya no pendiente (409 sin código)     | «Ya no estaba pendiente» y se recarga             |
 * | I7  | Aceptar un stroke play sin hándicap          | El mensaje del servidor; el cuadro se queda       |
 * | I8  | Rechazar                                     | «Invitación rechazada» y se recarga               |
 * | I9  | Rechazar sin plaza / ya no pendiente         | Sin aviso, se recarga                             |
 * | I10 | Mientras responde                            | Los dos botones desactivados                      |
 * | I11 | Sin conexión u otro fallo                    | Aviso; el cuadro sigue, se puede reintentar       |
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import InvitacionEnLaFicha from './InvitacionEnLaFicha';
import es from '../../i18n/locales/es/invitations.json';
import en from '../../i18n/locales/en/invitations.json';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => (opts?.date ? `${key} ${opts.date}` : key),
    i18n: { language: 'es' },
  }),
}));

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('../../utils/toast', () => ({ default: toast }));

const genero = vi.hoisted(() => ({ falta: false, guardar: vi.fn(), refrescar: vi.fn() }));
vi.mock('../../hooks/useGeneroParaApuntarse', () => ({ useGeneroParaApuntarse: () => genero }));

vi.mock('../profile/GeneroParaApuntarseModal', () => ({
  default: ({ isOpen, onConfirm }) =>
    isOpen ? <button type="button" data-testid="elegir-genero" onClick={() => onConfirm('FEMALE')} /> : null,
}));

const responder = vi.hoisted(() => vi.fn());
vi.mock('../../composition', () => ({
  respondToInvitationUseCase: { execute: (...a) => responder(...a) },
}));

const INVITACION = { id: 'inv-1', expiresAt: '2026-11-03T10:00:00' };
const fallo = (extra) => Object.assign(new Error('Te falta el hándicap'), extra);

const pinta = (props = {}) => {
  const alCambiar = vi.fn();
  render(<InvitacionEnLaFicha invitacion={INVITACION} alCambiar={alCambiar} {...props} />);
  return { alCambiar };
};

beforeEach(() => {
  vi.clearAllMocks();
  genero.falta = false;
  genero.guardar.mockResolvedValue(undefined);
  responder.mockResolvedValue({ competitionId: 'c-1' });
});

describe('InvitacionEnLaFicha — el cuadro', () => {
  it('I1: dice que me han invitado, cuándo caduca y ofrece Aceptar y Rechazar', () => {
    pinta();

    expect(screen.getByTestId('invitacion-en-la-ficha')).toHaveTextContent('inDetail.title');
    expect(screen.getByTestId('invitacion-caduca')).toHaveTextContent('inDetail.expiresOn 3 nov');
    expect(screen.getByTestId('invitacion-aceptar')).toHaveTextContent('actions.accept');
    expect(screen.getByTestId('invitacion-rechazar')).toHaveTextContent('actions.decline');
  });

  it('I1: sin caducidad, no la dice', () => {
    pinta({ invitacion: { id: 'inv-1', expiresAt: null } });

    expect(screen.queryByTestId('invitacion-caduca')).not.toBeInTheDocument();
  });

  it('sin invitación, nada', () => {
    const { container } = render(<InvitacionEnLaFicha invitacion={null} alCambiar={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('InvitacionEnLaFicha — aceptar', () => {
  it('I3: acepta, avisa y recarga la ficha', async () => {
    const { alCambiar } = pinta();

    fireEvent.click(screen.getByTestId('invitacion-aceptar'));

    await waitFor(() => expect(alCambiar).toHaveBeenCalledTimes(1));
    expect(responder).toHaveBeenCalledWith('inv-1', 'ACCEPT');
    expect(toast.success).toHaveBeenCalledWith('success.accepted');
  });

  it('I4: sin género, antes se pregunta; guardado, acepta y refresca la sesión al final', async () => {
    genero.falta = true;
    const { alCambiar } = pinta();

    fireEvent.click(screen.getByTestId('invitacion-aceptar'));
    expect(responder).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('elegir-genero'));

    await waitFor(() => expect(alCambiar).toHaveBeenCalledTimes(1));
    expect(genero.guardar).toHaveBeenCalledWith('FEMALE');
    expect(responder).toHaveBeenCalledWith('inv-1', 'ACCEPT');
    expect(genero.refrescar).toHaveBeenCalledTimes(1);
  });

  it('I4: si no se puede guardar el género, ni acepta ni recarga', async () => {
    genero.falta = true;
    genero.guardar.mockRejectedValue(new Error('sin red'));
    const { alCambiar } = pinta();

    fireEvent.click(screen.getByTestId('invitacion-aceptar'));
    fireEvent.click(screen.getByTestId('elegir-genero'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('sin red'));
    expect(responder).not.toHaveBeenCalled();
    expect(alCambiar).not.toHaveBeenCalled();
  });

  it('I5: sin plaza, lo dice y recarga', async () => {
    responder.mockRejectedValue(fallo({ status: 409, errorCode: 'INVITATION_NO_ROOM' }));
    const { alCambiar } = pinta();

    fireEvent.click(screen.getByTestId('invitacion-aceptar'));

    await waitFor(() => expect(alCambiar).toHaveBeenCalledTimes(1));
    expect(toast.error).toHaveBeenCalledWith('errors.noRoom');
  });

  it('I6: ya no estaba pendiente, lo dice (sin hablar de una lista) y recarga', async () => {
    responder.mockRejectedValue(fallo({ status: 409 }));
    const { alCambiar } = pinta();

    fireEvent.click(screen.getByTestId('invitacion-aceptar'));

    await waitFor(() => expect(alCambiar).toHaveBeenCalledTimes(1));
    expect(toast.error).toHaveBeenCalledWith('inDetail.notPendingAnymore');
  });

  it('I7: sin hándicap en un stroke play, el mensaje del servidor; ni recarga', async () => {
    responder.mockRejectedValue(fallo({ status: 422, errorCode: 'HANDICAP_REQUIRED' }));
    const { alCambiar } = pinta();

    fireEvent.click(screen.getByTestId('invitacion-aceptar'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Te falta el hándicap'));
    expect(alCambiar).not.toHaveBeenCalled();
    expect(screen.getByTestId('invitacion-aceptar')).not.toBeDisabled();
  });

  it('I11: sin conexión, aviso; el cuadro sigue y se reintenta', async () => {
    responder.mockRejectedValueOnce(Object.assign(new TypeError('Failed to fetch'))).mockResolvedValueOnce({});
    const { alCambiar } = pinta();

    fireEvent.click(screen.getByTestId('invitacion-aceptar'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(alCambiar).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('invitacion-aceptar'));
    await waitFor(() => expect(alCambiar).toHaveBeenCalledTimes(1));
  });

  it('I11: un fallo sin mensaje, el genérico', async () => {
    responder.mockRejectedValue({ status: 500 });
    pinta();

    fireEvent.click(screen.getByTestId('invitacion-aceptar'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('errors.failedToRespond'));
  });
});

describe('InvitacionEnLaFicha — rechazar', () => {
  it('I8: rechaza, avisa y recarga', async () => {
    const { alCambiar } = pinta();

    fireEvent.click(screen.getByTestId('invitacion-rechazar'));

    await waitFor(() => expect(alCambiar).toHaveBeenCalledTimes(1));
    expect(responder).toHaveBeenCalledWith('inv-1', 'DECLINE');
    expect(toast.success).toHaveBeenCalledWith('success.declined');
  });

  it('I8: rechazar no pregunta el género', async () => {
    genero.falta = true;
    pinta();

    fireEvent.click(screen.getByTestId('invitacion-rechazar'));

    await waitFor(() => expect(responder).toHaveBeenCalledWith('inv-1', 'DECLINE'));
    expect(screen.queryByTestId('elegir-genero')).not.toBeInTheDocument();
  });

  it.each([
    ['sin plaza', { status: 409, errorCode: 'INVITATION_NO_ROOM' }],
    ['ya no pendiente', { status: 409 }],
  ])('I9: %s, sin aviso, y recarga', async (_, extra) => {
    responder.mockRejectedValue(fallo(extra));
    const { alCambiar } = pinta();

    fireEvent.click(screen.getByTestId('invitacion-rechazar'));

    await waitFor(() => expect(alCambiar).toHaveBeenCalledTimes(1));
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('I11: otro fallo al rechazar, aviso y sin recargar', async () => {
    responder.mockRejectedValue(fallo({ status: 500 }));
    const { alCambiar } = pinta();

    fireEvent.click(screen.getByTestId('invitacion-rechazar'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Te falta el hándicap'));
    expect(alCambiar).not.toHaveBeenCalled();
  });
});

describe('InvitacionEnLaFicha — I10: mientras responde', () => {
  it('los dos botones desactivados, y un doble toque envía una sola respuesta', async () => {
    let soltar;
    responder.mockReturnValue(new Promise((r) => { soltar = r; }));
    const { alCambiar } = pinta();

    fireEvent.click(screen.getByTestId('invitacion-aceptar'));
    fireEvent.click(screen.getByTestId('invitacion-aceptar'));
    fireEvent.click(screen.getByTestId('invitacion-rechazar'));

    expect(screen.getByTestId('invitacion-aceptar')).toBeDisabled();
    expect(screen.getByTestId('invitacion-rechazar')).toBeDisabled();
    expect(responder).toHaveBeenCalledTimes(1);
    soltar({});
    await waitFor(() => expect(alCambiar).toHaveBeenCalledTimes(1));
  });
});

describe('InvitacionEnLaFicha — mientras responde, lo dice (revisor de la PR 3)', () => {
  it.each([
    ['invitacion-aceptar', 'actions.accepting'],
    ['invitacion-rechazar', 'actions.declining'],
  ])('%s → «%s» en ese botón', (boton, texto) => {
    responder.mockReturnValue(new Promise(() => {}));
    pinta();

    fireEvent.click(screen.getByTestId(boton));

    expect(screen.getByTestId(boton)).toHaveTextContent(texto);
    // El otro, con su texto de siempre
    const otro = boton === 'invitacion-aceptar' ? 'invitacion-rechazar' : 'invitacion-aceptar';
    expect(screen.getByTestId(otro)).toHaveTextContent(otro === 'invitacion-aceptar' ? 'actions.accept' : 'actions.decline');
  });

  it('a 360 px, con el mismo margen lateral que la cabecera', () => {
    pinta();

    expect(screen.getByTestId('invitacion-en-la-ficha').className).toMatch(/\bmx-4\b/);
  });
});

describe('InvitacionEnLaFicha — la caducidad (/code-review)', () => {
  it('una fecha que no se puede leer no tumba la ficha: sin la línea', () => {
    pinta({ invitacion: { id: 'inv-1', expiresAt: 'basura' } });

    expect(screen.getByTestId('invitacion-en-la-ficha')).toBeInTheDocument();
    expect(screen.queryByTestId('invitacion-caduca')).not.toBeInTheDocument();
  });

  it('sin huso, es UTC (como todo instante de la API)', () => {
    vi.useFakeTimers({ now: new Date('2026-10-27T12:00:00Z') });
    const formatear = vi.spyOn(Date.prototype, 'toLocaleString');
    try {
      pinta({ invitacion: { id: 'inv-1', expiresAt: '2026-11-03T00:30:00' } });

      expect(formatear.mock.contexts[0].toISOString()).toBe('2026-11-03T00:30:00.000Z');
    } finally {
      formatear.mockRestore();
      vi.useRealTimers();
    }
  });

  it('caducada al abrir la ficha, no sale', () => {
    vi.useFakeTimers({ now: new Date('2026-11-04T00:00:00Z') });
    try {
      pinta({ invitacion: { id: 'inv-1', expiresAt: '2026-11-03T10:00:00' } });

      expect(screen.queryByTestId('invitacion-en-la-ficha')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('si caduca con la ficha abierta, desaparece sola', () => {
    vi.useFakeTimers({ now: new Date('2026-11-03T09:59:59Z') });
    try {
      pinta({ invitacion: { id: 'inv-1', expiresAt: '2026-11-03T10:00:00' } });
      expect(screen.getByTestId('invitacion-en-la-ficha')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.queryByTestId('invitacion-en-la-ficha')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('InvitacionEnLaFicha — otra invitación tras releer', () => {
  it('que ya llega caducada, no sale aunque el reloj de la anterior no haya saltado', () => {
    vi.useFakeTimers({ now: new Date('2026-11-01T00:00:00Z') });
    try {
      const { rerender } = render(
        <InvitacionEnLaFicha invitacion={{ id: 'inv-1', expiresAt: '2026-11-09T00:00:00' }} alCambiar={vi.fn()} />
      );
      vi.setSystemTime(new Date('2026-11-03T00:00:00Z'));

      rerender(<InvitacionEnLaFicha invitacion={{ id: 'inv-2', expiresAt: '2026-11-02T00:00:00' }} alCambiar={vi.fn()} />);
      act(() => {
        vi.advanceTimersByTime(0);
      });

      expect(screen.queryByTestId('invitacion-en-la-ficha')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('InvitacionEnLaFicha — textos', () => {
  it.each([
    ['es', es],
    ['en', en],
  ])('%s: los del cuadro', (_, textos) => {
    for (const clave of ['title', 'expiresOn', 'notPendingAnymore']) {
      expect(textos.inDetail[clave]).toBeTruthy();
    }
    expect(textos.inDetail.expiresOn).toContain('{{date}}');
  });
});
