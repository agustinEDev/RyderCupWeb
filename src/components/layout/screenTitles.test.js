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
    });
  });

  it('prefers a static route over a parameterised one of the same depth', () => {
    // Sin esto `/competitions/:id` se quedaria con `/competitions/create`
    expect(resolveScreen('/competitions/create')).toEqual({
      titleKey: 'screens.createCompetition',
      backTo: '/competitions',
    });
  });

  it('matches a competition id and walks back to the list', () => {
    expect(resolveScreen('/competitions/abc-123')).toEqual({
      titleKey: 'screens.competition',
      backTo: '/competitions',
    });
  });

  it('carries route params into the parent path', () => {
    // El calendario vuelve a SU torneo, no a la lista
    expect(resolveScreen('/competitions/abc-123/schedule')).toEqual({
      titleKey: 'screens.schedule',
      backTo: '/competitions/abc-123',
    });
  });

  it('prefers the deeper route when several match', () => {
    expect(resolveScreen('/competitions/abc-123/edit')).toEqual({
      titleKey: 'screens.editCompetition',
      backTo: '/competitions/abc-123',
    });
  });

  it('resolves creator routes back to the competition', () => {
    expect(resolveScreen('/creator/competitions/xyz/invitations')).toEqual({
      titleKey: 'screens.invitations',
      backTo: '/competitions/xyz',
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
});
