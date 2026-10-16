/**
 * Las muestras de hoyo entre la API y el dominio (BE #532, marcado por par).
 *
 * Son anónimas y por barra (color y género): el servidor no dice de quién es
 * cada una, solo, por hoyo, las barras que tienen muestras (la más antigua
 * primero), con la primera que le llegó de cada una y si aún recoge más. La
 * API nombra los puntos (`{ latitude, longitude }`); aquí pasan a
 * `{ lat, lon }`, como el resto de la app.
 *
 * Lo que no se sabe de una barra es «sin primera y recogiendo»: así no se deja
 * de recoger por un dato roto. La que se envía lleva su `id`, que pone el
 * móvil: con él, un reintento cuenta una sola vez.
 */

const esPunto = (p) => Boolean(p) && Number.isFinite(p.latitude) && Number.isFinite(p.longitude);
const aDominio = (p) => ({ lat: p.latitude, lon: p.longitude });
const aApi = (p) => ({ latitude: p.lat, longitude: p.lon });

// Sin salida o sin green no se puede dibujar el hoyo, y el servidor no guarda
// una así: si llega, es que algo se rompió por el camino
const primeraADominio = (muestra) => {
  if (!esPunto(muestra?.tee) || !esPunto(muestra?.green_center)) return null;
  return {
    tee: aDominio(muestra.tee),
    bends: (Array.isArray(muestra.bends) ? muestra.bends : []).filter(esPunto).map(aDominio),
    greenCenter: aDominio(muestra.green_center),
  };
};

const barraADominio = (barra) => ({
  color: barra.tee_color,
  gender: barra.tee_gender ?? null,
  primera: primeraADominio(barra.first_sample),
  recoge: barra.collecting !== false,
});

class HoleSampleMapper {
  /** @returns {Object<number, {color: string, gender: string|null, primera: Object|null, recoge: boolean}[]>} por número de hoyo */
  static toDomain(api) {
    if (!Array.isArray(api)) return {};
    return Object.fromEntries(
      api
        .filter((hoyo) => Number.isInteger(hoyo?.hole_number))
        .map((hoyo) => [
          hoyo.hole_number,
          (Array.isArray(hoyo.tees) ? hoyo.tees : []).filter((barra) => Boolean(barra?.tee_color)).map(barraADominio),
        ]),
    );
  }

  static toApi(muestra) {
    return {
      id: muestra.id,
      tee_color: muestra.barra.color,
      tee_gender: muestra.barra.gender ?? null,
      tee: aApi(muestra.tee),
      bends: (muestra.bends ?? []).map(aApi),
      green_center: aApi(muestra.greenCenter),
    };
  }
}

export default HoleSampleMapper;
