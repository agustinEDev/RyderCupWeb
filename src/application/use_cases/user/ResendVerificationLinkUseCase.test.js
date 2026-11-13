import { describe, it, expect, vi } from 'vitest';
import ResendVerificationLinkUseCase from './ResendVerificationLinkUseCase';

describe('ResendVerificationLinkUseCase (fase 3)', () => {
  it('pide otro enlace con el token del caducado', async () => {
    const authRepository = {
      resendVerificationLink: vi.fn().mockResolvedValue(undefined),
    };

    await new ResendVerificationLinkUseCase({ authRepository }).execute(
      'caducado-1',
    );

    expect(authRepository.resendVerificationLink).toHaveBeenCalledWith(
      'caducado-1',
    );
  });

  it.each([[''], ['   '], [null], [undefined]])(
    'sin token (%s) no llama al backend',
    async (token) => {
      const authRepository = { resendVerificationLink: vi.fn() };

      await expect(
        new ResendVerificationLinkUseCase({ authRepository }).execute(token),
      ).rejects.toThrow('Verification token is required');
      expect(authRepository.resendVerificationLink).not.toHaveBeenCalled();
    },
  );
});
