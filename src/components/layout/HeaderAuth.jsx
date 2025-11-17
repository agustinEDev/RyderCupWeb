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
            {/* Circular green background */}
            <circle cx="32" cy="32" r="30" fill="url(#greenCircleGradient)" stroke="#1a5a2a" strokeWidth="2.5"/>

            {/* Golfer silhouette in finish position */}
            <g fill="#D4AF37">
              {/* Head */}
              <circle cx="28" cy="18" r="3"/>

              {/* Body - leaning back in finish */}
              <path d="M28 21 L27 26 L25 32 L24 38"/>
              <path d="M28 21 L29 26 L31 32 L32 38" strokeWidth="2.5" stroke="#D4AF37" strokeLinecap="round"/>

              {/* Arms - club over shoulder */}
              <path d="M28 22 L32 20 L38 18 L42 16" strokeWidth="2.5" stroke="#D4AF37" strokeLinecap="round"/>
              <path d="M28 23 L26 24 L24 26" strokeWidth="2" stroke="#D4AF37" strokeLinecap="round"/>

              {/* Golf club */}
              <path d="M38 18 L44 14" strokeWidth="2" stroke="#D4AF37" strokeLinecap="round"/>
              <circle cx="44.5" cy="13.5" r="1.5" fill="#D4AF37"/>

              {/* Legs - classic finish pose */}
              <path d="M25 38 L24 44 L23 48" strokeWidth="2.5" stroke="#D4AF37" strokeLinecap="round"/>
              <path d="M32 38 L34 44 L36 48" strokeWidth="2.5" stroke="#D4AF37" strokeLinecap="round"/>

              {/* Front foot */}
              <ellipse cx="36" cy="48.5" rx="2.5" ry="1" fill="#D4AF37"/>
              {/* Back foot - on toe */}
              <ellipse cx="23" cy="48.5" rx="1.5" ry="1" fill="#D4AF37"/>
            </g>

            {/* RCF Text */}
            <text x="32" y="58" fontSize="7" fontWeight="bold" fill="#D4AF37" textAnchor="middle" fontFamily="Arial, sans-serif">RCF</text>

            <defs>
              <linearGradient id="greenCircleGradient" x1="32" y1="2" x2="32" y2="62">
                <stop offset="0%" stopColor="#3a9d4f"/>
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
