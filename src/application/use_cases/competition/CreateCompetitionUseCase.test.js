import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreateCompetitionUseCase from './CreateCompetitionUseCase';
import { ICompetitionRepository } from '../../../domain/repositories/ICompetitionRepository';

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

describe('CreateCompetitionUseCase', () => {
  let competitionRepository;
  let createCompetitionUseCase;

  beforeEach(() => {
    vi.clearAllMocks();

    // Re-instanciar el mock del repositorio para cada test
    competitionRepository = {
      save: vi.fn(),
    };

    // Re-instanciar el caso de uso con el mock
    createCompetitionUseCase = new CreateCompetitionUseCase({ competitionRepository });
  });

  it('should successfully create a competition and return a simple DTO', async () => {
    // Arrange
    const competitionData = {
      name: 'Ryder Cup Test',
      team_one_name: 'Team A',
      team_two_name: 'Team B',
      start_date: '2025-01-01',
      end_date: '2025-01-05',
      main_country: 'US',
      countries: ['US'],
      handicap_type: 'SCRATCH',
      number_of_players: 24,  // API field name (matches backend DTO alias)
      team_assignment: 'manual',
      player_handicap: 'user',
    };

    // Mock competition entity returned by repository
    const mockCompetitionEntity = {
      id: 'comp-123',
      name: 'Ryder Cup Test',
      team1Name: 'Team A',
      team2Name: 'Team B',
      startDate: '2025-01-01',
      endDate: '2025-01-05',
      status: 'DRAFT',
      maxPlayers: 24,
      creatorId: 'user-456'
    };

    // Expected simple DTO (what the UI will receive)
    const expectedDTO = {
      id: 'comp-123',
      name: 'Ryder Cup Test',
      team1Name: 'Team A',
      team2Name: 'Team B',
      startDate: '2025-01-01',
      endDate: '2025-01-05',
      status: 'DRAFT',
      maxPlayers: 24,
      creatorId: 'user-456'
    };

    // Configure repository mock to return the competition entity
    competitionRepository.save.mockResolvedValue(mockCompetitionEntity);

    // Act
    const result = await createCompetitionUseCase.execute(competitionData);

    // Assert
    // 1. Verify repository.save was called with correct data
    expect(competitionRepository.save).toHaveBeenCalledWith(competitionData);

    // 2. Verify the use case returns the DTO (not the entity)
    expect(result).toEqual(expectedDTO);
  });

  // TODO: Add more tests for validation, error handling, etc.
});
