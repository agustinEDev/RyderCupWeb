import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreateCompetitionUseCase from './CreateCompetitionUseCase';
import { ICompetitionRepository } from '../../domain/repositories/ICompetitionRepository';
import Competition from '../../domain/entities/Competition'; // Assuming default export now

// Mockear el repositorio
vi.mock('../../domain/repositories/ICompetitionRepository');
vi.mock('../../domain/entities/Competition'); // Mockear la entidad si no queremos la implementación real

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

  it('should successfully create a competition and return the new competition entity', async () => {
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
      max_players: 24,
      team_assignment: 'manual',
      player_handicap: 'user',
    };

    const mockCreatedCompetition = { id: 'comp-123', name: 'Ryder Cup Test' };

    // Configurar el mock del repositorio para que devuelva la competición creada
    competitionRepository.save.mockResolvedValue(mockCreatedCompetition);

    // Act
    const newCompetition = await createCompetitionUseCase.execute(competitionData);

    // Assert
    // 1. Verificar que el método save del repositorio fue llamado con los datos correctos
    expect(competitionRepository.save).toHaveBeenCalledWith(competitionData);

    // 2. Verificar que el caso de uso devuelve la competición creada
    expect(newCompetition).toEqual(mockCreatedCompetition);
  });

  // TODO: Add more tests for validation, error handling, etc.
});
