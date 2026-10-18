/**
 * Lo que lee y manda el admin para revisar los hoyos (BE #575, 17 oct 2026):
 * una línea de referencia por hoyo, a partir de las muestras. La API nombra los
 * puntos (`{ latitude, longitude }`); aquí pasan a `{ lat, lon }`.
 */

const aDominio = (p) => (p ? { lat: p.latitude, lon: p.longitude } : null);
const aApi = (p) => ({ latitude: p.lat, longitude: p.lon });

const lineaADominio = (linea) =>
  linea ? { tee: aDominio(linea.tee), bends: (linea.bends ?? []).map(aDominio), greenCenter: aDominio(linea.green_center) } : null;

class HoleReviewMapper {
  /** @returns {{golfCourseId: string, name: string, holes: {holeNumber: number, samples: number}[]}[]} */
  static listToDomain(api) {
    return (api?.courses ?? []).map((curso) => ({
      golfCourseId: curso.golf_course_id,
      name: curso.name,
      // Solo llegan los pendientes: el `saved` de la API es siempre false (17 oct)
      // Con reportes abiertos, un hoyo también está pendiente (entrega 7)
      holes: (curso.holes ?? []).map((h) => ({ holeNumber: h.hole_number, samples: h.samples, reports: h.reports ?? 0 })),
    }));
  }

  static reviewToDomain(api) {
    return {
      golfCourseId: api.golf_course_id,
      name: api.name,
      // Para marcar un hoyo sin nada, el mapa parte del campo (17 oct)
      ubicacion: api.location ? aDominio(api.location) : null,
      holes: (api.holes ?? []).map((h) => ({
        holeNumber: h.hole_number,
        guardada: lineaADominio(h.saved_line),
        // La del mapa de OSM aprobado, entera (17 oct): se ve y se parte de ella
        osm: h.osm_line ? { puntos: (h.osm_line.points ?? []).map(aDominio), green: h.osm_line.green_center ? aDominio(h.osm_line.green_center) : null } : null,
        muestras: (h.samples ?? []).map((m) => ({
          id: m.id,
          barra: { color: m.tee_color, gender: m.tee_gender ?? null },
          tee: aDominio(m.tee),
          bends: (m.bends ?? []).map(aDominio),
          greenCenter: aDominio(m.green_center),
          llego: m.received_on,
        })),
        barras: (h.tees ?? []).map((t) => ({
          color: t.tee_color,
          gender: t.tee_gender ?? null,
          identifier: t.identifier ?? null,
          par: t.par,
          metros: t.meters ?? null,
        })),
        // Los reportes de los jugadores (entrega 7): el motivo y la línea que proponen
        reportes: (h.reports ?? []).map((r) => ({
          id: r.id,
          motivo: r.reason,
          tee: aDominio(r.tee),
          bends: (r.bends ?? []).map(aDominio),
          greenCenter: aDominio(r.green_center),
          llego: r.received_on,
        })),
      })),
    };
  }

  static lineToApi(linea) {
    return { tee: aApi(linea.tee), bends: (linea.bends ?? []).map(aApi), green_center: aApi(linea.greenCenter) };
  }
}

export default HoleReviewMapper;
