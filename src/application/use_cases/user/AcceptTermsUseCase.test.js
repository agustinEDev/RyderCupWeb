import { describe, it, expect, vi } from 'vitest';
import AcceptTermsUseCase from './AcceptTermsUseCase';

/** F2/F3: aceptar la versión vigente de los Términos. */
describe('AcceptTermsUseCase', () => {
  it('exige el repositorio', () => {
    expect(() => new AcceptTermsUseCase({})).toThrow('userRepository is required');
  });

  it('acepta y devuelve el usuario tal como lo da el backend', async () => {
    const dto = { terms_accepted: true, is_admin: false };
    const userRepository = { acceptTerms: vi.fn().mockResolvedValue(dto) };

    await expect(new AcceptTermsUseCase({ userRepository }).execute()).resolves.toBe(dto);
    expect(userRepository.acceptTerms).toHaveBeenCalledTimes(1);
  });

  it('un fallo se propaga', async () => {
    const userRepository = { acceptTerms: vi.fn().mockRejectedValue(new Error('sin red')) };

    await expect(new AcceptTermsUseCase({ userRepository }).execute()).rejects.toThrow('sin red');
  });
});
