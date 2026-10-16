/**
 * Las muestras de hoyo entre la API y el dominio (BE #532, marcado por par).
 *
 * Son anónimas: el servidor no dice de quién es cada una, solo, por hoyo, la
 * primera que le llegó (la que se dibuja mientras no hay mapa) y si aún recoge
 * más. La API nombra los puntos (`{ latitude, longitude }`); aquí pasan a
 * `{ lat, lon }`, como el resto de la app.
 *
 * Lo que no se sabe de un hoyo es «sin primera y recogiendo»: es lo que da un
 * hoyo del que aún no ha llegado nada, y así no se deja de pedir por un dato
 * roto.
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

class HoleSampleMapper {
  /** @returns {Object<number, {primera: Object|null, recoge: boolean}>} por número de hoyo */
  static toDomain(api) {
    if (!Array.isArray(api)) return {};
    return Object.fromEntries(
      api
        .filter((hoyo) => Number.isInteger(hoyo?.hole_number))
        .map((hoyo) => [hoyo.hole_number, { primera: primeraADominio(hoyo.first_sample), recoge: hoyo.collecting !== false }]),
    );
  }

  static toApi(muestra) {
    return {
      tee: aApi(muestra.tee),
      bends: (muestra.bends ?? []).map(aApi),
      green_center: aApi(muestra.greenCenter),
    };
  }
}

export default HoleSampleMapper;
