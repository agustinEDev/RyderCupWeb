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
 * @param {'verde'|'blanco'|'auto'} tinta - Cual de las dos se pinta. `auto` la
 *        elige segun la aplicacion este instalada o no, con una media query: lo
 *        necesita la pantalla de espera, que va sobre verde instalada y sobre
 *        blanco en el navegador, y eso no se sabe al escribir la prop.
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
  if (import.meta.env.DEV && tinta !== 'auto' && !FUENTES[tinta]) {
    console.warn(`BrandMark: tinta desconocida "${tinta}"; se pinta la verde. Use "verde" o "blanco".`);
  }

  if (tinta === 'auto') {
    return (
      <picture>
        <source media="(display-mode: standalone)" srcSet={FUENTES.blanco} />
        <img
          src={FUENTES.verde}
          className={`${className} object-contain`}
          alt={title || ''}
          aria-hidden={title ? undefined : 'true'}
          draggable="false"
        />
      </picture>
    );
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
