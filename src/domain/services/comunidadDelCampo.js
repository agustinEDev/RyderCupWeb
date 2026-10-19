import { CONTORNOS } from './contornosDeComunidades';

/**
 * Las comunidades con ortofoto propia más reciente que la PNOA (19 oct): el
 * mapa del hoyo elige la de la comunidad donde cae el campo. Código ISO
 * 3166-2 (`ES-CT`, `ES-PV`, `ES-NC`), o null si no cae en ninguna.
 */

// Par/impar del rayo hacia el este: cruzar un número impar de bordes es estar dentro
const dentroDelAnillo = (lon, lat, anillo) => {
  let dentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i];
    const [xj, yj] = anillo[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
};

// Dentro del borde y fuera de sus huecos (el enclave de Treviño en Álava)
const dentroDelPoligono = (lon, lat, [borde, ...huecos]) =>
  dentroDelAnillo(lon, lat, borde) && !huecos.some((hueco) => dentroDelAnillo(lon, lat, hueco));

export const comunidadDelPunto = (punto) => {
  if (!punto) return null;
  const encontrada = Object.entries(CONTORNOS).find(([, poligonos]) =>
    poligonos.some((poligono) => dentroDelPoligono(punto.lon, punto.lat, poligono)),
  );
  return encontrada ? encontrada[0] : null;
};

/** La caja [oeste, sur, este, norte] de la comunidad: su ortofoto no se pide fuera. */
export const limitesDeLaComunidad = (codigo) => {
  const poligonos = CONTORNOS[codigo];
  if (!poligonos) return null;
  const puntos = poligonos.flatMap(([borde]) => borde);
  const lons = puntos.map(([lon]) => lon);
  const lats = puntos.map(([, lat]) => lat);
  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
};
