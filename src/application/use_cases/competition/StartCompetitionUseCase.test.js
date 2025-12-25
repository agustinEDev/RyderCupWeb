import { describe, it, expect, vi, beforeEach } from 'vitest';
import StartCompetitionUseCase from './StartCompetitionUseCase';

// Mock fetch globally
globalThis.fetch = vi.fn();

describe('StartCompetitionUseCase', () => {
  let useCase;

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

      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await useCase.execute('comp-123');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/v1/competitions/comp-123/start',
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
        status: 'IN_PROGRESS',
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

    it('should throw error if competition is not in CLOSED status', async () => {
      const mockResponse = {
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: async () => ({ detail: 'Competition must be in CLOSED status to start' }),
        clone: function() { return this; },
      };
      globalThis.fetch.mockResolvedValue(mockResponse);

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'Competition must be in CLOSED status to start'
      );
    });

    it('should throw error if user is not the creator', async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ detail: 'Only the creator can start the competition' }),
        clone: function() { return this; },
      };
      globalThis.fetch.mockResolvedValue(mockResponse);

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'Only the creator can start the competition'
      );
    });

    it('should throw generic error if API error has no detail', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({}),
        clone: function() { return this; },
      };
      globalThis.fetch.mockResolvedValue(mockResponse);

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'HTTP 500: Internal Server Error'
      );
    });

    it('should throw error with text content if API response is not JSON', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => { throw new SyntaxError('Unexpected token < in JSON at position 0'); },
        text: async () => '<html><body><h1>500 Internal Server Error</h1></body></html>',
        clone: function() { return this; },
      };
      globalThis.fetch.mockResolvedValue(mockResponse);

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
