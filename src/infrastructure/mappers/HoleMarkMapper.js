/**
 * Las marcas de hoyo del jugador entre la API y el dominio (BE #532, PR C).
 *
 * La API nombra los puntos (`{ latitude, longitude }`) en vez de usar el orden
 * de GeoJSON; aquí pasan a `{ lat, lon }`, como el resto de la app. `markedAt`
 * es cuándo marcó el jugador, en ISO con zona: con ella el servidor se queda
 * con la más reciente aunque llegue antes otra que esperaba en la cola.
 */

const aDominio = (p) => ({ lat: p.latitude, lon: p.longitude });
const aApi = (p) => ({ latitude: p.lat, longitude: p.lon });

class HoleMarkMapper {
  static toDomain(api) {
    return {
      holeNumber: api.hole_number,
      tee: api.tee ? aDominio(api.tee) : null,
      bends: (api.bends ?? []).map(aDominio),
      greenCenter: aDominio(api.green_center),
      markedAt: api.marked_at,
    };
  }

  static toApi(marca) {
    return {
      tee: marca.tee ? aApi(marca.tee) : null,
      bends: marca.bends.map(aApi),
      green_center: aApi(marca.greenCenter),
      marked_at: marca.markedAt,
    };
  }
}

export default HoleMarkMapper;
