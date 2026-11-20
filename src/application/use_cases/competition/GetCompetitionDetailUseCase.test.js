import { describe, it, expect, vi, beforeEach } from 'vitest';
import GetCompetitionDetailUseCase from './GetCompetitionDetailUseCase';
import CompetitionAssembler from '../../assemblers/CompetitionAssembler';

// Mock del assembler
vi.mock('../../assemblers/CompetitionAssembler');

describe('GetCompetitionDetailUseCase', () => {
  let useCase;
  let mockRepository;
  let mockCompetition;
  let mockExtras;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock competition entity
    mockCompetition = {
      id: { toString: () => 'comp-123' },
      name: { toString: () => 'Test Competition' },
      status: { value: 'DRAFT' },
    };
    mockExtras = {
      countries: [{ code: 'ES', nameEn: 'Spain', nameEs: 'España' }],
    };

    // Mock repository: la entidad y sus extras
    mockRepository = {
      findById: vi
        .fn()
        .mockResolvedValue({ entity: mockCompetition, extras: mockExtras }),
    };

    // Mock CompetitionAssembler.toSimpleDTO
    CompetitionAssembler.toSimpleDTO = vi.fn().mockReturnValue({
      id: 'comp-123',
      name: 'Test Competition',
      status: 'DRAFT',
      countries: [{ code: 'ES', name: 'Spain', flag: '🇪🇸', isMain: true }],
    });

    // Create use case instance
    useCase = new GetCompetitionDetailUseCase({
      competitionRepository: mockRepository,
    });
  });

  describe('execute', () => {
    it('should get competition details successfully', async () => {
      const result = await useCase.execute('comp-123');

      expect(mockRepository.findById).toHaveBeenCalledWith('comp-123');
      expect(CompetitionAssembler.toSimpleDTO).toHaveBeenCalledWith(
        mockCompetition,
        mockExtras,
      );
      expect(result).toEqual({
        id: 'comp-123',
        name: 'Test Competition',
        status: 'DRAFT',
        countries: [{ code: 'ES', name: 'Spain', flag: '🇪🇸', isMain: true }],
      });
    });

    it('should throw error if competitionId is not provided', async () => {
      await expect(useCase.execute()).rejects.toThrow(
        'Competition ID is required',
      );
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw error if competitionId is empty string', async () => {
      await expect(useCase.execute('')).rejects.toThrow(
        'Competition ID is required',
      );
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });

    it('should propagate repository errors', async () => {
      mockRepository.findById.mockRejectedValue(
        new Error('Competition not found'),
      );

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'Competition not found',
      );
      expect(mockRepository.findById).toHaveBeenCalledWith('comp-123');
    });

    it('should throw "Competition not found" error if repository returns null', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'Competition not found',
      );
      expect(mockRepository.findById).toHaveBeenCalledWith('comp-123');
      expect(CompetitionAssembler.toSimpleDTO).not.toHaveBeenCalled();
    });

    it('should propagate mapper errors', async () => {
      CompetitionAssembler.toSimpleDTO.mockImplementation(() => {
        throw new Error('Mapping error');
      });

      await expect(useCase.execute('comp-123')).rejects.toThrow(
        'Mapping error',
      );
      expect(mockRepository.findById).toHaveBeenCalledWith('comp-123');
    });

    it('should handle competition with multiple countries', async () => {
      const multiCountryExtras = {
        countries: [
          { code: 'ES', nameEn: 'Spain', nameEs: 'España' },
          { code: 'FR', nameEn: 'France', nameEs: 'Francia' },
          { code: 'PT', nameEn: 'Portugal', nameEs: 'Portugal' },
        ],
      };

      mockRepository.findById.mockResolvedValue({
        entity: mockCompetition,
        extras: multiCountryExtras,
      });
      CompetitionAssembler.toSimpleDTO.mockReturnValue({
        id: 'comp-123',
        name: 'Test Competition',
        status: 'DRAFT',
        countries: [
          { code: 'ES', name: 'Spain', flag: '🇪🇸', isMain: true },
          { code: 'FR', name: 'France', flag: '🇫🇷', isMain: false },
          { code: 'PT', name: 'Portugal', flag: '🇵🇹', isMain: false },
        ],
      });

      const result = await useCase.execute('comp-123');

      expect(result.countries).toHaveLength(3);
      expect(result.countries[0].isMain).toBe(true);
      expect(result.countries[1].isMain).toBe(false);
    });
  });
});
