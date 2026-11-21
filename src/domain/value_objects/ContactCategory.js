/**
 * De qué va un mensaje del formulario de contacto.
 *
 * Los valores son los del backend (modules/support/domain/value_objects/contact_category.py).
 *
 * @readonly
 * @enum {string}
 */
export const ContactCategory = Object.freeze({
  BUG: 'BUG',
  FEATURE: 'FEATURE',
  QUESTION: 'QUESTION',
  OTHER: 'OTHER',
});
