/**
 * Las muestras de hoyo entre la API y el dominio (BE #532, marcado por par).
 *
 * Son anónimas y van por hoyo (BE #575, 17 oct: una referencia por hoyo): el
 * servidor no dice de quién es cada una, solo, por hoyo, su primera muestra
 * completa, el green de su primera muestra solo green y si aún recoge. La API
 * nombra los puntos (`{ latitude, longitude }`); aquí pasan a `{ lat, lon }`,
 * como el resto de la app. La lista por barra que aún manda (`tees`) es para
 * los móviles de antes y no se lee.
 *
 * Lo que no se sabe de un hoyo es «sin muestra y recogiendo»: así no se deja
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

const hoyoADominio = (hoyo) => ({
  // La que guardó el admin (BE #575): la referencia del hoyo, antes que nada
  guardada: primeraADominio(hoyo.saved_line),
  primera: primeraADominio(hoyo.first_sample),
  green: esPunto(hoyo.first_green) ? aDominio(hoyo.first_green) : null,
  recoge: hoyo.collecting !== false,
});

class HoleSampleMapper {
  /** @returns {Object<number, {guardada: Object|null, primera: Object|null, green: Object|null, recoge: boolean}>} por número de hoyo */
  static toDomain(api) {
    if (!Array.isArray(api)) return {};
    return Object.fromEntries(
      api.filter((hoyo) => Number.isInteger(hoyo?.hole_number)).map((hoyo) => [hoyo.hole_number, hoyoADominio(hoyo)]),
    );
  }

  /** Un reporte de hoyo (entrega 7): el motivo y la línea que propone el jugador. */
  static reportToApi(reporte) {
    return {
      id: reporte.id,
      reason: reporte.reason,
      tee: aApi(reporte.tee),
      bends: (reporte.bends ?? []).map(aApi),
      green_center: aApi(reporte.greenCenter),
    };
  }

  static toApi(muestra) {
    return {
      id: muestra.id,
      tee_color: muestra.barra.color,
      tee_gender: muestra.barra.gender ?? null,
      // Sin salida, una solo green (17 oct): tampoco lleva codos
      tee: muestra.tee ? aApi(muestra.tee) : null,
      bends: (muestra.bends ?? []).map(aApi),
      green_center: aApi(muestra.greenCenter),
    };
  }
}

export default HoleSampleMapper;
