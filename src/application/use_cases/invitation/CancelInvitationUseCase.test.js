import { describe, it, expect, vi } from 'vitest';
import CancelInvitationUseCase from './CancelInvitationUseCase';

describe('CancelInvitationUseCase (FE #724)', () => {
  it('pide al repositorio que la retire', async () => {
    const invitationRepository = { cancelInvitation: vi.fn().mockResolvedValue(undefined) };

    await new CancelInvitationUseCase({ invitationRepository }).execute('inv-1');

    expect(invitationRepository.cancelInvitation).toHaveBeenCalledWith('inv-1');
  });

  it('sin id no llama a nadie', async () => {
    const invitationRepository = { cancelInvitation: vi.fn() };

    await expect(new CancelInvitationUseCase({ invitationRepository }).execute('')).rejects.toThrow();
    expect(invitationRepository.cancelInvitation).not.toHaveBeenCalled();
  });

  it('necesita su repositorio', () => {
    expect(() => new CancelInvitationUseCase({})).toThrow();
  });
});
