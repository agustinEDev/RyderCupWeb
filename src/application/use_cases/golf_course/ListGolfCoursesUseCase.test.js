// src/application/use_cases/golf_course/ListGolfCoursesUseCase.test.js

import { describe, it, expect, vi, beforeEach } from 'vitest';
import ListGolfCoursesUseCase from './ListGolfCoursesUseCase';

describe('ListGolfCoursesUseCase', () => {
  let golfCourseRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();

    golfCourseRepository = {
      list: vi.fn()
    };

    useCase = new ListGolfCoursesUseCase({ golfCourseRepository });
  });

  it('should successfully list all golf courses', async () => {
    // Arrange
    const mockCourses = [
      {
        id: 'course-1',
        name: 'Pebble Beach',
        countryCode: 'US',
        courseType: 'STANDARD_18',
        approvalStatus: 'APPROVED',
        totalPar: 72,
        tees: [],
        holes: []
      },
      {
        id: 'course-2',
        name: 'St Andrews',
        countryCode: 'GB',
        courseType: 'STANDARD_18',
        approvalStatus: 'APPROVED',
        totalPar: 72,
        tees: [],
        holes: []
      }
    ];

    golfCourseRepository.list.mockResolvedValue(mockCourses);

    // Act
    const result = await useCase.execute();

    // Assert
    expect(golfCourseRepository.list).toHaveBeenCalledWith({});
    expect(result).toEqual(mockCourses);
    expect(result).toHaveLength(2);
  });

  it('should filter by country code', async () => {
    // Arrange
    const filters = { countryCode: 'ES' };
    const mockCourses = [
      {
        id: 'course-3',
        name: 'Real Club de Golf El Prat',
        countryCode: 'ES',
        courseType: 'STANDARD_18',
        approvalStatus: 'APPROVED',
        totalPar: 72,
        tees: [],
        holes: []
      }
    ];

    golfCourseRepository.list.mockResolvedValue(mockCourses);

    // Act
    const result = await useCase.execute(filters);

    // Assert
    expect(golfCourseRepository.list).toHaveBeenCalledWith(filters);
    expect(result).toHaveLength(1);
    expect(result[0].countryCode).toBe('ES');
  });

  it('should filter by approval status', async () => {
    // Arrange
    const filters = { approvalStatus: 'PENDING_APPROVAL' };
    const mockCourses = [
      {
        id: 'course-4',
        name: 'Pending Course',
        countryCode: 'US',
        courseType: 'STANDARD_18',
        approvalStatus: 'PENDING_APPROVAL',
        totalPar: 72,
        tees: [],
        holes: []
      }
    ];

    golfCourseRepository.list.mockResolvedValue(mockCourses);

    // Act
    const result = await useCase.execute(filters);

    // Assert
    expect(golfCourseRepository.list).toHaveBeenCalledWith(filters);
    expect(result).toHaveLength(1);
    expect(result[0].approvalStatus).toBe('PENDING_APPROVAL');
  });

  it('should filter by course type', async () => {
    // Arrange
    const filters = { courseType: 'PITCH_AND_PUTT' };
    const mockCourses = [
      {
        id: 'course-5',
        name: 'Mini Golf Course',
        countryCode: 'FR',
        courseType: 'PITCH_AND_PUTT',
        approvalStatus: 'APPROVED',
        totalPar: 54,
        tees: [],
        holes: []
      }
    ];

    golfCourseRepository.list.mockResolvedValue(mockCourses);

    // Act
    const result = await useCase.execute(filters);

    // Assert
    expect(golfCourseRepository.list).toHaveBeenCalledWith(filters);
    expect(result).toHaveLength(1);
    expect(result[0].courseType).toBe('PITCH_AND_PUTT');
  });

  it('should handle multiple filters simultaneously', async () => {
    // Arrange
    const filters = {
      countryCode: 'US',
      approvalStatus: 'APPROVED',
      courseType: 'STANDARD_18'
    };
    const mockCourses = [
      {
        id: 'course-6',
        name: 'Augusta National',
        countryCode: 'US',
        courseType: 'STANDARD_18',
        approvalStatus: 'APPROVED',
        totalPar: 72,
        tees: [],
        holes: []
      }
    ];

    golfCourseRepository.list.mockResolvedValue(mockCourses);

    // Act
    const result = await useCase.execute(filters);

    // Assert
    expect(golfCourseRepository.list).toHaveBeenCalledWith(filters);
    expect(result).toEqual(mockCourses);
  });

  it('should return empty array when no courses match filters', async () => {
    // Arrange
    const filters = { countryCode: 'XX' };
    golfCourseRepository.list.mockResolvedValue([]);

    // Act
    const result = await useCase.execute(filters);

    // Assert
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
    expect(golfCourseRepository.list).toHaveBeenCalledWith(filters);
  });

  it('should handle repository errors', async () => {
    // Arrange
    const errorMessage = 'Database connection failed';
    golfCourseRepository.list.mockRejectedValue(new Error(errorMessage));

    // Act & Assert
    await expect(useCase.execute()).rejects.toThrow(errorMessage);
  });

  it('should pass empty filters object by default', async () => {
    // Arrange
    golfCourseRepository.list.mockResolvedValue([]);

    // Act
    await useCase.execute();

    // Assert
    expect(golfCourseRepository.list).toHaveBeenCalledWith({});
  });

  it('should preserve filter properties', async () => {
    // Arrange
    const customFilters = {
      countryCode: 'GB',
      approvalStatus: 'APPROVED',
      customField: 'customValue'
    };
    golfCourseRepository.list.mockResolvedValue([]);

    // Act
    await useCase.execute(customFilters);

    // Assert
    expect(golfCourseRepository.list).toHaveBeenCalledWith(customFilters);
  });
});
