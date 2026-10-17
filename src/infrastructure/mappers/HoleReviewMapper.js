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
      holes: (curso.holes ?? []).map((h) => ({ holeNumber: h.hole_number, samples: h.samples })),
    }));
  }

  static reviewToDomain(api) {
    return {
      golfCourseId: api.golf_course_id,
      name: api.name,
      holes: (api.holes ?? []).map((h) => ({
        holeNumber: h.hole_number,
        guardada: lineaADominio(h.saved_line),
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
      })),
    };
  }

  static lineToApi(linea) {
    return { tee: aApi(linea.tee), bends: (linea.bends ?? []).map(aApi), green_center: aApi(linea.greenCenter) };
  }
}

export default HoleReviewMapper;
