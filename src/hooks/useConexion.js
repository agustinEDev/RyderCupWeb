import { useSyncExternalStore } from 'react';
import { hayConexion, seSuscribeALaConexion } from '../services/estadoDeConexion';

/**
 * Si la aplicación está llegando al servidor.
 *
 * Lee del estado compartido en vez de `navigator.onLine`, que en cobertura
 * débil miente. Ver `services/estadoDeConexion`.
 *
 * @returns {boolean}
 */
export const useConexion = () => useSyncExternalStore(seSuscribeALaConexion, hayConexion, () => true);

export default useConexion;
