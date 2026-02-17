import { describe, it, expect, vi, beforeEach } from 'vitest';
import CloseEnrollmentsUseCase from './CloseEnrollmentsUseCase';

describe('CloseEnrollmentsUseCase', () => {
  let useCase;
  let mockRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository = {
      closeEnrollments: vi.fn(),
    };
    useCase = new CloseEnrollmentsUseCase({ competitionRepository: mockRepository });
  });

  describe('execute', () => {
    it('should close enrollments successfully', async () => {
      const mockResponse = {
        id: 'comp-123',
        name: 'Test Competition',
        status: 'CLOSED',
        updated_at: '2025-11-22T10:00:00Z'
      };

      mockRepository.closeEnrollments.mockResolvedValue(mockResponse);

      const result = await useCase.execute('comp-123');

      expect(mockRepository.closeEnrollments).toHaveBeenCalledWith('comp-123');
      expect(result).toEqual({
        id: 'comp-123',
        name: 'Test Competition',
        status: 'CLOSED',
        updatedAt: '2025-11-22T10:00:00Z'
      });
    });

    it('should throw error if competitionId is not provided', async () => {
      await expect(useCase.execute()).rejects.toThrow('Competition ID is required');
      expect(mockRepository.closeEnrollments).not.toHaveBeenCalled();
    });

    it('should throw error if competitionId is empty string', async () => {
      await expect(useCase.execute('')).rejects.toThrow('Competition ID is required');
      expect(mockRepository.closeEnrollments).not.toHaveBeenCalled();
    });

    it('should propagate repository errors for invalid state', async () => {
      mockRepository.closeEnrollments.mockRejectedValue(new Error('Competition must be in ACTIVE status to close enrollments'));

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'Competition must be in ACTIVE status to close enrollments'
      );
    });

    it('should propagate authorization errors', async () => {
      mockRepository.closeEnrollments.mockRejectedValue(new Error('Only the creator can close enrollments'));

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'Only the creator can close enrollments'
      );
    });

    it('should handle network errors', async () => {
      mockRepository.closeEnrollments.mockRejectedValue(new Error('Network error'));

      await expect(useCase.execute('comp-123')).rejects.toThrow('Network error');
    });
  });
});
