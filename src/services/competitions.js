/**
 * Competitions API Service
 * Handles all competition-related API calls
 */

import apiRequest from './api';

/**
 * Competition endpoints
 */
const ENDPOINTS = {
  COMPETITIONS: '/api/v1/competitions',
  COMPETITION_BY_ID: (id) => `/api/v1/competitions/${id}`,
  ACTIVATE: (id) => `/api/v1/competitions/${id}/activate`,
  CLOSE_ENROLLMENTS: (id) => `/api/v1/competitions/${id}/close-enrollments`,
  START: (id) => `/api/v1/competitions/${id}/start`,
  COMPLETE: (id) => `/api/v1/competitions/${id}/complete`,
  CANCEL: (id) => `/api/v1/competitions/${id}/cancel`,
  ENROLLMENTS: (id) => `/api/v1/competitions/${id}/enrollments`,
  ENROLLMENT_BY_ID: (competitionId, enrollmentId) =>
    `/api/v1/competitions/${competitionId}/enrollments/${enrollmentId}`,
};

// ============================================================================
// Competition CRUD Operations
// ============================================================================

/**
 * Create a new competition
 * @param {object} competitionData - Competition data
 * @returns {Promise<object>} Created competition
 */
export const createCompetition = async (competitionData) => {
  return apiRequest(ENDPOINTS.COMPETITIONS, {
    method: 'POST',
    body: JSON.stringify(competitionData),
  });
};

/**
 * Get all competitions (with optional filters)
 * @param {object} filters - Query parameters (status, creator_id, etc.)
 * @returns {Promise<array>} List of competitions
 */
export const getCompetitions = async (filters = {}) => {
  const queryParams = new URLSearchParams(filters).toString();
  const endpoint = queryParams
    ? `${ENDPOINTS.COMPETITIONS}?${queryParams}`
    : ENDPOINTS.COMPETITIONS;

  return apiRequest(endpoint, {
    method: 'GET',
  });
};

/**
 * Get competition by ID
 * @param {string} competitionId - Competition UUID
 * @returns {Promise<object>} Competition details
 */
export const getCompetitionById = async (competitionId) => {
  return apiRequest(ENDPOINTS.COMPETITION_BY_ID(competitionId), {
    method: 'GET',
  });
};

/**
 * Update competition (only in DRAFT state)
 * @param {string} competitionId - Competition UUID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} Updated competition
 */
export const updateCompetition = async (competitionId, updates) => {
  return apiRequest(ENDPOINTS.COMPETITION_BY_ID(competitionId), {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

/**
 * Delete competition (only in DRAFT state)
 * @param {string} competitionId - Competition UUID
 * @returns {Promise<void>}
 */
export const deleteCompetition = async (competitionId) => {
  return apiRequest(ENDPOINTS.COMPETITION_BY_ID(competitionId), {
    method: 'DELETE',
  });
};

// ============================================================================
// Competition State Transitions
// ============================================================================

/**
 * Activate competition (DRAFT → ACTIVE)
 * @param {string} competitionId - Competition UUID
 * @returns {Promise<object>} Updated competition
 */
export const activateCompetition = async (competitionId) => {
  return apiRequest(ENDPOINTS.ACTIVATE(competitionId), {
    method: 'POST',
  });
};

/**
 * Close enrollments (ACTIVE → CLOSED)
 * @param {string} competitionId - Competition UUID
 * @returns {Promise<object>} Updated competition
 */
export const closeEnrollments = async (competitionId) => {
  return apiRequest(ENDPOINTS.CLOSE_ENROLLMENTS(competitionId), {
    method: 'POST',
  });
};

/**
 * Start competition (CLOSED → IN_PROGRESS)
 * @param {string} competitionId - Competition UUID
 * @returns {Promise<object>} Updated competition
 */
export const startCompetition = async (competitionId) => {
  return apiRequest(ENDPOINTS.START(competitionId), {
    method: 'POST',
  });
};

/**
 * Complete competition (IN_PROGRESS → COMPLETED)
 * @param {string} competitionId - Competition UUID
 * @returns {Promise<object>} Updated competition
 */
export const completeCompetition = async (competitionId) => {
  return apiRequest(ENDPOINTS.COMPLETE(competitionId), {
    method: 'POST',
  });
};

/**
 * Cancel competition (any state → CANCELLED)
 * @param {string} competitionId - Competition UUID
 * @returns {Promise<object>} Updated competition
 */
export const cancelCompetition = async (competitionId) => {
  return apiRequest(ENDPOINTS.CANCEL(competitionId), {
    method: 'POST',
  });
};

// ============================================================================
// Enrollment Operations
// ============================================================================

/**
 * Request enrollment in competition
 * @param {string} competitionId - Competition UUID
 * @param {object} enrollmentData - Enrollment data
 * @returns {Promise<object>} Created enrollment
 */
export const requestEnrollment = async (competitionId, enrollmentData = {}) => {
  return apiRequest(ENDPOINTS.ENROLLMENTS(competitionId), {
    method: 'POST',
    body: JSON.stringify(enrollmentData),
  });
};

/**
 * Get all enrollments for a competition
 * @param {string} competitionId - Competition UUID
 * @param {object} filters - Query parameters (status, team, etc.)
 * @returns {Promise<array>} List of enrollments
 */
export const getEnrollments = async (competitionId, filters = {}) => {
  const queryParams = new URLSearchParams(filters).toString();
  const endpoint = queryParams
    ? `${ENDPOINTS.ENROLLMENTS(competitionId)}?${queryParams}`
    : ENDPOINTS.ENROLLMENTS(competitionId);

  return apiRequest(endpoint, {
    method: 'GET',
  });
};

/**
 * Approve enrollment
 * @param {string} competitionId - Competition UUID
 * @param {string} enrollmentId - Enrollment UUID
 * @param {string} team - Team assignment (optional)
 * @returns {Promise<object>} Updated enrollment
 */
export const approveEnrollment = async (competitionId, enrollmentId, team = null) => {
  return apiRequest(ENDPOINTS.ENROLLMENT_BY_ID(competitionId, enrollmentId) + '/approve', {
    method: 'POST',
    body: JSON.stringify({ team }),
  });
};

/**
 * Reject enrollment
 * @param {string} competitionId - Competition UUID
 * @param {string} enrollmentId - Enrollment UUID
 * @returns {Promise<object>} Updated enrollment
 */
export const rejectEnrollment = async (competitionId, enrollmentId) => {
  return apiRequest(ENDPOINTS.ENROLLMENT_BY_ID(competitionId, enrollmentId) + '/reject', {
    method: 'POST',
  });
};

/**
 * Cancel enrollment (by player)
 * @param {string} competitionId - Competition UUID
 * @param {string} enrollmentId - Enrollment UUID
 * @returns {Promise<object>} Updated enrollment
 */
export const cancelEnrollment = async (competitionId, enrollmentId) => {
  return apiRequest(ENDPOINTS.ENROLLMENT_BY_ID(competitionId, enrollmentId) + '/cancel', {
    method: 'POST',
  });
};

/**
 * Withdraw from competition (by player)
 * @param {string} competitionId - Competition UUID
 * @param {string} enrollmentId - Enrollment UUID
 * @returns {Promise<object>} Updated enrollment
 */
export const withdrawEnrollment = async (competitionId, enrollmentId) => {
  return apiRequest(ENDPOINTS.ENROLLMENT_BY_ID(competitionId, enrollmentId) + '/withdraw', {
    method: 'POST',
  });
};

/**
 * Set custom handicap for enrollment
 * @param {string} competitionId - Competition UUID
 * @param {string} enrollmentId - Enrollment UUID
 * @param {number} customHandicap - Custom handicap value
 * @returns {Promise<object>} Updated enrollment
 */
export const setCustomHandicap = async (competitionId, enrollmentId, customHandicap) => {
  return apiRequest(ENDPOINTS.ENROLLMENT_BY_ID(competitionId, enrollmentId) + '/handicap', {
    method: 'PUT',
    body: JSON.stringify({ custom_handicap: customHandicap }),
  });
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get competition status badge color
 * @param {string} status - Competition status
 * @returns {string} Tailwind CSS color classes
 */
export const getStatusColor = (status) => {
  const colors = {
    DRAFT: 'bg-gray-100 text-gray-700',
    ACTIVE: 'bg-green-100 text-green-700',
    CLOSED: 'bg-yellow-100 text-yellow-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-purple-100 text-purple-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

/**
 * Get enrollment status badge color
 * @param {string} status - Enrollment status
 * @returns {string} Tailwind CSS color classes
 */
export const getEnrollmentStatusColor = (status) => {
  const colors = {
    REQUESTED: 'bg-yellow-100 text-yellow-700',
    INVITED: 'bg-blue-100 text-blue-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-700',
    WITHDRAWN: 'bg-orange-100 text-orange-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

/**
 * Format date range
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {string} Formatted date range
 */
export const formatDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  const startFormatted = start.toLocaleDateString('en-US', options);
  const endFormatted = end.toLocaleDateString('en-US', options);

  return `${startFormatted} - ${endFormatted}`;
};
