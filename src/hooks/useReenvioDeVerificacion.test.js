import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

/**
 * Reenviar la verificación una sola vez aunque se pulse dos veces seguidas: el
 * `disabled` del botón llega en el siguiente render (CodeRabbit, #1092).
 */
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));
const reenviar = vi.fn(() => new Promise(() => {}));
vi.mock('../composition', () => ({
  resendVerificationEmailUseCase: { execute: (...a) => reenviar(...a) },
}));

const { useReenvioDeVerificacion } = await import('./useReenvioDeVerificacion');

describe('useReenvioDeVerificacion · doble clic', () => {
  it('dos llamadas seguidas piden un solo reenvío', () => {
    const { result } = renderHook(() =>
      useReenvioDeVerificacion('ana@example.com'),
    );

    act(() => {
      result.current.reenviar();
      result.current.reenviar();
    });

    expect(reenviar).toHaveBeenCalledTimes(1);
  });
});
