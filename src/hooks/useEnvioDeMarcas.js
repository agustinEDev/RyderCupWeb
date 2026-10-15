import { useEffect } from 'react';
import { sendPendingHoleMarksUseCase } from '../composition';

/**
 * Envía las marcas de hoyo que se quedaron en el móvil sin cobertura (BE #532,
 * PR C): al arrancar, al volver la red y al volver a la aplicación (en iOS una
 * página suspendida no suele recibir `online`). Solo las de quien tiene la
 * sesión. Las de golpes van por su vaciado, que pregunta al jugador cuando
 * otro anotó otra cosa; estas no tienen nada que negociar.
 */
export const useEnvioDeMarcas = ({ activo, userId = null }) => {
  useEffect(() => {
    if (!activo || !userId) return undefined;
    const envia = () => {
      if (globalThis.navigator?.onLine === false) return;
      sendPendingHoleMarksUseCase.execute(userId).catch(() => {
        // Se reintenta con el siguiente disparador
      });
    };
    const alVolver = () => {
      if (globalThis.document.visibilityState === 'visible') envia();
    };
    envia();
    globalThis.addEventListener('online', envia);
    globalThis.document.addEventListener('visibilitychange', alVolver);
    return () => {
      globalThis.removeEventListener('online', envia);
      globalThis.document.removeEventListener('visibilitychange', alVolver);
    };
  }, [activo, userId]);
};
