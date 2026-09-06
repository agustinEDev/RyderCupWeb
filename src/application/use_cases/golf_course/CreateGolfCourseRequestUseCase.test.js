// src/application/use_cases/golf_course/CreateGolfCourseRequestUseCase.test.js

import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreateGolfCourseRequestUseCase from './CreateGolfCourseRequestUseCase';

describe('CreateGolfCourseRequestUseCase', () => {
  let golfCourseRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();

    golfCourseRepository = {
      create: vi.fn()
    };

    useCase = new CreateGolfCourseRequestUseCase({ golfCourseRepository });
  });

  const teeAt = (index) => ({
    color: 'OTHER',
    identifier: `Barra ${index + 1}`,
    courseRating: 70.0,
    slopeRating: 120,
    gender: 'MALE'
  });

  const createValidCourseData = (overrides = {}) => ({
    name: 'Pebble Beach Golf Links',
    countryCode: 'US',
    courseType: 'STANDARD_18',
    tees: [teeAt(0), teeAt(1)],
    holes: Array.from({ length: 18 }, (_, i) => ({
      holeNumber: i + 1,
      par: 4,
      strokeIndex: i + 1
    })),
    ...overrides
  });

  describe('par per hole', () => {
    // La Marquesa tiene un hoyo par 6 y el backend lo guarda (VALID_PARS incluye
    // el 6). Mientras aqui se rechazaba, ese campo no se podia ni proponer.
    it('accepts a par 6 hole', async () => {
      // Arrange - el par 3 del segundo hoyo compensa el 6 para no salirse del
      // par total del tipo de campo
      const holes = Array.from({ length: 18 }, (_, i) => ({
        holeNumber: i + 1,
        par: i === 0 ? 6 : i === 1 ? 3 : 4,
        strokeIndex: i + 1
      }));
      const courseData = createValidCourseData({ holes });
      golfCourseRepository.create.mockResolvedValue({ id: 'course-1', ...courseData });

      // Act
      const result = await useCase.execute(courseData);

      // Assert
      expect(result.id).toBe('course-1');
      expect(golfCourseRepository.create).toHaveBeenCalledWith(courseData);
    });

    it('rejects a par 7 hole', async () => {
      // Arrange
      const holes = Array.from({ length: 18 }, (_, i) => ({
        holeNumber: i + 1,
        par: i === 0 ? 7 : 4,
        strokeIndex: i + 1
      }));

      // Act & Assert
      await expect(useCase.execute(createValidCourseData({ holes }))).rejects.toThrow(
        'Hole 1 par must be one of 3, 4, 5, 6 (current: 7)'
      );
      expect(golfCourseRepository.create).not.toHaveBeenCalled();
    });

    it('rejects a par 2 hole', async () => {
      // Arrange
      const holes = Array.from({ length: 18 }, (_, i) => ({
        holeNumber: i + 1,
        par: i === 0 ? 2 : 4,
        strokeIndex: i + 1
      }));

      // Act & Assert
      await expect(useCase.execute(createValidCourseData({ holes }))).rejects.toThrow(
        'Hole 1 par must be one of 3, 4, 5, 6 (current: 2)'
      );
    });
  });

  describe('tee count', () => {
    it('accepts a single tee', async () => {
      // Arrange
      const courseData = createValidCourseData({ tees: [teeAt(0)] });
      golfCourseRepository.create.mockResolvedValue({ id: 'course-2', ...courseData });

      // Act
      const result = await useCase.execute(courseData);

      // Assert
      expect(result.id).toBe('course-2');
    });

    it('accepts the 14 tees the backend stores', async () => {
      // Arrange
      const courseData = createValidCourseData({
        tees: Array.from({ length: 14 }, (_, i) => teeAt(i))
      });
      golfCourseRepository.create.mockResolvedValue({ id: 'course-3', ...courseData });

      // Act
      const result = await useCase.execute(courseData);

      // Assert
      expect(result.id).toBe('course-3');
    });

    // Antes no habia techo aqui: 15 barras pasaban y moria en la API con un 422
    it('rejects 15 tees, one past what the backend stores', async () => {
      // Arrange
      const courseData = createValidCourseData({
        tees: Array.from({ length: 15 }, (_, i) => teeAt(i))
      });

      // Act & Assert
      await expect(useCase.execute(courseData)).rejects.toThrow(
        'Golf course must have between 1 and 14 tees'
      );
      expect(golfCourseRepository.create).not.toHaveBeenCalled();
    });

    it('rejects a course with no tees', async () => {
      // Act & Assert
      await expect(useCase.execute(createValidCourseData({ tees: [] }))).rejects.toThrow(
        'Golf course must have between 1 and 14 tees'
      );
    });
  });
});
