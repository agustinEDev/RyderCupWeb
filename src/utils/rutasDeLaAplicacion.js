import { matchRoutes } from 'react-router';

/**
 * Las rutas que declara `App.jsx`, sin la comodín (FE #544).
 *
 * Hace falta fuera del árbol de React: el interceptor de refresco decide con
 * `location.pathname`, sin router. Una dirección que no lleva a ninguna pantalla
 * se trata como la clasificación compartida —solo se refresca con sesión
 * guardada—; si no, un visitante que tecleaba mal la dirección se comía el 401,
 * el refresco fallido y la salida a `/login` con «tu sesión expiró».
 *
 * Es una copia de las `<Route>` de `App.jsx`, y un test vigila que no se separen.
 */
export const RUTAS_DE_LA_APLICACION = Object.freeze([
  '/',
  '/start',
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password/:token',
  '/reset-password',
  '/pricing',
  '/contact',
  '/terms',
  '/privacy',
  '/cookies',
  '/legal',
  '/auth/google/callback',
  '/competitions/:id/leaderboard',
  '/auth/complete-profile',
  '/accept-terms',
  '/dashboard',
  '/stats',
  '/profile',
  '/profile/edit',
  '/profile/devices',
  '/competitions',
  '/competitions/create',
  '/competitions/:id/edit',
  '/competitions/:id',
  '/competitions/:id/draft',
  '/competitions/:id/rounds/:roundId/envelope',
  '/competitions/:id/groups/:groupId',
  '/competitions/:id/matches/:matchId',
  '/browse-competitions',
  '/admin/:seccion?',
  '/creator/competitions/:id/invitations',
  '/player/invitations',
  '/feed',
  '/players/:userId',
  '/friends',
  '/player/matches',
  '/player/matches/:matchId/scoring',
  '/player/groups/:groupId/scoring',
  '/quick-matches',
  '/quick-matches/:quickMatchId/scoring',
  '/quick-matches/:quickMatchId/shared',
  '/creator/competitions/:id/schedule',
  '/competitions/:id/schedule',
  '/unauthorized',
]);

// El mismo emparejador que usa el router: parámetros, opcionales y barra final
// se resuelven igual que al pintar, sin expresiones escritas a mano
const RUTAS = RUTAS_DE_LA_APLICACION.map((path) => ({ path }));

/** Si la dirección no lleva a ninguna pantalla: la que pinta la comodín. */
export const esRutaDesconocida = (ruta) => matchRoutes(RUTAS, ruta) === null;
