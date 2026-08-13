import { matchPath } from 'react-router';

/**
 * Titulo y pantalla padre de cada ruta autenticada (FE #310).
 *
 * Dentro de la aplicacion la cabecera debe decir donde estas y como volver, no
 * repetir la marca en todas las pantallas. El mapa vive aqui, en un solo sitio,
 * en lugar de repartido por veinte paginas.
 *
 * `parent` es una plantilla de ruta: sus parametros se rellenan con los de la
 * ruta actual, de modo que el detalle de un torneo vuelve a ese torneo y no a
 * la lista. Sin `parent` no se pinta flecha: son las cuatro raices de la
 * navegacion inferior, donde volver no significa nada.
 *
 * `back: 'history'` es para pantallas sin padre unico. Al perfil de un jugador
 * se llega desde el feed, desde Amigos y desde la busqueda, asi que cualquier
 * destino fijo se equivocaria dos de cada tres veces: se vuelve por donde se
 * vino.
 *
 * Las rutas de anotacion en vivo no aparecen a proposito: llevan su propia
 * cabecera y ni siquiera muestran la navegacion inferior.
 */
const SCREENS = [
  { pattern: '/dashboard', titleKey: 'screens.dashboard' },
  { pattern: '/competitions', titleKey: 'screens.myCompetitions' },
  { pattern: '/friends', titleKey: 'screens.friends' },
  { pattern: '/profile', titleKey: 'screens.profile' },

  { pattern: '/profile/edit', titleKey: 'screens.editProfile', parent: '/profile' },
  { pattern: '/profile/devices', titleKey: 'screens.devices', parent: '/profile' },
  { pattern: '/admin', titleKey: 'screens.admin', parent: '/profile' },

  { pattern: '/competitions/create', titleKey: 'screens.createCompetition', parent: '/competitions' },
  { pattern: '/competitions/:id', titleKey: 'screens.competition', parent: '/competitions' },
  { pattern: '/competitions/:id/edit', titleKey: 'screens.editCompetition', parent: '/competitions/:id' },
  { pattern: '/competitions/:id/schedule', titleKey: 'screens.schedule', parent: '/competitions/:id' },
  { pattern: '/creator/competitions/:id/schedule', titleKey: 'screens.schedule', parent: '/competitions/:id' },
  { pattern: '/creator/competitions/:id/invitations', titleKey: 'screens.invitations', parent: '/competitions/:id' },

  { pattern: '/players/:userId', titleKey: 'screens.playerProfile', back: 'history' },

  { pattern: '/browse-competitions', titleKey: 'screens.browseCompetitions', parent: '/dashboard' },
  { pattern: '/player/invitations', titleKey: 'screens.myInvitations', parent: '/dashboard' },
  { pattern: '/player/matches', titleKey: 'screens.myMatches', parent: '/dashboard' },
  { pattern: '/quick-matches', titleKey: 'screens.myQuickMatches', parent: '/dashboard' },
  { pattern: '/stats', titleKey: 'screens.myStats', parent: '/dashboard' },
];

/**
 * Sustituye los `:param` de una plantilla por los valores de la ruta actual.
 * Si falta alguno se devuelve null: mejor no pintar flecha que pintar una que
 * lleva a una URL con `:id` literal.
 */
function buildPath(template, params) {
  const segments = template.split('/');

  for (const segment of segments) {
    if (segment.startsWith(':') && !params[segment.slice(1)]) return null;
  }

  return segments
    .map((segment) => (segment.startsWith(':') ? params[segment.slice(1)] : segment))
    .join('/');
}

/**
 * Devuelve `{ titleKey, backTo, backByHistory }` para un pathname, o null si la
 * ruta no es una pantalla de la aplicacion (publicas, anotacion en vivo, alta
 * de perfil).
 */
function specificity(pattern) {
  const segments = pattern.split('/');
  const staticSegments = segments.filter((segment) => !segment.startsWith(':')).length;

  // Primero manda la profundidad (`/competitions/:id/edit` gana a
  // `/competitions/:id`), y a igualdad de profundidad gana lo estatico, o
  // `/competitions/:id` se quedaria con `/competitions/create`
  return segments.length * 10 + staticSegments;
}

export function resolveScreen(pathname) {
  // El orden del mapa no deberia importar: se elige la coincidencia mas
  // especifica
  const matches = SCREENS
    .map((screen) => ({ screen, match: matchPath({ path: screen.pattern, end: true }, pathname) }))
    .filter(({ match }) => match !== null);

  if (matches.length === 0) return null;

  const best = matches.reduce((winner, candidate) =>
    specificity(candidate.screen.pattern) > specificity(winner.screen.pattern) ? candidate : winner
  );

  return {
    titleKey: best.screen.titleKey,
    backTo: best.screen.parent ? buildPath(best.screen.parent, best.match.params) : null,
    backByHistory: best.screen.back === 'history',
  };
}

export default resolveScreen;
