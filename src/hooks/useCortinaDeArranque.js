import { useLayoutEffect, useState } from 'react';
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
  // La ruta anterior en ESTADO y comparada durante el render, no en un `ref`
  // dentro del efecto. Los efectos de este componente corren DESPUES de que
  // hayan renderizado las rutas que cuelgan de el, asi que marcar ahi el fin del
  // arranque llegaba tarde: la pantalla de destino ya habia decidido su cara y
  // pintaba el verde del arranque a media sesion, que es justo el defecto de
  // FE #492. Ajustar estado durante el render es el patron que React documenta
  // para esto: descarta este render y rehace el componente antes de pintar.
  const [rutaAnterior, setRutaAnterior] = useState(pathname);

  if (rutaAnterior !== pathname) {
    setRutaAnterior(pathname);

    // El arranque se consuma en la primera navegacion que ocurre con la cortina
    // ya fuera: eso solo pasa moviendose por la aplicacion. Los tramos del
    // propio arranque —`/start` al panel, el panel al formulario— pasan con la
    // cortina PUESTA, asi que no cuentan.
    if (!laCortinaSiguePuesta()) {
      terminaElArranque();
    }
  }

  useLayoutEffect(() => {
    if (rutaQueAvisa(pathname)) {
      esperaElAviso();
    } else {
      retiraLaCortina();
    }
  }, [pathname]);
};
