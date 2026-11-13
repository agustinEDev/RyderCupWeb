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
    // Las piezas en que se partieron las tres pantallas de anotar (fase 5, 13 nov)
    '/src/components/quick_match/AvisosDePartidaRapida.jsx',
    '/src/components/quick_match/DialogosDePartidaRapida.jsx',
    '/src/components/quick_match/PestanaDeAnotarRapida.jsx',
    '/src/components/quick_match/PestanaDeClasificacionRapida.jsx',
    '/src/components/scoring/AvisosDelPartido.jsx',
    '/src/components/scoring/CabeceraDelPartido.jsx',
    '/src/components/scoring/EntregaDelPartido.jsx',
    '/src/components/scoring/ModalesDelPartido.jsx',
    '/src/components/scoring/PestanaDeAnotar.jsx',
    '/src/components/scoring/PestanasDelPartido.jsx',
    '/src/components/scoring/SinNadaQuePintar.jsx',
    '/src/hooks/useAccionesDelPartido.js',
    '/src/hooks/useCandadoDeLaSesion.js',
    '/src/hooks/useCargaDePartidaRapida.js',
    '/src/hooks/useCierreDePartidaRapida.js',
    '/src/hooks/useClasificacionAlAbrir.js',
    '/src/hooks/useColaDelPartido.js',
    '/src/hooks/useDespertarALaHora.js',
    '/src/hooks/useFocoDeLosDialogos.js',
    '/src/hooks/useNoGuardados.js',
    '/src/hooks/useVaciadoDePartidaRapida.js',
    '/src/hooks/useVistaDelPartido.js',
    '/src/utils/casillasDelHoyo.js',
    '/src/utils/colaDePartidaRapida.js',
    '/src/utils/estadoDelPartido.js',
    '/src/utils/fallosDeLaAnotacion.js',
    '/src/utils/lecturaDelHoyo.js',
    '/src/utils/lecturaDelPartido.js',
    '/src/utils/textosDePartidaRapida.js',
    '/src/utils/vistaDeLaAnotacion.js',
    '/src/utils/vueltaTrasEntrar.js',
    '/src/infrastructure/http/tokenRefreshInterceptor.js',
  ],
  { query: '?raw', import: 'default', eager: true }
);

const QUITADOS =
  /\b(?:user|usuario|currentUser|authUser|recordado)\??\.(?:email|pending_email|pendingEmail|gender|handicap|handicap_updated_at|country_code|countryCode|created_at|auth_providers|authProviders|has_password|hasPassword|share_activity)\b/;

describe('Lo que funciona sin conexión no lee lo que la copia ya no guarda (fase 3)', () => {
  it('están todos los ficheros', () => {
    expect(Object.keys(fuentes)).toHaveLength(44);
  });

  it.each(Object.entries(fuentes))('%s', (_fichero, codigo) => {
    const lineas = codigo
      .split('\n')
      .filter((linea) => !/^\s*(\/\/|\*|\/\*)/.test(linea))
      .filter((linea) => QUITADOS.test(linea));
    expect(lineas).toEqual([]);
  });
});

/**
 * Auditoría de todos los lectores de los campos que la copia del dispositivo ya no
 * guarda (revisión de la fase 3). Cada fichero que los lee está aquí con su decisión:
 * - «desconocido»: funciona sin el dato (lo pinta como «—», neutro, o no lo pide)
 * - «espera»: no usa el dato mientras la sesión está sin confirmar (`sinConfirmar`)
 * - «otro usuario»: lee datos de otra persona que vienen de la API, no la sesión
 * Un fichero nuevo que lea alguno de esos campos hace fallar este test hasta decidir.
 */
const AUDITADOS = {
  '/src/hooks/useEditProfile.jsx': 'espera: no rellena el formulario sin confirmar',
  '/src/pages/EditProfile.jsx': 'espera: sin confirmar dice que no hay conexión',
  '/src/pages/Profile.jsx': 'desconocido: «—», sin hándicap/país; el interruptor de actividad espera',
  '/src/components/profile/ActivitySharingToggle.jsx': 'espera: solo se monta con la sesión confirmada',
  '/src/pages/Dashboard.jsx': 'espera: partida rápida, modal y refresco del hándicap; el correo, si lo hay',
  '/src/components/profile/HandicapRequestModal.jsx': 'espera: el panel no lo abre sin confirmar',
  '/src/components/quick_match/CreateQuickMatchModal.jsx': 'espera: el panel no lo abre sin confirmar',
  '/src/pages/CompetitionDetail.jsx': 'desconocido: etiquetas neutras; falta el hándicap por la regla',
  '/src/pages/Competitions.jsx': 'desconocido: etiqueta de inscripción neutra',
  '/src/pages/player/MyInvitationsPage.jsx': 'desconocido: el aviso sin botón de reenviar',
  '/src/utils/datosQueFaltanSinConexion.js': 'la regla misma (faltaElGenero / faltaElHandicap)',
  '/src/components/admin/hoyos/TodosLosCampos.jsx': 'espera: administración; sin confirmar no hay is_admin',
  '/src/utils/countryUtils.js': 'espera: solo lo usa EditProfile',
  '/src/components/admin/AdminUsersTable.jsx': 'otro usuario',
  '/src/components/admin/EditUserModal.jsx': 'otro usuario',
  '/src/application/assemblers/EnrollmentAssembler.js': 'otro usuario',
  '/src/infrastructure/mappers/EnrollmentMapper.js': 'otro usuario',
  '/src/application/use_cases/handicap/UpdateRfegHandicapUseCase.js': 'otro usuario: la entidad del repositorio',
};

describe('Todos los lectores de los campos quitados están auditados (revisión fase 3)', () => {
  const todas = import.meta.glob(['/src/**/*.{js,jsx,ts,tsx}', '!/src/**/*.test.{js,jsx,ts,tsx}'], {
    query: '?raw',
    import: 'default',
    eager: true,
  });

  it('ninguno nuevo sin decidir', () => {
    const lectores = Object.entries(todas)
      .filter(([, codigo]) =>
        codigo.split('\n').some((linea) => !/^\s*(\/\/|\*|\/\*)/.test(linea) && QUITADOS.test(linea))
      )
      .map(([fichero]) => fichero)
      .sort();

    expect(lectores.filter((fichero) => !(fichero in AUDITADOS))).toEqual([]);
  });
});
