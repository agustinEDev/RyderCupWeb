import { MAX_PLAYERS, MIN_PLAYERS } from '../domain/entities/Competition';
import { tieneEquipos } from '../domain/value_objects/TournamentType';
import { numeroEntero } from './numeroEntero';
import { diasDelTorneo, errorDeAjustes } from './ajustesDeStrokePlay';

const MIN_TEAM_NAME = 3;
const MAX_TEAM_NAME = 50;
const MIN_HANDICAP = 1;
const MAX_HANDICAP = 54;

/**
 * Validates the CreateCompetition/EditCompetition form data.
 *
 * Pure function, independent of the page component: no i18n, no rendering.
 * Returns the first validation error found (same short-circuit order as the
 * original inline checks), as `{ key, params? }` where `key` is meant to be
 * interpolated into the `create.errors.<key>` i18n namespace by the caller.
 * `missingCourseCountryCodes` is returned as raw codes rather than resolved
 * country names, since name resolution (locale, country lookup) is a
 * presentation concern that belongs to the component, not the validation.
 *
 * Returns `null` when the form is valid.
 */
export const validateCompetitionForm = (formData, { exigirCampos = true, inscritos = 0 } = {}) => {
  if (!formData.competitionName?.trim()) {
    return { key: 'nameRequired' };
  }

  // Los dos nombres se normalizan UNA vez y las tres comprobaciones miran lo
  // mismo: la guarda de vacío usaba `?.trim()` y la de longitud `.trim()`, y esa
  // asimetría convertía un valor no textual en un TypeError (`/code-review`)
  // Solo una Ryder Cup tiene equipos (FE #791): sin ellos no hay qué validar
  const equipos = (tieneEquipos(formData.tournamentType) ? [formData.teamOneName, formData.teamTwoName] : []).map(
    (nombre) => (typeof nombre === 'string' ? nombre.trim() : '')
  );
  if (equipos.some((nombre) => !nombre)) {
    return { key: 'teamNamesRequired' };
  }

  // La API pide `min_length=3, max_length=50`: «EU» o un nombre kilométrico
  // pasaban de largo y volvían como un 422 bajo el genérico «Error al crear la
  // competición» (`/code-review`)
  if (equipos.some((nombre) => nombre.length < MIN_TEAM_NAME)) {
    return { key: 'teamNamesTooShort' };
  }
  if (equipos.some((nombre) => nombre.length > MAX_TEAM_NAME)) {
    return { key: 'teamNamesTooLong' };
  }

  // El tope de hándicap vive dentro del plegable, y al plegarse el input se
  // desmonta: con él se va el `min`/`max` del navegador, que era lo único que
  // paraba un 99 camino de un 422 (`/code-review`)
  const topeEscrito = formData.maxPlayingHandicap !== '' && formData.maxPlayingHandicap != null;
  if (topeEscrito) {
    const tope = numeroEntero(formData.maxPlayingHandicap);
    if (tope === null || tope < MIN_HANDICAP || tope > MAX_HANDICAP) {
      return { key: 'handicapLimitRange' };
    }
  }

  if (!formData.startDate || !formData.endDate) {
    return { key: 'datesRequired' };
  }

  if (new Date(formData.startDate) > new Date(formData.endDate)) {
    return { key: 'endDateAfterStart' };
  }

  // Los ajustes de un Stableford o un Medal (FE #824), ya con las fechas: las
  // jornadas de cada jugador no pueden pasar de los días del torneo
  if (!tieneEquipos(formData.tournamentType) && formData.strokePlay) {
    const dias = diasDelTorneo(formData.startDate, formData.endDate);
    const error = errorDeAjustes(formData.strokePlay, dias);
    if (error) {
      // Con `count`: «1 día» o «3 días» (i18next pone el plural)
      return error === 'matchdaysMoreThanDays' ? { key: error, count: dias } : { key: error };
    }
  }

  if (!formData.country) {
    return { key: 'countryRequired' };
  }

  const selectedCountryCodes = [formData.country?.code];
  if (formData.adjacentCountry1) selectedCountryCodes.push(formData.adjacentCountry1);
  if (formData.adjacentCountry2) selectedCountryCodes.push(formData.adjacentCountry2);

  // Al editar los campos no se piden: se gestionan desde la ficha, en
  // cualquier tipo de torneo. El formulario no los enseña, y exigirlos dejaba
  // sin poder guardar nada a una competición que se quedaba sin campo
  // (Agustín, 3 oct 2026)
  const missingCourseCountryCodes = exigirCampos
    ? selectedCountryCodes.filter((code) => !formData.golfCourses.some((gc) => gc.countryCode === code))
    : [];
  if (missingCourseCountryCodes.length > 0) {
    return { key: 'golfCoursesRequired', missingCourseCountryCodes };
  }

  // Sin número no hay error: la competición sale con el cupo por defecto. Era
  // obligatorio y nacía vacío, así que obligaba a decidir un tope de inscritos
  // antes de poder crear nada — y quien monta una Ryder con sus amigos no tiene
  // opinión sobre eso (FE #637)
  const sinNumero = formData.numberOfPlayers === '' || formData.numberOfPlayers == null;
  if (sinNumero) return null;

  const numPlayers = numeroEntero(formData.numberOfPlayers);
  if (numPlayers === null) {
    return { key: 'playersInvalid' };
  }
  if (numPlayers < MIN_PLAYERS) {
    return { key: 'playersMinimum' };
  }

  if (numPlayers > MAX_PLAYERS) {
    return { key: 'playersMaximum', max: MAX_PLAYERS };
  }

  // Y no por debajo de quien ya está dentro (FE #662). El servidor lo rechaza
  // (BE #324), y aceptarlo aquí perdía el resto de cambios del formulario al
  // guardar. Tras las de rango: con un «1» lo que hay que decir es el mínimo
  if (inscritos > 0 && numPlayers < inscritos) {
    return { key: 'capBelowEnrolled', count: inscritos };
  }

  return null;
};
