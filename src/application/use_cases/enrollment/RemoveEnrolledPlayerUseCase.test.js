import { describe, it, expect, vi, beforeEach } from 'vitest';
import RemoveEnrolledPlayerUseCase from './RemoveEnrolledPlayerUseCase';

describe('RemoveEnrolledPlayerUseCase (release social 2)', () => {
  let repositorio;
  let useCase;

  beforeEach(() => {
    repositorio = { remove: vi.fn().mockResolvedValue(undefined) };
    useCase = new RemoveEnrolledPlayerUseCase(repositorio);
  });

  it('exige un repositorio', () => {
    expect(() => new RemoveEnrolledPlayerUseCase()).toThrow();
  });

  it('pide quitar esa inscripción', async () => {
    await useCase.execute('enroll-1');

    expect(repositorio.remove).toHaveBeenCalledWith('enroll-1');
  });

  it.each([[''], [null], [undefined], [7]])('sin una inscripción válida (%j), ni lo pide', async (id) => {
    await expect(useCase.execute(id)).rejects.toThrow();
    expect(repositorio.remove).not.toHaveBeenCalled();
  });

  it('el fallo del servidor llega tal cual, con su código', async () => {
    const fallo = Object.assign(new Error('x'), { status: 409, errorCode: 'PLAYER_HAS_MATCHES' });
    repositorio.remove.mockRejectedValue(fallo);

    await expect(useCase.execute('enroll-1')).rejects.toBe(fallo);
  });
});
