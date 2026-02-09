const VALID_CATEGORIES = ['BUG', 'FEATURE', 'QUESTION', 'OTHER'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * SubmitContactFormUseCase
 * Validates and submits a contact form through the support repository
 */
class SubmitContactFormUseCase {
  /**
   * @param {Object} deps - Dependencies
   * @param {import('../../../domain/repositories/ISupportRepository').default} deps.supportRepository - Support repository
   */
  constructor({ supportRepository }) {
    if (!supportRepository) {
      throw new Error('supportRepository is required');
    }
    this.supportRepository = supportRepository;
  }

  /**
   * Validates and submits the contact form
   * @param {{ name: string, email: string, category: string, subject: string, message: string }} formData
   * @returns {Promise<{ message: string }>}
   * @throws {Error} If validation fails or submission errors
   */
  async execute(formData) {
    if (!formData || typeof formData !== 'object') {
      throw new Error('Form data is required');
    }

    const { name, email, category, subject, message } = formData;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      throw new Error('Name must be at least 2 characters');
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      throw new Error('A valid email address is required');
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      throw new Error('Category must be one of: BUG, FEATURE, QUESTION, OTHER');
    }

    if (!subject || typeof subject !== 'string' || subject.trim().length < 3) {
      throw new Error('Subject must be at least 3 characters');
    }

    if (!message || typeof message !== 'string' || message.trim().length < 10) {
      throw new Error('Message must be at least 10 characters');
    }

    return this.supportRepository.submitContactForm({
      name: name.trim(),
      email: email.trim(),
      category,
      subject: subject.trim(),
      message: message.trim(),
    });
  }
}

export default SubmitContactFormUseCase;
