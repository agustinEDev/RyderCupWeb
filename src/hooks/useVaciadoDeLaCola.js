import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

import { vaciaLaColaEntera } from '../services/vaciadoDeLaCola';

/**
 * La partida que se está anotando ahora mismo, si es que se está anotando
 * alguna. Sale de la ruta porque este vaciado vive por encima de las pantallas
 * y no tiene otra forma de saberlo.
 */
const partidaQueSeEstaAnotando = (pathname) => {
  const encaje = /\/(?:player\/matches|quick-matches)\/([^/]+)\/scoring$/.exec(pathname);
  return encaje ? encaje[1] : null;
};

/**
 * Vacía la cola de golpes pendientes esté el usuario en la pantalla que esté
 * (FE #521).
 *
 * Hasta ahora solo vaciaba la pantalla de anotación, y solo lo suyo: quien
 * terminaba una vuelta con hoyos en la cola y no volvía a abrir esa partida
 * los perdía. Esto se cuelga una vez, arriba del todo, para que no dependa de
 * dónde esté mirando nadie.
 *
 * Escucha DOS señales, y las dos hacen falta:
 *
 * - `online`, la vuelta de la cobertura.
 * - `visibilitychange`, volver a la aplicación. En iOS una página suspendida
 *   no suele recibir `online`, y el caso típico de esta issue es justo ese:
 *   terminar la vuelta en una zona sin cobertura, guardar el móvil, y sacarlo
 *   en la casa club con wifi. Sin esto, los golpes esperarían a un arranque en
 *   frío. Es lo que ya hacen los otros hooks que dependen de volver.
 *
 * La partida que se está anotando se deja fuera: la vacía su propia pantalla,
 * que además sabe resolver los desacuerdos con otro anotador (FE #528).
 */
export const useVaciadoDeLaCola = ({ activo, userId = null }) => {
  const location = useLocation();

  // La ruta se lee de una ref: si `vacia` cambiara con cada navegación, el
  // efecto se desmontaría y lanzaría un vaciado entero en CADA cambio de
  // pantalla
  const rutaActual = useRef(location.pathname);
  useEffect(() => {
    rutaActual.current = location.pathname;
  }, [location.pathname]);

  const vacia = useCallback(() => {
    if (!activo || !userId) return;
    vaciaLaColaEntera({
      saltaPartida: partidaQueSeEstaAnotando(rutaActual.current),
      userId,
    }).catch((err) => {
      // Nunca hacia arriba: esto corre de fondo y un fallo aquí no puede
      // tumbar la pantalla que el usuario esté mirando
      console.error('[VaciadoDeLaCola] No se pudo vaciar la cola:', err);
    });
  }, [activo, userId]);

  useEffect(() => {
    if (!activo || !userId) return undefined;

    // Al entrar: puede haber quedado algo de la última vez que se cerró la
    // aplicación sin cobertura
    vacia();

    const alVolverALaApp = () => {
      if (document.visibilityState !== 'visible') return;
      vacia();
    };

    window.addEventListener('online', vacia);
    document.addEventListener('visibilitychange', alVolverALaApp);
    return () => {
      window.removeEventListener('online', vacia);
      document.removeEventListener('visibilitychange', alVolverALaApp);
    };
  }, [activo, userId, vacia]);
};
