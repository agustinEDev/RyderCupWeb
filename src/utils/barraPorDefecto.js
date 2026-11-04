import { NO_TEE_KEY, teeKey } from '../components/quick_match/createQuickMatchModalConstants';
import TeeColor from '../domain/value_objects/TeeColor';

/**
 * La barra que sale elegida y las que se ven al crear una partida rápida
 * (FE #1025, decidido con Agustín el 3 nov 2026).
 *
 * Una barra sin género es mixta: vale para todos.
 */

// La habitual de cada género: amarillas los hombres y rojas las mujeres
const COLOR_HABITUAL = { MALE: TeeColor.YELLOW, FEMALE: TeeColor.RED };

const delGenero = (tee, genero) => (tee.gender ?? null) === genero || (tee.gender ?? null) === null;

/**
 * @param {Object} opciones
 * @param {Array} opciones.tees Las barras del campo
 * @param {'MALE'|'FEMALE'|null} opciones.genero El de quien juega
 * @param {string|null} opciones.ultima La que llevó la última vez en ese campo
 * @returns {string} La clave de la barra, o `NO_TEE_KEY`
 */
export const barraPorDefecto = ({ tees, genero, ultima }) => {
  if (!tees?.length) return NO_TEE_KEY;
  const claves = new Set(tees.map((t) => teeKey(t.color, t.gender)));
  if (ultima && claves.has(ultima)) return ultima;
  const color = COLOR_HABITUAL[genero];
  if (!color) return NO_TEE_KEY;
  const suya = tees.find((t) => t.color === color && t.gender === genero);
  const mixta = tees.find((t) => t.color === color && (t.gender ?? null) === null);
  const habitual = suya ?? mixta;
  return habitual ? teeKey(habitual.color, habitual.gender) : NO_TEE_KEY;
};

/**
 * La barra que llevó cada jugador registrado la última vez que jugó en ese
 * campo, de las partidas rápidas de quien crea la nueva. El asistente ya las
 * pide solo de ese campo (BE, 4 nov 2026); filtrar aquí también protege de un
 * servidor anterior, que ignora el filtro y manda las de cualquier campo.
 *
 * @param {Array|null} partidas Sus partidas rápidas
 * @param {string} golfCourseId
 * @returns {Map<string, string>} userId → clave de la barra
 */
export const ultimasBarras = (partidas, golfCourseId) => {
  const ultimas = new Map();
  const cuando = (p) => new Date(p.playedAt ?? p.createdAt ?? 0).getTime();
  const enEseCampo = (partidas ?? [])
    .filter((p) => p.golfCourseId === golfCourseId)
    .sort((a, b) => cuando(b) - cuando(a));
  for (const partida of enEseCampo) {
    for (const p of partida.participants ?? []) {
      if (p.isGuest || !p.userId || !p.color || ultimas.has(p.userId)) continue;
      ultimas.set(p.userId, teeKey(p.color, p.teeGender));
    }
  }
  return ultimas;
};

/**
 * Las barras que se ven como botones: las de tu género y las mixtas. Las del
 * otro género, en «Otras»: con botones planos se elegía la equivocada sin
 * notarlo, y la diferencia vale varios golpes (por eso existe el panel).
 * Sin género conocido no se filtra nada: va el panel de siempre.
 *
 * @returns {Array|null}
 */
export const barrasDeMiGenero = (tees, genero) =>
  genero ? (tees ?? []).filter((t) => delGenero(t, genero)) : null;
