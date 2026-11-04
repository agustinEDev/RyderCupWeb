/**
 * El nombre de la modalidad individual en el paso 1 (hotfix 2.63.1, Agustín,
 * 4 nov 2026).
 *
 * En el paso 1 de la partida rápida, «Individual» no decía que hacen falta dos:
 * se probó a seguir solo y «Siguiente» no se activaba. «Match Play» tampoco
 * valía: Fourball y Foursomes también son match play. El botón dice el número
 * de jugadores, y la línea de debajo, la modalidad.
 *
 *   #  dónde                                          | es                                   | en
 *   ---|---------------------------------------------|--------------------------------------|------------------------------
 *   20 botón del paso 1 (`create.course.corto`)      | «1 contra 1»                         | «1 vs 1»
 *   21 línea gris del paso 1 y resumen del paso 4    | «Match play individual (1 contra 1)» | «Singles match play (1 vs 1)»
 *   —  historial, panel (3), «Jugáis juntos»          | «Individual», como en producción     | «Singles»
 *   —  sesión del calendario del torneo (`schedule`)  | «Individuales», sin cambios          | «Singles»
 *
 * Caso 22 (cabe a 360 px): «1 contra 1» es más corto que «Foursomes», que ya
 * cabe en el mismo botón.
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
  ['es', esQuickMatch, esDashboard, esPerfil, '1 contra 1', 'Match play individual (1 contra 1)', 'Individual'],
  ['en', enQuickMatch, enDashboard, enPerfil, '1 vs 1', 'Singles match play (1 vs 1)', 'Singles'],
];

describe.each(IDIOMAS)('%s: la modalidad individual', (_, quickMatch, dashboard, perfil, boton, explicacion, etiqueta) => {
  it('20: el botón del paso 1 dice cuántos juegan', () => {
    expect(quickMatch.create.course.corto.SINGLES).toBe(boton);
  });

  it('21: la línea gris del paso 1, que es también la del resumen, dice la modalidad', () => {
    expect(quickMatch.create.course.formatSingles).toBe(explicacion);
  });

  it('ningún texto la llama «Match Play» a secas: Fourball y Foursomes también lo son', () => {
    const todos = JSON.stringify([quickMatch, dashboard, perfil]);
    expect(todos).not.toMatch(/"Match Play"/);
  });

  it.each([
    ['historial de partidas rápidas', () => quickMatch.history.format.SINGLES],
    ['panel: acciones pendientes', () => dashboard.pendingActions.quickMatchFormat.SINGLES],
    ['panel: próximo partido', () => dashboard.nextMatch.format.SINGLES],
    ['panel: partidas recientes', () => dashboard.recentMatches.format.SINGLES],
    ['perfil: jugáis juntos', () => perfil.gamesTogether.format.SINGLES],
  ])('%s: la etiqueta de producción', (__, lee) => {
    expect(lee()).toBe(etiqueta);
  });
});

describe('la sesión del calendario del torneo no cambia', () => {
  it('sigue «Individuales» / «Singles»', () => {
    expect(esCalendario.SINGLES ?? Object.values(esCalendario).find((v) => v?.SINGLES)?.SINGLES).toBe('Individuales');
    expect(enCalendario.SINGLES ?? Object.values(enCalendario).find((v) => v?.SINGLES)?.SINGLES).toBe('Singles');
  });
});
