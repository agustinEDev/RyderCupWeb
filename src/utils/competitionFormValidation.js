const MIN_PLAYERS = 2;
const MIN_TEAM_NAME = 3;
const MAX_TEAM_NAME = 50;
const MIN_HANDICAP = 1;
const MAX_HANDICAP = 54;
const MAX_PLAYERS = 100;

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
export const validateCompetitionForm = (formData) => {
  if (!formData.competitionName?.trim()) {
    return { key: 'nameRequired' };
  }

  // Los dos nombres se normalizan UNA vez y las tres comprobaciones miran lo
  // mismo: la guarda de vacío usaba `?.trim()` y la de longitud `.trim()`, y esa
  // asimetría convertía un valor no textual en un TypeError (`/code-review`)
  const equipos = [formData.teamOneName, formData.teamTwoName].map(
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
    const tope = Number.parseInt(formData.maxPlayingHandicap, 10);
    if (Number.isNaN(tope) || tope < MIN_HANDICAP || tope > MAX_HANDICAP) {
      return { key: 'handicapLimitRange' };
    }
  }

  if (!formData.startDate || !formData.endDate) {
    return { key: 'datesRequired' };
  }

  if (new Date(formData.startDate) > new Date(formData.endDate)) {
    return { key: 'endDateAfterStart' };
  }

  if (!formData.country) {
    return { key: 'countryRequired' };
  }

  const selectedCountryCodes = [formData.country?.code];
  if (formData.adjacentCountry1) selectedCountryCodes.push(formData.adjacentCountry1);
  if (formData.adjacentCountry2) selectedCountryCodes.push(formData.adjacentCountry2);

  const missingCourseCountryCodes = selectedCountryCodes.filter(
    (code) => !formData.golfCourses.some((gc) => gc.countryCode === code)
  );
  if (missingCourseCountryCodes.length > 0) {
    return { key: 'golfCoursesRequired', missingCourseCountryCodes };
  }

  // Sin número no hay error: la competición sale con el cupo por defecto. Era
  // obligatorio y nacía vacío, así que obligaba a decidir un tope de inscritos
  // antes de poder crear nada — y quien monta una Ryder con sus amigos no tiene
  // opinión sobre eso (FE #637)
  const sinNumero = formData.numberOfPlayers === '' || formData.numberOfPlayers == null;
  if (sinNumero) return null;

  const numPlayers = Number.parseInt(formData.numberOfPlayers, 10);
  if (Number.isNaN(numPlayers) || numPlayers < MIN_PLAYERS) {
    return { key: 'playersMinimum' };
  }

  if (numPlayers > MAX_PLAYERS) {
    return { key: 'playersMaximum' };
  }

  return null;
};
