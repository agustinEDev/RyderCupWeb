/**
 * Competitions presentation helpers: badge colours and date ranges.
 *
 * The API calls that used to live here are gone (FE #244): every call goes
 * through the repositories and use cases in `src/composition`.
 */

import { diaDeLaSesion } from '../utils/diaDeLaSesion';

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
 * Las fechas de una competición, «3 oct 2026 - 4 oct 2026», en el idioma de
 * quien mira (antes, siempre en inglés: FE #710).
 *
 * Cada fecha es un día sin hora, leído en el huso de quien mira. Un idioma que
 * `Intl` no entiende lanza RangeError; entonces, el del navegador.
 *
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @param {string} [idioma] - el de i18n
 * @returns {string}
 */
export const formatDateRange = (startDate, endDate, idioma) => {
  const opciones = { year: 'numeric', month: 'short', day: 'numeric' };
  const dia = (iso) => {
    const fecha = diaDeLaSesion(iso) ?? new Date(iso);
    try {
      return fecha.toLocaleDateString(idioma, opciones);
    } catch {
      return fecha.toLocaleDateString(undefined, opciones);
    }
  };

  return `${dia(startDate)} - ${dia(endDate)}`;
};
