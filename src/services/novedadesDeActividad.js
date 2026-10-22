/**
 * El número de Actividad (FE-1): lo nuevo desde la última visita, y su copia
 * en el icono de la aplicación.
 *
 * Vive aquí, en servicios y sin React, porque lo tienen que poder olvidar los
 * caminos de salida que no pasan por la interfaz —dispositivo revocado, sesión
 * caducada, fallo de CSRF, arranque sin sesión—, y esos no pueden depender de
 * la composition root. Quien lo pide y lo vigila es
 * `hooks/useNovedadesDeActividad`.
 */

let valor = 0;
// Sube cada vez que el número se pone a cero a mano (visto, o sesión cerrada):
// un recuento que ya iba de camino trae el número de antes y no debe ganar
let generacion = 0;
const oyentes = new Set();

// La Badging API puede no existir (Safari en pestaña, Firefox), lanzar o
// rechazar (sin permiso, sin instalar): en cualquier caso se sigue sin más
const ponEnElIcono = (n) => {
  const navegador = globalThis.navigator;
  try {
    const resultado =
      n > 0
        ? typeof navegador?.setAppBadge === 'function' && navegador.setAppBadge(n)
        : typeof navegador?.clearAppBadge === 'function' && navegador.clearAppBadge();
    if (resultado && typeof resultado.catch === 'function') resultado.catch(() => {});
  } catch {
    // Sin icono: el número del botón sigue valiendo
  }
};

export const leeLasNovedades = () => valor;

export const generacionDeLasNovedades = () => generacion;

export const suscribeALasNovedades = (oyente) => {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
};

/** Fija el número, avisa a quien lo pinta y lo lleva al icono. */
export const fijaLasNovedades = (n) => {
  valor = n;
  oyentes.forEach((oyente) => oyente());
  ponEnElIcono(n);
};

/** Se ha abierto Actividad y el backend lo ha dado por visto. */
export const ponLasNovedadesACero = () => {
  generacion += 1;
  fijaLasNovedades(0);
};

/**
 * Se cierra la sesión, por el camino que sea: el número y el del icono eran de
 * esa cuenta. Sin esto, quien entrara después en el mismo dispositivo vería el
 * de la anterior. Un recuento que iba de camino tampoco vuelve.
 */
export const olvidaLasNovedades = () => {
  ponLasNovedadesACero();
};

/** Solo para las pruebas: esto vive en el módulo y sobrevive de una a otra. */
export const reiniciaElNumeroDeNovedades = () => {
  valor = 0;
  generacion += 1;
};
