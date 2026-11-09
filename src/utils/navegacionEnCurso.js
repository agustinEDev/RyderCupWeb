/**
 * La navegación del router de la aplicación que está en curso, sin nada más.
 *
 * Con el router de datos, una pantalla con `loader` hace sus llamadas ANTES de
 * que cambie la dirección: mientras carga, `location` sigue siendo la página de
 * partida. Quien necesite saber a qué página se iba (la vuelta tras aceptar los
 * Términos pendientes) lo lee aquí. El router lo apunta App.jsx en un efecto.
 *
 * Sin imports: lo usan módulos que el propio router importa (toast, Términos), y
 * así no hay ciclos.
 */
let router = null;

/**
 * Apunta el router de la aplicación. Solo lo llaman App.jsx, en el efecto que
 * también lo registra para Sentry, y los tests: otro router apuntado aquí
 * cambiaría a qué página se vuelve tras aceptar los Términos. Lo vigila
 * `navegacionEnCurso.test.js`. En un efecto y no al crearlo: con StrictMode, el
 * inicializador de `useState` crea dos routers y React se queda con el primero.
 *
 * @returns {() => void} la limpieza del efecto: si sigue apuntado, deja de estarlo
 */
export const apuntaElRouterDeLaAplicacion = (elRouter) => {
  router = elRouter;
  return () => {
    if (router === elRouter) router = null;
  };
};

/**
 * La página a la que se va, si hay una navegación en curso.
 * @returns {{pathname: string, search: string}|null}
 */
export const destinoDeLaNavegacion = () => {
  const navegacion = router?.state?.navigation;
  if (!navegacion || navegacion.state === 'idle' || !navegacion.location) return null;
  return { pathname: navegacion.location.pathname, search: navegacion.location.search ?? '' };
};
