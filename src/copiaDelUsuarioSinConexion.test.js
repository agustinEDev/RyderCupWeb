import { describe, it, expect } from 'vitest';

/**
 * Sin conexión el usuario sale de la copia del dispositivo, que ya no guarda el correo,
 * el pendiente, el género, el hándicap, el país, las fechas ni lo de los proveedores
 * (fase 3, FE-06, opción A). Lo que funciona sin red —arrancar, el guardia de los
 * Términos y anotar— no puede depender de esos campos: este test falla si alguno de sus
 * ficheros empieza a leerlos.
 *
 * El perfil y el panel sí los leen y están cubiertos aparte (Profile.fechas.test.jsx,
 * Dashboard.sinCobertura.test.jsx): enseñan «—» o no pintan lo que falta.
 */
const fuentes = import.meta.glob(
  [
    '/src/App.jsx',
    '/src/hooks/useAuth.js',
    '/src/hooks/useTerminosPendientes.js',
    '/src/components/auth/ProtectedRoute.jsx',
    '/src/components/auth/RoleGuard.jsx',
    '/src/components/layout/HeaderAuth.jsx',
    '/src/components/layout/BottomNav.jsx',
    '/src/domain/services/aceptacionDeTerminos.js',
    '/src/pages/AcceptTerms.jsx',
    '/src/pages/player/ScoringPage.jsx',
    '/src/pages/player/GroupScoringPage.jsx',
    '/src/pages/quick_match/QuickMatchScoringPage.jsx',
    '/src/utils/vueltaTrasEntrar.js',
    '/src/infrastructure/http/tokenRefreshInterceptor.js',
  ],
  { query: '?raw', import: 'default', eager: true }
);

const QUITADOS =
  /\b(?:user|usuario|currentUser|authUser|recordado)\??\.(?:email|pending_email|pendingEmail|gender|handicap|handicap_updated_at|country_code|countryCode|created_at|auth_providers|authProviders|has_password|hasPassword|share_activity)\b/;

describe('Lo que funciona sin conexión no lee lo que la copia ya no guarda (fase 3)', () => {
  it('están todos los ficheros', () => {
    expect(Object.keys(fuentes)).toHaveLength(14);
  });

  it.each(Object.entries(fuentes))('%s', (_fichero, codigo) => {
    const lineas = codigo
      .split('\n')
      .filter((linea) => !/^\s*(\/\/|\*|\/\*)/.test(linea))
      .filter((linea) => QUITADOS.test(linea));
    expect(lineas).toEqual([]);
  });
});
