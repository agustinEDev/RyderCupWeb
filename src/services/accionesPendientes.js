/**
 * Lo último que enseñó «Requiere tu Atención», guardado entre montajes (FE #502).
 *
 * Esa tarjeta hace cuatro peticiones propias —invitaciones, inscripciones,
 * solicitudes de amistad y partidas rápidas—, y como el panel se remonta cada vez
 * que se vuelve a Inicio desde la barra inferior, cada vuelta empezaba de cero y
 * pintaba su esqueleto amarillo. Antes quedaba escondido detrás de la espera a
 * pantalla completa del panel; al quitar esa espera (FE #495) se quedó a la vista.
 *
 * Guardando lo último, al volver se pinta lo de antes al instante y se refresca
 * en silencio. Se ve una carga la primera vez de la sesión, y ninguna después.
 *
 * Vive en el módulo, así que se vacía al recargar la página: no es un caché con
 * fecha de caducidad, es memoria de lo que ya estaba en pantalla hace un momento.
 */

let guardado = null;

export const loQueSeEnseñoAntes = () => guardado;

export const recuerdaLasAccionesPendientes = (datos) => {
  guardado = datos;
};

/** Al cerrar sesión: lo de la cuenta anterior no puede asomar en la siguiente. */
export const olvidaLasAccionesPendientes = () => {
  guardado = null;
};
