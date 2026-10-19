import { describe, it, expect, vi } from 'vitest';
import TakeTeeWindowPlaceUseCase from './TakeTeeWindowPlaceUseCase';
import ReleaseTeeWindowPlaceUseCase from './ReleaseTeeWindowPlaceUseCase';
import JoinWaitingListUseCase from './JoinWaitingListUseCase';
import LeaveWaitingListUseCase from './LeaveWaitingListUseCase';
import ListMyAssignedPlacesUseCase from './ListMyAssignedPlacesUseCase';
import AcknowledgeAssignedPlaceUseCase from './AcknowledgeAssignedPlaceUseCase';

/** D1-D2 (FE #824, PR 4): cada caso de uso pasa al repositorio y no llama sin lo que necesita. */
const repo = () => ({
  takePlace: vi.fn().mockResolvedValue({}),
  releasePlace: vi.fn().mockResolvedValue(),
  joinWaitingList: vi.fn().mockResolvedValue({}),
  leaveWaitingList: vi.fn().mockResolvedValue(),
  getMyAssignedPlaces: vi.fn().mockResolvedValue([]),
  acknowledgeAssignedPlace: vi.fn().mockResolvedValue(),
});

describe('Plazas en franjas · casos de uso (FE #824)', () => {
  it('coger plaza, con a quién y en lugar de cuál', async () => {
    const scheduleRepository = repo();

    await new TakeTeeWindowPlaceUseCase({ scheduleRepository }).execute('r-2', { userId: 'u-1', insteadOfRoundId: 'r-1' });

    expect(scheduleRepository.takePlace).toHaveBeenCalledWith('r-2', { userId: 'u-1', insteadOfRoundId: 'r-1' });
  });

  it('coger plaza para uno mismo, sin más', async () => {
    const scheduleRepository = repo();

    await new TakeTeeWindowPlaceUseCase({ scheduleRepository }).execute('r-2');

    expect(scheduleRepository.takePlace).toHaveBeenCalledWith('r-2', {});
  });

  it.each([
    ['coger', (r) => new TakeTeeWindowPlaceUseCase({ scheduleRepository: r }).execute(''), 'takePlace'],
    ['soltar sin jugador', (r) => new ReleaseTeeWindowPlaceUseCase({ scheduleRepository: r }).execute('r-1', ''), 'releasePlace'],
    ['esperar', (r) => new JoinWaitingListUseCase({ scheduleRepository: r }).execute(''), 'joinWaitingList'],
    ['dejar de esperar sin jugador', (r) => new LeaveWaitingListUseCase({ scheduleRepository: r }).execute('r-1', ''), 'leaveWaitingList'],
    ['entendido', (r) => new AcknowledgeAssignedPlaceUseCase({ scheduleRepository: r }).execute(''), 'acknowledgeAssignedPlace'],
  ])('%s: sin lo necesario no llama', async (_caso, ejecutar, metodo) => {
    const scheduleRepository = repo();

    await expect(ejecutar(scheduleRepository)).rejects.toThrow();
    expect(scheduleRepository[metodo]).not.toHaveBeenCalled();
  });

  it('soltar, esperar, dejar de esperar y entendido pasan sus datos', async () => {
    const scheduleRepository = repo();

    await new ReleaseTeeWindowPlaceUseCase({ scheduleRepository }).execute('r-1', 'u-1');
    await new JoinWaitingListUseCase({ scheduleRepository }).execute('r-1');
    await new LeaveWaitingListUseCase({ scheduleRepository }).execute('r-1', 'u-1');
    await new AcknowledgeAssignedPlaceUseCase({ scheduleRepository }).execute('r-1');

    expect(scheduleRepository.releasePlace).toHaveBeenCalledWith('r-1', 'u-1');
    expect(scheduleRepository.joinWaitingList).toHaveBeenCalledWith('r-1');
    expect(scheduleRepository.leaveWaitingList).toHaveBeenCalledWith('r-1', 'u-1');
    expect(scheduleRepository.acknowledgeAssignedPlace).toHaveBeenCalledWith('r-1');
  });

  it('mis plazas asignadas', async () => {
    const scheduleRepository = repo();
    scheduleRepository.getMyAssignedPlaces.mockResolvedValue([{ roundId: 'r-1' }]);

    expect(await new ListMyAssignedPlacesUseCase({ scheduleRepository }).execute()).toEqual([{ roundId: 'r-1' }]);
  });
});
