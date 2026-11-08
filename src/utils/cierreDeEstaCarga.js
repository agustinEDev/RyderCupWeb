/**
 * El cierre forzado de ESTA carga de página (C1, 8 nov 2026): al recargar con la sesión
 * muerta fallan dos peticiones a la vez; la primera ya guardó la página, enseñó el aviso y
 * sale, así que la segunda no hace nada. Lo comparten todos los cierres duros (dispositivo
 * revocado, sesión caducada, CSRF: S1), y lo consultan quienes no deben enseñar un fallo
 * mientras la redirección al login está en camino (la confirmación del correo, los avisos
 * de error: 3c, A1).
 *
 * Módulo propio para que los avisos lo consulten sin un import circular con los cierres.
 * La marca de localStorage no sirve para esto: la comparten las pestañas y sobrevive a la
 * carga.
 */
let cierreEnEstaCarga = false;

/** Anota el cierre de esta carga. `false` si ya había uno: quien llama no hace nada. */
export const empiezaElCierreDeEstaCarga = () => {
  if (cierreEnEstaCarga) return false;
  cierreEnEstaCarga = true;
  return true;
};

/** Si un cierre forzado ya está en marcha en esta carga: la redirección llega enseguida. */
export const seEstaCerrandoLaSesion = () => cierreEnEstaCarga;

/**
 * SOLO para los tests: una carga de página nueva. En el navegador lo hace la salida a
 * /login, que descarga la página; ningún código de la aplicación lo llama.
 */
export const olvidaElCierreDeEstaCarga = () => {
  cierreEnEstaCarga = false;
};
