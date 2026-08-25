import LoadingMark from './LoadingMark';

/**
 * La espera de un bloque dentro de una pagina ya pintada (FE #495).
 *
 * El mismo dibujo que la de pantalla completa, en pequeño: antes cada seccion
 * ponia el suyo —un circulo CSS aqui, el icono `Loader` de lucide alla— para el
 * mismo trabajo.
 *
 * No ocupa la pantalla entera a proposito: lo que rodea al bloque ya esta en
 * pantalla, y vaciarlo para enseñar una espera seria peor que la espera.
 *
 * Siempre en la tinta verde: estas esperas viven sobre el fondo claro de la
 * aplicacion, nunca sobre el verde del arranque.
 */
const BlockLoader = ({ texto, sinRelleno = false }) => (
  <div
    role="status"
    aria-live="polite"
    className={`flex flex-col items-center justify-center gap-3 ${sinRelleno ? '' : 'py-12'}`}
  >
    <LoadingMark tamano="pequeno" tinta="verde" />
    {/* Sin texto visible, la region seguiria anunciandose VACIA: el anillo va
        `aria-hidden` y el monograma es decorativo. Un lector de pantalla se
        encontraba con que algo cambia y nada que leer. */}
    {texto ? <p className="text-gray-600">{texto}</p> : <span className="sr-only">Cargando...</span>}
  </div>
);

export default BlockLoader;
