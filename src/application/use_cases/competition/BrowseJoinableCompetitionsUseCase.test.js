import { describe, it, expect, vi, beforeEach } from 'vitest';
import BrowseJoinableCompetitionsUseCase from './BrowseJoinableCompetitionsUseCase';

// Mock the CompetitionAssembler
vi.mock('../../assemblers/CompetitionAssembler', () => ({
  default: {
    toSimpleDTO: vi.fn((competition) => ({
      id: competition.id,
      name: competition.name,
      startDate: competition.startDate,
      endDate: competition.endDate,
      status: competition.status,
      creator: competition.creator,
      enrolledCount: competition.enrolledCount,
      maxPlayers: competition.maxPlayers,
      countries: competition.countries
    }))
  }
}));

describe('BrowseJoinableCompetitionsUseCase', () => {
  let competitionRepository;
  let browseJoinableCompetitionsUseCase;

  beforeEach(() => {
    vi.clearAllMocks();

    // Re-instantiate the repository mock for each test
    competitionRepository = {
      findPublic: vi.fn(),
    };

    // Re-instantiate the use case with the mock
    browseJoinableCompetitionsUseCase = new BrowseJoinableCompetitionsUseCase(competitionRepository);
  });

  it('should successfully list ACTIVE joinable competitions with default filters', async () => {
    // Arrange
    const filters = {};

    // Mock competition entities returned by repository
    const mockCompetitionEntities = [
      {
        id: 'comp-1',
        name: 'Spring Championship 2025',
        startDate: '2025-03-01',
        endDate: '2025-03-05',
        status: 'ACTIVE',
        creator: { id: 'creator-1', name: 'John Doe' },
        enrolledCount: 10,
        maxPlayers: 24,
        countries: ['ESP', 'USA']
      },
      {
        id: 'comp-2',
        name: 'Summer Tournament',
        startDate: '2025-06-15',
        endDate: '2025-06-20',
        status: 'ACTIVE',
        creator: { id: 'creator-2', name: 'Jane Smith' },
        enrolledCount: 5,
        maxPlayers: 20,
        countries: ['GBR', 'FRA']
      }
    ];

    // Expected simple DTOs (what the UI will receive)
    const expectedDTOs = [
      {
        id: 'comp-1',
        name: 'Spring Championship 2025',
        startDate: '2025-03-01',
        endDate: '2025-03-05',
        status: 'ACTIVE',
        creator: { id: 'creator-1', name: 'John Doe' },
        enrolledCount: 10,
        maxPlayers: 24,
        countries: ['ESP', 'USA']
      },
      {
        id: 'comp-2',
        name: 'Summer Tournament',
        startDate: '2025-06-15',
        endDate: '2025-06-20',
        status: 'ACTIVE',
        creator: { id: 'creator-2', name: 'Jane Smith' },
        enrolledCount: 5,
        maxPlayers: 20,
        countries: ['GBR', 'FRA']
      }
    ];

    // Configure repository mock to return the competition entities
    competitionRepository.findPublic.mockResolvedValue(mockCompetitionEntities);

    // Act
    const result = await browseJoinableCompetitionsUseCase.execute(filters);

    // Assert
    // 1. Verify repository.findPublic was called with correct filters
    expect(competitionRepository.findPublic).toHaveBeenCalledWith({
      status: 'ACTIVE',
      excludeMyCompetitions: true,
      searchName: undefined,
      searchCreator: undefined,
      limit: 50,
      offset: 0
    });

    // 2. Verify the use case returns the DTOs (not the entities)
    expect(result).toEqual(expectedDTOs);
    expect(result).toHaveLength(2);
  });

  it('should pass searchName filter to repository', async () => {
    // Arrange
    const filters = { searchName: 'Championship' };

    // Configure repository mock
    competitionRepository.findPublic.mockResolvedValue([]);

    // Act
    await browseJoinableCompetitionsUseCase.execute(filters);

    // Assert
    expect(competitionRepository.findPublic).toHaveBeenCalledWith({
      status: 'ACTIVE',
      excludeMyCompetitions: true,
      searchName: 'Championship',
      searchCreator: undefined,
      limit: 50,
      offset: 0
    });
  });

  it('should pass searchCreator filter to repository', async () => {
    // Arrange
    const filters = { searchCreator: 'John' };

    // Configure repository mock
    competitionRepository.findPublic.mockResolvedValue([]);

    // Act
    await browseJoinableCompetitionsUseCase.execute(filters);

    // Assert
    expect(competitionRepository.findPublic).toHaveBeenCalledWith({
      status: 'ACTIVE',
      excludeMyCompetitions: true,
      searchName: undefined,
      searchCreator: 'John',
      limit: 50,
      offset: 0
    });
  });

  it('should pass custom limit and offset to repository', async () => {
    // Arrange
    const filters = { limit: 20, offset: 10 };

    // Configure repository mock
    competitionRepository.findPublic.mockResolvedValue([]);

    // Act
    await browseJoinableCompetitionsUseCase.execute(filters);

    // Assert
    expect(competitionRepository.findPublic).toHaveBeenCalledWith({
      status: 'ACTIVE',
      excludeMyCompetitions: true,
      searchName: undefined,
      searchCreator: undefined,
      limit: 20,
      offset: 10
    });
  });

  it('should always exclude my competitions (excludeMyCompetitions = true)', async () => {
    // Arrange
    const filters = {};

    // Configure repository mock
    competitionRepository.findPublic.mockResolvedValue([]);

    // Act
    await browseJoinableCompetitionsUseCase.execute(filters);

    // Assert
    expect(competitionRepository.findPublic).toHaveBeenCalledWith(
      expect.objectContaining({
        excludeMyCompetitions: true
      })
    );
  });

  it('should always filter by ACTIVE status', async () => {
    // Arrange
    const filters = {};

    // Configure repository mock
    competitionRepository.findPublic.mockResolvedValue([]);

    // Act
    await browseJoinableCompetitionsUseCase.execute(filters);

    // Assert
    expect(competitionRepository.findPublic).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ACTIVE'
      })
    );
  });

  it('should return empty array when no competitions are available', async () => {
    // Arrange
    const filters = {};

    // Configure repository mock to return empty array
    competitionRepository.findPublic.mockResolvedValue([]);

    // Act
    const result = await browseJoinableCompetitionsUseCase.execute(filters);

    // Assert
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should propagate repository errors', async () => {
    // Arrange
    const filters = {};
    const errorMessage = 'Failed to fetch public competitions';

    // Configure repository mock to throw error
    competitionRepository.findPublic.mockRejectedValue(new Error(errorMessage));

    // Act & Assert
    await expect(browseJoinableCompetitionsUseCase.execute(filters))
      .rejects
      .toThrow(errorMessage);
  });

  it('should pass multiple filters combined to repository', async () => {
    // Arrange
    const filters = {
      searchName: 'Summer',
      searchCreator: 'Jane',
      limit: 25,
      offset: 5
    };

    // Configure repository mock
    competitionRepository.findPublic.mockResolvedValue([]);

    // Act
    await browseJoinableCompetitionsUseCase.execute(filters);

    // Assert
    expect(competitionRepository.findPublic).toHaveBeenCalledWith({
      status: 'ACTIVE',
      excludeMyCompetitions: true,
      searchName: 'Summer',
      searchCreator: 'Jane',
      limit: 25,
      offset: 5
    });
  });
});
