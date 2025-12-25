import { describe, it, expect, vi, beforeEach } from 'vitest';
import CompleteCompetitionUseCase from './CompleteCompetitionUseCase';

// Mock fetch globally
globalThis.fetch = vi.fn();


describe('CompleteCompetitionUseCase', () => {
  let useCase;
  const API_URL = 'http://localhost:8000';

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new CompleteCompetitionUseCase();
  });

  describe('execute', () => {
    it('should complete competition successfully', async () => {
      const mockResponse = {
        id: 'comp-123',
        name: 'Test Competition',
        status: 'COMPLETED',
        updated_at: '2025-11-22T10:00:00Z'
      };

      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await useCase.execute('comp-123');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/competitions/comp-123/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );

      expect(result).toEqual({
        id: 'comp-123',
        name: 'Test Competition',
        status: 'COMPLETED',
        updatedAt: '2025-11-22T10:00:00Z'
      });
    });

    it('should throw error if competitionId is not provided', async () => {
      await expect(useCase.execute()).rejects.toThrow('Competition ID is required');
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('should throw error if competitionId is empty string', async () => {
      await expect(useCase.execute('')).rejects.toThrow('Competition ID is required');
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('should throw error if competition is not in IN_PROGRESS status', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: false,
        json: async () => ({ detail: 'Competition must be in IN_PROGRESS status to complete' })
      });

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'Competition must be in IN_PROGRESS status to complete'
      );
    });

    it('should throw error if user is not the creator', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: false,
        json: async () => ({ detail: 'Only the creator can complete the competition' })
      });

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'Only the creator can complete the competition'
      );
    });

    it('should throw generic error if API error has no detail', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({})
      });

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'HTTP 500: Internal Server Error'
      );
    });

    it('should throw generic error if API response is not valid JSON', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON at position 0');
        },
      });

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'HTTP 500: Internal Server Error'
      );
    });

    it('should handle network errors', async () => {
      globalThis.fetch.mockRejectedValue(new Error('Network error'));

      await expect(useCase.execute('comp-123')).rejects.toThrow('Network error');
    });
  });
});
