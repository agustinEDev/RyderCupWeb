import { describe, it, expect, vi, beforeEach } from 'vitest';
import ActivateCompetitionUseCase from './ActivateCompetitionUseCase';

describe('ActivateCompetitionUseCase', () => {
  let useCase;
  let mockRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository = {
      activate: vi.fn(),
    };
    useCase = new ActivateCompetitionUseCase({ competitionRepository: mockRepository });
  });

  describe('execute', () => {
    it('should activate competition successfully', async () => {
      const mockResponse = {
        id: 'comp-123',
        name: 'Test Competition',
        status: 'ACTIVE',
        updated_at: '2025-11-22T10:00:00Z'
      };

      mockRepository.activate.mockResolvedValue(mockResponse);

      const result = await useCase.execute('comp-123');

      expect(mockRepository.activate).toHaveBeenCalledWith('comp-123');
      expect(result).toEqual({
        id: 'comp-123',
        name: 'Test Competition',
        status: 'ACTIVE',
        updatedAt: '2025-11-22T10:00:00Z'
      });
    });

    it('should throw error if competitionId is not provided', async () => {
      await expect(useCase.execute()).rejects.toThrow('Competition ID is required');
      expect(mockRepository.activate).not.toHaveBeenCalled();
    });

    it('should throw error if competitionId is empty string', async () => {
      await expect(useCase.execute('')).rejects.toThrow('Competition ID is required');
      expect(mockRepository.activate).not.toHaveBeenCalled();
    });

    it('should propagate repository errors for invalid state transition', async () => {
      mockRepository.activate.mockRejectedValue(new Error('Competition must be in DRAFT status to activate'));

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'Competition must be in DRAFT status to activate'
      );
    });

    it('should propagate authorization errors', async () => {
      mockRepository.activate.mockRejectedValue(new Error('Only the creator can activate this competition'));

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'Only the creator can activate this competition'
      );
    });

    it('should handle network errors', async () => {
      mockRepository.activate.mockRejectedValue(new Error('Network error'));

      await expect(useCase.execute('comp-123')).rejects.toThrow('Network error');
    });
  });
});
