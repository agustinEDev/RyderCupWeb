import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import {
  useNovedadesDeActividad,
  useVigilanciaDeNovedades,
  ponLasNovedadesACero,
  olvidaLasNovedades,
  reiniciaLasNovedades,
} from './useNovedadesDeActividad';

const contar = vi.fn();
vi.mock('../composition', () => ({
  getFeedUnseenCountUseCase: { execute: (...args) => contar(...args) },
}));

const Numero = ({ testId = 'numero' }) => {
  const n = useNovedadesDeActividad();
  return <span data-testid={testId}>{n}</span>;
};

const Vigia = () => {
  useVigilanciaDeNovedades();
  return null;
};

const numero = (testId = 'numero') => screen.getByTestId(testId).textContent;

const ponVisibilidad = (estado) => {
  Object.defineProperty(globalThis.document, 'visibilityState', {
    configurable: true,
    get: () => estado,
  });
  globalThis.document.dispatchEvent(new globalThis.Event('visibilitychange'));
};

const conBadging = () => {
  const setAppBadge = vi.fn().mockResolvedValue(undefined);
  const clearAppBadge = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { ...globalThis.navigator, setAppBadge, clearAppBadge });
  return { setAppBadge, clearAppBadge };
};

describe('useNovedadesDeActividad', () => {
  beforeEach(() => {
    reiniciaLasNovedades();
    contar.mockReset();
    contar.mockResolvedValue(0);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(globalThis.document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
  });

  it('asks for the number when the app opens and shares it with every reader (case 3)', async () => {
    contar.mockResolvedValue(4);
    render(
      <>
        <Vigia />
        <Numero testId="abajo" />
        <Numero testId="arriba" />
      </>
    );

    await waitFor(() => expect(numero('abajo')).toBe('4'));
    expect(numero('arriba')).toBe('4');
    expect(contar).toHaveBeenCalledTimes(1);
  });

  it('a reader alone does not ask (pages render the header in their tests)', async () => {
    render(<Numero />);

    await act(async () => {});
    expect(contar).not.toHaveBeenCalled();
    expect(numero()).toBe('0');
  });

  it('asks again when returning to the app (case 3)', async () => {
    contar.mockResolvedValueOnce(1).mockResolvedValueOnce(6);
    render(
      <>
        <Vigia />
        <Numero />
      </>
    );
    await waitFor(() => expect(numero()).toBe('1'));

    act(() => ponVisibilidad('hidden'));
    expect(contar).toHaveBeenCalledTimes(1);

    act(() => ponVisibilidad('visible'));
    await waitFor(() => expect(numero()).toBe('6'));
    expect(contar).toHaveBeenCalledTimes(2);
  });

  it('asks again when the network comes back (case 3)', async () => {
    contar.mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    render(
      <>
        <Vigia />
        <Numero />
      </>
    );
    await waitFor(() => expect(numero()).toBe('1'));

    act(() => {
      globalThis.dispatchEvent(new globalThis.Event('online'));
    });

    await waitFor(() => expect(numero()).toBe('2'));
  });

  it('keeps the last value without errors when offline (case 3)', async () => {
    contar.mockResolvedValueOnce(3).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    render(
      <>
        <Vigia />
        <Numero />
      </>
    );
    await waitFor(() => expect(numero()).toBe('3'));

    act(() => ponVisibilidad('visible'));
    await waitFor(() => expect(contar).toHaveBeenCalledTimes(2));
    await act(async () => {});

    expect(numero()).toBe('3');
  });

  it('stops listening when the watcher goes away', async () => {
    const { unmount } = render(<Vigia />);
    await waitFor(() => expect(contar).toHaveBeenCalledTimes(1));

    unmount();
    act(() => ponVisibilidad('visible'));
    act(() => {
      globalThis.dispatchEvent(new globalThis.Event('online'));
    });

    expect(contar).toHaveBeenCalledTimes(1);
  });

  it('opening Actividad sets it to zero (case 4)', async () => {
    contar.mockResolvedValue(5);
    render(
      <>
        <Vigia />
        <Numero />
      </>
    );
    await waitFor(() => expect(numero()).toBe('5'));

    act(() => ponLasNovedadesACero());

    expect(numero()).toBe('0');
  });

  it('a count already on its way does not undo the zero (case 4)', async () => {
    let responde;
    contar.mockImplementation(
      () =>
        new Promise((resolve) => {
          responde = resolve;
        })
    );
    render(
      <>
        <Vigia />
        <Numero />
      </>
    );
    await waitFor(() => expect(contar).toHaveBeenCalledTimes(1));

    act(() => ponLasNovedadesACero());
    await act(async () => responde(8));

    expect(numero()).toBe('0');
  });

  it('puts the number on the app icon (case 2)', async () => {
    const { setAppBadge } = conBadging();
    contar.mockResolvedValue(3);
    render(<Vigia />);

    await waitFor(() => expect(setAppBadge).toHaveBeenCalledWith(3));
  });

  it('clears the app icon at zero and when Actividad is opened (case 2, 4)', async () => {
    const { setAppBadge, clearAppBadge } = conBadging();
    contar.mockResolvedValue(0);
    render(<Vigia />);
    await waitFor(() => expect(clearAppBadge).toHaveBeenCalledTimes(1));
    expect(setAppBadge).not.toHaveBeenCalled();

    act(() => ponLasNovedadesACero());

    expect(clearAppBadge).toHaveBeenCalledTimes(2);
  });

  it('skips the icon silently when the Badging API is missing (case 2)', async () => {
    vi.stubGlobal('navigator', { userAgent: 'sin badging' });
    contar.mockResolvedValue(3);
    render(
      <>
        <Vigia />
        <Numero />
      </>
    );

    await waitFor(() => expect(numero()).toBe('3'));
    act(() => ponLasNovedadesACero());
    expect(numero()).toBe('0');
  });

  it('swallows a Badging API that refuses (permission, not installed)', async () => {
    const setAppBadge = vi.fn().mockRejectedValue(new Error('NotAllowedError'));
    const clearAppBadge = vi.fn(() => {
      throw new Error('boom');
    });
    vi.stubGlobal('navigator', { setAppBadge, clearAppBadge });
    contar.mockResolvedValue(2);
    render(
      <>
        <Vigia />
        <Numero />
      </>
    );

    await waitFor(() => expect(numero()).toBe('2'));
    expect(() => act(() => ponLasNovedadesACero())).not.toThrow();
  });

  describe('logout forgets the number (another user on the same device)', () => {
    it('resets it to zero and clears the app icon', async () => {
      const { clearAppBadge } = conBadging();
      contar.mockResolvedValue(7);
      render(
        <>
          <Vigia />
          <Numero />
        </>
      );
      await waitFor(() => expect(numero()).toBe('7'));
      clearAppBadge.mockClear();

      act(() => olvidaLasNovedades());

      expect(numero()).toBe('0');
      expect(clearAppBadge).toHaveBeenCalledTimes(1);
    });

    it("a count on its way for the previous user does not come back", async () => {
      let responde;
      contar.mockImplementation(
        () =>
          new Promise((resolve) => {
            responde = resolve;
          })
      );
      render(
        <>
          <Vigia />
          <Numero />
        </>
      );
      await waitFor(() => expect(contar).toHaveBeenCalledTimes(1));

      act(() => olvidaLasNovedades());
      await act(async () => responde(9));

      expect(numero()).toBe('0');
    });

    it('works without the Badging API', () => {
      vi.stubGlobal('navigator', { userAgent: 'sin badging' });

      expect(() => act(() => olvidaLasNovedades())).not.toThrow();
    });
  });
});
