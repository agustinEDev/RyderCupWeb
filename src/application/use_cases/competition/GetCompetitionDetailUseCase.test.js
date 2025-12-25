import { describe, it, expect, vi, beforeEach } from 'vitest';
import GetCompetitionDetailUseCase from './GetCompetitionDetailUseCase';
import CompetitionMapper from '../../../infrastructure/mappers/CompetitionMapper';

// Mock del mapper
vi.mock('../../../infrastructure/mappers/CompetitionMapper');

describe('GetCompetitionDetailUseCase', () => {
  let useCase;
  let mockRepository;
  let mockCompetition;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock competition entity
    mockCompetition = {
      id: { toString: () => 'comp-123' },
      name: { toString: () => 'Test Competition' },
      status: { value: 'DRAFT' },
      _apiData: {
        countries: [
          { code: 'ES', name_en: 'Spain', name_es: 'España' }
        ]
      }
    };

    // Mock repository
    mockRepository = {
      findById: vi.fn().mockResolvedValue(mockCompetition)
    };

    // Mock CompetitionMapper.toSimpleDTO
    CompetitionMapper.toSimpleDTO = vi.fn().mockReturnValue({
      id: 'comp-123',
      name: 'Test Competition',
      status: 'DRAFT',
      countries: [
        { code: 'ES', name: 'Spain', flag: '🇪🇸', isMain: true }
      ]
    });

    // Create use case instance
    useCase = new GetCompetitionDetailUseCase({ competitionRepository: mockRepository });
  });

  describe('execute', () => {
    it('should get competition details successfully', async () => {
      const result = await useCase.execute('comp-123');

      expect(mockRepository.findById).toHaveBeenCalledWith('comp-123');
      expect(CompetitionMapper.toSimpleDTO).toHaveBeenCalledWith(
        mockCompetition,
        mockCompetition._apiData
      );
      expect(result).toEqual({
        id: 'comp-123',
        name: 'Test Competition',
        status: 'DRAFT',
        countries: [
          { code: 'ES', name: 'Spain', flag: '🇪🇸', isMain: true }
        ]
      });
    });

    it('should throw error if competitionId is not provided', async () => {
      await expect(useCase.execute()).rejects.toThrow('Competition ID is required');
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw error if competitionId is empty string', async () => {
      await expect(useCase.execute('')).rejects.toThrow('Competition ID is required');
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });

    it('should propagate repository errors', async () => {
      mockRepository.findById.mockRejectedValue(new Error('Competition not found'));

      await expect(useCase.execute('comp-123')).rejects.toThrow('Competition not found');
      expect(mockRepository.findById).toHaveBeenCalledWith('comp-123');
    });

    it('should throw "Competition not found" error if repository returns null', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute('comp-123')).rejects.toThrow('Competition not found');
      expect(mockRepository.findById).toHaveBeenCalledWith('comp-123');
      expect(CompetitionMapper.toSimpleDTO).not.toHaveBeenCalled();
    });

    it('should propagate mapper errors', async () => {
      CompetitionMapper.toSimpleDTO.mockImplementation(() => {
        throw new Error('Mapping error');
      });

      await expect(useCase.execute('comp-123')).rejects.toThrow('Mapping error');
      expect(mockRepository.findById).toHaveBeenCalledWith('comp-123');
    });

    it('should handle competition with multiple countries', async () => {
      const multiCountryCompetition = {
        ...mockCompetition,
        _apiData: {
          countries: [
            { code: 'ES', name_en: 'Spain', name_es: 'España' },
            { code: 'FR', name_en: 'France', name_es: 'Francia' },
            { code: 'PT', name_en: 'Portugal', name_es: 'Portugal' }
          ]
        }
      };

      mockRepository.findById.mockResolvedValue(multiCountryCompetition);
      CompetitionMapper.toSimpleDTO.mockReturnValue({
        id: 'comp-123',
        name: 'Test Competition',
        status: 'DRAFT',
        countries: [
          { code: 'ES', name: 'Spain', flag: '🇪🇸', isMain: true },
          { code: 'FR', name: 'France', flag: '🇫🇷', isMain: false },
          { code: 'PT', name: 'Portugal', flag: '🇵🇹', isMain: false }
        ]
      });

      const result = await useCase.execute('comp-123');

      expect(result.countries).toHaveLength(3);
      expect(result.countries[0].isMain).toBe(true);
      expect(result.countries[1].isMain).toBe(false);
    });
  });
});
