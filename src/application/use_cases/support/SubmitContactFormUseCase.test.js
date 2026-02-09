import { describe, it, expect, vi } from 'vitest';
import SubmitContactFormUseCase from './SubmitContactFormUseCase';

const createMockRepo = () => ({
  submitContactForm: vi.fn().mockResolvedValue({ message: 'Message sent' }),
});

const validFormData = {
  name: 'John Doe',
  email: 'john@example.com',
  category: 'BUG',
  subject: 'Something is broken',
  message: 'The scoring page crashes when I submit my score.',
};

describe('SubmitContactFormUseCase', () => {
  describe('constructor', () => {
    it('should throw if supportRepository is not provided', () => {
      expect(() => new SubmitContactFormUseCase({})).toThrow('supportRepository is required');
    });

    it('should create instance with valid repository', () => {
      const repo = createMockRepo();
      const useCase = new SubmitContactFormUseCase({ supportRepository: repo });
      expect(useCase).toBeDefined();
    });
  });

  describe('validation', () => {
    it('should throw if formData is null', async () => {
      const useCase = new SubmitContactFormUseCase({ supportRepository: createMockRepo() });
      await expect(useCase.execute(null)).rejects.toThrow('Form data is required');
    });

    it('should throw if formData is not an object', async () => {
      const useCase = new SubmitContactFormUseCase({ supportRepository: createMockRepo() });
      await expect(useCase.execute('string')).rejects.toThrow('Form data is required');
    });

    it('should throw if name is missing', async () => {
      const useCase = new SubmitContactFormUseCase({ supportRepository: createMockRepo() });
      await expect(useCase.execute({ ...validFormData, name: '' })).rejects.toThrow('Name must be at least 2 characters');
    });

    it('should throw if name is too short', async () => {
      const useCase = new SubmitContactFormUseCase({ supportRepository: createMockRepo() });
      await expect(useCase.execute({ ...validFormData, name: 'A' })).rejects.toThrow('Name must be at least 2 characters');
    });

    it('should throw if email is missing', async () => {
      const useCase = new SubmitContactFormUseCase({ supportRepository: createMockRepo() });
      await expect(useCase.execute({ ...validFormData, email: '' })).rejects.toThrow('A valid email address is required');
    });

    it('should throw if email is invalid', async () => {
      const useCase = new SubmitContactFormUseCase({ supportRepository: createMockRepo() });
      await expect(useCase.execute({ ...validFormData, email: 'not-an-email' })).rejects.toThrow('A valid email address is required');
    });

    it('should throw if category is missing', async () => {
      const useCase = new SubmitContactFormUseCase({ supportRepository: createMockRepo() });
      await expect(useCase.execute({ ...validFormData, category: '' })).rejects.toThrow('Category must be one of');
    });

    it('should throw if category is invalid', async () => {
      const useCase = new SubmitContactFormUseCase({ supportRepository: createMockRepo() });
      await expect(useCase.execute({ ...validFormData, category: 'INVALID' })).rejects.toThrow('Category must be one of');
    });

    it('should throw if subject is missing', async () => {
      const useCase = new SubmitContactFormUseCase({ supportRepository: createMockRepo() });
      await expect(useCase.execute({ ...validFormData, subject: '' })).rejects.toThrow('Subject must be at least 3 characters');
    });

    it('should throw if subject is too short', async () => {
      const useCase = new SubmitContactFormUseCase({ supportRepository: createMockRepo() });
      await expect(useCase.execute({ ...validFormData, subject: 'AB' })).rejects.toThrow('Subject must be at least 3 characters');
    });

    it('should throw if message is missing', async () => {
      const useCase = new SubmitContactFormUseCase({ supportRepository: createMockRepo() });
      await expect(useCase.execute({ ...validFormData, message: '' })).rejects.toThrow('Message must be at least 10 characters');
    });

    it('should throw if message is too short', async () => {
      const useCase = new SubmitContactFormUseCase({ supportRepository: createMockRepo() });
      await expect(useCase.execute({ ...validFormData, message: 'Too short' })).rejects.toThrow('Message must be at least 10 characters');
    });
  });

  describe('execution', () => {
    it('should call repository with trimmed data on success', async () => {
      const repo = createMockRepo();
      const useCase = new SubmitContactFormUseCase({ supportRepository: repo });

      const result = await useCase.execute({
        name: '  John Doe  ',
        email: ' john@example.com ',
        category: 'FEATURE',
        subject: '  New feature idea  ',
        message: '  I would like to suggest a new feature for the app.  ',
      });

      expect(repo.submitContactForm).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        category: 'FEATURE',
        subject: 'New feature idea',
        message: 'I would like to suggest a new feature for the app.',
      });
      expect(result).toEqual({ message: 'Message sent' });
    });

    it('should accept all valid categories', async () => {
      const categories = ['BUG', 'FEATURE', 'QUESTION', 'OTHER'];
      for (const category of categories) {
        const repo = createMockRepo();
        const useCase = new SubmitContactFormUseCase({ supportRepository: repo });
        await expect(useCase.execute({ ...validFormData, category })).resolves.toBeDefined();
      }
    });

    it('should propagate repository errors', async () => {
      const repo = createMockRepo();
      repo.submitContactForm.mockRejectedValue(new Error('NETWORK_ERROR'));
      const useCase = new SubmitContactFormUseCase({ supportRepository: repo });

      await expect(useCase.execute(validFormData)).rejects.toThrow('NETWORK_ERROR');
    });
  });
});
