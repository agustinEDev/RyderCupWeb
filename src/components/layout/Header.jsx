import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

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

      {/* Desktop Menu */}
      <div className="hidden md:flex flex-1 justify-end gap-8">
        <div className="flex items-center gap-9">
          <a className="text-gray-900 text-sm font-medium leading-normal" href="#features">
            Features
          </a>
          <a className="text-gray-900 text-sm font-medium leading-normal" href="#pricing">
            Pricing
          </a>
          <a className="text-gray-900 text-sm font-medium leading-normal" href="#support">
            Support
          </a>
        </div>
        <div className="flex gap-2">
          <Link to="/register">
            <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-wide hover:bg-primary/90 transition-colors">
              <span className="truncate">Register</span>
            </button>
          </Link>
          <Link to="/login">
            <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-100 text-gray-900 text-sm font-bold leading-normal tracking-wide hover:bg-gray-200 transition-colors">
              <span className="truncate">Sign In</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Mobile Menu Button */}
      <div className="md:hidden relative" ref={mobileMenuRef}>
        <button
          onClick={toggleMobileMenu}
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
            {isMobileMenuOpen ? (
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
            <a
              href="#features"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 transition-colors"
            >
              Features
            </a>
            <a
              href="#pricing"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 transition-colors"
            >
              Pricing
            </a>
            <a
              href="#support"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 transition-colors"
            >
              Support
            </a>
            <div className="border-t border-gray-200 my-2"></div>
            <Link
              to="/register"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-4 py-2 text-sm text-white bg-primary hover:bg-primary/90 transition-colors mx-2 rounded-lg text-center font-bold"
            >
              Register
            </Link>
            <Link
              to="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-4 py-2 text-sm text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors mx-2 mt-2 rounded-lg text-center font-bold"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
