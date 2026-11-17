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
// El recordatorio de «Requiere tu atención» que deja cerrar el modal con «Ahora no»
export const RECORDATORIO_HANDICAP = 'handicap_pending';

// El recordatorio por su nombre, no por la clave a mano en cada pantalla: un cambio
// de clave se dejaba alguna (re-auditoría del 16 nov 2026, Q-FE-11)
export const hayRecordatorioDeHandicap = () => {
  try {
    return (
      typeof localStorage !== 'undefined' &&
      localStorage.getItem(RECORDATORIO_HANDICAP) === 'true'
    );
  } catch {
    // Almacenamiento bloqueado: sin recordatorio, y el panel se pinta igual
    return false;
  }
};
// Si quedó pendiente un refresco del hándicap (lo apunta el login). Con el
// almacenamiento bloqueado, no: el panel no puede romperse por leerlo (CodeRabbit)
export const hayRefrescoPendiente = () => {
  try {
    return localStorage.getItem(APUNTE_REFRESCAR) === 'true';
  } catch {
    return false;
  }
};

// El apunte de una versión anterior (`needs_handicap`): su información es de otro día
export const olvidaElApunteAntiguo = () => {
  try {
    localStorage.removeItem('needs_handicap');
  } catch {
    // Sin almacenamiento no hay nada que olvidar
  }
};

// Sin almacenamiento (Safari con los datos bloqueados, sin espacio), el recordatorio
// simplemente no se guarda: no puede romper el botón que lo apunta
export const apuntaRecordatorioDeHandicap = () => {
  try {
    localStorage.setItem(RECORDATORIO_HANDICAP, 'true');
  } catch {
    // Sin sitio donde apuntarlo: el modal volverá a salir cuando toque
  }
};
export const quitaRecordatorioDeHandicap = () => {
  try {
    localStorage.removeItem(RECORDATORIO_HANDICAP);
  } catch {
    // Sin almacenamiento tampoco hay nada que quitar
  }
};

// Sube en cada cierre de sesión. Una respuesta de una generación anterior es de
// una cuenta que ya salió, y no puede tocar nada de la siguiente
let generacion = 0;

export const generacionDelRefresco = () => generacion;

/**
 * Olvida todo lo del hándicap de la cuenta que sale: el apunte, lo pendiente de
 * pedir, el recordatorio y cualquier respuesta que aún esté por llegar. En un móvil compartido,
 * si no, la siguiente persona vería el modal con el hándicap de la anterior, y
 * aceptarlo lo guardaría en su perfil.
 */
export const olvidaElRefrescoDeHandicap = () => {
  generacion += 1;
  localStorage.removeItem(APUNTE_REFRESCAR);
  localStorage.removeItem(HANDICAP_POR_PEDIR);
  localStorage.removeItem(RECORDATORIO_HANDICAP);
};
