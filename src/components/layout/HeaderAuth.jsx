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
        <div className="size-10 md:size-12">
          <img
            src="/images/rcf-monogram-green.jpeg"
            alt="RCF Logo"
            className="w-full h-full object-contain"
          />
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
