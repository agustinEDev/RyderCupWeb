import { useLayoutEffect, useRef } from 'react';
import {
  rutaQueAvisa,
  esperaElAviso,
  retiraLaCortina,
  terminaElArranque,
  laCortinaSiguePuesta,
} from '../utils/cortinaDeArranque';

/**
 * Decide, en cada cambio de ruta, si la cortina del arranque se queda o se
 * levanta (FE #485).
 *
 * Con `useLayoutEffect` porque corre cuando React YA ha puesto su contenido en
 * el DOM y ANTES de que el navegador pinte: el relevo ocurre en el mismo
 * fotograma y no se ve. Quitar la capa justo despues de pedir el render —que es
 * lo que se hacia— la retiraba antes de que hubiera nada debajo, y se veia el
 * fondo blanco de la pagina hasta que React llegaba: ese era el pantallazo.
 *
 * Mira la RUTA y no quien monte: este defecto volvio cuatro veces con caras
 * distintas y las cuatro eran lo mismo, un resultado que dependia del orden de
 * montaje. Como cada redireccion vuelve a pasar por aqui, ninguna pantalla se
 * queda esperando un aviso que nadie manda.
 */
export const useCortinaDeArranque = (pathname) => {
  const rutaAnterior = useRef(null);

  useLayoutEffect(() => {
    // El arranque se da por consumado en la primera navegacion que ocurre con
    // la cortina ya fuera: eso solo pasa moviendose por la aplicacion (FE #492).
    //
    // Ni antes ni por otro camino. Llegar a una ruta que no avisa NO basta:
    // `/login`, `/register` y la vuelta de Google siguen pintando la espera a
    // pantalla completa mientras resuelven, igual que el `Suspense` de
    // cualquier enlace profundo, y eso todavia es el arranque —la aplicacion
    // acaba de abrirse—. Darlo por terminado alli cortaba el verde a media
    // espera. Y los tramos del propio arranque —`/start` al panel, el panel al
    // formulario— pasan con la cortina PUESTA, asi que no cuentan.
    const veniaDeOtraRuta = rutaAnterior.current !== null && rutaAnterior.current !== pathname;
    if (veniaDeOtraRuta && !laCortinaSiguePuesta()) {
      terminaElArranque();
    }
    rutaAnterior.current = pathname;

    if (rutaQueAvisa(pathname)) {
      esperaElAviso();
    } else {
      retiraLaCortina();
    }
  }, [pathname]);
};
