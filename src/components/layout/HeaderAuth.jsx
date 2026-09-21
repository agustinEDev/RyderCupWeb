import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronDown, Globe } from 'lucide-react';
import { useLogout } from '../../hooks/useLogout';
import { resolveScreen } from './screenTitles';
import { useGoBack } from '../../hooks/useGoBack';
import LanguageSwitcher from '../ui/LanguageSwitcher';
import BrandMark from '../ui/BrandMark';

// Los destinos de la navegacion de escritorio. Se pintan dos veces —en linea
// desde xl y dentro del desplegable del avatar por debajo—, asi que viven en
// un solo sitio
const NAVEGACION = [
  { to: '/dashboard', clave: 'header.dashboard' },
  { to: '/browse-competitions', clave: 'header.browseCompetitions' },
  { to: '/competitions', clave: 'header.myCompetitions' },
  { to: '/competitions/create', clave: 'header.createCompetition' },
  { to: '/player/invitations', clave: 'header.myInvitations' },
  // El feed solo se alcanzaba desde la navegacion inferior, que es md:hidden:
  // en escritorio no habia forma de llegar salvo tecleando la URL. Amigos ya no
  // va aqui suelto porque se entra desde dentro del propio feed, igual que en movil
  { to: '/feed', clave: 'header.feed' },
];

/**
 * @param {string} [title] - Sustituye al titulo del mapa de rutas. Para
 *   pantallas cuyo nombre solo se conoce en ejecucion (el de un torneo).
 * @param {string|null} [backTo] - Sustituye al destino de la flecha. `null`
 *   explicito la retira.
 */
const HeaderAuth = ({ user, title, backTo }) => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const desktopDropdownRef = useRef(null);
  const botonPerfilRef = useRef(null);
  const { logout } = useLogout();

  // En movil la cabecera dice donde estas y como volver; repetir la marca en
  // cada pantalla es lenguaje de sitio web, no de aplicacion (FE #310)
  const screen = resolveScreen(location.pathname);
  const screenTitle = title ?? (screen ? t(screen.titleKey) : null);
  const screenBackTo = backTo !== undefined ? backTo : screen?.backTo ?? null;

  // Pantallas sin padre unico vuelven por donde se vino. En escritorio la
  // vuelta la pone la propia pagina, junto al contenido, como hace el detalle
  // de un torneo: una flecha suelta en la cabecera desentona
  const backByHistory = backTo === undefined && !!screen?.backByHistory;
  const goBack = useGoBack();

  const backArrowClasses =
    'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-gray-700 transition-colors active:bg-gray-100';

  const handleProfileClick = () => {
    navigate('/profile');
    setIsDropdownOpen(false);
  };

  // La salida es una sola y vive en `useLogout` (FE #531): esta hacia su
  // peticion y redirigia, sin limpiar nada, y lo mismo la del perfil
  const handleLogout = () => logout({ recargarEn: '/' });

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Close dropdown when clicking outside, or on Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!desktopDropdownRef.current?.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      // Con el foco dentro, al desaparecer el desplegable caeria al body: se
      // devuelve al avatar para que quien va con teclado no pierda el sitio
      if (desktopDropdownRef.current?.contains(document.activeElement)) {
        botonPerfilRef.current?.focus();
      }
      setIsDropdownOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (!user) return '?';
    const firstInitial = user.first_name?.[0] || '';
    const lastInitial = user.last_name?.[0] || '';
    return `${firstInitial}${lastInitial}`.toUpperCase();
  };

  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-gray-200 px-4 md:px-10 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] overflow-visible">
      {/* Movil: titulo de pantalla, con flecha si hay pantalla padre. Sin
          titulo en el mapa (alta de perfil, rutas sueltas) se mantiene la
          marca, que es el comportamiento anterior */}
      {screenTitle ? (
        <div className="md:hidden flex items-center gap-2 min-w-0 flex-1">
          {screenBackTo && (
            <Link
              to={screenBackTo}
              aria-label={t('back')}
              className={`-ml-2 ${backArrowClasses}`}
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
          )}
          {/* Excluyente con la de arriba a proposito: hoy ninguna pantalla
              declara `parent` y `back: 'history'` a la vez, pero el mapa esta
              hecho para crecer y la primera que declarase ambos pintaria dos
              flechas seguidas */}
          {!screenBackTo && backByHistory && (
            <button
              type="button"
              onClick={goBack}
              aria-label={t('back')}
              className={`-ml-2 ${backArrowClasses}`}
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
          <h1 className="truncate text-lg font-bold leading-tight tracking-tight text-gray-900 font-poppins">
            {screenTitle}
          </h1>
        </div>
      ) : (
        <Link to="/dashboard" className="md:hidden flex items-center gap-3 text-gray-900 hover:opacity-80 transition-opacity">
          <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center overflow-visible">
            <BrandMark className="block h-full w-auto  transform -translate-y-[2px] scale-105" title={t('brandMarkAlt')} />
          </div>
          <h2 className="text-gray-900 text-lg font-bold leading-tight tracking-tight font-poppins">
            RyderCupFriends
          </h2>
        </Link>
      )}

      {/* Escritorio: la marca no se toca */}
      <Link to="/dashboard" className="hidden md:flex items-center gap-3 text-gray-900 hover:opacity-80 transition-opacity">
        <div className="h-12 w-12 flex-shrink-0 flex items-center justify-center overflow-visible">
          <BrandMark className="block h-full w-auto  transform -translate-y-[2px] scale-110" title={t('brandMarkAlt')} />
        </div>
        <h2 className="text-gray-900 text-xl font-bold leading-tight tracking-tight font-poppins">
          RyderCupFriends
        </h2>
      </Link>

      {/* Desktop Navigation */}
      <div className="hidden md:flex flex-1 justify-end gap-8">
        {/* En linea solo desde xl: con todo junto la cabecera pide ~1250 px, y por
            debajo la pagina se desplazaba en horizontal (FE #680). Por debajo,
            los mismos enlaces van al desplegable del avatar */}
        <div data-testid="navegacion-en-linea" className="hidden xl:flex items-center gap-9">
          {NAVEGACION.map(({ to, clave }) => (
            <Link
              key={to}
              to={to}
              className="text-gray-900 text-sm font-medium leading-normal hover:text-primary transition-colors"
            >
              {t(clave)}
            </Link>
          ))}
        </div>

        {/* Desktop Profile Dropdown */}
        <div className="relative" ref={desktopDropdownRef}>
          <button
            ref={botonPerfilRef}
            onClick={toggleDropdown}
            aria-expanded={isDropdownOpen}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            {user?.is_admin && (
              <span data-testid="admin-badge" className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {t('header.adminBadge')}
              </span>
            )}
            <div className="bg-primary bg-center bg-no-repeat aspect-square bg-cover rounded-full h-8 w-8 md:h-10 md:w-10 flex items-center justify-center text-white font-bold text-sm md:text-base">
              {getInitials()}
            </div>
            {/* Por debajo de xl los enlaces viven aqui dentro: tiene que notarse
                que el avatar se abre (FE #680) */}
            <ChevronDown
              data-testid="indicador-desplegable"
              aria-hidden="true"
              className={`-ml-1 h-4 w-4 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Desktop Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <div data-testid="navegacion-en-desplegable" className="xl:hidden">
                {NAVEGACION.map(({ to, clave }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setIsDropdownOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    {t(clave)}
                  </Link>
                ))}
                <div className="border-t border-gray-200 my-1" />
              </div>
              <button
                onClick={handleProfileClick}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {t('header.viewProfile')}
              </button>
              {/* El idioma vive aqui y no en la barra: es un ajuste de la cuenta y
                  ocupaba el sitio que les faltaba a los enlaces (FE #680). En la
                  portada sigue en la barra, que alli no hay cuenta */}
              <div
                data-testid="idioma-en-desplegable"
                className="flex items-center justify-between gap-3 px-4 py-2 text-sm text-gray-700"
              >
                <span className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-500" aria-hidden="true" />
                  {t('header.language')}
                </span>
                <LanguageSwitcher />
              </div>
              {user?.is_admin && (
                <>
                  <div className="border-t border-gray-200 my-1" />
                  <p className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {t('header.administration')}
                  </p>
                  <Link
                    to="/admin"
                    onClick={() => setIsDropdownOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    {t('header.adminPanel')}
                  </Link>
                </>
              )}
              <div className="border-t border-gray-200 my-1" />
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                {t('header.logout')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* En móvil no hay menú: la navegación vive en <BottomNav /> (FE #306).
          Idioma, panel Admin y cierre de sesión están en /profile. */}
    </header>
  );
};

export default HeaderAuth;
