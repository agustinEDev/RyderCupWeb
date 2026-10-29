import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Las páginas que van con la barra inferior ocupan la pantalla MENOS la barra
 * (`PANTALLA_MENOS_BARRA_INFERIOR`), no la pantalla entera: con `min-h-screen`,
 * App añade el hueco de la barra detrás y la página se desplazaba casi vacía
 * (FE #979; release social 3). Se miran TODAS las páginas: una nueva con barra
 * que use `min-h-screen` no pasa (code-review).
 */
const AQUI = dirname(fileURLToPath(import.meta.url));

// Las que no llevan la barra inferior: públicas, de entrada, de anotar; y las
// dos de admin, que solo usan `min-h-screen` fuera del panel, donde no se montan
const SIN_BARRA = new Set([
  'AcceptTerms.jsx',
  'AppStart.jsx',
  'CompleteProfile.jsx',
  'ForgotPassword.jsx',
  'GoogleCallback.jsx',
  'Landing.jsx',
  'Login.jsx',
  'Register.jsx',
  'ResetPassword.jsx',
  'VerifyEmail.jsx',
  'admin/GolfCourses.jsx',
  'admin/PendingGolfCourses.jsx',
  'player/GroupScoringPage.jsx',
  'player/ScoringPage.jsx',
  'quick_match/QuickMatchScoringPage.jsx',
]);

const LAS_QUE_LO_USABAN = [
  'BrowseCompetitions.jsx',
  'CompetitionDetail.jsx',
  'Competitions.jsx',
  'CreateCompetition.jsx',
  'Dashboard.jsx',
  'DeviceManagement.jsx',
  'DraftRoomPage.jsx',
  'EditProfile.jsx',
  'EnvelopePage.jsx',
  'PlayerStatsPage.jsx',
  'Profile.jsx',
  'admin/AdminPanel.jsx',
  'creator/InvitationsPage.jsx',
  'creator/SchedulePage.jsx',
  'player/FeedPage.jsx',
  'player/FriendsPage.jsx',
  'player/MyInvitationsPage.jsx',
  'player/PlayerProfilePage.jsx',
  'player/UpcomingMatchesPage.jsx',
  'quick_match/MyQuickMatchesPage.jsx',
  'quick_match/QuickMatchSharedPage.jsx',
];

const paginas = readdirSync(AQUI, { recursive: true })
  // Con «/» también en Windows (CodeRabbit)
  .map((f) => String(f).replaceAll('\\', '/'))
  .filter((f) => f.endsWith('.jsx') && !f.includes('.test.') && !f.startsWith('public/'))
  .filter((f) => !SIN_BARRA.has(f));

describe('Las páginas con barra inferior no ocupan más que la pantalla', () => {
  it('hay páginas que mirar', () => {
    expect(paginas.length).toBeGreaterThan(20);
  });

  it.each(paginas)('%s no usa min-h-screen', (pagina) => {
    expect(readFileSync(join(AQUI, pagina), 'utf8')).not.toMatch(/\bmin-h-screen\b/);
  });

  // Las que lo usaban ocupan ahora la pantalla menos la barra (CodeRabbit)
  it.each(LAS_QUE_LO_USABAN)('%s usa la pantalla menos la barra', (pagina) => {
    expect(readFileSync(join(AQUI, pagina), 'utf8')).toMatch(/\$\{PANTALLA_MENOS_BARRA_INFERIOR\}/);
  });
});
