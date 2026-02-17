import { describe, it, expect, vi, beforeEach } from 'vitest';
import BrowseExploreCompetitionsUseCase from './BrowseExploreCompetitionsUseCase';

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

describe('BrowseExploreCompetitionsUseCase', () => {
  let competitionRepository;
  let browseExploreCompetitionsUseCase;

  beforeEach(() => {
    vi.clearAllMocks();

    // Re-instantiate the repository mock for each test
    competitionRepository = {
      findPublic: vi.fn(),
    };

    // Re-instantiate the use case with the mock
    browseExploreCompetitionsUseCase = new BrowseExploreCompetitionsUseCase(competitionRepository);
  });

  it('should successfully list CLOSED, IN_PROGRESS, and COMPLETED competitions with default filters', async () => {
    // Arrange
    const filters = {};

    // Mock competition entities returned by repository
    const mockCompetitionEntities = [
      {
        id: 'comp-1',
        name: 'Past Championship',
        startDate: '2024-10-01',
        endDate: '2024-10-05',
        status: 'COMPLETED',
        creator: { id: 'creator-1', name: 'John Doe' },
        enrolledCount: 24,
        maxPlayers: 24,
        countries: ['ESP', 'USA']
      },
      {
        id: 'comp-2',
        name: 'Ongoing Tournament',
        startDate: '2025-01-10',
        endDate: '2025-01-15',
        status: 'IN_PROGRESS',
        creator: { id: 'creator-2', name: 'Jane Smith' },
        enrolledCount: 20,
        maxPlayers: 20,
        countries: ['GBR', 'FRA']
      },
      {
        id: 'comp-3',
        name: 'Closed Registration',
        startDate: '2025-02-01',
        endDate: '2025-02-05',
        status: 'CLOSED',
        creator: { id: 'creator-3', name: 'Bob Johnson' },
        enrolledCount: 18,
        maxPlayers: 20,
        countries: ['ITA', 'GER']
      }
    ];

    // Expected simple DTOs (what the UI will receive)
    const expectedDTOs = [
      {
        id: 'comp-1',
        name: 'Past Championship',
        startDate: '2024-10-01',
        endDate: '2024-10-05',
        status: 'COMPLETED',
        creator: { id: 'creator-1', name: 'John Doe' },
        enrolledCount: 24,
        maxPlayers: 24,
        countries: ['ESP', 'USA']
      },
      {
        id: 'comp-2',
        name: 'Ongoing Tournament',
        startDate: '2025-01-10',
        endDate: '2025-01-15',
        status: 'IN_PROGRESS',
        creator: { id: 'creator-2', name: 'Jane Smith' },
        enrolledCount: 20,
        maxPlayers: 20,
        countries: ['GBR', 'FRA']
      },
      {
        id: 'comp-3',
        name: 'Closed Registration',
        startDate: '2025-02-01',
        endDate: '2025-02-05',
        status: 'CLOSED',
        creator: { id: 'creator-3', name: 'Bob Johnson' },
        enrolledCount: 18,
        maxPlayers: 20,
        countries: ['ITA', 'GER']
      }
    ];

    // Configure repository mock to return the competition entities
    competitionRepository.findPublic.mockResolvedValue(mockCompetitionEntities);

    // Act
    const result = await browseExploreCompetitionsUseCase.execute(filters);

    // Assert
    // 1. Verify repository.findPublic was called with correct filters
    expect(competitionRepository.findPublic).toHaveBeenCalledWith({
      status: ['CLOSED', 'IN_PROGRESS', 'COMPLETED'],
      excludeMyCompetitions: false,
      searchName: undefined,
      searchCreator: undefined,
      limit: 50,
      offset: 0
    });

    // 2. Verify the use case returns the DTOs (not the entities)
    expect(result).toEqual(expectedDTOs);
    expect(result).toHaveLength(3);
  });

  it('should pass searchName filter to repository', async () => {
    // Arrange
    const filters = { searchName: 'Tournament' };

    // Configure repository mock
    competitionRepository.findPublic.mockResolvedValue([]);

    // Act
    await browseExploreCompetitionsUseCase.execute(filters);

    // Assert
    expect(competitionRepository.findPublic).toHaveBeenCalledWith({
      status: ['CLOSED', 'IN_PROGRESS', 'COMPLETED'],
      excludeMyCompetitions: false,
      searchName: 'Tournament',
      searchCreator: undefined,
      limit: 50,
      offset: 0
    });
  });

  it('should pass searchCreator filter to repository', async () => {
    // Arrange
    const filters = { searchCreator: 'Jane' };

    // Configure repository mock
    competitionRepository.findPublic.mockResolvedValue([]);

    // Act
    await browseExploreCompetitionsUseCase.execute(filters);

    // Assert
    expect(competitionRepository.findPublic).toHaveBeenCalledWith({
      status: ['CLOSED', 'IN_PROGRESS', 'COMPLETED'],
      excludeMyCompetitions: false,
      searchName: undefined,
      searchCreator: 'Jane',
      limit: 50,
      offset: 0
    });
  });

  it('should pass custom limit and offset to repository', async () => {
    // Arrange
    const filters = { limit: 30, offset: 15 };

    // Configure repository mock
    competitionRepository.findPublic.mockResolvedValue([]);

    // Act
    await browseExploreCompetitionsUseCase.execute(filters);

    // Assert
    expect(competitionRepository.findPublic).toHaveBeenCalledWith({
      status: ['CLOSED', 'IN_PROGRESS', 'COMPLETED'],
      excludeMyCompetitions: false,
      searchName: undefined,
      searchCreator: undefined,
      limit: 30,
      offset: 15
    });
  });

  it('should include all competitions regardless of creator (excludeMyCompetitions = false)', async () => {
    // Arrange
    const filters = {};

    // Configure repository mock
    competitionRepository.findPublic.mockResolvedValue([]);

    // Act
    await browseExploreCompetitionsUseCase.execute(filters);

    // Assert
    expect(competitionRepository.findPublic).toHaveBeenCalledWith(
      expect.objectContaining({
        excludeMyCompetitions: false
      })
    );
  });

  it('should always filter by CLOSED, IN_PROGRESS, and COMPLETED statuses', async () => {
    // Arrange
    const filters = {};

    // Configure repository mock
    competitionRepository.findPublic.mockResolvedValue([]);

    // Act
    await browseExploreCompetitionsUseCase.execute(filters);

    // Assert
    expect(competitionRepository.findPublic).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ['CLOSED', 'IN_PROGRESS', 'COMPLETED']
      })
    );
  });

  it('should return empty array when no competitions are available', async () => {
    // Arrange
    const filters = {};

    // Configure repository mock to return empty array
    competitionRepository.findPublic.mockResolvedValue([]);

    // Act
    const result = await browseExploreCompetitionsUseCase.execute(filters);

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
    await expect(browseExploreCompetitionsUseCase.execute(filters))
      .rejects
      .toThrow(errorMessage);
  });

  it('should pass multiple filters combined to repository', async () => {
    // Arrange
    const filters = {
      searchName: 'Championship',
      searchCreator: 'John',
      limit: 40,
      offset: 20
    };

    // Configure repository mock
    competitionRepository.findPublic.mockResolvedValue([]);

    // Act
    await browseExploreCompetitionsUseCase.execute(filters);

    // Assert
    expect(competitionRepository.findPublic).toHaveBeenCalledWith({
      status: ['CLOSED', 'IN_PROGRESS', 'COMPLETED'],
      excludeMyCompetitions: false,
      searchName: 'Championship',
      searchCreator: 'John',
      limit: 40,
      offset: 20
    });
  });

  it('should include competitions from my own as well (read-only mode)', async () => {
    // Arrange
    const filters = {};

    // Mock competition entities including one from current user
    const mockCompetitionEntities = [
      {
        id: 'comp-1',
        name: 'My Past Tournament',
        startDate: '2024-10-01',
        endDate: '2024-10-05',
        status: 'COMPLETED',
        creator: { id: 'current-user', name: 'Current User' },
        enrolledCount: 20,
        maxPlayers: 20,
        countries: ['ESP', 'FRA']
      },
      {
        id: 'comp-2',
        name: 'Other Tournament',
        startDate: '2025-01-10',
        endDate: '2025-01-15',
        status: 'IN_PROGRESS',
        creator: { id: 'other-user', name: 'Other User' },
        enrolledCount: 18,
        maxPlayers: 20,
        countries: ['GBR', 'USA']
      }
    ];

    // Configure repository mock
    competitionRepository.findPublic.mockResolvedValue(mockCompetitionEntities);

    // Act
    const result = await browseExploreCompetitionsUseCase.execute(filters);

    // Assert
    // Should include both competitions (my own and others)
    expect(result).toHaveLength(2);
    expect(result[0].creator.id).toBe('current-user');
    expect(result[1].creator.id).toBe('other-user');
  });
});
