import { describe, it, expect, vi, beforeEach } from 'vitest';
import ListUserCompetitionsUseCase from './ListUserCompetitionsUseCase';

// Mock the CompetitionMapper
vi.mock('../../../infrastructure/mappers/CompetitionMapper', () => ({
  default: {
    toSimpleDTO: vi.fn((competition) => ({
      id: competition.id,
      name: competition.name,
      team1Name: competition.team1Name,
      team2Name: competition.team2Name,
      startDate: competition.startDate,
      endDate: competition.endDate,
      status: competition.status,
      maxPlayers: competition.maxPlayers,
      creatorId: competition.creatorId
    }))
  }
}));

describe('ListUserCompetitionsUseCase', () => {
  let competitionRepository;
  let listUserCompetitionsUseCase;

  beforeEach(() => {
    vi.clearAllMocks();

    // Re-instantiate the repository mock for each test
    competitionRepository = {
      findByCreator: vi.fn(),
    };

    // Re-instantiate the use case with the mock
    listUserCompetitionsUseCase = new ListUserCompetitionsUseCase({ competitionRepository });
  });

  it('should successfully list competitions for a user and return simple DTOs', async () => {
    // Arrange
    const userId = 'user-123';
    const filters = {};

    // Mock competition entities returned by repository
    const mockCompetitionEntities = [
      {
        id: 'comp-1',
        name: 'Ryder Cup 2025',
        team1Name: 'Europe',
        team2Name: 'USA',
        startDate: '2025-01-01',
        endDate: '2025-01-05',
        status: 'DRAFT',
        maxPlayers: 24,
        creatorId: 'user-123'
      },
      {
        id: 'comp-2',
        name: 'Masters Tournament',
        team1Name: 'Team A',
        team2Name: 'Team B',
        startDate: '2025-02-01',
        endDate: '2025-02-05',
        status: 'ACTIVE',
        maxPlayers: 20,
        creatorId: 'user-123'
      }
    ];

    // Expected simple DTOs (what the UI will receive)
    const expectedDTOs = [
      {
        id: 'comp-1',
        name: 'Ryder Cup 2025',
        team1Name: 'Europe',
        team2Name: 'USA',
        startDate: '2025-01-01',
        endDate: '2025-01-05',
        status: 'DRAFT',
        maxPlayers: 24,
        creatorId: 'user-123'
      },
      {
        id: 'comp-2',
        name: 'Masters Tournament',
        team1Name: 'Team A',
        team2Name: 'Team B',
        startDate: '2025-02-01',
        endDate: '2025-02-05',
        status: 'ACTIVE',
        maxPlayers: 20,
        creatorId: 'user-123'
      }
    ];

    // Configure repository mock to return the competition entities
    competitionRepository.findByCreator.mockResolvedValue(mockCompetitionEntities);

    // Act
    const result = await listUserCompetitionsUseCase.execute(userId, filters);

    // Assert
    // 1. Verify repository.findByCreator was called with correct parameters
    expect(competitionRepository.findByCreator).toHaveBeenCalledWith(userId, filters);

    // 2. Verify the use case returns the DTOs (not the entities)
    expect(result).toEqual(expectedDTOs);
    expect(result).toHaveLength(2);
  });

  it('should throw an error if userId is not provided', async () => {
    // Arrange
    const userId = null;
    const filters = {};

    // Act & Assert
    await expect(listUserCompetitionsUseCase.execute(userId, filters))
      .rejects
      .toThrow('User ID is required');

    // Verify repository was not called
    expect(competitionRepository.findByCreator).not.toHaveBeenCalled();
  });

  it('should return empty array when user has no competitions', async () => {
    // Arrange
    const userId = 'user-456';
    const filters = {};

    // Configure repository mock to return empty array
    competitionRepository.findByCreator.mockResolvedValue([]);

    // Act
    const result = await listUserCompetitionsUseCase.execute(userId, filters);

    // Assert
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
    expect(competitionRepository.findByCreator).toHaveBeenCalledWith(userId, filters);
  });

  it('should pass filters to the repository', async () => {
    // Arrange
    const userId = 'user-789';
    const filters = { status: 'ACTIVE' };

    // Configure repository mock
    competitionRepository.findByCreator.mockResolvedValue([]);

    // Act
    await listUserCompetitionsUseCase.execute(userId, filters);

    // Assert
    expect(competitionRepository.findByCreator).toHaveBeenCalledWith(userId, filters);
  });

  it('should propagate repository errors', async () => {
    // Arrange
    const userId = 'user-123';
    const filters = {};
    const errorMessage = 'Database connection failed';

    // Configure repository mock to throw error
    competitionRepository.findByCreator.mockRejectedValue(new Error(errorMessage));

    // Act & Assert
    await expect(listUserCompetitionsUseCase.execute(userId, filters))
      .rejects
      .toThrow(errorMessage);
  });
});
