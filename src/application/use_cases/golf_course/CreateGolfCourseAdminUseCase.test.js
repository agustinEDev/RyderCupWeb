// src/application/use_cases/golf_course/CreateGolfCourseAdminUseCase.test.js

import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreateGolfCourseAdminUseCase from './CreateGolfCourseAdminUseCase';

describe('CreateGolfCourseAdminUseCase', () => {
  let golfCourseRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();

    golfCourseRepository = {
      createAsAdmin: vi.fn()
    };

    useCase = new CreateGolfCourseAdminUseCase({ golfCourseRepository });
  });

  const createValidCourseData = () => ({
    name: 'Pebble Beach Golf Links',
    countryCode: 'US',
    courseType: 'STANDARD_18',
    tees: [
      {
        teeCategory: 'CHAMPIONSHIP',
        identifier: 'Black',
        courseRating: 75.5,
        slopeRating: 140,
        gender: 'MALE'
      },
      {
        teeCategory: 'AMATEUR',
        identifier: 'Blue',
        courseRating: 72.0,
        slopeRating: 130,
        gender: 'MALE'
      }
    ],
    holes: Array.from({ length: 18 }, (_, i) => ({
      holeNumber: i + 1,
      par: 4,
      strokeIndex: i + 1
    }))
  });

  it('should successfully create a golf course as admin (directly APPROVED)', async () => {
    // Arrange
    const courseData = createValidCourseData();
    const mockCreatedCourse = {
      id: 'course-123',
      ...courseData,
      approvalStatus: 'APPROVED',
      totalPar: 72,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    golfCourseRepository.createAsAdmin.mockResolvedValue(mockCreatedCourse);

    // Act
    const result = await useCase.execute(courseData);

    // Assert
    expect(golfCourseRepository.createAsAdmin).toHaveBeenCalledWith(courseData);
    expect(result.id).toBe('course-123');
    expect(result.approvalStatus).toBe('APPROVED');
    expect(result.name).toBe(courseData.name);
  });

  it('should throw error when course data is not provided', async () => {
    // Act & Assert
    await expect(useCase.execute(null)).rejects.toThrow('Golf course data is required');
    await expect(useCase.execute(undefined)).rejects.toThrow('Golf course data is required');

    expect(golfCourseRepository.createAsAdmin).not.toHaveBeenCalled();
  });

  it('should handle course creation with minimum 2 tees', async () => {
    // Arrange
    const courseData = {
      ...createValidCourseData(),
      tees: [
        {
          teeCategory: 'AMATEUR',
          identifier: 'Yellow',
          courseRating: 70.0,
          slopeRating: 120,
          gender: 'MALE'
        },
        {
          teeCategory: 'AMATEUR',
          identifier: 'Red',
          courseRating: 68.0,
          slopeRating: 115,
          gender: 'FEMALE'
        }
      ]
    };

    const mockCreatedCourse = {
      id: 'course-456',
      ...courseData,
      approvalStatus: 'APPROVED',
      totalPar: 72
    };

    golfCourseRepository.createAsAdmin.mockResolvedValue(mockCreatedCourse);

    // Act
    const result = await useCase.execute(courseData);

    // Assert
    expect(result.tees).toHaveLength(2);
  });

  it('should handle course creation with maximum 6 tees', async () => {
    // Arrange
    const courseData = {
      ...createValidCourseData(),
      tees: [
        { teeCategory: 'CHAMPIONSHIP', identifier: 'Black', courseRating: 75.5, slopeRating: 140, gender: 'MALE' },
        { teeCategory: 'AMATEUR', identifier: 'Blue', courseRating: 72.0, slopeRating: 130, gender: 'MALE' },
        { teeCategory: 'SENIOR', identifier: 'Yellow', courseRating: 70.0, slopeRating: 120, gender: 'MALE' },
        { teeCategory: 'JUNIOR', identifier: 'Orange', courseRating: 72.0, slopeRating: 130, gender: 'FEMALE' },
        { teeCategory: 'FORWARD', identifier: 'Red', courseRating: 68.0, slopeRating: 115, gender: 'FEMALE' },
        { teeCategory: 'AMATEUR', identifier: 'Green', courseRating: 65.0, slopeRating: 110, gender: 'FEMALE' }
      ]
    };

    const mockCreatedCourse = {
      id: 'course-789',
      ...courseData,
      approvalStatus: 'APPROVED',
      totalPar: 72
    };

    golfCourseRepository.createAsAdmin.mockResolvedValue(mockCreatedCourse);

    // Act
    const result = await useCase.execute(courseData);

    // Assert
    expect(result.tees).toHaveLength(6);
  });

  it('should create course with exactly 18 holes', async () => {
    // Arrange
    const courseData = createValidCourseData();
    const mockCreatedCourse = {
      id: 'course-999',
      ...courseData,
      approvalStatus: 'APPROVED',
      totalPar: 72
    };

    golfCourseRepository.createAsAdmin.mockResolvedValue(mockCreatedCourse);

    // Act
    const result = await useCase.execute(courseData);

    // Assert
    expect(result.holes).toHaveLength(18);
  });

  it('should handle different course types', async () => {
    // Arrange - EXECUTIVE course with valid total par (66-76)
    const executiveData = {
      ...createValidCourseData(),
      courseType: 'EXECUTIVE',
      holes: [
        ...Array.from({ length: 12 }, (_, i) => ({
          holeNumber: i + 1,
          par: 4,
          strokeIndex: i + 1
        })),
        ...Array.from({ length: 6 }, (_, i) => ({
          holeNumber: i + 13,
          par: 3,
          strokeIndex: i + 13
        }))
      ]
    };

    const mockCreatedCourse = {
      id: 'course-111',
      ...executiveData,
      approvalStatus: 'APPROVED',
      totalPar: 66 // 12*4 + 6*3 = 48+18 = 66
    };

    golfCourseRepository.createAsAdmin.mockResolvedValue(mockCreatedCourse);

    // Act
    const result = await useCase.execute(executiveData);

    // Assert
    expect(result.courseType).toBe('EXECUTIVE');
    expect(result.totalPar).toBe(66);
  });

  it('should handle repository errors', async () => {
    // Arrange
    const courseData = createValidCourseData();
    const errorMessage = 'Database connection failed';
    golfCourseRepository.createAsAdmin.mockRejectedValue(new Error(errorMessage));

    // Act & Assert
    await expect(useCase.execute(courseData)).rejects.toThrow(errorMessage);
  });

  it('should preserve all tee and hole data', async () => {
    // Arrange
    const courseData = createValidCourseData();
    const mockCreatedCourse = {
      id: 'course-222',
      ...courseData,
      approvalStatus: 'APPROVED',
      totalPar: 72
    };

    golfCourseRepository.createAsAdmin.mockResolvedValue(mockCreatedCourse);

    // Act
    const result = await useCase.execute(courseData);

    // Assert
    expect(result.tees[0].teeCategory).toBe('CHAMPIONSHIP');
    expect(result.tees[0].courseRating).toBe(75.5);
    expect(result.holes[0].holeNumber).toBe(1);
    expect(result.holes[17].holeNumber).toBe(18);
  });
});
