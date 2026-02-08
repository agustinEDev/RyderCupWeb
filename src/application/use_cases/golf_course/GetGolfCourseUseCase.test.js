// src/application/use_cases/golf_course/GetGolfCourseUseCase.test.js

import { describe, it, expect, vi, beforeEach } from 'vitest';
import GetGolfCourseUseCase from './GetGolfCourseUseCase';

describe('GetGolfCourseUseCase', () => {
  let golfCourseRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();

    golfCourseRepository = {
      getById: vi.fn()
    };

    useCase = new GetGolfCourseUseCase({ golfCourseRepository });
  });

  it('should successfully get a golf course by id', async () => {
    // Arrange
    const courseId = 'course-123';
    const mockCourse = {
      id: courseId,
      name: 'Pebble Beach',
      countryCode: 'US',
      courseType: 'STANDARD_18',
      approvalStatus: 'APPROVED',
      totalPar: 72,
      tees: [
        {
          teeCategory: 'CHAMPIONSHIP',
          identifier: 'Black',
          courseRating: 75.5,
          slopeRating: 140,
          gender: 'MALE'
        }
      ],
      holes: Array.from({ length: 18 }, (_, i) => ({
        holeNumber: i + 1,
        par: 4,
        strokeIndex: i + 1
      }))
    };

    golfCourseRepository.getById.mockResolvedValue(mockCourse);

    // Act
    const result = await useCase.execute(courseId);

    // Assert
    expect(golfCourseRepository.getById).toHaveBeenCalledWith(courseId);
    expect(result).toEqual(mockCourse);
    expect(result.id).toBe(courseId);
  });

  it('should throw error when course id is not provided', async () => {
    // Act & Assert
    await expect(useCase.execute(null)).rejects.toThrow('Golf course ID is required');
    await expect(useCase.execute(undefined)).rejects.toThrow('Golf course ID is required');
    await expect(useCase.execute('')).rejects.toThrow('Golf course ID is required');

    expect(golfCourseRepository.getById).not.toHaveBeenCalled();
  });

  it('should throw error when course not found', async () => {
    // Arrange
    const courseId = 'non-existent-course';
    golfCourseRepository.getById.mockRejectedValue(new Error('Golf course not found'));

    // Act & Assert
    await expect(useCase.execute(courseId)).rejects.toThrow('Golf course not found');
  });

  it('should handle repository errors', async () => {
    // Arrange
    const courseId = 'course-123';
    const errorMessage = 'Database connection failed';
    golfCourseRepository.getById.mockRejectedValue(new Error(errorMessage));

    // Act & Assert
    await expect(useCase.execute(courseId)).rejects.toThrow(errorMessage);
  });

  it('should return course with all tees and holes', async () => {
    // Arrange
    const courseId = 'course-456';
    const mockCourse = {
      id: courseId,
      name: 'St Andrews',
      countryCode: 'GB',
      courseType: 'STANDARD_18',
      approvalStatus: 'APPROVED',
      totalPar: 72,
      tees: [
        {
          teeCategory: 'CHAMPIONSHIP',
          identifier: 'Black',
          courseRating: 75.0,
          slopeRating: 135,
          gender: 'MALE'
        },
        {
          teeCategory: 'AMATEUR',
          identifier: 'Blue',
          courseRating: 72.0,
          slopeRating: 125,
          gender: 'MALE'
        }
      ],
      holes: Array.from({ length: 18 }, (_, i) => ({
        holeNumber: i + 1,
        par: i % 3 === 0 ? 5 : 4,
        strokeIndex: i + 1
      }))
    };

    golfCourseRepository.getById.mockResolvedValue(mockCourse);

    // Act
    const result = await useCase.execute(courseId);

    // Assert
    expect(result.tees).toHaveLength(2);
    expect(result.holes).toHaveLength(18);
  });

  it('should handle course with pending approval status', async () => {
    // Arrange
    const courseId = 'pending-course-789';
    const mockCourse = {
      id: courseId,
      name: 'Pending Course',
      countryCode: 'ES',
      courseType: 'STANDARD_18',
      approvalStatus: 'PENDING_APPROVAL',
      totalPar: 72,
      tees: [],
      holes: []
    };

    golfCourseRepository.getById.mockResolvedValue(mockCourse);

    // Act
    const result = await useCase.execute(courseId);

    // Assert
    expect(result.approvalStatus).toBe('PENDING_APPROVAL');
  });

  it('should handle course that is a clone (update proposal)', async () => {
    // Arrange
    const courseId = 'clone-999';
    const mockCourse = {
      id: courseId,
      name: 'Updated Course',
      countryCode: 'US',
      courseType: 'STANDARD_18',
      approvalStatus: 'PENDING_APPROVAL',
      originalGolfCourseId: 'original-123',
      isPendingUpdate: false,
      totalPar: 72,
      tees: [],
      holes: []
    };

    golfCourseRepository.getById.mockResolvedValue(mockCourse);

    // Act
    const result = await useCase.execute(courseId);

    // Assert
    expect(result.originalGolfCourseId).toBe('original-123');
  });
});
