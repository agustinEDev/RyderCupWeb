/**
 * El mapa de hoyos de la API (GeoJSON) al del dominio (BE #532).
 *
 * GeoJSON pone la longitud ANTES que la latitud; aquí todo pasa a `{ lat, lon }`,
 * como el resto de la app. Un green sin alguno de sus tres puntos cuenta como
 * sin green: con medio green no hay distancias que dar.
 */

const punto = ([lon, lat]) => ({ lat, lon });

class HoleMapMapper {
  static toDomain(api) {
    const holes = {};
    const hoyo = (n) => {
      holes[n] ??= { playLine: [], green: null, puntos: {} };
      return holes[n];
    };
    for (const feature of api.geojson?.features ?? []) {
      const { hole, kind } = feature.properties ?? {};
      if (!hole) continue;
      if (kind === 'play_line') hoyo(hole).playLine = feature.geometry.coordinates.map(punto);
      else if (kind === 'green_front' || kind === 'green_center' || kind === 'green_back') {
        hoyo(hole).puntos[kind] = punto(feature.geometry.coordinates);
      }
    }
    for (const datos of Object.values(holes)) {
      const { green_front: front, green_center: center, green_back: back } = datos.puntos;
      datos.green = front && center && back ? { front, center, back } : null;
      delete datos.puntos;
    }
    return {
      golfCourseId: api.golf_course_id,
      version: api.version,
      attribution: api.attribution ?? null,
      holes,
    };
  }
}

export default HoleMapMapper;
