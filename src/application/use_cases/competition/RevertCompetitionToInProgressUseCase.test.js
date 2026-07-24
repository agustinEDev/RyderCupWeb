import { describe, it, expect, vi, beforeEach } from 'vitest';
import RevertCompetitionToInProgressUseCase from './RevertCompetitionToInProgressUseCase';

describe('RevertCompetitionToInProgressUseCase', () => {
  let useCase;
  let mockRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository = {
      revertToInProgress: vi.fn(),
    };
    useCase = new RevertCompetitionToInProgressUseCase({ competitionRepository: mockRepository });
  });

  describe('execute', () => {
    it('should revert competition to in progress successfully', async () => {
      const mockResponse = {
        id: 'comp-123',
        name: 'Test Competition',
        status: 'IN_PROGRESS',
        updated_at: '2026-07-09T10:00:00Z'
      };

      mockRepository.revertToInProgress.mockResolvedValue(mockResponse);

      const result = await useCase.execute('comp-123');

      expect(mockRepository.revertToInProgress).toHaveBeenCalledWith('comp-123');
      expect(result).toEqual({
        id: 'comp-123',
        name: 'Test Competition',
        status: 'IN_PROGRESS',
        updatedAt: '2026-07-09T10:00:00Z'
      });
    });

    it('should throw error if competitionId is not provided', async () => {
      await expect(useCase.execute()).rejects.toThrow('Competition ID is required');
      expect(mockRepository.revertToInProgress).not.toHaveBeenCalled();
    });

    it('should throw error if competitionId is empty string', async () => {
      await expect(useCase.execute('')).rejects.toThrow('Competition ID is required');
      expect(mockRepository.revertToInProgress).not.toHaveBeenCalled();
    });

    it('should propagate repository errors', async () => {
      mockRepository.revertToInProgress.mockRejectedValue(
        new Error('Competition must be in COMPLETED status to revert')
      );

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'Competition must be in COMPLETED status to revert'
      );
    });

    it('should propagate authorization errors', async () => {
      mockRepository.revertToInProgress.mockRejectedValue(
        new Error('Only the creator can revert the competition')
      );

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'Only the creator can revert the competition'
      );
    });

    it('should handle network errors', async () => {
      mockRepository.revertToInProgress.mockRejectedValue(new Error('Network error'));

      await expect(useCase.execute('comp-123')).rejects.toThrow('Network error');
    });
  });
});
