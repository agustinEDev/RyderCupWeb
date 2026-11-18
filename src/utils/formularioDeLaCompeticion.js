import { CompetitionName } from '../domain/value_objects/CompetitionName';
import { validateCompetitionForm } from './competitionFormValidation';
import { CUPO_POR_DEFECTO } from './cupoDeJugadores';
import { formularioDeAjustes, separadorDecimal } from './ajustesDeStrokePlay';

/**
 * El formulario de crear o editar una competición: cómo nace, cómo se rellena
 * al editar y qué le pasa al cambiar de país. Sin React: lo usa la página.
 */

// Para preguntar «¿vale lo que está plegado?» hay que dar por buenos los campos
// de fuera: si no, el primer error de ellos taparía siempre al del plegable.
// El cupo y el modo de juego ya no están ahí dentro: subieron al formulario
export const FORMULARIO_MINIMO = {
  competitionName: 'x'.repeat(CompetitionName.MIN_LENGTH),
  startDate: '2026-01-01',
  endDate: '2026-01-02',
  country: { code: 'ES' },
  adjacentCountry1: '',
  adjacentCountry2: '',
  golfCourses: [{ countryCode: 'ES' }],
  numberOfPlayers: null,
};

// Los del nombre se dicen junto a su campo, no en el aviso de arriba
// (RyderCupAm#540): «nameTaken» es el 409 del servidor
export const ERRORES_DEL_NOMBRE = new Set([
  'nameRequired',
  'nameTooShort',
  'nameTooLong',
  'nameUnreadable',
  'nameTaken',
]);

// Los avisos que apuntan a un campo de «Más opciones»: si salta uno de estos,
// el plegable tiene que abrirse o el organizador no ve lo que le piden
export const ERRORES_DE_LAS_OPCIONES = new Set([
  'teamNamesRequired',
  'teamNamesTooShort',
  'teamNamesTooLong',
  'handicapLimitRange',
]);

// Un país de la API, con lo que usan los selectores; los que no traen código o
// nombre se descartan
export const aPaises = (data) =>
  Array.isArray(data)
    ? data
        .filter((c) => c?.code && (c?.name_en || c?.name_es))
        .map((c) => ({
          id: c.code,
          name: c.name_en || c.name_es,
          code: c.code,
          name_en: c.name_en,
          name_es: c.name_es,
        }))
    : [];

// Los que ofrece el tercer país: los del primer adyacente más los vecinos del
// adyacente, sin repetir y sin el principal ni el propio adyacente
export const vecinosDelSegundoNivel = (
  vecinosDelPrimero,
  vecinosDelAdyacente,
  mainCountryCode,
  adjacentCountry1Code,
) => {
  const existingIds = new Set(vecinosDelPrimero.map((c) => c.code));
  const combined = [...vecinosDelPrimero];
  for (const country of vecinosDelAdyacente) {
    if (
      !existingIds.has(country.code) &&
      country.code !== mainCountryCode &&
      country.code !== adjacentCountry1Code
    ) {
      combined.push(country);
    }
  }
  return combined;
};

/**
 * El formulario vacío del alta.
 *
 * @param {{uno: string, dos: string}} equipos los nombres por defecto de los
 *   equipos, en el idioma de la app
 */
export const formularioInicial = (equipos) => ({
  // Competition Details
  competitionName: '',
  // Si el organizador de un Stableford o un Medal juega (RyderCupAm#552): si
  // no, no queda inscrito. Lo normal es que sí
  organizerPlays: true,
  // Nacen en el idioma de la app: son texto libre del organizador, así que
  // traducirlos al pintar le cambiaría el nombre a quien llame a su equipo
  // «USA» a propósito
  teamOneName: equipos.uno,
  teamTwoName: equipos.dos,

  // Schedule
  startDate: '',
  endDate: '',

  // Location
  country: null,
  adjacentCountry1: '',
  adjacentCountry2: '',
  showAdjacentCountry1: false,
  showAdjacentCountry2: false,

  // Golf Courses (array of { countryCode, course })
  golfCourses: [],

  // RyderCup Settings
  playMode: 'HANDICAP',
  visibility: 'PRIVATE',
  numberOfPlayers: CUPO_POR_DEFECTO,
  // Cuánto monta la app por su cuenta (FE #695). Al crear se elige en su paso;
  // el reparto de equipos sale de él, así que ya no se pregunta aparte
  setupMode: null,
  tournamentType: null,
  maxPlayingHandicap: undefined,
  // Categorías, jornadas por jugador y general de un Stableford o un Medal
  // (FE #824); una Ryder no los usa ni los manda
  strokePlay: formularioDeAjustes(null),
});

/**
 * El formulario de una competición que se edita, con lo leído del servidor.
 * El mapper devuelve camelCase, no snake_case.
 *
 * @param {object} datos lo que devuelve la lectura para editar
 * @param {{equipos: {uno: string, dos: string}, idioma: string, allCountries: Array}} contexto
 */
export const formularioDeLaEdicion = (
  datos,
  { equipos, idioma, allCountries },
) => {
  const { competition } = datos;
  // Find main country object from allCountries
  const mainCountry = allCountries.find(
    (c) => c.code === datos.mainCountryCode,
  );
  return {
    competitionName: competition.name || '',
    teamOneName: competition.team1Name || equipos.uno,
    teamTwoName: competition.team2Name || equipos.dos,
    startDate: competition.startDate || '',
    endDate: competition.endDate || '',
    country: mainCountry || null,
    adjacentCountry1: datos.adjacentCountry1,
    adjacentCountry2: datos.adjacentCountry2,
    showAdjacentCountry1: !!datos.adjacentCountry1,
    showAdjacentCountry2: !!datos.adjacentCountry2,
    golfCourses: datos.golfCoursesData,
    playMode: competition.playMode || 'HANDICAP',
    visibility: competition.visibility || 'PRIVATE',
    numberOfPlayers: competition.maxPlayers || CUPO_POR_DEFECTO,
    tournamentType: competition.tournamentType || 'RYDER_CUP',
    // Solo una Ryder tiene modo de montaje: a un Stableford no se le pone
    setupMode:
      competition.setupMode || (competition.hasTeams ? 'RYDER_CUP' : null),
    maxPlayingHandicap: competition.maxPlayingHandicap ?? undefined,
    // Con el decimal del idioma: «12,0» en español, «12.0» en inglés
    strokePlay: formularioDeAjustes(
      competition.strokePlay ?? null,
      separadorDecimal(idioma),
    ),
  };
};

// El resumen no puede prometer lo que el envío va a rechazar, y quien sabe si
// vale es la validación: aquí se le pregunta a ella, no a una copia de sus
// reglas que se quedaría vieja al añadir la siguiente (`/code-review`)
export const faltaAlgoPlegado = (formData) =>
  ERRORES_DE_LAS_OPCIONES.has(
    validateCompetitionForm({ ...formData, ...FORMULARIO_MINIMO })?.key,
  );

// El género del organizador, que juega: solo al crear y solo si le falta
// (#710). Y si no juega («¿Juegas tú?» desmarcada, solo en stroke play), ni se
// pide ni se guarda: el servidor tampoco lo exige (Agustín, 13 oct)
export const pideGenero = ({ isEditMode, falta, conEquipos, organizerPlays }) =>
  !isEditMode && falta && (conEquipos || organizerPlays);

/**
 * Qué se enseña: el tipo, el modo (solo una Ryder) o ya el formulario. El tipo
 * se elige ANTES de rellenar nada (FE #639) y, detrás, cuánto hace la app por
 * su cuenta (FE #695). Editando no hay pasos: la competición ya existe.
 *
 * @returns {'tipo'|'modo'|'formulario'}
 */
export const pasoDelAlta = ({
  isEditMode,
  tipoElegido,
  conEquipos,
  setupMode,
}) => {
  if (isEditMode) return 'formulario';
  if (!tipoElegido) return 'tipo';
  if (conEquipos && !setupMode) return 'modo';
  return 'formulario';
};

// Otro país principal: fuera los adyacentes y los campos que no son suyos
export const alElegirPais = (prev, country) => ({
  ...prev,
  country: country,
  adjacentCountry1: '',
  adjacentCountry2: '',
  showAdjacentCountry1: false,
  showAdjacentCountry2: false,
  // Keep only golf courses for the main country
  golfCourses: prev.golfCourses.filter((gc) => gc.countryCode === country.code),
});

// Sin país principal: fuera los adyacentes, pero los campos se quedan
export const alVaciarPais = (prev) => ({
  ...prev,
  country: null,
  adjacentCountry1: '',
  adjacentCountry2: '',
  showAdjacentCountry1: false,
  showAdjacentCountry2: false,
});

// Los campos que se quedan sin los de esos países: un país que deja de estar en
// la competición se lleva los suyos, o se mandarían con ella sin verse
const sinLosCamposDe = (golfCourses, ...codigos) =>
  golfCourses.filter((gc) => !codigos.includes(gc.countryCode));

// Otro adyacente: el tercer país era vecino del anterior, así que se van los
// dos con sus campos. El mismo otra vez no cambia nada
export const alCambiarAdyacente1 = (prev, countryId) =>
  countryId === prev.adjacentCountry1
    ? prev
    : {
        ...prev,
        adjacentCountry1: countryId,
        adjacentCountry2: '',
        showAdjacentCountry2: false,
        golfCourses: sinLosCamposDe(
          prev.golfCourses,
          prev.adjacentCountry1,
          prev.adjacentCountry2,
        ),
      };

// Otro tercer país, o ninguno: se van los campos del anterior, como con su
// papelera, pero el selector sigue a la vista. El mismo otra vez no cambia nada
export const alCambiarAdyacente2 = (prev, countryId) =>
  countryId === prev.adjacentCountry2
    ? prev
    : {
        ...prev,
        adjacentCountry2: countryId,
        golfCourses: sinLosCamposDe(prev.golfCourses, prev.adjacentCountry2),
      };

// Sin adyacente no hay tercer país: fuera los dos y sus campos
export const alQuitarAdyacente1 = (prev) => ({
  ...prev,
  adjacentCountry1: '',
  adjacentCountry2: '',
  showAdjacentCountry1: false,
  showAdjacentCountry2: false,
  golfCourses: sinLosCamposDe(
    prev.golfCourses,
    prev.adjacentCountry1,
    prev.adjacentCountry2,
  ),
});

// Sin tercer país: fuera él y sus campos
export const alQuitarAdyacente2 = (prev) => ({
  ...prev,
  adjacentCountry2: '',
  showAdjacentCountry2: false,
  golfCourses: sinLosCamposDe(prev.golfCourses, prev.adjacentCountry2),
});
