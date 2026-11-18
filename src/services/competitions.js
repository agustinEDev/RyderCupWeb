/**
 * Competitions presentation helpers: badge colours and date ranges.
 *
 * The API calls that used to live here are gone (FE #244): every call goes
 * through the repositories and use cases in `src/composition`.
 */

import { diaDeLaSesion } from '../utils/diaDeLaSesion';
import { CompetitionStatusEnum } from '../domain/value_objects/CompetitionStatus';
import EnrollmentStatus from '../domain/value_objects/EnrollmentStatus';

/**
 * Get competition status badge color
 * @param {string} status - Competition status
 * @returns {string} Tailwind CSS color classes
 */
export const getStatusColor = (status) => {
  const colors = {
    [CompetitionStatusEnum.DRAFT]: 'bg-gray-100 text-gray-700',
    [CompetitionStatusEnum.ACTIVE]: 'bg-green-100 text-green-700',
    [CompetitionStatusEnum.CLOSED]: 'bg-yellow-100 text-yellow-700',
    [CompetitionStatusEnum.IN_PROGRESS]: 'bg-blue-100 text-blue-700',
    [CompetitionStatusEnum.COMPLETED]: 'bg-purple-100 text-purple-700',
    [CompetitionStatusEnum.CANCELLED]: 'bg-red-100 text-red-700',
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
    [EnrollmentStatus.REQUESTED]: 'bg-yellow-100 text-yellow-700',
    [EnrollmentStatus.INVITED]: 'bg-blue-100 text-blue-700',
    [EnrollmentStatus.APPROVED]: 'bg-green-100 text-green-700',
    [EnrollmentStatus.REJECTED]: 'bg-red-100 text-red-700',
    [EnrollmentStatus.CANCELLED]: 'bg-gray-100 text-gray-700',
    [EnrollmentStatus.WITHDRAWN]: 'bg-orange-100 text-orange-700',
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
