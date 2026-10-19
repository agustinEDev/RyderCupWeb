import { describe, it, expect, vi } from 'vitest';
import LaunchHandicapUpdateUseCase from './LaunchHandicapUpdateUseCase';
import ScheduleHandicapUpdateUseCase from './ScheduleHandicapUpdateUseCase';
import CancelScheduledHandicapUpdateUseCase from './CancelScheduledHandicapUpdateUseCase';

/** D3 (FE #824, PR 5): lanzar, programar y anular la actualización de hándicaps. */
const repo = () => ({
  launchHandicapUpdate: vi.fn().mockResolvedValue({ status: 'IN_PROGRESS' }),
  scheduleHandicapUpdate: vi.fn().mockResolvedValue({ runAt: 'x' }),
  cancelScheduledHandicapUpdate: vi.fn().mockResolvedValue(),
});

describe('Actualizar hándicaps · casos de uso (FE #824)', () => {
  it('lanzar', async () => {
    const competitionRepository = repo();

    await new LaunchHandicapUpdateUseCase({ competitionRepository }).execute('c-1');

    expect(competitionRepository.launchHandicapUpdate).toHaveBeenCalledWith('c-1');
  });

  it('programar con una hora con huso', async () => {
    const competitionRepository = repo();

    await new ScheduleHandicapUpdateUseCase({ competitionRepository }).execute('c-1', '2030-10-12T03:00:00+02:00');

    expect(competitionRepository.scheduleHandicapUpdate).toHaveBeenCalledWith('c-1', '2030-10-12T03:00:00+02:00');
  });

  it.each(['2030-10-12T03:00', '2030-10-12T03:00:00', '', null])(
    'programar sin huso no se manda (el backend da un 422): %s',
    async (hora) => {
      const competitionRepository = repo();

      await expect(new ScheduleHandicapUpdateUseCase({ competitionRepository }).execute('c-1', hora)).rejects.toThrow();
      expect(competitionRepository.scheduleHandicapUpdate).not.toHaveBeenCalled();
    }
  );

  it('anular', async () => {
    const competitionRepository = repo();

    await new CancelScheduledHandicapUpdateUseCase({ competitionRepository }).execute('c-1');

    expect(competitionRepository.cancelScheduledHandicapUpdate).toHaveBeenCalledWith('c-1');
  });

  it.each([
    ['lanzar', (r) => new LaunchHandicapUpdateUseCase({ competitionRepository: r }).execute('')],
    ['anular', (r) => new CancelScheduledHandicapUpdateUseCase({ competitionRepository: r }).execute('')],
  ])('%s sin competición no llama', async (_c, ejecutar) => {
    const r = repo();

    await expect(ejecutar(r)).rejects.toThrow();
  });
});
