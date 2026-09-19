import { describe, it, expect } from 'vitest';
import { validateCompetitionForm } from './competitionFormValidation';

const validFormData = {
  competitionName: 'Ryder Cup 2026',
  teamOneName: 'Europe',
  teamTwoName: 'USA',
  startDate: '2026-06-01',
  endDate: '2026-06-03',
  country: { code: 'ES' },
  adjacentCountry1: null,
  adjacentCountry2: null,
  golfCourses: [{ countryCode: 'ES' }],
  numberOfPlayers: '24'
};

describe('validateCompetitionForm', () => {
  it('returns null for valid form data', () => {
    expect(validateCompetitionForm(validFormData)).toBeNull();
  });

  it('returns nameRequired when competitionName is empty', () => {
    const result = validateCompetitionForm({ ...validFormData, competitionName: '' });
    expect(result).toEqual({ key: 'nameRequired' });
  });

  it('returns nameRequired when competitionName is only whitespace', () => {
    const result = validateCompetitionForm({ ...validFormData, competitionName: '   ' });
    expect(result).toEqual({ key: 'nameRequired' });
  });

  it('returns teamNamesRequired when teamOneName is empty', () => {
    const result = validateCompetitionForm({ ...validFormData, teamOneName: '' });
    expect(result).toEqual({ key: 'teamNamesRequired' });
  });

  it('returns teamNamesRequired when teamTwoName is empty', () => {
    const result = validateCompetitionForm({ ...validFormData, teamTwoName: '  ' });
    expect(result).toEqual({ key: 'teamNamesRequired' });
  });

  it('returns datesRequired when startDate is missing', () => {
    const result = validateCompetitionForm({ ...validFormData, startDate: '' });
    expect(result).toEqual({ key: 'datesRequired' });
  });

  it('returns datesRequired when endDate is missing', () => {
    const result = validateCompetitionForm({ ...validFormData, endDate: '' });
    expect(result).toEqual({ key: 'datesRequired' });
  });

  it('returns endDateAfterStart when endDate is before startDate', () => {
    const result = validateCompetitionForm({
      ...validFormData,
      startDate: '2026-06-05',
      endDate: '2026-06-01'
    });
    expect(result).toEqual({ key: 'endDateAfterStart' });
  });

  it('returns countryRequired when country is missing', () => {
    const result = validateCompetitionForm({ ...validFormData, country: null });
    expect(result).toEqual({ key: 'countryRequired' });
  });

  it('returns golfCoursesRequired with the missing main country code', () => {
    const result = validateCompetitionForm({ ...validFormData, golfCourses: [] });
    expect(result).toEqual({ key: 'golfCoursesRequired', missingCourseCountryCodes: ['ES'] });
  });

  it('returns golfCoursesRequired listing every country missing a course, including adjacents', () => {
    const result = validateCompetitionForm({
      ...validFormData,
      adjacentCountry1: 'PT',
      adjacentCountry2: 'FR',
      golfCourses: [{ countryCode: 'ES' }]
    });
    expect(result).toEqual({
      key: 'golfCoursesRequired',
      missingCourseCountryCodes: ['PT', 'FR']
    });
  });

  it('does not require a course for an adjacent country that already has one', () => {
    const result = validateCompetitionForm({
      ...validFormData,
      adjacentCountry1: 'PT',
      golfCourses: [{ countryCode: 'ES' }, { countryCode: 'PT' }]
    });
    expect(result).toBeNull();
  });

  it('returns playersMinimum when numberOfPlayers is not a number', () => {
    const result = validateCompetitionForm({ ...validFormData, numberOfPlayers: 'abc' });
    expect(result).toEqual({ key: 'playersMinimum' });
  });

  it('returns playersMinimum when numberOfPlayers is below 2', () => {
    const result = validateCompetitionForm({ ...validFormData, numberOfPlayers: '1' });
    expect(result).toEqual({ key: 'playersMinimum' });
  });

  it('accepts numberOfPlayers at the minimum boundary (2)', () => {
    const result = validateCompetitionForm({ ...validFormData, numberOfPlayers: '2' });
    expect(result).toBeNull();
  });

  it('returns playersMaximum when numberOfPlayers is above 100', () => {
    const result = validateCompetitionForm({ ...validFormData, numberOfPlayers: '101' });
    expect(result).toEqual({ key: 'playersMaximum' });
  });

  it('accepts numberOfPlayers at the maximum boundary (100)', () => {
    const result = validateCompetitionForm({ ...validFormData, numberOfPlayers: '100' });
    expect(result).toBeNull();
  });

  it('short-circuits on the first failing rule (name before team names)', () => {
    const result = validateCompetitionForm({
      ...validFormData,
      competitionName: '',
      teamOneName: ''
    });
    expect(result).toEqual({ key: 'nameRequired' });
  });

  /**
   * LA TABLA de la FE #637 — el formulario pedía ocho cosas obligatorias y la
   * API solo exige cinco. Lo que el servidor rellena solo deja de ser una
   * decisión del organizador:
   *
   *   #    caso                                   | qué pasa
   *   -----|-----------------------------------------|---------------------
   *   5    nº de jugadores vacío                     | vale: son 12
   *   6    nº de jugadores 150                       | error: el tope es 100
   *   7    un nombre de equipo en blanco             | error, como hasta ahora
   */
  it('5: sin número de jugadores es válido — serán 12', () => {
    // Antes obligaba a escribirlo, y el campo nacía vacío: una decisión que
    // nadie quería tomar antes de poder pulsar el botón
    expect(validateCompetitionForm({ ...validFormData, numberOfPlayers: '' })).toBeNull();
    expect(validateCompetitionForm({ ...validFormData, numberOfPlayers: null })).toBeNull();
    expect(validateCompetitionForm({ ...validFormData, numberOfPlayers: undefined })).toBeNull();
  });

  it('6: pero un número imposible sigue siendo un error', () => {
    // El tope de 100 no es del formulario: lo pone la API (`le=100`), así que
    // saltárselo aquí solo cambia un aviso claro por un 422 del servidor
    expect(validateCompetitionForm({ ...validFormData, numberOfPlayers: '150' })).toEqual({ key: 'playersMaximum' });
    expect(validateCompetitionForm({ ...validFormData, numberOfPlayers: '1' })).toEqual({ key: 'playersMinimum' });
    expect(validateCompetitionForm({ ...validFormData, numberOfPlayers: 'doce' })).toEqual({ key: 'playersMinimum' });
  });

  it('8: un nombre de equipo de dos letras lo para el formulario, no un 422', () => {
    // La API pide `min_length=3` en `team_1_name`/`team_2_name`. «EU» y «US» son
    // nombres perfectamente plausibles: pasaban de largo y volvían como un 422
    // bajo el genérico «Error al crear la competición» (`/code-review`)
    expect(validateCompetitionForm({ ...validFormData, teamOneName: 'EU' })).toEqual({ key: 'teamNamesTooShort' });
    expect(validateCompetitionForm({ ...validFormData, teamTwoName: 'US' })).toEqual({ key: 'teamNamesTooShort' });
    expect(validateCompetitionForm({ ...validFormData, teamOneName: 'Los' })).toBeNull();
  });

  it('9: y uno de 51 letras tampoco pasa: la API corta en 50 (el gemelo)', () => {
    const largo = 'A'.repeat(51);
    expect(validateCompetitionForm({ ...validFormData, teamOneName: largo })).toEqual({ key: 'teamNamesTooLong' });
    expect(validateCompetitionForm({ ...validFormData, teamTwoName: largo })).toEqual({ key: 'teamNamesTooLong' });
    expect(validateCompetitionForm({ ...validFormData, teamOneName: 'A'.repeat(50) })).toBeNull();
  });

  it('11: un nombre de equipo que no es texto da clave de error, no un TypeError', () => {
    // La guarda de arriba usa `?.` y la de abajo no: hoy no se alcanza, pero la
    // asimetría es la trampa (`/code-review`)
    expect(() => validateCompetitionForm({ ...validFormData, teamOneName: 42 })).not.toThrow();
    expect(validateCompetitionForm({ ...validFormData, teamOneName: 42 })).toHaveProperty('key');
  });

  it('10: el tope de hándicap fuera de 1–54 se para aquí', () => {
    // Vive dentro del plegable, y al plegarse el input se desmonta: con él se
    // fue el `min`/`max` del navegador, que era lo único que lo paraba
    expect(validateCompetitionForm({ ...validFormData, maxPlayingHandicap: '99' })).toEqual({ key: 'handicapLimitRange' });
    expect(validateCompetitionForm({ ...validFormData, maxPlayingHandicap: '0' })).toEqual({ key: 'handicapLimitRange' });
    expect(validateCompetitionForm({ ...validFormData, maxPlayingHandicap: '54' })).toBeNull();
    expect(validateCompetitionForm({ ...validFormData, maxPlayingHandicap: '' })).toBeNull();
    expect(validateCompetitionForm({ ...validFormData, maxPlayingHandicap: undefined })).toBeNull();
  });
});
