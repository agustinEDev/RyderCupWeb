/**
 * El orden en que se leen las tarjetas de una partida (FE #550).
 *
 * La tarjeta se mira de pie en el tee y con una mano: la fila que se busca es
 * siempre la propia, y hasta ahora había que cazarla entre las demás porque el
 * orden venía del servidor —equipo A y luego B en competición, orden de alta en
 * partida rápida— y lo propio solo se teñía de azul.
 *
 * Aquí se ordena SOLO la lista que se pinta. La posición dentro de
 * `participants` / `players` significa cosas —`sideCardHolder` guarda la bola
 * del bando a nombre del primero, y el reparto de golpes toma `[0]` y `[1]` como
 * bandos A y B cuando no hay `team`—, así que esas listas no se tocan: mover una
 * fila de sitio no puede cambiar a nombre de quién se anota un golpe.
 */

/**
 * Devuelve la lista con la fila del visor delante, y detrás la de su bando.
 *
 * El desempate es la posición original, así que lo que no sube conserva su orden
 * relativo: la lista no se reordena, solo se saca de ella lo propio.
 *
 * Si el visor no juega esa partida —un espectador, quien organiza la
 * competición— no hay fila propia que subir y la lista se devuelve tal cual. Esa
 * es la razón de devolver el mismo array y no una copia: sin jugador dentro, no
 * hay nada que decidir.
 *
 * @param {Array<Object>} filas Lista ya derivada que se va a pintar
 * @param {Object} accesores
 * @param {(fila: Object) => boolean} accesores.esMia
 * @param {(fila: Object) => string|null|undefined} [accesores.equipoDe] Bando de
 *   la fila. Sin él —o sin bandos en la partida— solo sube la fila propia.
 * @returns {Array<Object>}
 */
export const conLaMiaPrimero = (filas = [], { esMia, equipoDe } = {}) => {
  if (typeof esMia !== 'function') return filas;

  const posicionPropia = filas.findIndex(esMia);
  if (posicionPropia === -1) return filas;

  // Sin bando no hay pareja a la que arrastrar: en una partida libre o en
  // individuales, `equipoDe` devuelve nulo y el rango 1 no lo alcanza nadie.
  const miBando = typeof equipoDe === 'function' ? equipoDe(filas[posicionPropia]) : null;

  const rango = (fila, posicion) => {
    if (posicion === posicionPropia) return 0;
    if (miBando && equipoDe(fila) === miBando) return 1;
    return 2;
  };

  return filas
    .map((fila, posicion) => ({ fila, posicion, rango: rango(fila, posicion) }))
    .sort((a, b) => a.rango - b.rango || a.posicion - b.posicion)
    .map(({ fila }) => fila);
};

/**
 * Los miembros de un bando con el visor delante, para ESCRIBIR EL NOMBRE.
 *
 * En foursomes la pareja comparte bola y ocupa una sola fila, así que subir el
 * bando no basta para que el visor se lea a sí mismo primero: lo que hay que
 * ordenar es la etiqueta. Y solo la etiqueta —el array de miembros sigue igual—
 * porque de él salen el dueño de la bola (`sideCardHolder`), la barra que se
 * pinta y el hándicap del bando.
 *
 * @param {Array<Object>} miembros
 * @param {(miembro: Object) => boolean} esMio
 * @returns {Array<Object>} Copia ordenada, solo para componer el texto
 */
export const conMiNombrePrimero = (miembros = [], esMio) => {
  const posicionPropia = typeof esMio === 'function' ? miembros.findIndex(esMio) : -1;

  // Copia SIEMPRE, también cuando no hay nada que mover: quien reciba esto
  // espera poder ordenarlo, y devolver el array de miembros de la tarjeta
  // dejaría que una ordenación en sitio cambiara al dueño de la bola.
  if (posicionPropia <= 0) return [...miembros];

  return [
    miembros[posicionPropia],
    ...miembros.filter((_, posicion) => posicion !== posicionPropia),
  ];
};
