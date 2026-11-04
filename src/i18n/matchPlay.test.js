/**
 * «Individual» pasa a llamarse «Match Play» (hotfix 2.63.1, Agustín, 4 nov 2026).
 *
 * En el paso 1 de la partida rápida, «Individual» no decía que hacen falta dos:
 * se probó a seguir solo y «Siguiente» no se activaba. Es match play, uno
 * contra otro, y así se llama en toda la app, también en torneo.
 *
 *   #  dónde                                          | es / en
 *   ---|---------------------------------------------|--------------------------
 *   20 botón del paso 1 (`create.course.corto`)      | «Match Play»
 *   21 línea gris del paso 1 y resumen del paso 4    | «Match Play (1 vs 1)»
 *   —  historial, panel (3), «Jugáis juntos»          | «Match Play»
 *   —  sesión del calendario del torneo (`schedule`)  | sin cambios: «Individuales»
 *
 * Caso 22 (cabe a 360 px): medido con la fuente de la app, 74 px de texto en un
 * hueco de 75; a 320 px parte en dos líneas, como ya le pasa a «Foursomes».
 */
import { describe, it, expect } from 'vitest';
import esQuickMatch from './locales/es/quickMatch.json';
import enQuickMatch from './locales/en/quickMatch.json';
import esDashboard from './locales/es/dashboard.json';
import enDashboard from './locales/en/dashboard.json';
import esPerfil from './locales/es/playerProfile.json';
import enPerfil from './locales/en/playerProfile.json';
import esCalendario from './locales/es/schedule.json';
import enCalendario from './locales/en/schedule.json';

const IDIOMAS = [
  ['es', esQuickMatch, esDashboard, esPerfil],
  ['en', enQuickMatch, enDashboard, enPerfil],
];

describe.each(IDIOMAS)('%s: Match Play', (_, quickMatch, dashboard, perfil) => {
  it('20: el botón del paso 1', () => {
    expect(quickMatch.create.course.corto.SINGLES).toBe('Match Play');
  });

  it('21: la línea gris del paso 1, que es también la del resumen', () => {
    expect(quickMatch.create.course.formatSingles).toBe('Match Play (1 vs 1)');
  });

  it.each([
    ['historial de partidas rápidas', (q) => q.history.format.SINGLES],
  ])('%s', (__, lee) => {
    expect(lee(quickMatch)).toBe('Match Play');
  });

  it.each([
    ['acciones pendientes', (d) => d.pendingActions.quickMatchFormat.SINGLES],
    ['próximo partido', (d) => d.nextMatch.format.SINGLES],
    ['partidas recientes', (d) => d.recentMatches.format.SINGLES],
  ])('panel: %s', (__, lee) => {
    expect(lee(dashboard)).toBe('Match Play');
  });

  it('«Jugáis juntos» del perfil', () => {
    expect(perfil.gamesTogether.format.SINGLES).toBe('Match Play');
  });
});

describe('la sesión del calendario del torneo no cambia', () => {
  it('sigue «Individuales» / «Singles»', () => {
    expect(esCalendario.SINGLES ?? Object.values(esCalendario).find((v) => v?.SINGLES)?.SINGLES).toBe('Individuales');
    expect(enCalendario.SINGLES ?? Object.values(enCalendario).find((v) => v?.SINGLES)?.SINGLES).toBe('Singles');
  });
});
