/**
 * Las rutas que se pueden ver sin sesion.
 *
 * Vive aqui porque la lista estaba DUPLICADA: una copia en `App.jsx` y otra a
 * mano dentro del interceptor de refresco, que ya iba dos entradas por detras
 * —le faltaban `/auth/google/callback` y `/start`—. Cada entrada que se olvida
 * en esa copia significa que, en esa pagina, un `401` esperable dispara el
 * refresco, falla, y echa al usuario a `/login` diciendo que su sesion expiro.
 */
export const RUTAS_PUBLICAS = [
  '/',
  // La aplicacion instalada arranca aqui (FE #465), normalmente SIN sesion
  '/start',
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/pricing',
  '/contact',
  '/terms',
  '/privacy',
  '/cookies',
  '/auth/google/callback',
];

/** Las publicas que llevan algo variable dentro. Anclados a proposito: con una
 *  subcadena, `/admin/leaderboard` o `/competitions/1/leaderboard/print` habrian
 *  pasado por publicas siendo privadas. */
const PATRONES_PUBLICOS = [
  // Con `[^/]*` y no `[^/]+`: `/reset-password/` a secas —el correo trunco el
  // enlace, o alguien recorto la URL— era publica con el `startsWith` anterior y
  // dejaba de serlo al anclar
  /^\/reset-password(\/[^/]*)?$/,
  /^\/competitions\/[^/]+\/leaderboard$/,
];

/** Quita la barra final, que llega sola desde enlaces copiados y correos:
 *  `/start/` no es otra pantalla que `/start`, pero sin esto no coincidia con
 *  ninguna lista y la pantalla de entrada pasaba por privada. La raiz se
 *  conserva tal cual. */
const normalizar = (ruta) => (ruta.length > 1 ? ruta.replace(/\/+$/, '') || '/' : ruta);

/** Si una ruta concreta es publica. */
export const esRutaPublica = (ruta) => {
  const limpia = normalizar(ruta);
  return RUTAS_PUBLICAS.includes(limpia) || PATRONES_PUBLICOS.some((p) => p.test(limpia));
};

/**
 * Si en esta ruta hay que AHORRARSE el refresco del token ante un 401.
 *
 * No basta con que la ruta sea publica: la clasificacion compartida tambien lo
 * es y ahi un usuario CON sesion, con su access de 15 minutos caducado, debe
 * refrescar — si no, la pantalla se pinta como si estuviera desconectado, con la
 * cabecera de visitante. La pregunta correcta es si hay sesion guardada: sin
 * ella, un 401 es lo esperable y forzar la salida a `/login` es un error.
 */
/** Donde alguien puede estar escribiendo sus credenciales, mas la portada.
 *  `/start` esta aqui porque monta el MISMO formulario que `/login`, y ademas es
 *  la pantalla donde se aterriza con un `user` rancio. `/` estaba en la lista
 *  original y se perdio al reescribir esto: ser echado de la portada publica es
 *  peor que el bucle que la exencion evita. */
const PANTALLAS_DE_ACCESO = ['/', '/start', '/login', '/register', '/forgot-password'];

export const sinSesionEnRutaPublica = (ruta, hayUsuarioGuardado) => {
  if (!esRutaPublica(ruta)) return false;
  const limpia = normalizar(ruta);

  // En las pantallas de acceso, SIEMPRE. `user` sobrevive en el almacen a que la
  // sesion muera de verdad —solo se borra al salir a proposito—, asi que quien
  // vuelve dias despues llevaria un `user` rancio: el 401 dispararia el refresco,
  // fallaria, y le echaria a `/login` con «tu sesion expiro» borrando lo que
  // estuviera escribiendo. Es el bucle que estas pantallas ya evitaban.
  if (PANTALLAS_DE_ACCESO.includes(limpia) || limpia.startsWith('/reset-password')) return true;

  // En el resto —la portada, una clasificacion compartida— depende: con sesion
  // hay que refrescar, o la pantalla se pinta como si estuviera desconectado.
  return !hayUsuarioGuardado;
};

export default RUTAS_PUBLICAS;

/**
 * Por donde se ENTRA a la aplicacion. Ofrecer «instala la aplicacion» aqui no
 * tiene sentido: en la portada porque tiene su propio boton, y en el arranque
 * porque quien lo ve ya la tiene instalada.
 */
export const esPuertaDeEntrada = (ruta) => {
  const limpia = normalizar(ruta);
  return limpia === '/' || limpia === '/start';
};
