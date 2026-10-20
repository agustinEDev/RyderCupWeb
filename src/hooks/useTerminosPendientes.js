import { useSyncExternalStore } from 'react';
import { loQueHaySobreLaSesion, suscribeALaSesion } from '../services/sesionCompartida';
import { debeAceptarLosTerminos } from '../domain/services/aceptacionDeTerminos';

/**
 * Si el usuario de la sesión tiene los Términos pendientes (F3).
 *
 * Lee la sesión compartida SIN preguntar a la red, al contrario que `useAuth`:
 * lo usa `App.jsx`, que en las rutas públicas no debe consultar la sesión. Y se
 * actualiza solo: al aceptar, la sesión se vuelve a confirmar y esto pasa a
 * `false` sin volver a montar nada.
 *
 * @returns {boolean}
 */
export const useTerminosPendientes = () => {
  const { user } = useSyncExternalStore(suscribeALaSesion, loQueHaySobreLaSesion);
  return debeAceptarLosTerminos(user);
};

export default useTerminosPendientes;
