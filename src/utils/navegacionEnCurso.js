import { matchRoutes } from 'react-router';

/**
 * La navegación del router de la aplicación que está en curso, sin nada más.
 *
 * Con el router de datos, una pantalla con `loader` hace sus llamadas ANTES de
 * que cambie la dirección: mientras carga, `location` sigue siendo la página de
 * partida. Quien necesite saber a qué página se iba (la vuelta tras aceptar los
 * Términos pendientes) lo lee aquí. El router lo apunta App.jsx en un efecto.
 *
 * Solo importa el router de la librería: lo usan módulos que la aplicación importa
 * desde muchos sitios (toast, Términos), y así no hay ciclos.
 */
let router = null;
let dejaDeVigilar = null;
// Cuándo empezó la navegación en curso (`performance.now()`), y cuál es
let inicioDeLaNavegacion = null;
let claveDeLaNavegacion = null;

const vigila = (estado) => {
  const navegacion = estado?.navigation;
  if (!navegacion || navegacion.state === 'idle') {
    inicioDeLaNavegacion = null;
    claveDeLaNavegacion = null;
    return;
  }
  const clave = navegacion.location?.key ?? navegacion.location?.pathname;
  if (clave !== claveDeLaNavegacion) {
    claveDeLaNavegacion = clave;
    inicioDeLaNavegacion = globalThis.performance.now();
  }
};

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
  dejaDeVigilar?.();
  router = elRouter;
  inicioDeLaNavegacion = null;
  claveDeLaNavegacion = null;
  // El router avisa al empezar una navegación, antes de llamar a sus `loader`
  dejaDeVigilar = elRouter?.subscribe?.(vigila) ?? null;
  vigila(elRouter?.state);
  return () => {
    if (router !== elRouter) return;
    dejaDeVigilar?.();
    dejaDeVigilar = null;
    router = null;
    inicioDeLaNavegacion = null;
    claveDeLaNavegacion = null;
  };
};

/**
 * La página a la que se va, si hay una navegación en curso.
 * @returns {{pathname: string, search: string}|null}
 */
export const destinoDeLaNavegacion = () => {
  const navegacion = router?.state?.navigation;
  if (!navegacion || navegacion.state === 'idle' || !navegacion.location)
    return null;
  return {
    pathname: navegacion.location.pathname,
    search: navegacion.location.search ?? '',
  };
};

/**
 * El destino de la navegación en curso, solo si una petición que empezó en
 * `inicio` (`performance.now()`) puede ser suya: el destino tiene `loader` y la
 * petición empezó después de iniciarse la navegación. No hay forma de saber qué
 * código lanzó cada petición; con esto, un sondeo de la página actual que salió
 * antes de navegar no se atribuye al destino.
 *
 * @param {number|undefined} inicio
 * @returns {{pathname: string, search: string}|null}
 */
export const destinoSiLaPeticionEsSuya = (inicio) => {
  const destino = destinoDeLaNavegacion();
  if (!destino || typeof inicio !== 'number' || inicioDeLaNavegacion === null)
    return null;
  if (inicio < inicioDeLaNavegacion) return null;
  const conLoader = (
    matchRoutes(router.routes ?? [], destino.pathname) ?? []
  ).some(({ route }) => Boolean(route.loader));
  return conLoader ? destino : null;
};
