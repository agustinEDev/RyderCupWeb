import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router';

// Cuántas veces se reintenta reponer el scroll mientras la pantalla crece. Son
// fotogramas: ~1 segundo a 60 Hz, de sobra para una pantalla que llega de la
// caché y sin dejar colgado nada si el contenido nunca alcanza esa altura.
const INTENTOS = 60;

/**
 * Cada pantalla empieza por el principio, y al volver atrás se vuelve donde estabas
 * (FE #643).
 *
 * Con `BrowserRouter` cambiar de ruta no recarga el documento, así que el scroll se
 * quedaba donde estaba y una pantalla se abría por la mitad: pulsar «Perfil» desde
 * la lista de torneos aterrizaba en «Cerrar Sesión» en vez de en tu nombre.
 *
 * La vuelta atrás **no se puede dejar en manos del navegador**. Medido en Chrome:
 * con las pantallas subiendo al principio, su restauración aterrizaba en 67 px en
 * vez de en los 1323 que tenía la lista, porque al volver la pantalla todavía no ha
 * cargado su contenido y no da de sí para ese scroll. Antes colaba de milagro,
 * porque el documento nunca había subido.
 *
 * Así que la posición se guarda por entrada de historial (`location.key`) y se
 * repone aquí, reintentando mientras la pantalla crece.
 *
 * Lo que NO cuenta como cambiar de pantalla: cambiar solo el query. Filtrar una
 * lista dejaría de ver justo lo que se estaba mirando, y por eso esto mira el
 * `pathname`, no la `location` entera.
 */
export function useVolverArriba() {
  const location = useLocation();
  const { pathname, key } = location;
  const tipoDeNavegacion = useNavigationType();

  const posiciones = useRef(new Map());
  const rutaAnterior = useRef(pathname);
  const claveActual = useRef(key);
  // Lo que se está intentando reponer, mientras la pantalla acaba de pintarse
  const pendiente = useRef(null);

  // Se apunta dónde queda el scroll de la pantalla que se está mirando, para
  // poder reponerlo cuando se vuelva a ella
  useEffect(() => {
    claveActual.current = key;
    const apunta = () => {
      if (pendiente.current === null) {
        posiciones.current.set(claveActual.current, window.scrollY);
      }
    };
    apunta();
    window.addEventListener('scroll', apunta, { passive: true });
    return () => window.removeEventListener('scroll', apunta);
  }, [key]);

  useLayoutEffect(() => {
    // La primera carga no es una navegación: ahí manda el navegador
    if (rutaAnterior.current === pathname && pendiente.current === null) return;
    rutaAnterior.current = pathname;

    if (tipoDeNavegacion !== 'POP') {
      pendiente.current = null;
      window.scrollTo(0, 0);
      return;
    }

    const destino = posiciones.current.get(key);
    if (destino === undefined || destino === 0) return;

    // La pantalla puede estar todavía a medio pintar, y entonces el navegador
    // recorta el scroll a lo que mide en ese momento. Se insiste mientras crece
    pendiente.current = destino;
    let intentos = 0;

    const repone = () => {
      if (pendiente.current === null) return;
      const alcanza =
        document.documentElement.scrollHeight - window.innerHeight >= destino;
      if (alcanza) {
        window.scrollTo(0, destino);
        pendiente.current = null;
        return;
      }
      if (++intentos < INTENTOS) window.requestAnimationFrame(repone);
      else pendiente.current = null;
    };
    repone();
  }, [pathname, key, tipoDeNavegacion]);

  // Si el contenido llega tarde, el `scroll` que dispara al crecer la página es
  // la última oportunidad de reponer la posición
  useEffect(() => {
    const alCrecer = () => {
      const destino = pendiente.current;
      if (destino === null) return;
      if (document.documentElement.scrollHeight - window.innerHeight >= destino) {
        window.scrollTo(0, destino);
        pendiente.current = null;
      }
    };
    window.addEventListener('scroll', alCrecer, { passive: true });
    return () => window.removeEventListener('scroll', alCrecer);
  }, []);
}

export default useVolverArriba;
