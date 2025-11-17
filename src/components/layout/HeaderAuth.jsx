import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { clearAuthData } from '../../utils/secureAuth';

const HeaderAuth = ({ user }) => {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const desktopDropdownRef = useRef(null);
  const mobileDropdownRef = useRef(null);

  const handleProfileClick = () => {
    navigate('/profile');
    setIsDropdownOpen(false);
  };

  const handleLogout = () => {
    // Clear auth data
    clearAuthData();

    // Redirect to home
    navigate('/');
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isOutsideDesktop = !desktopDropdownRef.current?.contains(event.target);
      const isOutsideMobile = !mobileDropdownRef.current?.contains(event.target);
      
      if (isOutsideDesktop && isOutsideMobile) {
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
    <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-gray-200 px-4 md:px-10 py-3">
      <Link to="/" className="flex items-center gap-3 text-gray-900 hover:opacity-80 transition-opacity">
        <div className="size-8 md:size-10">
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Shield/Badge Background */}
            <path d="M32 4 L54 12 L54 32 Q54 48 32 60 Q10 48 10 32 L10 12 Z" fill="url(#shieldGradient)" stroke="#1a5a2a" strokeWidth="2"/>

            {/* Inner gold accent border */}
            <path d="M32 8 L50 15 L50 32 Q50 46 32 56 Q14 46 14 32 L14 15 Z" fill="none" stroke="#D4AF37" strokeWidth="1.2" opacity="0.7"/>

            {/* Central golf ball - White with strong border */}
            <circle cx="32" cy="30" r="14" fill="white" stroke="#1a5a2a" strokeWidth="2.5"/>

            {/* Dimples on ball - Hexagonal pattern for uniqueness */}
            <circle cx="28" cy="24" r="1.5" fill="#2d7b3e" opacity="0.6"/>
            <circle cx="32" cy="23" r="1.5" fill="#2d7b3e" opacity="0.6"/>
            <circle cx="36" cy="24" r="1.5" fill="#2d7b3e" opacity="0.6"/>
            <circle cx="26" cy="28" r="1.5" fill="#2d7b3e" opacity="0.6"/>
            <circle cx="30" cy="27" r="1.5" fill="#2d7b3e" opacity="0.6"/>
            <circle cx="34" cy="27" r="1.5" fill="#2d7b3e" opacity="0.6"/>
            <circle cx="38" cy="28" r="1.5" fill="#2d7b3e" opacity="0.6"/>
            <circle cx="28" cy="31" r="1.5" fill="#2d7b3e" opacity="0.6"/>
            <circle cx="32" cy="30" r="1.5" fill="#2d7b3e" opacity="0.6"/>
            <circle cx="36" cy="31" r="1.5" fill="#2d7b3e" opacity="0.6"/>
            <circle cx="30" cy="34" r="1.5" fill="#2d7b3e" opacity="0.6"/>
            <circle cx="34" cy="34" r="1.5" fill="#2d7b3e" opacity="0.6"/>
            <circle cx="32" cy="37" r="1.5" fill="#2d7b3e" opacity="0.6"/>

            {/* Golf flag on the right side */}
            <line x1="42" y1="22" x2="42" y2="38" stroke="#8B6914" strokeWidth="1.8" strokeLinecap="round"/>

            {/* Waving flag - More prominent */}
            <path d="M42 22 L52 25 L52 32 L42 35 Z" fill="#D4AF37" stroke="#8B6914" strokeWidth="0.8"/>
            <path d="M52 25 Q54 28.5 52 32" fill="#FFD700" opacity="0.4"/>

            {/* RCF letters on flag */}
            <text x="45" y="30" fontSize="5" fontWeight="bold" fill="#1a5a2a" fontFamily="Arial, sans-serif">R</text>

            {/* Golf tee at bottom of ball */}
            <path d="M30 44 L34 44 L33 48 L31 48 Z" fill="#D4AF37" stroke="#8B6914" strokeWidth="0.5"/>
            <ellipse cx="32" cy="44" rx="2.5" ry="0.8" fill="#FFD700"/>

            {/* Shine effect on ball */}
            <circle cx="28" cy="25" r="3" fill="white" opacity="0.6"/>
            <circle cx="26" cy="23" r="1.2" fill="white" opacity="0.9"/>

            {/* Bottom banner with RCF */}
            <path d="M18 50 L46 50 L44 56 L20 56 Z" fill="#D4AF37" stroke="#8B6914" strokeWidth="0.8"/>
            <text x="32" y="54.5" fontSize="4.5" fontWeight="bold" fill="#1a5a2a" textAnchor="middle" fontFamily="Arial, sans-serif">RCF</text>

            {/* Decorative corner elements */}
            <circle cx="32" cy="8" r="2" fill="#D4AF37"/>
            <circle cx="18" cy="18" r="1.5" fill="#D4AF37" opacity="0.6"/>
            <circle cx="46" cy="18" r="1.5" fill="#D4AF37" opacity="0.6"/>

            <defs>
              <linearGradient id="shieldGradient" x1="32" y1="4" x2="32" y2="60">
                <stop offset="0%" stopColor="#3a9d4f"/>
                <stop offset="50%" stopColor="#2d7b3e"/>
                <stop offset="100%" stopColor="#1a5a2a"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="flex flex-col">
          <h2 className="text-gray-900 text-lg md:text-xl font-bold leading-tight tracking-tight font-poppins">
            RyderCupFriends
          </h2>
          <span className="text-primary text-xs md:text-sm font-semibold -mt-1">RCF</span>
        </div>
      </Link>

      {/* Desktop Navigation */}
      <div className="hidden md:flex flex-1 justify-end gap-8">
        <div className="flex items-center gap-9">
          <Link to="/dashboard" className="text-gray-900 text-sm font-medium leading-normal hover:text-primary transition-colors">
            Dashboard
          </Link>
          <Link to="/competitions" className="text-gray-900 text-sm font-medium leading-normal hover:text-primary transition-colors">
            My Competitions
          </Link>
          <Link to="/competitions/create" className="text-gray-900 text-sm font-medium leading-normal hover:text-primary transition-colors">
            Create Competition
          </Link>
        </div>

        {/* Desktop Profile Dropdown */}
        <div className="relative" ref={desktopDropdownRef}>
          <button
            onClick={toggleDropdown}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="bg-primary bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 flex items-center justify-center text-white font-bold">
              {getInitials()}
            </div>
          </button>

          {/* Desktop Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <button
                onClick={handleProfileClick}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                View Profile
              </button>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      <div className="md:hidden relative" ref={mobileDropdownRef}>
        <button
          onClick={toggleDropdown}
          className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6 text-gray-900"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {isDropdownOpen ? (
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Mobile Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-primary bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 flex items-center justify-center text-white font-bold text-sm">
                  {getInitials()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>
            <Link
              to="/dashboard"
              onClick={() => setIsDropdownOpen(false)}
              className="block px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              to="/competitions"
              onClick={() => setIsDropdownOpen(false)}
              className="block px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 transition-colors"
            >
              My Competitions
            </Link>
            <Link
              to="/competitions/create"
              onClick={() => setIsDropdownOpen(false)}
              className="block px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 transition-colors"
            >
              Create Competition
            </Link>
            <div className="border-t border-gray-200 my-2"></div>
            <button
              onClick={handleProfileClick}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              View Profile
            </button>
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

HeaderAuth.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.string,
    first_name: PropTypes.string,
    last_name: PropTypes.string,
    email: PropTypes.string,
    handicap: PropTypes.number,
    handicap_updated_at: PropTypes.string,
    created_at: PropTypes.string,
    updated_at: PropTypes.string,
  }),
};

export default HeaderAuth;
