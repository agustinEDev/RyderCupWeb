/**
 * Los textos de las pantallas de error, en el idioma de la app (25 oct 2026).
 *
 * Van aquí y no en los JSON de traducción a propósito: esos se cargan bajo
 * demanda (`i18n/config.js`), y estas pantallas salen justo cuando la carga
 * falla, sin cobertura o con la caché a medias. Antes estaban fijas en inglés.
 *
 * El idioma, el mismo que elige i18next: el guardado (`i18nextLng`) y, sin él,
 * el del navegador. Español si empieza por «es»; si no, inglés, el de por
 * defecto de la app.
 */
const CLAVE_DEL_IDIOMA = 'i18nextLng';

const TEXTOS = {
  es: {
    sinCargar: {
      titulo: 'No se ha podido cargar la aplicación',
      texto:
        'Suele pasar tras una actualización o sin cobertura. Recarga la página; si sigue, borra los datos del sitio en el navegador.',
      detalles: 'Detalles técnicos',
      boton: 'Recargar',
    },
    fallo: {
      titulo: 'Algo ha fallado',
      texto: 'Sentimos las molestias: el error ya nos ha llegado. Prueba a recargar; si sigue pasando, escríbenos desde Contacto.',
      detalles: 'Detalles del error (solo en desarrollo)',
      boton: 'Reintentar',
    },
  },
  en: {
    sinCargar: {
      titulo: 'Unable to Load Application',
      texto:
        'We encountered an issue loading the application. This typically happens after an update. Please try refreshing the page or clearing your browser cache.',
      detalles: 'Technical details',
      boton: 'Refresh Page',
    },
    fallo: {
      titulo: 'Oops! Something went wrong',
      texto:
        "We're sorry for the inconvenience. An error occurred and our team has been notified. Please try refreshing the page or contact support if the problem persists.",
      detalles: 'Error Details (Development Only)',
      boton: 'Try Again',
    },
  },
};

const esEspanol = (idioma) => typeof idioma === 'string' && idioma.toLowerCase().startsWith('es');

/** 'es' o 'en'. Sin almacenamiento (Safari sin cookies lanza al leerlo), el del navegador. */
export const idiomaDelError = ({ almacen, navegador = globalThis.navigator } = {}) => {
  let guardado = null;
  try {
    guardado = (almacen ?? globalThis.localStorage)?.getItem(CLAVE_DEL_IDIOMA) ?? null;
  } catch {
    // Sin almacenamiento: se mira el navegador
  }
  const idioma = guardado || navegador?.language;
  return esEspanol(idioma) ? 'es' : 'en';
};

export const textosDelError = (idioma = idiomaDelError()) => TEXTOS[idioma] ?? TEXTOS.en;
