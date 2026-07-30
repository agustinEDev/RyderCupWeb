const MIN_PLAYERS = 2;
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

  if (!formData.teamOneName?.trim() || !formData.teamTwoName?.trim()) {
    return { key: 'teamNamesRequired' };
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

  const numPlayers = Number.parseInt(formData.numberOfPlayers, 10);
  if (Number.isNaN(numPlayers) || numPlayers < MIN_PLAYERS) {
    return { key: 'playersMinimum' };
  }

  if (numPlayers > MAX_PLAYERS) {
    return { key: 'playersMaximum' };
  }

  return null;
};
