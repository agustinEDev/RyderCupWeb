import { useSyncExternalStore } from 'react';

/**
 * Si el navegador dice que NO hay red.
 *
 * En un sentido es de fiar y en el otro no: cuando dice que no hay conexión
 * —modo avión, wifi caída— acierta siempre; cuando dice que sí, puede estar
 * mintiendo, porque en un campo con dos barras se sigue considerando
 * «conectado» sin que salga una sola petición. Por eso esto solo se usa para
 * AVISAR, nunca para decidir si merece la pena intentar algo: eso se sigue
 * intentando siempre, y quien falla ya lo cuenta.
 */
const suscribe = (avisa) => {
  globalThis.addEventListener?.('online', avisa);
  globalThis.addEventListener?.('offline', avisa);
  return () => {
    globalThis.removeEventListener?.('online', avisa);
    globalThis.removeEventListener?.('offline', avisa);
  };
};

const leeAhora = () => globalThis.navigator?.onLine === false;

/** En el servidor no hay navegador, y ahí no hay nada que avisar. */
const leeEnElServidor = () => false;

export const useSinConexion = () =>
  useSyncExternalStore(suscribe, leeAhora, leeEnElServidor);
