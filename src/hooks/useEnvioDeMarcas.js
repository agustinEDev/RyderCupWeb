import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { sendPendingHoleMarksUseCase } from '../composition';

// Si queda algo pendiente con la aplicación abierta (el wifi de un club tras su
// portal, un tope de peticiones), se reintenta así, como la cola de golpes, y
// agotada la escalera se espera a la red o a volver a la aplicación (FE #551)
export const ESPERAS_MS = [30_000, 120_000, 300_000];

/** Se emite al guardar una marca que se queda pendiente: arma los reintentos. */
export const MARCA_PENDIENTE = 'rydercup:marca-de-hoyo-pendiente';

/** Se emite cuando la cola ha enviado o descartado alguna marca: el mapa abierto se refresca. */
export const MARCAS_CAMBIADAS = 'rydercup:marcas-de-hoyos';

/**
 * Envía las marcas de hoyo que se quedaron en el móvil sin cobertura (BE #532,
 * PR C): al arrancar, al volver la red y al volver a la aplicación (en iOS una
 * página suspendida no suele recibir `online`). Solo las de quien tiene la
 * sesión, y se corta si cambia a mitad. Las de golpes van por su vaciado, que
 * pregunta al jugador cuando otro anotó otra cosa; estas no tienen nada que
 * negociar.
 */
export const useEnvioDeMarcas = ({ activo, userId = null }) => {
  const { t } = useTranslation('scoring');
  useEffect(() => {
    if (!activo || !userId) return undefined;
    let vigente = true;
    let reintento = null;
    let fallos = 0;
    const envia = () => {
      if (!vigente || globalThis.navigator?.onLine === false) return;
      globalThis.clearTimeout(reintento);
      reintento = null;
      sendPendingHoleMarksUseCase
        .execute(userId, { sigue: () => vigente })
        .then(({ enviadas, rechazadas, pendientes }) => {
          if (!vigente) return;
          if (enviadas || rechazadas) globalThis.dispatchEvent(new globalThis.CustomEvent(MARCAS_CAMBIADAS));
          // Se envió sin nadie mirando: lo que el servidor no quiso, se dice
          if (rechazadas) toast.error(t('mapa.marcaRechazada', { count: rechazadas }));
          if (!pendientes) {
            fallos = 0;
            return;
          }
          // Ya armado (una marca se quedó pendiente mientras iba esta tanda): uno basta
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
    // Una marca guardada que no salió (envío lento, servidor caído) con la app
    // abierta y con red: sin esto solo saldría al volver la red o a la app
    const alQuedarPendiente = () => {
      if (reintento || !vigente) return;
      fallos = 1;
      reintento = globalThis.setTimeout(envia, ESPERAS_MS[0]);
    };
    globalThis.addEventListener(MARCA_PENDIENTE, alQuedarPendiente);
    envia();
    globalThis.addEventListener('online', porSenal);
    globalThis.document.addEventListener('visibilitychange', alVolver);
    return () => {
      vigente = false;
      globalThis.clearTimeout(reintento);
      globalThis.removeEventListener('online', porSenal);
      globalThis.removeEventListener(MARCA_PENDIENTE, alQuedarPendiente);
      globalThis.document.removeEventListener('visibilitychange', alVolver);
    };
  }, [activo, userId, t]);
};
