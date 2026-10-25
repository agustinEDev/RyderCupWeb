import { useLayoutEffect, useRef, useState } from 'react';
import { inicialesDe } from '../../utils/inicialesDe';

/**
 * Un nombre que, si no cabe en su casilla, se queda en sus iniciales (Agustín,
 * 24 oct 2026). Lo usa la fila «Resultado» de la tarjeta de torneo: con las
 * columnas fijas (FE #938), a 768 px cada hoyo deja ~47 px y «Maximiliano R.»
 * se montaba sobre el hoyo de al lado.
 *
 * Mide el nombre entero en una copia invisible contra el ancho de la casilla,
 * y vuelve a medir cuando la casilla cambia o llega la fuente. La caja recorta la copia: si no,
 * desbordaba la casilla y podía estirar el deslizamiento de la tarjeta. Sin
 * ResizeObserver no mide y se queda el nombre, como antes. Con las iniciales,
 * el nombre sigue en el `title` y para el lector de pantalla.
 */
const NombreQueCabe = ({ nombre }) => {
  const caja = useRef(null);
  const copia = useRef(null);
  const [cabe, setCabe] = useState(true);

  useLayoutEffect(() => {
    const Observador = globalThis.ResizeObserver;
    if (!Observador || !caja.current) return undefined;
    const medir = () => setCabe(copia.current.scrollWidth <= caja.current.clientWidth);
    medir();
    const observador = new Observador(medir);
    observador.observe(caja.current);
    // La primera medida puede ser con la fuente de reserva, más estrecha: al
    // llegar la de la app el nombre crece y la casilla no, así que el
    // observador no avisa
    let vivo = true;
    globalThis.document?.fonts?.ready?.then(() => {
      if (vivo) medir();
    });
    return () => {
      vivo = false;
      observador.disconnect();
    };
  }, [nombre]);

  return (
    <span ref={caja} data-medida="caja" className="relative block w-full overflow-hidden">
      <span ref={copia} data-medida="nombre" aria-hidden="true" className="invisible absolute whitespace-nowrap">
        {nombre}
      </span>
      <span data-testid="nombre-que-cabe" className="whitespace-nowrap">
        {cabe ? (
          nombre
        ) : (
          <>
            <span aria-hidden="true" title={nombre}>
              {inicialesDe(nombre)}
            </span>
            <span className="sr-only">{nombre}</span>
          </>
        )}
      </span>
    </span>
  );
};

export default NombreQueCabe;
