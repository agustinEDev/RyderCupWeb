import { describe, it, expect } from 'vitest';
import { resolveScreen } from './screenTitles';

/**
 * Mapa de pantallas de la cabecera contextual (FE #310).
 */
describe('resolveScreen', () => {
  it('titles the four bottom-navigation roots without a back arrow', () => {
    // Volver desde una pestana raiz no significa nada
    for (const path of ['/dashboard', '/competitions', '/friends', '/profile']) {
      expect(resolveScreen(path)).toMatchObject({ backTo: null });
      expect(resolveScreen(path).titleKey).toMatch(/^screens\./);
    }
  });

  it('sends a child screen back to its parent, not to the previous page', () => {
    expect(resolveScreen('/profile/devices')).toEqual({
      titleKey: 'screens.devices',
      backTo: '/profile',
      backByHistory: false,
    });
  });

  it('prefers a static route over a parameterised one of the same depth', () => {
    // Sin esto `/competitions/:id` se quedaria con `/competitions/create`
    expect(resolveScreen('/competitions/create')).toEqual({
      titleKey: 'screens.createCompetition',
      backTo: '/competitions',
      backByHistory: false,
    });
  });

  it('matches a competition id and walks back to the list', () => {
    expect(resolveScreen('/competitions/abc-123')).toEqual({
      titleKey: 'screens.competition',
      backTo: '/competitions',
      backByHistory: false,
    });
  });

  it('carries route params into the parent path', () => {
    // El calendario vuelve a SU torneo, no a la lista
    expect(resolveScreen('/competitions/abc-123/schedule')).toEqual({
      titleKey: 'screens.schedule',
      backTo: '/competitions/abc-123',
      backByHistory: false,
    });
  });

  it('prefers the deeper route when several match', () => {
    expect(resolveScreen('/competitions/abc-123/edit')).toEqual({
      titleKey: 'screens.editCompetition',
      backTo: '/competitions/abc-123',
      backByHistory: false,
    });
  });

  it('resolves creator routes back to the competition', () => {
    expect(resolveScreen('/creator/competitions/xyz/invitations')).toEqual({
      titleKey: 'screens.invitations',
      backTo: '/competitions/xyz',
      backByHistory: false,
    });
  });

  it('sends the player profile back through history, with no fixed parent', () => {
    // Se llega desde el feed, desde Amigos y desde la busqueda: cualquier padre
    // fijo se equivocaria dos de cada tres veces
    expect(resolveScreen('/players/abc-123')).toEqual({
      titleKey: 'screens.playerProfile',
      backTo: null,
      backByHistory: true,
    });
  });

  it.each([
    '/',
    '/login',
    '/terms',
    '/auth/complete-profile',
    '/player/matches/m-1/scoring',
    '/quick-matches/q-1/scoring',
  ])('leaves %s without a contextual title', (path) => {
    // Publicas, alta de perfil y anotacion en vivo: la cabecera no cambia
    expect(resolveScreen(path)).toBeNull();
  });

  it('does not confuse the quick match list with its scoring screen', () => {
    expect(resolveScreen('/quick-matches')).toMatchObject({ titleKey: 'screens.myQuickMatches' });
    expect(resolveScreen('/quick-matches/q-1/scoring')).toBeNull();
  });
  it('gives each admin section its title and sends it back to the admin menu (17 oct)', () => {
    const secciones = {
      resumen: 'screens.adminOverview',
      usuarios: 'screens.adminUsers',
      competiciones: 'screens.adminCompetitions',
      campos: 'screens.adminGolfCourses',
      hoyos: 'screens.adminHoles',
    };
    for (const [seccion, titleKey] of Object.entries(secciones)) {
      expect(resolveScreen(`/admin/${seccion}`)).toEqual({ titleKey, backTo: '/admin', backByHistory: false });
    }
    expect(resolveScreen('/admin')).toMatchObject({ titleKey: 'screens.admin', backTo: '/profile' });
  });

  // QA (FE #865-4): con sesión, la clasificación lleva la cabecera de la
  // aplicación, con flecha a su competición
  it('titles the shared leaderboard and sends it back to its competition', () => {
    expect(resolveScreen('/competitions/c1/leaderboard')).toEqual({
      titleKey: 'screens.leaderboard',
      backTo: '/competitions/c1',
      backByHistory: false,
    });
  });
});
