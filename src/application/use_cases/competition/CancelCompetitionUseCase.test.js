import { describe, it, expect, vi, beforeEach } from 'vitest';
import CancelCompetitionUseCase from './CancelCompetitionUseCase';

// Mock fetch globally
global.fetch = vi.fn();

// Mock auth utils
vi.mock('../../../utils/secureAuth', () => ({
  getAuthToken: vi.fn(() => 'test-token')
}));

describe('CancelCompetitionUseCase', () => {
  let useCase;
  const API_URL = 'http://localhost:8000';

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new CancelCompetitionUseCase();
  });

  describe('execute', () => {
    it('should cancel competition successfully', async () => {
      const mockResponse = {
        id: 'comp-123',
        name: 'Test Competition',
        status: 'CANCELLED',
        updated_at: '2025-11-22T10:00:00Z'
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await useCase.execute('comp-123');

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/competitions/comp-123/cancel`,
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
        status: 'CANCELLED',
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

    it('should cancel competition from DRAFT status', async () => {
      const mockResponse = {
        id: 'comp-123',
        name: 'Test Competition',
        status: 'CANCELLED',
        updated_at: '2025-11-22T10:00:00Z'
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await useCase.execute('comp-123');

      expect(result.status).toBe('CANCELLED');
    });

    it('should cancel competition from ACTIVE status', async () => {
      const mockResponse = {
        id: 'comp-123',
        name: 'Test Competition',
        status: 'CANCELLED',
        updated_at: '2025-11-22T10:00:00Z'
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await useCase.execute('comp-123');

      expect(result.status).toBe('CANCELLED');
    });

    it('should cancel competition from IN_PROGRESS status', async () => {
      const mockResponse = {
        id: 'comp-123',
        name: 'Test Competition',
        status: 'CANCELLED',
        updated_at: '2025-11-22T10:00:00Z'
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await useCase.execute('comp-123');

      expect(result.status).toBe('CANCELLED');
    });

    it('should throw error if user is not the creator', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        json: async () => ({ detail: 'Only the creator can cancel the competition' })
      });

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'Only the creator can cancel the competition'
      );
    });

    it('should throw generic error if API error has no detail', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        json: async () => ({})
      });

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'Failed to cancel competition'
      );
    });

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      await expect(useCase.execute('comp-123')).rejects.toThrow('Network error');
    });
  });
});
