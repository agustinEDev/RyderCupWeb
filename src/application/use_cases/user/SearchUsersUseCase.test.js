import { describe, it, expect, vi, beforeEach } from 'vitest';
import SearchUsersUseCase from './SearchUsersUseCase';

describe('SearchUsersUseCase', () => {
  let useCase;
  let mockUserRepository;

  beforeEach(() => {
    mockUserRepository = {
      searchUsers: vi.fn(),
    };
    useCase = new SearchUsersUseCase({ userRepository: mockUserRepository });
  });

  it('should throw if userRepository is not provided', () => {
    expect(() => new SearchUsersUseCase({})).toThrow('SearchUsersUseCase requires userRepository');
  });

  it('should throw if query is empty', async () => {
    await expect(useCase.execute('')).rejects.toThrow('Search query must be at least 2 characters');
  });

  it('should throw if query is null', async () => {
    await expect(useCase.execute(null)).rejects.toThrow('Search query must be at least 2 characters');
  });

  it('should throw if query is too short', async () => {
    await expect(useCase.execute('a')).rejects.toThrow('Search query must be at least 2 characters');
  });

  it('should throw if query is only whitespace under 2 chars', async () => {
    await expect(useCase.execute('  a  ')).rejects.toThrow('Search query must be at least 2 characters');
  });

  it('should call repository with trimmed query', async () => {
    const mockResults = [
      { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', countryCode: 'ES' },
    ];
    mockUserRepository.searchUsers.mockResolvedValue(mockResults);

    const result = await useCase.execute('  John  ');

    expect(mockUserRepository.searchUsers).toHaveBeenCalledWith('John');
    expect(result).toEqual(mockResults);
  });

  it('should return results from repository', async () => {
    const mockResults = [
      { id: 'u1', firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com', countryCode: 'US' },
      { id: 'u2', firstName: 'Jane', lastName: 'Doe', email: 'janed@test.com', countryCode: null },
    ];
    mockUserRepository.searchUsers.mockResolvedValue(mockResults);

    const result = await useCase.execute('Jane');

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('u1');
    expect(result[1].id).toBe('u2');
  });

  it('should propagate repository errors', async () => {
    mockUserRepository.searchUsers.mockRejectedValue(new Error('Network error'));

    await expect(useCase.execute('test')).rejects.toThrow('Network error');
  });
});
