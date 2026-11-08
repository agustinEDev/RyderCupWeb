import { describe, it, expect, vi } from 'vitest';
import ReauthenticateUseCase from './ReauthenticateUseCase';

describe('ReauthenticateUseCase (RyderCupAm #753)', () => {
  it('pide al repositorio que confirme la contraseña', async () => {
    const authRepository = { reauthenticate: vi.fn().mockResolvedValue({ expiresIn: 300 }) };

    const resultado = await new ReauthenticateUseCase({ authRepository }).execute('Actual123!');

    expect(authRepository.reauthenticate).toHaveBeenCalledWith('Actual123!');
    expect(resultado).toEqual({ expiresIn: 300 });
  });

  it('sin contraseña no pregunta', async () => {
    const authRepository = { reauthenticate: vi.fn() };

    await expect(new ReauthenticateUseCase({ authRepository }).execute('')).rejects.toThrow();
    expect(authRepository.reauthenticate).not.toHaveBeenCalled();
  });

  it('sin repositorio no se construye', () => {
    expect(() => new ReauthenticateUseCase({})).toThrow();
  });
});
