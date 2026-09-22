/**
 * Los apuntes del refresco del hándicap (FE #677), SIN dependencias.
 *
 * Aparte de `refrescoDeHandicap.js` a propósito: los tres cierres de sesión los
 * olvidan, y dos de ellos (dispositivo revocado, CSRF) los importa `api.js`.
 * Si este módulo trajera `composition` —que trae los repositorios, que traen
 * `api.js`— se cerraría un ciclo de imports.
 */

export const APUNTE_REFRESCAR = 'refrescar_handicap';
export const HANDICAP_POR_PEDIR = 'pedir_handicap';

// Sube en cada cierre de sesión. Una respuesta de una generación anterior es de
// una cuenta que ya salió, y no puede tocar nada de la siguiente
let generacion = 0;

export const generacionDelRefresco = () => generacion;

/**
 * Olvida todo lo del hándicap de la cuenta que sale: el apunte, lo pendiente de
 * pedir y cualquier respuesta que aún esté por llegar. En un móvil compartido,
 * si no, la siguiente persona vería el modal con el hándicap de la anterior, y
 * aceptarlo lo guardaría en su perfil.
 */
export const olvidaElRefrescoDeHandicap = () => {
  generacion += 1;
  localStorage.removeItem(APUNTE_REFRESCAR);
  localStorage.removeItem(HANDICAP_POR_PEDIR);
};
