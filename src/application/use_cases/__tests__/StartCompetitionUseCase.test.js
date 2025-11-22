import { describe, it, expect, vi, beforeEach } from 'vitest';
import StartCompetitionUseCase from '../StartCompetitionUseCase';

// Mock fetch globally
global.fetch = vi.fn();

// Mock auth utils
vi.mock('../../../utils/secureAuth', () => ({
  getAuthToken: vi.fn(() => 'test-token')
}));

describe('StartCompetitionUseCase', () => {
  let useCase;
  const API_URL = 'http://localhost:8000';

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new StartCompetitionUseCase();
  });

  describe('execute', () => {
    it('should start competition successfully', async () => {
      const mockResponse = {
        id: 'comp-123',
        name: 'Test Competition',
        status: 'IN_PROGRESS',
        updated_at: '2025-11-22T10:00:00Z'
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await useCase.execute('comp-123');

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/competitions/comp-123/start`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          }
        }
      );

      expect(result).toEqual({
        id: 'comp-123',
        name: 'Test Competition',
        status: 'IN_PROGRESS',
        updatedAt: '2025-11-22T10:00:00Z'
      });
    });

    it('should throw error if competitionId is not provided', async () => {
      await expect(useCase.execute()).rejects.toThrow('Competition ID is required');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should throw error if competitionId is empty string', async () => {
      await expect(useCase.execute('')).rejects.toThrow('Competition ID is required');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should throw error if competition is not in CLOSED status', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        json: async () => ({ detail: 'Competition must be in CLOSED status to start' })
      });

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'Competition must be in CLOSED status to start'
      );
    });

    it('should throw error if user is not the creator', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        json: async () => ({ detail: 'Only the creator can start the competition' })
      });

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'Only the creator can start the competition'
      );
    });

    it('should throw generic error if API error has no detail', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        json: async () => ({})
      });

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'Failed to start competition'
      );
    });

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      await expect(useCase.execute('comp-123')).rejects.toThrow('Network error');
    });
  });
});
