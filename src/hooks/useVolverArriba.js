import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * Cada pantalla empieza por el principio (FE #643).
 *
 * Con `BrowserRouter` cambiar de ruta no recarga el documento, así que el scroll se
 * quedaba donde estaba y una pantalla se abría por la mitad: pulsar «Perfil» desde
 * la lista de torneos aterrizaba en «Cerrar Sesión» en vez de en tu nombre. Es el
 * patrón de toda la vida para esto, el mismo que usa cualquier SPA con este router.
 *
 * Depende del `pathname` y no de la `location` entera a propósito: cambiar solo el
 * query es filtrar una lista, y saltar arriba dejaría de ver justo lo que se
 * estaba mirando.
 *
 * Lo que NO hace: devolverte a donde estabas al volver atrás. Eso lo resuelve
 * `<ScrollRestoration />` de React Router, que necesita el router moderno
 * (`createBrowserRouter`) — una migración de las 41 rutas de la aplicación, con
 * sus guards y sus Suspense, que va en su propia issue. Hasta entonces, volver
 * atrás también empieza arriba: predecible, aunque no sea lo ideal.
 */
export function useVolverArriba() {
  const { pathname } = useLocation();

  // `useLayoutEffect` y no `useEffect`: este último puede correr DESPUÉS de
  // pintar, y entonces se ve un fotograma con el scroll de la pantalla anterior
  // antes del salto. La pega de `useLayoutEffect` es el renderizado en servidor,
  // que esta aplicación no tiene.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
}

export default useVolverArriba;
