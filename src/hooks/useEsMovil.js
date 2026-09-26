import { useSyncExternalStore } from 'react';

// El `sm` de Tailwind: por debajo, pantalla de móvil
const CONSULTA = '(max-width: 639px)';

const hayMatchMedia = () => typeof window.matchMedia === 'function';

const suscribir = (avisar) => {
  if (!hayMatchMedia()) return () => {};
  const consulta = window.matchMedia(CONSULTA);
  consulta.addEventListener('change', avisar);
  return () => consulta.removeEventListener('change', avisar);
};

const leer = () => hayMatchMedia() && window.matchMedia(CONSULTA).matches;

/**
 * Si la pantalla es de móvil. Sigue al ancho en vivo —girar la tablet cambia
 * la respuesta— y, sin `matchMedia`, se queda en la vista de siempre.
 *
 * Lo decide React con `useSyncExternalStore`, la pieza pensada para leer algo
 * que vive fuera de él: sin estado propio que sincronizar a mano.
 */
export const useEsMovil = () => useSyncExternalStore(suscribir, leer, () => false);

export default useEsMovil;
