import { describe, it, expect, vi, beforeEach } from 'vitest';
import CancelCompetitionUseCase from './CancelCompetitionUseCase';

describe('CancelCompetitionUseCase', () => {
  let useCase;
  let mockRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository = {
      cancel: vi.fn(),
    };
    useCase = new CancelCompetitionUseCase({ competitionRepository: mockRepository });
  });

  describe('execute', () => {
    it('should cancel competition successfully', async () => {
      const mockResponse = {
        id: 'comp-123',
        name: 'Test Competition',
        status: 'CANCELLED',
        updated_at: '2025-11-22T10:00:00Z'
      };

      mockRepository.cancel.mockResolvedValue(mockResponse);

      const result = await useCase.execute('comp-123');

      expect(mockRepository.cancel).toHaveBeenCalledWith('comp-123');
      expect(result).toEqual({
        id: 'comp-123',
        name: 'Test Competition',
        status: 'CANCELLED',
        updatedAt: '2025-11-22T10:00:00Z'
      });
    });

    it('should throw error if competitionId is not provided', async () => {
      await expect(useCase.execute()).rejects.toThrow('Competition ID is required');
      expect(mockRepository.cancel).not.toHaveBeenCalled();
    });

    it('should throw error if competitionId is empty string', async () => {
      await expect(useCase.execute('')).rejects.toThrow('Competition ID is required');
      expect(mockRepository.cancel).not.toHaveBeenCalled();
    });

    it('should propagate repository errors', async () => {
      mockRepository.cancel.mockRejectedValue(new Error('Cannot cancel competition'));

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'Cannot cancel competition'
      );
    });

    it('should propagate authorization errors', async () => {
      mockRepository.cancel.mockRejectedValue(new Error('Only the creator can cancel the competition'));

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'Only the creator can cancel the competition'
      );
    });

    it('should handle network errors', async () => {
      mockRepository.cancel.mockRejectedValue(new Error('Network error'));

      await expect(useCase.execute('comp-123')).rejects.toThrow('Network error');
    });
  });
});
