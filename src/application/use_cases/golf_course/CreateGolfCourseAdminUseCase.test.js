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
        color: 'WHITE',
        identifier: 'Black',
        courseRating: 75.5,
        slopeRating: 140,
        gender: 'MALE'
      },
      {
        color: 'YELLOW',
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
          color: 'YELLOW',
          identifier: 'Yellow',
          courseRating: 70.0,
          slopeRating: 120,
          gender: 'MALE'
        },
        {
          color: 'YELLOW',
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

  it('should handle course creation with 6 tees', async () => {
    // Arrange
    const courseData = {
      ...createValidCourseData(),
      tees: [
        { color: 'WHITE', identifier: 'Black', courseRating: 75.5, slopeRating: 140, gender: 'MALE' },
        { color: 'YELLOW', identifier: 'Blue', courseRating: 72.0, slopeRating: 130, gender: 'MALE' },
        { color: 'BLUE', identifier: 'Yellow', courseRating: 70.0, slopeRating: 120, gender: 'MALE' },
        { color: 'GREEN', identifier: 'Orange', courseRating: 72.0, slopeRating: 130, gender: 'FEMALE' },
        { color: 'RED', identifier: 'Red', courseRating: 68.0, slopeRating: 115, gender: 'FEMALE' },
        { color: 'YELLOW', identifier: 'Green', courseRating: 65.0, slopeRating: 110, gender: 'FEMALE' }
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

  it('should accept the 10 tees the form allows, not just 6', async () => {
    // Arrange - el formulario deja llegar hasta 10 (`handleAddTee`) y su mensaje
    // dice "entre 2 y 10". Con el limite en 6, un campo de 7 barras se aceptaba
    // en pantalla y reventaba aqui.
    const courseData = {
      ...createValidCourseData(),
      tees: Array.from({ length: 10 }, (_, i) => ({
        color: 'OTHER',
        identifier: `Barra ${i + 1}`,
        courseRating: 70.0,
        slopeRating: 120,
        gender: 'MALE'
      }))
    };

    golfCourseRepository.createAsAdmin.mockResolvedValue({
      id: 'course-790',
      ...courseData,
      totalPar: 72
    });

    // Act
    const result = await useCase.execute(courseData);

    // Assert
    expect(result.tees).toHaveLength(10);
  });

  it('should reject 11 tees, which the form cannot produce either', async () => {
    // Arrange
    const courseData = {
      ...createValidCourseData(),
      tees: Array.from({ length: 11 }, (_, i) => ({
        color: 'OTHER',
        identifier: `Barra ${i + 1}`,
        courseRating: 70.0,
        slopeRating: 120,
        gender: 'MALE'
      }))
    };

    // Act & Assert
    await expect(useCase.execute(courseData)).rejects.toThrow(
      'Golf course must have between 2 and 10 tees'
    );
    expect(golfCourseRepository.createAsAdmin).not.toHaveBeenCalled();
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
    // Arrange - un EXECUTIVE de par 64, que es su rango (61-65) y no el de un
    // campo de 18 hoyos. Este caso pedia par 66 y pasaba porque la validacion
    // era la de un STANDARD_18 para los tres tipos.
    const executiveData = {
      ...createValidCourseData(),
      courseType: 'EXECUTIVE',
      holes: [
        ...Array.from({ length: 10 }, (_, i) => ({
          holeNumber: i + 1,
          par: 4,
          strokeIndex: i + 1
        })),
        ...Array.from({ length: 8 }, (_, i) => ({
          holeNumber: i + 11,
          par: 3,
          strokeIndex: i + 11
        }))
      ]
    };

    const mockCreatedCourse = {
      id: 'course-111',
      ...executiveData,
      approvalStatus: 'APPROVED',
      totalPar: 64 // 10*4 + 8*3 = 40+24 = 64
    };

    golfCourseRepository.createAsAdmin.mockResolvedValue(mockCreatedCourse);

    // Act
    const result = await useCase.execute(executiveData);

    // Assert
    expect(result.courseType).toBe('EXECUTIVE');
    expect(result.totalPar).toBe(64);
  });

  it('should accept a pitch & putt at par 54, which a standard course would reject', async () => {
    // Arrange - 18 hoyos par 3. Antes se rechazaba aqui despues de que el
    // formulario lo aceptase, asi que dar de alta un campo corto era imposible.
    const pitchAndPuttData = {
      ...createValidCourseData(),
      courseType: 'PITCH_AND_PUTT',
      holes: Array.from({ length: 18 }, (_, i) => ({
        holeNumber: i + 1,
        par: 3,
        strokeIndex: i + 1
      }))
    };

    golfCourseRepository.createAsAdmin.mockResolvedValue({
      id: 'course-112',
      ...pitchAndPuttData,
      totalPar: 54
    });

    // Act
    const result = await useCase.execute(pitchAndPuttData);

    // Assert
    expect(golfCourseRepository.createAsAdmin).toHaveBeenCalled();
    expect(result.totalPar).toBe(54);
  });

  it('should reject that same par 54 on a standard 18-hole course', async () => {
    // Arrange
    const standardData = {
      ...createValidCourseData(),
      courseType: 'STANDARD_18',
      holes: Array.from({ length: 18 }, (_, i) => ({
        holeNumber: i + 1,
        par: 3,
        strokeIndex: i + 1
      }))
    };

    // Act & Assert - el mensaje nombra el rango del tipo, no uno fijo
    await expect(useCase.execute(standardData)).rejects.toThrow(
      'Total par must be between 66 and 76'
    );
    expect(golfCourseRepository.createAsAdmin).not.toHaveBeenCalled();
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
    expect(result.tees[0].color).toBe('WHITE');
    expect(result.tees[0].courseRating).toBe(75.5);
    expect(result.holes[0].holeNumber).toBe(1);
    expect(result.holes[17].holeNumber).toBe(18);
  });
});
