import { describe, it, expect, vi, beforeEach } from 'vitest';
import StartCompetitionUseCase from './StartCompetitionUseCase';

describe('StartCompetitionUseCase', () => {
  let useCase;
  let mockRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository = {
      start: vi.fn(),
    };
    useCase = new StartCompetitionUseCase({ competitionRepository: mockRepository });
  });

  describe('execute', () => {
    it('should start competition successfully', async () => {
      const mockResponse = {
        id: 'comp-123',
        name: 'Test Competition',
        status: 'IN_PROGRESS',
        updated_at: '2025-11-22T10:00:00Z'
      };

      mockRepository.start.mockResolvedValue(mockResponse);

      const result = await useCase.execute('comp-123');

      expect(mockRepository.start).toHaveBeenCalledWith('comp-123');
      expect(result).toEqual({
        id: 'comp-123',
        name: 'Test Competition',
        status: 'IN_PROGRESS',
        updatedAt: '2025-11-22T10:00:00Z'
      });
    });

    it('should throw error if competitionId is not provided', async () => {
      await expect(useCase.execute()).rejects.toThrow('Competition ID is required');
      expect(mockRepository.start).not.toHaveBeenCalled();
    });

    it('should throw error if competitionId is empty string', async () => {
      await expect(useCase.execute('')).rejects.toThrow('Competition ID is required');
      expect(mockRepository.start).not.toHaveBeenCalled();
    });

    it('should propagate repository errors', async () => {
      mockRepository.start.mockRejectedValue(new Error('Competition must be in CLOSED status to start'));

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'Competition must be in CLOSED status to start'
      );
    });

    it('should propagate authorization errors', async () => {
      mockRepository.start.mockRejectedValue(new Error('Only the creator can start the competition'));

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'Only the creator can start the competition'
      );
    });

    it('should handle network errors', async () => {
      mockRepository.start.mockRejectedValue(new Error('Network error'));

      await expect(useCase.execute('comp-123')).rejects.toThrow('Network error');
    });
  });
});
