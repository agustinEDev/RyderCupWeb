import { useEffectEvent, useLayoutEffect, useRef } from 'react';
import { useLocation, useMatches, useNavigationType } from 'react-router';

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
 * Volver atrás te deja donde estabas solo en las pantallas que cargan con un
 * `loader` y lo dicen en su ruta (`handle: { restauraElScroll: true }`): ahí lo
 * hace `<ScrollRestoration />` (FE #647, fase 3). Una pantalla que pide sus
 * datos al montarse aún no ha pintado nada cuando se restaura, y el navegador
 * recorta el scroll (volvía a 67 en vez de a 1323): hasta que cada una tenga su
 * `loader`, volver atrás también empieza arriba. Esto corre después de
 * `<ScrollRestoration />`, que va dentro de la carcasa, así que es lo que manda.
 */
export function useVolverArriba() {
  const { pathname } = useLocation();
  const tipo = useNavigationType();
  const restauraElScroll = useMatches().at(-1)?.handle?.restauraElScroll === true;
  // Recargar también llega como POP, y hoy empieza arriba: solo un «atrás» de
  // verdad, ya montada la aplicación, la deja donde estaba (Agustín, 2 nov 2026)
  const yaMontada = useRef(false);
  const vuelveAtrasAUnaQueRestaura = tipo === 'POP' && restauraElScroll;

  // `useLayoutEffect` y no `useEffect`: este último puede correr DESPUÉS de
  // pintar, y entonces se ve un fotograma con el scroll de la pantalla anterior
  // antes del salto. La pega de `useLayoutEffect` es el renderizado en servidor,
  // que esta aplicación no tiene.
  //
  // Solo al cambiar de pantalla (`pathname`): el tipo de navegación y la ruta
  // se leen de esa misma, como evento del efecto, y no lo vuelven a lanzar
  const subirSiToca = useEffectEvent(() => {
    const esLaPrimeraCarga = !yaMontada.current;
    yaMontada.current = true;
    if (vuelveAtrasAUnaQueRestaura && !esLaPrimeraCarga) return;
    window.scrollTo(0, 0);
  });
  useLayoutEffect(() => {
    subirSiToca();
  }, [pathname]);
}
