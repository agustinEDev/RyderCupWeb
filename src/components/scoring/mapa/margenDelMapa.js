// Lo que tapan la cabecera y el panel de abajo, según el alto de la pantalla:
// fijo, en apaisado (~360 px) no cabía el hoyo y MapLibre no lo encuadraba.
// Abajo caben la ayuda, «Marcar hoyo», el recuadro de distancias y los
// botones: con menos, la salida de un hoyo marcado quedaba debajo
export const margenDelEncuadre = (alto) => ({
  top: Math.round(Math.min(90, alto * 0.15)),
  bottom: Math.round(Math.min(320, alto * 0.45)),
  left: 40,
  right: 40,
});

// Lo que de verdad tapan la cabecera y el panel de abajo, medido, con un poco
// de aire: el hoyo, lo más grande que quepa sin cortarse (Agustín, 16 oct). Si
// no se puede medir (aún sin pintar) o no cabría nada (apaisado), los de siempre
const AIRE = 12;
// Los lados, con sitio para la muesca o las esquinas redondeadas (apaisado)
const LADOS = 40;
export const margenMedido = (contenedor, arriba, abajo) => {
  const alto = contenedor?.clientHeight || 640;
  const caja = contenedor?.getBoundingClientRect?.();
  const deArriba = arriba?.getBoundingClientRect?.();
  const deAbajo = abajo?.getBoundingClientRect?.();
  if (!caja?.height || !deArriba?.height || !deAbajo?.height) return margenDelEncuadre(alto);
  const top = Math.round(deArriba.bottom - caja.top + AIRE);
  const bottom = Math.round(caja.bottom - deAbajo.top + AIRE);
  return alto - top - bottom < 120 ? margenDelEncuadre(alto) : { top, bottom, left: LADOS, right: LADOS };
};
