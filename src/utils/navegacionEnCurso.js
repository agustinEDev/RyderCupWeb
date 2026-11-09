/**
 * La navegación del router de la aplicación que está en curso, sin nada más.
 *
 * Con el router de datos, una pantalla con `loader` hace sus llamadas ANTES de
 * que cambie la dirección: mientras carga, `location` sigue siendo la página de
 * partida. Quien necesite saber a qué página se iba (la vuelta tras aceptar los
 * Términos pendientes) lo lee aquí. El router lo apunta `creaElRouterDeLaAplicacion`.
 *
 * Sin imports: lo usan módulos que el propio router importa (toast, Términos), y
 * así no hay ciclos.
 */
let router = null;

/** `creaElRouterDeLaAplicacion`, al crearlo (y los tests). */
export const apuntaElRouterDeLaAplicacion = (elRouter) => {
  router = elRouter;
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
