import { useState } from 'react';
import BrandMark from './BrandMark';

/**
 * La marca dentro de su anillo de carga: el dibujo UNICO de las esperas de la
 * aplicacion (FE #495).
 *
 * Habia cinco dibujos distintos —el monograma suelto, un «Loading...» gris, un
 * circulo CSS, el icono `Loader` de lucide y su version dentro del contenido—,
 * asi que moverse por la aplicacion era ver cambiar la imagen a cada paso. Que
 * es exactamente lo que se percibia como parpadeo en el arranque: no son los
 * cortes, es que el dibujo cambia.
 *
 * El monograma NO gira, gira el anillo. Y el anillo va holgado a proposito: el
 * monograma trae su propio circulo, y pegados se leen como un doble borde en
 * vez de como una cosa dentro de otra.
 *
 * Las tintas —blanca sobre el verde del arranque, verde sobre fondo claro— las
 * decide `index.css` junto al resto de la pantalla, que es donde ya vive esa
 * distincion. Aqui solo se elige el tamaño.
 */
/* En pixeles y no en `size-32`, que son 8rem: la capa de `index.html` mide en
   pixeles, y en un navegador con la fuente base en 20px una mitad mediria 128 y
   la otra 160. El monograma daria un salto justo en el relevo, que es el
   fotograma del que va toda esta historia. */
const MEDIDAS = {
  grande: { marco: 'w-[128px] h-[128px]', anillo: 'border-[3px]', marca: 'w-[76px]' },
  pequeno: { marco: 'w-[64px] h-[64px]', anillo: 'border-2', marca: 'w-[38px]' },
};

const LoadingMark = ({ tamano = 'grande', tinta = 'auto' }) => {
  const medida = MEDIDAS[tamano] ?? MEDIDAS.grande;

  // La MISMA fase que el anillo de la capa de `index.html`, no solo la misma
  // velocidad. El reloj de una animacion CSS empieza cuando nace su elemento:
  // el de la capa lleva girando desde el primer pintado y este nace al montar
  // React, cientos de milisegundos despues, asi que en el relevo el arco
  // saltaba a otro angulo. Con un retraso negativo arranca donde estaria si
  // llevara girando desde el principio. Se calcula una vez, al montar: en cada
  // render cambiaria el desfase y el anillo daria tirones.
  const [desfase] = useState(() => -(globalThis.performance.now() % 1000));

  return (
    <div className={`relative grid place-items-center ${medida.marco}`}>
      {/* `motion-reduce`: quien pide menos movimiento se queda con la marca y el
          texto, que ya dicen que se esta esperando */}
      <span
        aria-hidden="true"
        className={`espera-anillo absolute inset-0 rounded-full ${medida.anillo} animate-spin motion-reduce:animate-none`}
        style={{ animationDelay: `${desfase}ms` }}
      />
      <BrandMark tinta={tinta} className={medida.marca} />
    </div>
  );
};

export default LoadingMark;
