import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

import { SE_ARREGLA_ESPERANDO } from '../services/vaciaAnotaciones';
import * as cerrojo from '../utils/scoringSessionLock';
import { vaciaLaColaEntera } from '../services/vaciadoDeLaCola';

// Espera creciente Y con tope de intentos: insistir cada pocos segundos contra
// un servidor caído gasta batería sin arreglar nada, y sin tope una sesión
// muerta con la cola llena despertaba el móvil cada cinco minutos el resto del
// día. Agotada la escalera se espera a un disparador de verdad —la vuelta de
// la red, volver a la aplicación—, como hace `sesionCompartida`. Fuera del
// hook a propósito: dentro obligaba a silenciar el aviso de dependencias en
// bloque, y ese silencio tapaba las de verdad
const ESPERAS_MS = [30_000, 120_000, 300_000];

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

  // Reintento cuando el vaciado se para por algo que no es de la anotación.
  //
  // Todos los disparadores son de flanco —montar, `online`, volver a la app— y
  // parar el bucle no programaba nada. Con un portal cautivo de un club, el
  // primer envío muere, se para, y al aceptar las condiciones ya no vuelve a
  // saltar `online` —el navegador nunca dejó de decir que había red— ni
  // `visibilitychange` —no se sale de la aplicación—: la cola se quedaba
  // llena, con cobertura, hasta cerrar la app (FE #551)
  const reintentoRef = useRef(null);
  const cuantosFallosRef = useRef(0);
  // Si el hook sigue montado: un vaciado que resuelve DESPUÉS de desmontar no
  // puede dejar armado un temporizador que ya nadie va a cancelar
  const vivoRef = useRef(true);

  const cancelaReintento = useCallback(() => {
    if (!reintentoRef.current) return;
    globalThis.clearTimeout(reintentoRef.current);
    reintentoRef.current = null;
  }, []);

  const vaciaRef = useRef(null);
  const programaReintento = useCallback(() => {
    if (!vivoRef.current || reintentoRef.current) return;
    // Escalera agotada: se deja de insistir hasta que algo cambie de verdad
    if (cuantosFallosRef.current >= ESPERAS_MS.length) return;
    const espera = ESPERAS_MS[cuantosFallosRef.current];
    cuantosFallosRef.current += 1;
    reintentoRef.current = globalThis.setTimeout(() => {
      reintentoRef.current = null;
      vaciaRef.current?.();
    }, espera);
  }, []);

  const vacia = useCallback(() => {
    if (!activo || !userId) return;
    // Sin red no se intenta. Sin esta guarda, el vaciado al montar disparaba la
    // primera petición durante el arranque y se quedaba esperando a que
    // venciera —diez o treinta segundos en iOS— para descubrir que no hay
    // cobertura, justo en el caso para el que existe esta función. La vuelta de
    // la red ya la cubre el evento `online`
    if (globalThis.navigator?.onLine === false) return;
    vaciaLaColaEntera({
      // Una función y no un valor: el vaciado tarda, y en ese rato el usuario
      // puede ENTRAR en una de las partidas que se están enviando. Congelado,
      // se seguiría vaciando por debajo de una pantalla ya montada, que además
      // enseña su propio contador de pendientes
      // La de la ruta, y la que tenga la anotación abierta en OTRA pestaña:
      // esta solo ve su propia ruta, así que con dos pestañas de la misma
      // cuenta —una anotando, otra en el panel— las dos leían la misma entrada
      // y la enviaban dos veces
      saltaPartida: () =>
        partidaQueSeEstaAnotando(rutaActual.current) ?? cerrojo.partidaConSesionViva(userId),
      userId,
    }).then((resultado) => {
      if (!resultado) return;
      // La escalera se reinicia con PROGRESO —algo llegó, algo se descartó, o
      // ya no queda nada—, no con «terminó sin parar»: un bucle que se saltó
      // todo porque el jugador está dentro de la única partida con cola
      // termina limpio sin haber enviado nada, y contarlo como éxito dejaba el
      // reintento clavado en el primer peldaño mientras el servidor seguía
      // caído. Y con progreso se cancela el que hubiera armado: ya no hace
      // falta esa vuelta, y sin cancelarlo cada contención dejaba un despertar
      // de más
      const huboProgreso = resultado.enviadas > 0
        || resultado.descartadas > 0
        || resultado.pendientes === 0;
      if (huboProgreso) {
        cuantosFallosRef.current = 0;
        cancelaReintento();
      }
      if (SE_ARREGLA_ESPERANDO.has(resultado.paroPor) && resultado.pendientes > 0) {
        programaReintento();
      }
    }).catch((err) => {
      // Nunca hacia arriba: esto corre de fondo y un fallo aquí no puede
      // tumbar la pantalla que el usuario esté mirando
      console.error('[VaciadoDeLaCola] No se pudo vaciar la cola:', err);
      programaReintento();
    });
  }, [activo, userId, programaReintento, cancelaReintento]);

  useEffect(() => {
    vaciaRef.current = vacia;
  }, [vacia]);

  // La limpieza del reintento va en su propio efecto, sin condiciones: colgada
  // del de abajo, un temporizador armado por un fallo que llega DESPUÉS de que
  // `activo` se apague se quedaba sin nadie que lo cancelara
  useEffect(() => {
    vivoRef.current = true;
    return () => {
      vivoRef.current = false;
      cancelaReintento();
      cuantosFallosRef.current = 0;
    };
  }, [cancelaReintento]);

  useEffect(() => {
    if (!activo || !userId) return undefined;

    // Al entrar: puede haber quedado algo de la última vez que se cerró la
    // aplicación sin cobertura. Aplazado un tick, para no meter peticiones en
    // el camino crítico del arranque: `activo` se pone a cierto en el mismo
    // instante en que el panel lanza sus consultas
    globalThis.queueMicrotask(() => vacia());

    // Una señal de fuera es OTRO episodio: la red que vuelve, o el jugador que
    // saca el móvil, no tienen nada que ver con la caída contra la que se
    // agotó la escalera, y desde cero es como se estrena. Sin esto, agotada
    // una vez, el siguiente fallo de la tarde ya no se reintentaba nunca; y
    // el reintento que hubiera armado se cancela, que esta pasada lo suple
    const porSenal = () => {
      cuantosFallosRef.current = 0;
      cancelaReintento();
      vacia();
    };
    const alVolverALaApp = () => {
      if (document.visibilityState !== 'visible') return;
      porSenal();
    };

    window.addEventListener('online', porSenal);
    document.addEventListener('visibilitychange', alVolverALaApp);
    return () => {
      window.removeEventListener('online', porSenal);
      document.removeEventListener('visibilitychange', alVolverALaApp);
    };
  }, [activo, userId, vacia, cancelaReintento]);
};
