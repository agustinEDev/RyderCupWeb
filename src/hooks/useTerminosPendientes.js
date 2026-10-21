import { useSyncExternalStore } from 'react';
import { loQueHaySobreLaSesion, suscribeALaSesion } from '../services/sesionCompartida';
import { debeAceptarLosTerminos } from '../domain/services/aceptacionDeTerminos';

/**
 * Si el usuario de la sesión tiene los Términos pendientes (F3).
 *
 * Con `soloConfirmados`, solo si lo ha dicho el servidor: la copia del
 * dispositivo puede ser de antes de aceptarlos (el aviso de las rutas
 * públicas, hotfix 2.50.1).
 *
 * Lee la sesión compartida SIN preguntar a la red, al contrario que `useAuth`:
 * lo usa `App.jsx`, que en las rutas públicas no debe consultar la sesión. Y se
 * actualiza solo: al aceptar, la sesión se vuelve a confirmar y esto pasa a
 * `false` sin volver a montar nada.
 *
 * @param {{soloConfirmados?: boolean}} [opciones]
 * @returns {boolean}
 */
export const useTerminosPendientes = ({ soloConfirmados = false } = {}) => {
  const { user, sinConfirmar } = useSyncExternalStore(suscribeALaSesion, loQueHaySobreLaSesion);
  if (soloConfirmados && sinConfirmar) return false;
  return debeAceptarLosTerminos(user);
};

export default useTerminosPendientes;
