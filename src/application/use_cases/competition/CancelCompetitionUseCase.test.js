import { describe, it, expect, vi, beforeEach } from 'vitest';
import CancelCompetitionUseCase from './CancelCompetitionUseCase';

// Mock fetch globally
globalThis.fetch = vi.fn();


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

      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await useCase.execute('comp-123');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/competitions/comp-123/cancel`,
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
        status: 'CANCELLED',
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

    it('should cancel competition from DRAFT status', async () => {
      const mockResponse = {
        id: 'comp-123',
        name: 'Test Competition',
        status: 'CANCELLED',
        updated_at: '2025-11-22T10:00:00Z'
      };

      globalThis.fetch.mockResolvedValue({
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

      globalThis.fetch.mockResolvedValue({
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

      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await useCase.execute('comp-123');

      expect(result.status).toBe('CANCELLED');
    });

    it('should throw error if user is not the creator', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: false,
        json: async () => ({ detail: 'Only the creator can cancel the competition' })
      });

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'Only the creator can cancel the competition'
      );
    });

    it('should throw generic error if API error has no detail', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({})
      });

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'Competition cancellation error: HTTP 400: Bad Request'
      );
    });

    it('should handle network errors', async () => {
      globalThis.fetch.mockRejectedValue(new Error('Network error'));

      await expect(useCase.execute('comp-123')).rejects.toThrow('Network error');
    });
  });
});
