/**
 * Los textos de las pantallas de error, en el idioma de la app (25 oct 2026).
 *
 * Van aquí y no en los JSON de traducción a propósito: esos se cargan bajo
 * demanda (`i18n/config.js`), y estas pantallas salen justo cuando la carga
 * falla, sin cobertura o con la caché a medias. Antes estaban fijas en inglés.
 *
 * El idioma, el mismo que elige i18next: el que tiene en memoria si ya arrancó
 * (cubre un cambio de idioma con el almacenamiento bloqueado), si no el guardado
 * (`i18nextLng`) y, sin él, el primero del navegador. Español si empieza por
 * «es»; si no, inglés, el de por defecto de la app. Un idioma nuevo de la app
 * necesita sus textos aquí: lo exige un test contra `src/i18n/locales`.
 */
import i18next from 'i18next';

const CLAVE_DEL_IDIOMA = 'i18nextLng';

const TEXTOS = {
  es: {
    sinCargar: {
      titulo: 'No se ha podido cargar la aplicación',
      // Nada de «borra los datos del sitio»: se llevaría la cola de golpes sin
      // conexión y la sesión (code-review)
      texto: 'Suele pasar tras una actualización o sin cobertura. Recarga la página cuando tengas conexión; lo que hayas anotado no se pierde.',
      detalles: 'Detalles técnicos',
      boton: 'Recargar',
    },
    fallo: {
      titulo: 'Algo ha fallado',
      texto: 'Sentimos las molestias: el error ya nos ha llegado. Pulsa Reintentar; si vuelve a pasar, cierra la app y ábrela de nuevo.',
      detalles: 'Detalles del error (solo en desarrollo)',
      boton: 'Reintentar',
    },
  },
  en: {
    sinCargar: {
      titulo: 'Unable to Load Application',
      texto: 'This usually happens after an update or without coverage. Reload the page when you are back online; nothing you have scored is lost.',
      detalles: 'Technical details',
      boton: 'Refresh Page',
    },
    fallo: {
      titulo: 'Oops! Something went wrong',
      texto: "Sorry for the inconvenience: we've been notified of the error. Tap Try Again; if it happens again, close the app and open it again.",
      detalles: 'Error Details (Development Only)',
      boton: 'Try Again',
    },
  },
};

// La base de la etiqueta («es-ES», «es_ES» → «es»), si hay textos para ella
const base = (idioma) => String(idioma ?? '').split(/[-_]/)[0].toLowerCase();
const conTextos = (idioma) => (Object.hasOwn(TEXTOS, base(idioma)) ? base(idioma) : null);

/** 'es' o 'en'. Sin almacenamiento (Safari sin cookies lanza al leerlo), el del navegador. */
export const idiomaDelError = ({ i18n = i18next, almacen, navegador = globalThis.navigator } = {}) => {
  // El elegido antes que el resuelto: si el JSON en español no carga, i18next
  // resuelve «en», y esta pantalla sale justo entonces (code-review)
  const enMemoria = i18n?.language || i18n?.resolvedLanguage;
  if (enMemoria) return conTextos(enMemoria) ?? 'en';
  let guardado = null;
  try {
    guardado = (almacen ?? globalThis.localStorage)?.getItem(CLAVE_DEL_IDIOMA) ?? null;
  } catch {
    // Sin almacenamiento: se mira el navegador
  }
  const idioma = guardado || navegador?.languages?.[0] || navegador?.language;
  return conTextos(idioma) ?? 'en';
};

export const textosDelError = (idioma = idiomaDelError()) => {
  const elegido = conTextos(idioma) ?? 'en';
  return { ...TEXTOS[elegido], idioma: elegido };
};
