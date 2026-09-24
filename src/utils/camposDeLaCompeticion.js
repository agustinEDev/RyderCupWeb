/**
 * Los campos de una competición, de la respuesta de la API a la pantalla.
 *
 * Una sola lectura para la ficha, el alta, el calendario y la agenda (FE #654):
 * eran cuatro copias y ya diferían. El id es SIEMPRE el del campo —el de la
 * fila que une campo y competición no sirve para nada en la pantalla—, y una
 * entrada sin él se descarta en vez de inventarlo.
 *
 * @param {Array|{golf_courses: Array}|null|undefined} resultado
 * @returns {Array<{id: string, name: string, approvalStatus: string, countryCode: string|null}>}
 */
export const aCamposDeLaCompeticion = (resultado) => {
  const lista = Array.isArray(resultado) ? resultado : resultado?.golf_courses || [];
  return lista
    .map((item) => ({
      id: item.golf_course?.id || item.golf_course_id,
      name: item.golf_course?.name || item.name || '',
      approvalStatus: item.golf_course?.approval_status || item.approval_status || 'APPROVED',
      countryCode: item.golf_course?.country_code || item.country_code || null,
    }))
    .filter((campo) => campo.id);
};
