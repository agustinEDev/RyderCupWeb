import { useEffect } from 'react';
import { sendPendingHoleSamplesUseCase } from '../composition';

// Si queda algo en la cola con la aplicación abierta (el wifi de un club tras
// su portal, un tope de peticiones), se reintenta así, como la cola de golpes,
// y agotada la escalera se espera a la red o a volver a la aplicación (FE #551)
export const ESPERAS_MS = [30_000, 120_000, 300_000];

/** Se emite al enviar una muestra que se queda en la cola: arma los reintentos. */
export const MUESTRA_PENDIENTE = 'rydercup:muestra-de-hoyo-pendiente';

/** Se emite cuando la cola ha enviado o descartado alguna muestra: el mapa abierto se pone al día. */
export const MUESTRAS_CAMBIADAS = 'rydercup:muestras-de-hoyos';

/**
 * Envía las muestras de hoyo que se quedaron en la cola del móvil (BE #532,
 * marcado por par): al arrancar, al volver la red y al volver a la aplicación
 * (en iOS una página suspendida no suele recibir `online`). Solo las de quien
 * tiene la sesión, y se corta si cambia a mitad.
 *
 * Sin un solo aviso: el jugador no sabe que hay muestras, ni que se envían ni
 * que alguna no entra (esas van a Sentry desde el caso de uso).
 */
export const useEnvioDeMuestras = ({ activo, userId = null }) => {
  useEffect(() => {
    if (!activo || !userId) return undefined;
    let vigente = true;
    let reintento = null;
    let fallos = 0;
    const envia = () => {
      if (!vigente || globalThis.navigator?.onLine === false) return;
      globalThis.clearTimeout(reintento);
      reintento = null;
      sendPendingHoleSamplesUseCase
        .execute(userId, { sigue: () => vigente })
        .then(({ enviadas, descartadas, pendientes }) => {
          if (!vigente) return;
          if (enviadas || descartadas) globalThis.dispatchEvent(new globalThis.CustomEvent(MUESTRAS_CAMBIADAS));
          if (!pendientes) {
            fallos = 0;
            return;
          }
          // Ya armado (una muestra se quedó en la cola mientras iba esta tanda): uno basta
          if (reintento || fallos >= ESPERAS_MS.length) return;
          reintento = globalThis.setTimeout(envia, ESPERAS_MS[fallos]);
          fallos += 1;
        })
        .catch(() => {
          // Se reintenta con el siguiente disparador
        });
    };
    const porSenal = () => {
      fallos = 0;
      envia();
    };
    const alVolver = () => {
      if (globalThis.document.visibilityState === 'visible') porSenal();
    };
    // Una muestra que no salió (envío lento, servidor caído) con la app abierta
    // y con red: sin esto solo saldría al volver la red o a la app
    const alQuedarPendiente = () => {
      if (reintento || !vigente) return;
      fallos = 1;
      reintento = globalThis.setTimeout(envia, ESPERAS_MS[0]);
    };
    globalThis.addEventListener(MUESTRA_PENDIENTE, alQuedarPendiente);
    envia();
    globalThis.addEventListener('online', porSenal);
    globalThis.document.addEventListener('visibilitychange', alVolver);
    return () => {
      vigente = false;
      globalThis.clearTimeout(reintento);
      globalThis.removeEventListener('online', porSenal);
      globalThis.removeEventListener(MUESTRA_PENDIENTE, alQuedarPendiente);
      globalThis.document.removeEventListener('visibilitychange', alVolver);
    };
  }, [activo, userId]);
};
