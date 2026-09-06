// src/application/use_cases/golf_course/UpdateGolfCourseUseCase.test.js

import { describe, it, expect, vi, beforeEach } from 'vitest';
import UpdateGolfCourseUseCase from './UpdateGolfCourseUseCase';

/**
 * La edicion se quedo con el limite viejo de 2-10 barras cuando el alta paso a
 * 1-14: un campo federado de 12 barras se abria en el formulario y moria al
 * guardar, asi que se podia crear y no se podia editar. Ver #584.
 */
describe('UpdateGolfCourseUseCase · numero de barras', () => {
  let golfCourseRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();

    golfCourseRepository = {
      update: vi.fn()
    };

    useCase = new UpdateGolfCourseUseCase({ golfCourseRepository });
  });

  const teeAt = (index) => ({
    color: 'OTHER',
    identifier: `Barra ${index + 1}`,
    courseRating: 70.0,
    slopeRating: 120,
    gender: 'MALE'
  });

  const courseWith = (teeCount) => ({
    name: 'Campo de prueba',
    countryCode: 'ES',
    courseType: 'STANDARD_18',
    tees: Array.from({ length: teeCount }, (_, i) => teeAt(i)),
    holes: Array.from({ length: 18 }, (_, i) => ({
      holeNumber: i + 1,
      par: 4,
      strokeIndex: i + 1
    }))
  });

  it.each([1, 2, 10, 14])('accepts %i tees, which the backend stores', async (teeCount) => {
    // Arrange
    const data = courseWith(teeCount);
    golfCourseRepository.update.mockResolvedValue({ golfCourse: data, pendingUpdate: null });

    // Act
    const result = await useCase.execute('course-1', data);

    // Assert
    expect(golfCourseRepository.update).toHaveBeenCalledWith('course-1', data);
    expect(result.golfCourse.tees).toHaveLength(teeCount);
  });

  it('rejects 15 tees, one past what the backend stores', async () => {
    // Act & Assert
    await expect(useCase.execute('course-1', courseWith(15))).rejects.toThrow(
      'Golf course must have between 1 and 14 tees'
    );
    expect(golfCourseRepository.update).not.toHaveBeenCalled();
  });

  it('rejects a course left with no tees', async () => {
    // Act & Assert
    await expect(useCase.execute('course-1', courseWith(0))).rejects.toThrow(
      'Golf course must have between 1 and 14 tees'
    );
    expect(golfCourseRepository.update).not.toHaveBeenCalled();
  });
});
