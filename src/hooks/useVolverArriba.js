import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router';

// Cuánto se espera, como mucho, a que la pantalla crezca lo suficiente para
// reponer el scroll. En milisegundos y no en fotogramas: 60 fotogramas son un
// segundo a 60 Hz pero medio a 120 Hz, que es la pantalla de medio catálogo de
// móviles. Pasado el plazo se baja lo que se pueda, que es mejor que nada.
const ESPERA_MAXIMA_MS = 1500;

/**
 * Cada pantalla empieza por el principio, y al volver atrás se vuelve donde estabas
 * (FE #643).
 *
 * Con `BrowserRouter` cambiar de ruta no recarga el documento, así que el scroll se
 * quedaba donde estaba y una pantalla se abría por la mitad: pulsar «Perfil» desde
 * la lista de torneos aterrizaba en «Cerrar Sesión» en vez de en tu nombre.
 *
 * La vuelta atrás no se puede dejar en manos del navegador. Medido en Chrome: con
 * las pantallas subiendo al principio, su restauración aterrizaba en 67 px en vez
 * de en los 1323 que tenía la lista, porque al volver la pantalla todavía no ha
 * cargado su contenido y no da de sí para ese scroll. Así que se desactiva
 * (`scrollRestoration = 'manual'`, que si no compite con esto en cada vuelta) y la
 * posición se guarda por entrada de historial y se repone aquí, insistiendo
 * mientras la pantalla crece.
 *
 * Lo que NO cuenta como cambiar de pantalla: cambiar solo el query. Filtrar una
 * lista dejaría de ver justo lo que se estaba mirando. Pulsar la pestaña en la que
 * ya estás sí cuenta, aunque la ruta sea la misma: es el gesto de volver arriba.
 */
export function useVolverArriba() {
  const { pathname, search, key } = useLocation();
  const tipoDeNavegacion = useNavigationType();

  const posiciones = useRef(new Map());
  const anterior = useRef({ pathname, search, key });
  // De quién son los scroll que lleguen a partir de ahora
  const claveActual = useRef(key);
  // La reposición en curso. Lleva su propio número para que un bucle viejo se
  // dé cuenta de que ya no es el suyo y se calle
  const reposicion = useRef(null);
  const contador = useRef(0);

  // El navegador restaura por su cuenta, y lo hace mal en una SPA cuyo contenido
  // llega después: desactivarlo es lo que deja mandar a lo de aquí abajo
  useEffect(() => {
    if (!('scrollRestoration' in globalThis.history)) return undefined;
    const previo = globalThis.history.scrollRestoration;
    globalThis.history.scrollRestoration = 'manual';
    return () => {
      globalThis.history.scrollRestoration = previo;
    };
  }, []);

  // Mientras se mira una pantalla se va apuntando dónde queda su scroll, en
  // continuo. Apuntarlo al navegar es TARDE: la pantalla que se deja se desmonta,
  // el documento se encoge y el navegador recorta el scroll a 0 antes de que
  // corra nada nuestro, así que lo que se guardaba era ese 0.
  //
  // Bajo qué entrada se apunta lo decide `claveActual`, que se cambia en el
  // layout effect, o sea antes de que llegue ningún scroll de la pantalla nueva:
  // en un efecto pasivo llegaba tarde y la posición acababa en la entrada
  // equivocada.
  useEffect(() => {
    const apunta = () => {
      if (!reposicion.current) posiciones.current.set(claveActual.current, window.scrollY);
    };
    window.addEventListener('scroll', apunta, { passive: true });
    return () => window.removeEventListener('scroll', apunta);
  }, []);

  useLayoutEffect(() => {
    const previo = anterior.current;
    // Mismo sitio que en el render anterior: la primera carga, o un render que no
    // viene de navegar. Ahí no hay nada que hacer
    if (previo.key === key) return;

    // A partir de aquí, los scroll que lleguen son de la pantalla nueva. La
    // posición de la que se deja ya está apuntada: la fue guardando el listener
    // mientras se miraba, que es el único momento en que ese número es cierto
    claveActual.current = key;
    anterior.current = { pathname, search, key };

    // Lo que hubiera en marcha ya no vale: sin esto, el bucle de la pantalla
    // anterior seguía vivo y la tiraba a SU posición en cuanto esta crecía
    if (reposicion.current) {
      window.cancelAnimationFrame(reposicion.current.fotograma);
      reposicion.current = null;
    }

    // Filtrar una lista no es cambiar de pantalla
    const soloCambiaElQuery = previo.pathname === pathname && previo.search !== search;
    if (soloCambiaElQuery) return;

    if (tipoDeNavegacion !== 'POP') {
      window.scrollTo(0, 0);
      return;
    }

    // Sin posición guardada, o guardada arriba, se va arriba. Quedarse quieto
    // dejaría la pantalla con el scroll de la anterior, que es el defecto de
    // partida colándose por la puerta de atrás
    const destino = posiciones.current.get(key) ?? 0;
    if (destino <= 0) {
      window.scrollTo(0, 0);
      return;
    }

    const numero = ++contador.current;
    const limite = globalThis.performance.now() + ESPERA_MAXIMA_MS;

    const repone = () => {
      const tarea = reposicion.current;
      if (!tarea || tarea.numero !== numero) return;

      const tope = document.documentElement.scrollHeight - window.innerHeight;
      if (tope >= destino) {
        reposicion.current = null;
        window.scrollTo(0, destino);
        return;
      }
      if (globalThis.performance.now() < limite) {
        tarea.fotograma = window.requestAnimationFrame(repone);
        return;
      }
      // Se acabó la espera: la pantalla ya no da para tanto (una lista que ahora
      // tiene menos elementos). Se baja lo que se pueda en vez de no hacer nada
      reposicion.current = null;
      window.scrollTo(0, Math.max(0, Math.min(destino, tope)));
    };

    reposicion.current = { numero, fotograma: 0 };
    repone();
  }, [pathname, search, key, tipoDeNavegacion]);

  // Al desmontar no puede quedar un bucle suelto
  useEffect(() => () => {
    if (reposicion.current) {
      window.cancelAnimationFrame(reposicion.current.fotograma);
      reposicion.current = null;
    }
  }, []);
}

export default useVolverArriba;
