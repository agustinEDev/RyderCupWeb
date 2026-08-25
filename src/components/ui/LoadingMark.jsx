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
const MEDIDAS = {
  grande: { marco: 'size-32', anillo: 'border-[3px]', marca: 'w-[76px]' },
  pequeno: { marco: 'size-16', anillo: 'border-2', marca: 'w-[38px]' },
};

const LoadingMark = ({ tamano = 'grande', tinta = 'auto' }) => {
  const medida = MEDIDAS[tamano] ?? MEDIDAS.grande;

  return (
    <div className={`relative grid place-items-center ${medida.marco}`}>
      {/* `motion-reduce`: quien pide menos movimiento se queda con la marca y el
          texto, que ya dicen que se esta esperando */}
      <span
        aria-hidden="true"
        className={`espera-anillo absolute inset-0 rounded-full ${medida.anillo} animate-spin motion-reduce:animate-none`}
      />
      <BrandMark tinta={tinta} className={medida.marca} />
    </div>
  );
};

export default LoadingMark;
