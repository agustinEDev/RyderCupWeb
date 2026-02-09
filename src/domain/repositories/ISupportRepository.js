/* eslint-disable no-unused-vars */

/**
 * Support Repository Interface
 * Handles contact form submissions
 */
class ISupportRepository {
  /**
   * Submits a contact form
   * @param {{ name: string, email: string, category: string, subject: string, message: string }} formData
   * @returns {Promise<{ message: string }>}
   */
  async submitContactForm(formData) {
    throw new Error('Method not implemented: submitContactForm');
  }
}

export default ISupportRepository;
