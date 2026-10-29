import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Las páginas que van con la barra inferior ocupan la pantalla MENOS la barra
 * (`PANTALLA_MENOS_BARRA_INFERIOR`), no la pantalla entera: con `min-h-screen`,
 * App añade el hueco de la barra detrás y la página se desplazaba casi vacía
 * (FE #979, y unas 40 más pendientes; release social 3).
 */
const AQUI = dirname(fileURLToPath(import.meta.url));

const PAGINAS = [
  'CreateCompetition.jsx',
  'EditProfile.jsx',
  'DraftRoomPage.jsx',
  'EnvelopePage.jsx',
  'CompetitionDetail.jsx',
  'Competitions.jsx',
  'PlayerStatsPage.jsx',
  'Dashboard.jsx',
  'Profile.jsx',
  'DeviceManagement.jsx',
  'admin/AdminPanel.jsx',
  'BrowseCompetitions.jsx',
  'creator/InvitationsPage.jsx',
  'creator/SchedulePage.jsx',
  'player/UpcomingMatchesPage.jsx',
  'player/PlayerProfilePage.jsx',
  'player/MyInvitationsPage.jsx',
  'player/FeedPage.jsx',
  'player/FriendsPage.jsx',
  'quick_match/MyQuickMatchesPage.jsx',
  'quick_match/QuickMatchSharedPage.jsx',
];

describe('Las páginas con barra inferior no ocupan más que la pantalla', () => {
  it.each(PAGINAS)('%s usa la pantalla menos la barra', (pagina) => {
    const codigo = readFileSync(join(AQUI, pagina), 'utf8');

    expect(codigo).not.toMatch(/\bmin-h-screen\b/);
    // Usada, no solo importada
    expect(codigo).toMatch(/\$\{PANTALLA_MENOS_BARRA_INFERIOR\}/);
  });
});
