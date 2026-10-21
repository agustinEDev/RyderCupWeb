import { useState, useCallback, lazy, Suspense } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Home, Trophy, Sparkles, User, Zap } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNovedadesDeActividad, useVigilanciaDeNovedades } from '../../hooks/useNovedadesDeActividad';
import InsigniaDeNovedades from '../feed/InsigniaDeNovedades';

// El modal solo se necesita cuando el usuario pulsa el FAB: fuera del bundle inicial
const CreateQuickMatchModal = lazy(() => import('../quick_match/CreateQuickMatchModal'));

/**
 * Lanzador de partida rápida.
 *
 * Se monta solo al pulsar el FAB para que `useAuth()` (que consulta
 * /auth/current-user) no dispare una petición extra en cada página.
 */
const QuickMatchLauncher = ({ onClose, onStarted }) => {
  const { user, loading } = useAuth();

  if (loading || !user) return null;

  return (
    <Suspense fallback={null}>
      <CreateQuickMatchModal onClose={onClose} onStarted={onStarted} currentUser={user} />
    </Suspense>
  );
};

const ID_DESCRIPCION_NOVEDADES = 'bottom-nav-novedades';

const NavItem = ({ to, icon: Icon, label, isActive, novedades = 0 }) => (
  <Link
    to={to}
    aria-current={isActive ? 'page' : undefined}
    aria-describedby={novedades > 0 ? ID_DESCRIPCION_NOVEDADES : undefined}
    className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 px-1 py-2 transition-colors ${
      isActive ? 'text-primary' : 'text-gray-500 active:text-gray-900'
    }`}
  >
    <span className="relative">
      <Icon className="h-6 w-6" strokeWidth={isActive ? 2.4 : 2} aria-hidden="true" />
      <InsigniaDeNovedades n={novedades} className="absolute -top-1.5 left-1/2 ml-1.5" />
    </span>
    <span className="text-[10px] font-medium leading-none">{label}</span>
  </Link>
);

/**
 * Navegación inferior para móvil (FE #306).
 *
 * Inicio · Torneos · ⚡Partida (FAB) · Jugadores · Perfil.
 * Solo visible por debajo de `md`; en escritorio manda el menú de HeaderAuth.
 */
const BottomNav = () => {
  const { t } = useTranslation('common');
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [showQuickMatchModal, setShowQuickMatchModal] = useState(false);

  const handleQuickMatchStarted = useCallback((quickMatchId) => {
    setShowQuickMatchModal(false);
    navigate(`/quick-matches/${quickMatchId}/scoring`);
  }, [navigate]);

  const isActive = (path) => pathname === path || pathname.startsWith(`${path}/`);

  // El número de Actividad se pide desde aquí: la barra está montada en toda
  // pantalla con sesión (en escritorio, oculta por CSS) y fuera de la
  // anotación, que es justo cuando tiene sentido preguntarlo (FE-1)
  useVigilanciaDeNovedades();
  const novedades = useNovedadesDeActividad();

  return (
    <>
      {showQuickMatchModal && (
        <QuickMatchLauncher
          onClose={() => setShowQuickMatchModal(false)}
          onStarted={handleQuickMatchStarted}
        />
      )}

      <nav
        data-testid="bottom-nav"
        aria-label={t('bottomNav.label')}
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]"
      >
        {/* Fuera del enlace para no cambiarle el nombre: lo cuenta como
            descripción. `hidden` evita que se lea dos veces */}
        {novedades > 0 && (
          <span id={ID_DESCRIPCION_NOVEDADES} hidden>
            {t('bottomNav.unseen', { count: novedades })}
          </span>
        )}
        <div className="grid grid-cols-5 items-center">
          <NavItem
            to="/dashboard"
            icon={Home}
            label={t('bottomNav.home')}
            isActive={isActive('/dashboard')}
          />
          <NavItem
            to="/competitions"
            icon={Trophy}
            label={t('bottomNav.tournaments')}
            isActive={isActive('/competitions')}
          />

          {/* FAB central: partida rápida */}
          <div className="flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={() => setShowQuickMatchModal(true)}
              aria-label={t('bottomNav.quickMatch')}
              className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 ring-4 ring-white transition-colors active:bg-primary-600"
            >
              <Zap className="h-7 w-7" aria-hidden="true" />
            </button>
            <span className="pb-2 pt-1 text-[10px] font-medium leading-none text-gray-500">
              {t('bottomNav.quickMatch')}
            </span>
          </div>

          {/* El feed ocupa el sitio que tenía Amigos: la barra vive de sus cinco
              posiciones con el FAB centrado, y una sexta la descoloca. La lista
              de amigos queda a un toque, dentro del propio feed, que es donde
              uno acaba mirando a sus amigos de todos modos. */}
          <NavItem
            to="/feed"
            icon={Sparkles}
            label={t('bottomNav.feed')}
            isActive={isActive('/feed') || isActive('/friends')}
            novedades={novedades}
          />
          <NavItem
            to="/profile"
            icon={User}
            label={t('bottomNav.profile')}
            isActive={isActive('/profile')}
          />
        </div>
      </nav>
    </>
  );
};

export default BottomNav;
