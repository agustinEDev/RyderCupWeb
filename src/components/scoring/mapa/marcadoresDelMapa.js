import { Marker } from 'maplibre-gl';
import { distanciaEnMetros } from '../../../domain/services/distanciasAlGreen';
import { enMedio, lngLat } from './geometriaDelMapa';

// Los elementos de los marcadores del mapa del hoyo: los puntos y las cifras

export const punto = (clase) => {
  const el = globalThis.document.createElement('div');
  el.className = clase;
  return el;
};

// La cifra de un tramo: amarilla la de medir, blanca la de la línea del hoyo
export const etiqueta = (tipo, color) => {
  const el = punto(
    `rounded-md bg-gray-950/85 px-1.5 py-0.5 font-mono text-sm font-bold shadow ${color}`,
  );
  el.dataset.tramo = tipo;
  // Las de la línea, el lector las lee juntas en una frase (más abajo)
  if (tipo === 'linea') el.setAttribute('aria-hidden', 'true');
  return el;
};
// Las cifras de unos tramos, sobre las que ya había: se mueven y se reescriben,
// no se rehacen (con cada lectura del GPS, o con el dedo al arrastrar)
export const sincronizarCifras = (
  mapa,
  etiquetas,
  tramos,
  { tipo, color, texto, donde = enMedio },
) => {
  while (etiquetas.length > tramos.length) etiquetas.pop().remove();
  tramos.forEach(([a, b], i) => {
    etiquetas[i] ??= new Marker({ element: etiqueta(tipo, color) })
      .setLngLat(lngLat(donde(a, b)))
      .addTo(mapa);
    etiquetas[i].setLngLat(lngLat(donde(a, b)));
    etiquetas[i].getElement().textContent = texto(distanciaEnMetros(a, b));
  });
};
// Los puntos que se arrastran: la salida, los codos y el green
export const CLASE_DEL_PUNTO = {
  salida:
    'h-5 w-5 rounded-full border-[3px] border-gray-900 bg-white shadow z-[2]',
  codo: 'h-5 w-5 rounded-full border-[3px] border-white bg-gray-900/70 shadow z-[2]',
  green:
    'h-5 w-5 rounded-full border-[3px] border-white bg-yellow-400 shadow z-[2]',
};
