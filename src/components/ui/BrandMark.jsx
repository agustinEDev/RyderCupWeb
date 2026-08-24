/**
 * La marca, en un solo sitio. Estaba copiada como SVG suelto en cada pantalla
 * que la necesitaba, y una marca duplicada acaba divergiendo al primer retoque.
 *
 * Pinta el monograma, que es la marca de la aplicacion: el triangulo que habia
 * aqui antes convivia con el monograma de la cabecera, asi que la aplicacion
 * ensenaba dos marcas distintas segun la pantalla.
 *
 * Va en dos tintas porque el color no puede heredarse como en un SVG: `verde`
 * (#2d7b3e) sobre fondo claro y `blanco` sobre el panel oscuro de las pantallas
 * de autenticacion. Los PNG llevan transparencia; los JPEG originales no, y
 * sobre el panel oscuro habrian dejado un recuadro blanco.
 *
 * @param {string} className - Clases del elemento, normalmente el tamaño
 * @param {'verde'|'blanco'} tinta - Cual de las dos versiones se pinta
 * @param {string} title - Nombre accesible; omitir cuando es decorativa
 */
const FUENTES = {
  verde: '/images/rcf-monogram-green.png',
  blanco: '/images/rcf-monogram-white.png',
};

const BrandMark = ({ className = 'size-8', tinta = 'verde', title }) => {
  // Una tinta mal escrita pintaria el monograma verde sobre el panel verde
  // oscuro de las pantallas de autenticacion: casi invisible, y sin que fallen
  // ni el lint ni los tests. Es la divergencia silenciosa que este componente
  // viene a evitar, asi que al menos se avisa mientras se desarrolla.
  if (import.meta.env.DEV && !FUENTES[tinta]) {
    console.warn(`BrandMark: tinta desconocida "${tinta}"; se pinta la verde. Use "verde" o "blanco".`);
  }

  return (
  <img
    src={FUENTES[tinta] ?? FUENTES.verde}
    className={`${className} object-contain`}
    alt={title || ''}
    aria-hidden={title ? undefined : 'true'}
    draggable="false"
  />
  );
};

export default BrandMark;
