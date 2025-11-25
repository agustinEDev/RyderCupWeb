import { describe, it, expect, vi, beforeEach } from 'vitest';
import ActivateCompetitionUseCase from './ActivateCompetitionUseCase';

// Mock fetch globally
globalThis.fetch = vi.fn();

// Mock auth utils
vi.mock('../../../utils/secureAuth', () => ({
  getAuthToken: vi.fn(() => 'test-token')
}));

describe('ActivateCompetitionUseCase', () => {
  let useCase;
  const API_URL = 'http://localhost:8000';

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new ActivateCompetitionUseCase();
  });

  describe('execute', () => {
    it('should activate competition successfully', async () => {
      const mockResponse = {
        id: 'comp-123',
        name: 'Test Competition',
        status: 'ACTIVE',
        updated_at: '2025-11-22T10:00:00Z'
      };

      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await useCase.execute('comp-123');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/competitions/comp-123/activate`,
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
        status: 'ACTIVE',
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

    it('should throw error if API returns 403 (not creator)', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: false,
        json: async () => ({ detail: 'Only the creator can activate this competition' })
      });

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'Only the creator can activate this competition'
      );
    });

    it('should throw error if API returns 409 (invalid state transition)', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: false,
        json: async () => ({ detail: 'Competition must be in DRAFT status to activate' })
      });

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'Competition must be in DRAFT status to activate'
      );
    });

    it('should throw generic error if API error has no detail', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: false,
        json: async () => ({})
      });

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'Failed to activate competition'
      );
    });

    it('should handle network errors', async () => {
      globalThis.fetch.mockRejectedValue(new Error('Network error'));

      await expect(useCase.execute('comp-123')).rejects.toThrow('Network error');
    });
  });
});
