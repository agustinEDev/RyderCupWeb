import ISupportRepository from '../../domain/repositories/ISupportRepository.js';

// Use plain fetch (not apiRequest) since this is an unauthenticated public endpoint
const API_URL = window.APP_CONFIG?.API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';

/**
 * API implementation of Support Repository
 * Uses plain fetch instead of apiRequest to avoid CSRF/auth warnings on public endpoints
 */
class ApiSupportRepository extends ISupportRepository {
  /**
   * @override
   * Submits a contact form to the backend
   * @param {{ name: string, email: string, category: string, subject: string, message: string }} formData
   * @returns {Promise<{ message: string }>}
   */
  async submitContactForm(formData) {
    let response;
    try {
      response = await fetch(`${API_URL}/api/v1/support/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
    } catch {
      const error = new Error('NETWORK_ERROR');
      error.code = 'NETWORK_ERROR';
      throw error;
    }

    if (!response.ok) {
      const error = new Error('SUBMIT_FAILED');
      error.code = 'SUBMIT_FAILED';
      error.status = response.status;
      throw error;
    }

    return response.json();
  }
}

export default ApiSupportRepository;
