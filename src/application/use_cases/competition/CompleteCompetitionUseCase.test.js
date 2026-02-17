import { describe, it, expect, vi, beforeEach } from 'vitest';
import CompleteCompetitionUseCase from './CompleteCompetitionUseCase';

describe('CompleteCompetitionUseCase', () => {
  let useCase;
  let mockRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository = {
      complete: vi.fn(),
    };
    useCase = new CompleteCompetitionUseCase({ competitionRepository: mockRepository });
  });

  describe('execute', () => {
    it('should complete competition successfully', async () => {
      const mockResponse = {
        id: 'comp-123',
        name: 'Test Competition',
        status: 'COMPLETED',
        updated_at: '2025-11-22T10:00:00Z'
      };

      mockRepository.complete.mockResolvedValue(mockResponse);

      const result = await useCase.execute('comp-123');

      expect(mockRepository.complete).toHaveBeenCalledWith('comp-123');
      expect(result).toEqual({
        id: 'comp-123',
        name: 'Test Competition',
        status: 'COMPLETED',
        updatedAt: '2025-11-22T10:00:00Z'
      });
    });

    it('should throw error if competitionId is not provided', async () => {
      await expect(useCase.execute()).rejects.toThrow('Competition ID is required');
      expect(mockRepository.complete).not.toHaveBeenCalled();
    });

    it('should throw error if competitionId is empty string', async () => {
      await expect(useCase.execute('')).rejects.toThrow('Competition ID is required');
      expect(mockRepository.complete).not.toHaveBeenCalled();
    });

    it('should propagate repository errors for invalid state', async () => {
      mockRepository.complete.mockRejectedValue(new Error('Competition must be in IN_PROGRESS status to complete'));

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'Competition must be in IN_PROGRESS status to complete'
      );
    });

    it('should propagate authorization errors', async () => {
      mockRepository.complete.mockRejectedValue(new Error('Only the creator can complete the competition'));

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'Only the creator can complete the competition'
      );
    });

    it('should handle network errors', async () => {
      mockRepository.complete.mockRejectedValue(new Error('Network error'));

      await expect(useCase.execute('comp-123')).rejects.toThrow('Network error');
    });
  });
});
