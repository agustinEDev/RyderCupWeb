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
});
