import { useEffect, useSyncExternalStore } from 'react';
import { getFeedUnseenCountUseCase } from '../composition';

/**
 * El número del botón de Actividad (FE-1): lo nuevo desde la última visita.
 *
 * Vive aquí, a nivel de módulo, porque lo leen dos sitios a la vez —la barra
 * inferior en móvil y la cabecera en escritorio— y no hay store global (es
 * deliberado, ver CLAUDE.md). Leerlo NO lo pide: lo pide quien lo vigila, que
 * es uno solo (la barra inferior). Así las páginas que pintan la cabecera en
 * sus tests no lanzan peticiones.
 *
 * Se pide al abrir la aplicación y al volver a ella o a la red. Sin cobertura
 * se queda el último número, sin avisos: es un indicador, no un dato crítico.
 * El mismo número va al icono de la aplicación con la Badging API, donde la
 * haya.
 */

let valor = 0;
// Sube al poner el número a cero: un recuento que ya iba de camino cuando se
// abrió Actividad llega con el número de antes y no debe deshacer el cero
let generacion = 0;
let enVuelo = null;
let vigilantes = 0;
let dejaDeVigilar = null;
const oyentes = new Set();

const avisa = () => {
  oyentes.forEach((oyente) => oyente());
};

// La Badging API puede no existir (Safari en pestaña, Firefox), lanzar o
// rechazar (sin permiso, sin instalar): en cualquier caso se sigue sin más
const ponEnElIcono = (n) => {
  const navegador = globalThis.navigator;
  try {
    const resultado =
      n > 0
        ? typeof navegador?.setAppBadge === 'function' && navegador.setAppBadge(n)
        : typeof navegador?.clearAppBadge === 'function' && navegador.clearAppBadge();
    if (resultado && typeof resultado.catch === 'function') resultado.catch(() => {});
  } catch {
    // Sin icono: el número del botón sigue valiendo
  }
};

const fija = (n) => {
  valor = n;
  avisa();
  ponEnElIcono(n);
};

/** Vuelve a preguntar por el número. Si falla, se queda el que había. */
export const refrescaLasNovedades = () => {
  if (enVuelo) return enVuelo;
  const deEstaGeneracion = generacion;
  enVuelo = getFeedUnseenCountUseCase
    .execute()
    .then((n) => {
      if (deEstaGeneracion === generacion && Number.isFinite(n)) fija(n);
    })
    .catch(() => {})
    .finally(() => {
      enVuelo = null;
    });
  return enVuelo;
};

/** Se ha abierto Actividad y el backend lo ha dado por visto. */
export const ponLasNovedadesACero = () => {
  generacion += 1;
  fija(0);
};

/**
 * Se cierra la sesión: el número y el del icono eran de esa cuenta. Sin esto,
 * quien entrara después en el mismo dispositivo vería el de la anterior. Un
 * recuento que iba de camino tampoco vuelve.
 */
export const olvidaLasNovedades = () => {
  generacion += 1;
  enVuelo = null;
  fija(0);
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

const suscribe = (oyente) => {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
};

const lee = () => valor;

/** El número, para pintarlo. No lo pide. */
export const useNovedadesDeActividad = () => useSyncExternalStore(suscribe, lee, lee);

/** Solo para las pruebas: esto vive en el módulo y sobrevive de una a otra. */
export const reiniciaLasNovedades = () => {
  valor = 0;
  generacion += 1;
  enVuelo = null;
  // Los oyentes de los componentes montados no se tocan; los de la ventana se
  // quitan cuando se desmonta el último vigilante
};
