import { useEffect, useSyncExternalStore } from 'react';
import { getFeedUnseenCountUseCase } from '../composition';
import {
  fijaLasNovedades,
  generacionDeLasNovedades,
  leeLasNovedades,
  olvidaLasNovedades,
  ponLasNovedadesACero,
  reiniciaElNumeroDeNovedades,
  suscribeALasNovedades,
} from '../services/novedadesDeActividad';

/**
 * El número del botón de Actividad (FE-1): lo nuevo desde la última visita.
 *
 * El número vive en `services/novedadesDeActividad`, a nivel de módulo: lo
 * leen dos sitios a la vez —la barra inferior en móvil y la cabecera en
 * escritorio—, no hay store global (deliberado, ver CLAUDE.md) y lo olvidan
 * también los cierres de sesión forzados. Leerlo NO lo pide: lo pide quien lo vigila, que
 * es uno solo (la barra inferior). Así las páginas que pintan la cabecera en
 * sus tests no lanzan peticiones.
 *
 * Se pide al abrir la aplicación y al volver a ella o a la red. Sin cobertura
 * se queda el último número, sin avisos: es un indicador, no un dato crítico.
 * El mismo número va al icono de la aplicación con la Badging API, donde la
 * haya.
 */

let enVuelo = null;
// De qué generación es el recuento en vuelo: tras olvidar el número (otra
// cuenta) no se reutiliza el de antes, que ya no vale
let generacionEnVuelo = -1;
let vigilantes = 0;
let dejaDeVigilar = null;

export { ponLasNovedadesACero, olvidaLasNovedades };

/** Vuelve a preguntar por el número. Si falla, se queda el que había. */
export const refrescaLasNovedades = () => {
  const deEstaGeneracion = generacionDeLasNovedades();
  if (enVuelo && generacionEnVuelo === deEstaGeneracion) return enVuelo;
  const promesa = getFeedUnseenCountUseCase
    .execute()
    .then((n) => {
      if (deEstaGeneracion === generacionDeLasNovedades() && Number.isFinite(n)) fijaLasNovedades(n);
    })
    .catch(() => {})
    .finally(() => {
      // Solo suelta el suyo: uno viejo que acaba tarde no suelta el de la
      // cuenta nueva
      if (enVuelo === promesa) enVuelo = null;
    });
  enVuelo = promesa;
  generacionEnVuelo = deEstaGeneracion;
  return promesa;
};

const empiezaAVigilar = () => {
  const alCambiarLaVisibilidad = () => {
    if (globalThis.document.visibilityState === 'visible') refrescaLasNovedades();
  };
  const alVolverLaRed = () => {
    refrescaLasNovedades();
  };
  globalThis.document.addEventListener('visibilitychange', alCambiarLaVisibilidad);
  globalThis.addEventListener('online', alVolverLaRed);
  return () => {
    globalThis.document.removeEventListener('visibilitychange', alCambiarLaVisibilidad);
    globalThis.removeEventListener('online', alVolverLaRed);
  };
};

/**
 * Pide el número al montarse y lo vuelve a pedir al volver a la aplicación o
 * a la red. Montarlo dos veces no duplica los oyentes.
 */
export const useVigilanciaDeNovedades = () => {
  useEffect(() => {
    vigilantes += 1;
    if (vigilantes === 1) dejaDeVigilar = empiezaAVigilar();
    refrescaLasNovedades();
    return () => {
      vigilantes -= 1;
      if (vigilantes === 0) {
        dejaDeVigilar?.();
        dejaDeVigilar = null;
      }
    };
  }, []);
};

/** El número, para pintarlo. No lo pide. */
export const useNovedadesDeActividad = () =>
  useSyncExternalStore(suscribeALasNovedades, leeLasNovedades, leeLasNovedades);

/** Solo para las pruebas: esto vive en el módulo y sobrevive de una a otra. */
export const reiniciaLasNovedades = () => {
  reiniciaElNumeroDeNovedades();
  enVuelo = null;
  // Los oyentes de los componentes montados no se tocan; los de la ventana se
  // quitan cuando se desmonta el último vigilante
};
