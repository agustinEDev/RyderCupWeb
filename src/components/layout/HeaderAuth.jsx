import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { broadcastLogout } from '../../utils/broadcastAuth';
import { logoutUseCase } from '../../composition';
import LanguageSwitcher from '../ui/LanguageSwitcher';

const HeaderAuth = ({ user }) => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const desktopDropdownRef = useRef(null);

  const handleProfileClick = () => {
    navigate('/profile');
    setIsDropdownOpen(false);
  };

  const handleLogout = async () => {
    // Broadcast logout event to all other tabs FIRST
    broadcastLogout();

    try {
      await logoutUseCase.execute();
    } catch {
      // Continue with logout anyway to clear frontend state
    }

    // Force full page reload to clear all state
    window.location.href = '/';
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!desktopDropdownRef.current?.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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
      <Link to="/dashboard" className="flex items-center gap-3 text-gray-900 hover:opacity-80 transition-opacity">
        <div className="h-10 w-10 md:h-12 md:w-12 flex-shrink-0 flex items-center justify-center overflow-visible">
          <img
            src="/images/rcf-monogram-green.jpeg"
            alt="RCF Logo"
            className="block h-full w-auto object-contain transform -translate-y-[2px] md:-translate-y-[2px] scale-105 md:scale-110"
          />
        </div>
        <h2 className="text-gray-900 text-lg md:text-xl font-bold leading-tight tracking-tight font-poppins">
          RyderCupFriends
        </h2>
      </Link>

      {/* Desktop Navigation */}
      <div className="hidden md:flex flex-1 justify-end gap-8">
        <div className="flex items-center gap-9">
          <Link to="/dashboard" className="text-gray-900 text-sm font-medium leading-normal hover:text-primary transition-colors">
            {t('header.dashboard')}
          </Link>
          <Link to="/browse-competitions" className="text-gray-900 text-sm font-medium leading-normal hover:text-primary transition-colors">
            {t('header.browseCompetitions')}
          </Link>
          <Link to="/competitions" className="text-gray-900 text-sm font-medium leading-normal hover:text-primary transition-colors">
            {t('header.myCompetitions')}
          </Link>
          <Link to="/competitions/create" className="text-gray-900 text-sm font-medium leading-normal hover:text-primary transition-colors">
            {t('header.createCompetition')}
          </Link>
          <Link to="/player/invitations" className="text-gray-900 text-sm font-medium leading-normal hover:text-primary transition-colors">
            {t('header.myInvitations')}
          </Link>

        </div>

        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* Desktop Profile Dropdown */}
        <div className="relative" ref={desktopDropdownRef}>
          <button
            onClick={toggleDropdown}
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
          </button>

          {/* Desktop Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <button
                onClick={handleProfileClick}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {t('header.viewProfile')}
              </button>
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
