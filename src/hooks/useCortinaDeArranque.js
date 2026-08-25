import { useLayoutEffect } from 'react';
import { rutaQueAvisa, esperaElAviso, retiraLaCortina } from '../utils/cortinaDeArranque';

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
  useLayoutEffect(() => {
    if (rutaQueAvisa(pathname)) {
      esperaElAviso();
    } else {
      retiraLaCortina();
    }
  }, [pathname]);
};
