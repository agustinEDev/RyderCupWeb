// src/application/use_cases/golf_course/ApproveRejectGolfCourse.test.js

import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApproveGolfCourseUseCase from './ApproveGolfCourseUseCase';
import RejectGolfCourseUseCase from './RejectGolfCourseUseCase';
import ApproveGolfCourseUpdateUseCase from './ApproveGolfCourseUpdateUseCase';
import RejectGolfCourseUpdateUseCase from './RejectGolfCourseUpdateUseCase';

describe('ApproveGolfCourseUseCase', () => {
  let golfCourseRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();

    golfCourseRepository = {
      approve: vi.fn()
    };

    useCase = new ApproveGolfCourseUseCase({ golfCourseRepository });
  });

  it('should successfully approve a golf course', async () => {
    // Arrange
    const courseId = 'pending-course-123';
    const mockApprovedCourse = {
      id: courseId,
      name: 'Test Course',
      approvalStatus: 'APPROVED',
      tees: [],
      holes: []
    };

    golfCourseRepository.approve.mockResolvedValue(mockApprovedCourse);

    // Act
    const result = await useCase.execute(courseId);

    // Assert
    expect(golfCourseRepository.approve).toHaveBeenCalledWith(courseId);
    expect(result.id).toBe(courseId);
    expect(result.approvalStatus).toBe('APPROVED');
  });

  it('should throw error when course id is not provided', async () => {
    // Act & Assert
    await expect(useCase.execute(null)).rejects.toThrow('Golf course ID is required');
    await expect(useCase.execute('')).rejects.toThrow('Golf course ID is required');

    expect(golfCourseRepository.approve).not.toHaveBeenCalled();
  });

  it('should handle repository errors', async () => {
    // Arrange
    const courseId = 'course-123';
    const errorMessage = 'Course not found';
    golfCourseRepository.approve.mockRejectedValue(new Error(errorMessage));

    // Act & Assert
    await expect(useCase.execute(courseId)).rejects.toThrow(errorMessage);
  });
});

describe('RejectGolfCourseUseCase', () => {
  let golfCourseRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();

    golfCourseRepository = {
      reject: vi.fn()
    };

    useCase = new RejectGolfCourseUseCase({ golfCourseRepository });
  });

  it('should successfully reject a golf course with reason', async () => {
    // Arrange
    const courseId = 'pending-course-456';
    const reason = 'Course does not meet minimum requirements';
    const mockRejectedCourse = {
      id: courseId,
      name: 'Test Course',
      approvalStatus: 'REJECTED',
      rejectionReason: reason,
      tees: [],
      holes: []
    };

    golfCourseRepository.reject.mockResolvedValue(mockRejectedCourse);

    // Act
    const result = await useCase.execute(courseId, reason);

    // Assert
    expect(golfCourseRepository.reject).toHaveBeenCalledWith(courseId, reason);
    expect(result.id).toBe(courseId);
    expect(result.approvalStatus).toBe('REJECTED');
    expect(result.rejectionReason).toBe(reason);
  });

  it('should throw error when course id is not provided', async () => {
    // Act & Assert
    await expect(useCase.execute(null, 'reason')).rejects.toThrow('Golf course ID is required');
    await expect(useCase.execute('', 'reason')).rejects.toThrow('Golf course ID is required');

    expect(golfCourseRepository.reject).not.toHaveBeenCalled();
  });

  it('should throw error when rejection reason is not provided', async () => {
    // Act & Assert
    await expect(useCase.execute('course-123', null)).rejects.toThrow('Rejection reason must be between 10 and 500 characters');
    await expect(useCase.execute('course-123', '')).rejects.toThrow('Rejection reason must be between 10 and 500 characters');
    await expect(useCase.execute('course-123', '   ')).rejects.toThrow('Rejection reason must be between 10 and 500 characters');

    expect(golfCourseRepository.reject).not.toHaveBeenCalled();
  });

  it('should throw error when rejection reason is too short', async () => {
    // Act & Assert
    await expect(useCase.execute('course-123', 'short')).rejects.toThrow('Rejection reason must be between 10 and 500 characters');

    expect(golfCourseRepository.reject).not.toHaveBeenCalled();
  });

  it('should accept rejection reason with exactly 10 characters', async () => {
    // Arrange
    const courseId = 'course-789';
    const reason = '0123456789'; // Exactly 10 chars
    const mockRejectedCourse = {
      id: courseId,
      approvalStatus: 'REJECTED',
      rejectionReason: reason
    };

    golfCourseRepository.reject.mockResolvedValue(mockRejectedCourse);

    // Act
    await useCase.execute(courseId, reason);

    // Assert
    expect(golfCourseRepository.reject).toHaveBeenCalledWith(courseId, reason);
  });

  it('should handle repository errors', async () => {
    // Arrange
    const courseId = 'course-123';
    const reason = 'Valid rejection reason here';
    const errorMessage = 'Course not found';
    golfCourseRepository.reject.mockRejectedValue(new Error(errorMessage));

    // Act & Assert
    await expect(useCase.execute(courseId, reason)).rejects.toThrow(errorMessage);
  });
});

describe('ApproveGolfCourseUpdateUseCase', () => {
  let golfCourseRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();

    golfCourseRepository = {
      approveUpdate: vi.fn()
    };

    useCase = new ApproveGolfCourseUpdateUseCase({ golfCourseRepository });
  });

  it('should successfully approve a golf course update (clone)', async () => {
    // Arrange
    const cloneId = 'clone-123';
    const mockApprovedCourse = {
      id: 'original-course-456',
      name: 'Updated Course Name',
      approvalStatus: 'APPROVED',
      isPendingUpdate: false,
      tees: [],
      holes: []
    };

    golfCourseRepository.approveUpdate.mockResolvedValue(mockApprovedCourse);

    // Act
    const result = await useCase.execute(cloneId);

    // Assert
    expect(golfCourseRepository.approveUpdate).toHaveBeenCalledWith(cloneId);
    expect(result.approvalStatus).toBe('APPROVED');
    expect(result.isPendingUpdate).toBe(false);
  });

  it('should throw error when clone id is not provided', async () => {
    // Act & Assert
    await expect(useCase.execute(null)).rejects.toThrow('Clone ID is required');
    await expect(useCase.execute('')).rejects.toThrow('Clone ID is required');

    expect(golfCourseRepository.approveUpdate).not.toHaveBeenCalled();
  });

  it('should handle repository errors', async () => {
    // Arrange
    const cloneId = 'clone-789';
    const errorMessage = 'Clone not found';
    golfCourseRepository.approveUpdate.mockRejectedValue(new Error(errorMessage));

    // Act & Assert
    await expect(useCase.execute(cloneId)).rejects.toThrow(errorMessage);
  });
});

describe('RejectGolfCourseUpdateUseCase', () => {
  let golfCourseRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();

    golfCourseRepository = {
      rejectUpdate: vi.fn()
    };

    useCase = new RejectGolfCourseUpdateUseCase({ golfCourseRepository });
  });

  it('should successfully reject a golf course update (clone)', async () => {
    // Arrange
    const cloneId = 'clone-456';
    const mockOriginalCourse = {
      id: 'original-course-789',
      name: 'Original Course',
      approvalStatus: 'APPROVED',
      isPendingUpdate: false,
      tees: [],
      holes: []
    };

    golfCourseRepository.rejectUpdate.mockResolvedValue(mockOriginalCourse);

    // Act
    const result = await useCase.execute(cloneId);

    // Assert
    expect(golfCourseRepository.rejectUpdate).toHaveBeenCalledWith(cloneId);
    expect(result.approvalStatus).toBe('APPROVED');
    expect(result.isPendingUpdate).toBe(false);
  });

  it('should throw error when clone id is not provided', async () => {
    // Act & Assert
    await expect(useCase.execute(null)).rejects.toThrow('Clone ID is required');
    await expect(useCase.execute('')).rejects.toThrow('Clone ID is required');

    expect(golfCourseRepository.rejectUpdate).not.toHaveBeenCalled();
  });

  it('should handle repository errors', async () => {
    // Arrange
    const cloneId = 'clone-999';
    const errorMessage = 'Clone not found';
    golfCourseRepository.rejectUpdate.mockRejectedValue(new Error(errorMessage));

    // Act & Assert
    await expect(useCase.execute(cloneId)).rejects.toThrow(errorMessage);
  });
});

// Export to avoid unused warning
export {};
