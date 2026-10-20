import { describe, it, expect, vi } from 'vitest';
import AcceptTermsUseCase from './AcceptTermsUseCase';

/** F2/F3: aceptar la versión vigente de los Términos. */
describe('AcceptTermsUseCase', () => {
  it('exige el repositorio', () => {
    expect(() => new AcceptTermsUseCase({})).toThrow('userRepository is required');
  });

  it('acepta y devuelve el usuario actualizado', async () => {
    const usuario = { termsAccepted: true };
    const userRepository = { acceptTerms: vi.fn().mockResolvedValue(usuario) };

    await expect(new AcceptTermsUseCase({ userRepository }).execute()).resolves.toBe(usuario);
    expect(userRepository.acceptTerms).toHaveBeenCalledTimes(1);
  });

  it('un fallo se propaga', async () => {
    const userRepository = { acceptTerms: vi.fn().mockRejectedValue(new Error('sin red')) };

    await expect(new AcceptTermsUseCase({ userRepository }).execute()).rejects.toThrow('sin red');
  });
});
