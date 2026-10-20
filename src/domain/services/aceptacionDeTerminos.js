/**
 * La aceptación de los Términos (auditoría legal, F3 y F4).
 *
 * El backend manda en el usuario `terms_accepted` y `terms_version_required`, y
 * responde 403 con `TERMINOS_NO_ACEPTADOS` en las rutas protegidas mientras no
 * se acepte la versión vigente.
 */

/** El `error_code` del 403 del backend. */
export const TERMINOS_NO_ACEPTADOS = 'TERMS_NOT_ACCEPTED';

/**
 * Si el usuario tiene que aceptar los Términos antes de seguir.
 *
 * Solo con `false` ESTRICTO: un backend anterior a la aceptación no manda el
 * campo, y bloquear por su ausencia dejaría a todo el mundo fuera. Vale para el
 * DTO del backend (`terms_accepted`, el que guarda la sesión compartida) y para
 * la entidad (`termsAccepted`).
 *
 * @param {Object|null|undefined} usuario
 * @returns {boolean}
 */
export const debeAceptarLosTerminos = (usuario) => {
  if (!usuario) return false;
  const aceptados = 'terms_accepted' in usuario ? usuario.terms_accepted : usuario.termsAccepted;
  return aceptados === false;
};
