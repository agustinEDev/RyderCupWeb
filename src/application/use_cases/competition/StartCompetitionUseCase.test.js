import { describe, it, expect, vi, beforeEach } from 'vitest';
import StartCompetitionUseCase from './StartCompetitionUseCase';
import { authenticatedFetch } from '../../../utils/secureAuth'; // Import authenticatedFetch

// Mock secureAuth module to control authenticatedFetch and getAuthToken
vi.mock('../../../utils/secureAuth', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getAuthToken: vi.fn(() => 'test-token'), // Mock getAuthToken for explicit token presence checks
    authenticatedFetch: vi.fn(), // Mock authenticatedFetch itself
  };
});

describe('StartCompetitionUseCase', () => {
  let useCase;
  const API_URL = 'http://localhost:8000';

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for authenticatedFetch to return a successful response
    authenticatedFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}) // Default empty JSON response
    });
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

      authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await useCase.execute('comp-123');

      expect(authenticatedFetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/competitions/comp-123/start`,
        {
          method: 'POST',
          headers: {} // authenticatedFetch adds Content-Type and Authorization headers internally
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
      expect(authenticatedFetch).not.toHaveBeenCalled();
    });

    it('should throw error if competitionId is empty string', async () => {
      await expect(useCase.execute('')).rejects.toThrow('Competition ID is required');
      expect(authenticatedFetch).not.toHaveBeenCalled();
    });

    it('should throw error if competition is not in CLOSED status', async () => {
      const mockResponse = {
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: async () => ({ detail: 'Competition must be in CLOSED status to start' }),
        clone: () => mockResponse,
      };
      authenticatedFetch.mockResolvedValue(mockResponse);

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'API Error (409 Conflict): Competition must be in CLOSED status to start'
      );
    });

    it('should throw error if user is not the creator', async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ detail: 'Only the creator can start the competition' }),
        clone: () => mockResponse,
      };
      authenticatedFetch.mockResolvedValue(mockResponse);

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'API Error (403 Forbidden): Only the creator can start the competition'
      );
    });

    it('should throw generic error if API error has no detail', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({}),
        clone: () => mockResponse,
      };
      authenticatedFetch.mockResolvedValue(mockResponse);

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        `API Error (500 Internal Server Error): No detail provided.`
      );
    });

    it('should throw error with text content if API response is not JSON', async () => {
      const mockHtmlError = '<html><body><h1>500 Internal Server Error</h1></body></html>';
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => { throw new SyntaxError('Unexpected token < in JSON at position 0'); },
        text: async () => mockHtmlError,
        clone: () => mockResponse,
      };
      authenticatedFetch.mockResolvedValue(mockResponse);

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        `API Error (500 Internal Server Error): ${mockHtmlError}`
      );
    });

    it('should handle network errors', async () => {
      authenticatedFetch.mockRejectedValue(new Error('Network error'));

      await expect(useCase.execute('comp-123')).rejects.toThrow('Network error');
    });
  });
});
