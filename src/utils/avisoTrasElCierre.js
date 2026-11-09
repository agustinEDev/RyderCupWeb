import customToast from './toast';

/**
 * El aviso de un cierre de sesión forzado (revocado, caducado, terminado), para
 * enseñarlo en /login.
 *
 * La página de partida se recarga hacia /login a los 500 ms, y su aviso de 8 s
 * apenas se veía (9 nov 2026). El motivo se guarda en sessionStorage (solo esa
 * pestaña) y /login lo enseña al cargar, una vez: mismo texto, icono, duración
 * y `delCierre`. Sin sessionStorage, quien cierra lo enseña en la página de
 * partida, como antes.
 *
 * Caduca a los 30 s (la redirección tarda nada), y se olvida al entrar con éxito
 * y al cerrar sesión con el botón: un aviso que /login no llegó a enseñar no puede
 * salir más tarde, en otro /login de otro momento.
 */
const CLAVE = 'rydercup-aviso-del-cierre';
const CADUCA_MS = 30_000;

// El aviso de cada motivo: su texto y su icono
const AVISO_DEL_CIERRE = Object.freeze({
  revocation: { clave: 'errors.deviceRevoked', icono: '🔒' },
  expiration: { clave: 'errors.sessionExpired', icono: '⏱️' },
});
const AVISO_DE_SESION_TERMINADA = Object.freeze({ clave: 'errors.sessionEnded', icono: 'ℹ️' });

/**
 * Guarda el motivo para /login.
 * @param {string} motivo 'revocation', 'expiration' u otro (una sesión que terminó)
 * @returns {boolean} si se pudo guardar
 */
export const guardaElAvisoDelCierre = (motivo) => {
  try {
    globalThis.sessionStorage.setItem(CLAVE, JSON.stringify({ motivo: String(motivo), hora: Date.now() }));
    return true;
  } catch {
    return false;
  }
};

/**
 * El motivo guardado, una sola vez: se borra al leerlo.
 * @returns {string|null}
 */
export const tomaElAvisoDelCierre = () => {
  let guardado;
  try {
    guardado = globalThis.sessionStorage.getItem(CLAVE);
    globalThis.sessionStorage.removeItem(CLAVE);
  } catch {
    return null;
  }
  try {
    const { motivo, hora } = JSON.parse(guardado) ?? {};
    const ahora = Date.now();
    // Ni caducado ni con una hora futura (un reloj cambiado, un valor manipulado)
    if (typeof motivo !== 'string' || typeof hora !== 'number' || ahora < hora || ahora - hora > CADUCA_MS) return null;
    return motivo;
  } catch {
    return null;
  }
};

/** Se entró con éxito o se cerró sesión con el botón: el aviso guardado ya no vale. */
export const olvidaElAvisoDelCierre = () => {
  try {
    globalThis.sessionStorage.removeItem(CLAVE);
  } catch {
    // Sin sessionStorage no había aviso guardado
  }
};

/**
 * Enseña el aviso de un motivo.
 * @param {string} motivo
 * @param {(clave: string, opciones: object) => string} traduce
 */
export const muestraElAvisoDelCierre = (motivo, traduce) => {
  // `hasOwn`: un motivo como «toString» no puede sacar nada del prototipo
  const { clave, icono } = Object.hasOwn(AVISO_DEL_CIERRE, motivo) ? AVISO_DEL_CIERRE[motivo] : AVISO_DE_SESION_TERMINADA;
  // `delCierre`: el único aviso de error que sale con el cierre en marcha (A1)
  customToast.error(traduce(clave, { ns: 'auth' }), { duration: 8000, icon: icono, delCierre: true });
};
