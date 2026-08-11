import { describe, it, expect, vi } from 'vitest';
import SetActivitySharingUseCase from './SetActivitySharingUseCase';

const repositorio = (respuesta = { shareActivity: false, removedEvents: 0 }) => ({
  setActivitySharing: vi.fn().mockResolvedValue(respuesta),
});

describe('SetActivitySharingUseCase', () => {
  it('requires a repository', () => {
    expect(() => new SetActivitySharingUseCase({})).toThrow(
      'SetActivitySharingUseCase requires socialFeedRepository'
    );
  });

  it('passes the new value through to the repository', async () => {
    const socialFeedRepository = repositorio();
    const useCase = new SetActivitySharingUseCase({ socialFeedRepository });

    await useCase.execute(false);

    expect(socialFeedRepository.setActivitySharing).toHaveBeenCalledWith(false);
  });

  it('reports how many entries were removed', async () => {
    // Apagar borra lo ya publicado. La pantalla necesita el número para poder
    // decir qué ha pasado, no solo que el interruptor cambió de lado.
    const socialFeedRepository = repositorio({ shareActivity: false, removedEvents: 12 });
    const useCase = new SetActivitySharingUseCase({ socialFeedRepository });

    const result = await useCase.execute(false);

    expect(result).toEqual({ shareActivity: false, removedEvents: 12 });
  });

  it('rejects anything that is not a boolean', async () => {
    // Un valor suelto llegaria al backend como `enabled: "false"`, que Pydantic
    // interpreta como cierto: apagar acabaria encendiendo.
    const socialFeedRepository = repositorio();
    const useCase = new SetActivitySharingUseCase({ socialFeedRepository });

    await expect(useCase.execute('false')).rejects.toThrow(
      'SetActivitySharingUseCase requires a boolean'
    );
    expect(socialFeedRepository.setActivitySharing).not.toHaveBeenCalled();
  });
});
