/**
 * Lo último que enseñó «Requiere tu Atención», guardado entre montajes (FE #502).
 *
 * Esa tarjeta hace hasta siete peticiones propias —invitaciones, inscripciones,
 * solicitudes de amistad, partidas rápidas, sobres sin entregar y, para quien
 * organiza, sesiones sin partidos (BE #361), y plazas asignadas desde la espera
 * (FE #824)—, y como el panel se remonta cada vez
 * que se vuelve a Inicio desde la barra inferior, cada vuelta empezaba de cero y
 * pintaba su esqueleto amarillo. Antes quedaba escondido detrás de la espera a
 * pantalla completa del panel; al quitar esa espera (FE #495) se quedó a la vista.
 *
 * Guardando lo último, al volver se pinta lo de antes al instante y se refresca
 * en silencio. Se ve una carga solo la primera vez en este móvil con esta cuenta.
 *
 * Vive en el módulo y, desde el 14 nov 2026, también en el móvil, dentro de lo
 * guardado del panel de esa cuenta: al abrir la app de cero tampoco espera.
 */

import { lasPendientesGuardadas, recuerdaElPanel } from './loUltimoConocido';

/** `{ usuarioId, datos }`: la memoria es de una cuenta. */
let guardado = null;

/**
 * Lo último que se enseñó con esta cuenta: lo de esta visita, o si no lo hay
 * (se abrió la app de cero), lo guardado en el móvil (Agustín, 14 nov 2026).
 *
 * @param {string} [usuarioId]
 */
export const loQueSeEnseñoAntes = (usuarioId) => {
  if (guardado && guardado.usuarioId === usuarioId) return guardado.datos;
  // Lo del móvil se lee una vez: se queda en memoria, de esa cuenta (/code-review)
  const delMovil = lasPendientesGuardadas(usuarioId);
  if (delMovil) guardado = { usuarioId, datos: delMovil };
  return delMovil;
};

/**
 * @param {Object} datos
 * @param {string} [usuarioId] Sin cuenta, solo en memoria
 */
export const recuerdaLasAccionesPendientes = (datos, usuarioId) => {
  guardado = { usuarioId, datos };
  if (usuarioId) recuerdaElPanel(usuarioId, { pendientes: datos });
};

/** Al cerrar sesión: lo de la cuenta anterior no puede asomar en la siguiente.
 *  Lo del móvil lo borra el registro de limpiezas, con el resto del panel. */
export const olvidaLasAccionesPendientes = () => {
  guardado = null;
};
