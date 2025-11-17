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
            {/* Golf Ball with dimples */}
            <circle cx="32" cy="32" r="28" fill="#2d7b3e" opacity="0.1"/>
            <circle cx="32" cy="32" r="24" fill="url(#golfGradient)" stroke="#2d7b3e" strokeWidth="2"/>

            {/* Dimples pattern - centered symmetrically */}
            <circle cx="32" cy="32" r="1.5" fill="#2d7b3e" opacity="0.3"/>
            <circle cx="32" cy="24" r="1.5" fill="#2d7b3e" opacity="0.3"/>
            <circle cx="32" cy="40" r="1.5" fill="#2d7b3e" opacity="0.3"/>
            <circle cx="24" cy="32" r="1.5" fill="#2d7b3e" opacity="0.3"/>
            <circle cx="40" cy="32" r="1.5" fill="#2d7b3e" opacity="0.3"/>
            <circle cx="26" cy="26" r="1.5" fill="#2d7b3e" opacity="0.3"/>
            <circle cx="38" cy="38" r="1.5" fill="#2d7b3e" opacity="0.3"/>
            <circle cx="38" cy="26" r="1.5" fill="#2d7b3e" opacity="0.3"/>
            <circle cx="26" cy="38" r="1.5" fill="#2d7b3e" opacity="0.3"/>
            <circle cx="28" cy="30" r="1.5" fill="#2d7b3e" opacity="0.3"/>
            <circle cx="36" cy="34" r="1.5" fill="#2d7b3e" opacity="0.3"/>
            <circle cx="36" cy="30" r="1.5" fill="#2d7b3e" opacity="0.3"/>
            <circle cx="28" cy="34" r="1.5" fill="#2d7b3e" opacity="0.3"/>

            {/* Golf tee */}
            <path d="M30 56 L34 56 L33 48 L31 48 Z" fill="#D4AF37"/>
            <ellipse cx="32" cy="48" rx="3" ry="1" fill="#D4AF37"/>

            {/* Accent shine */}
            <circle cx="28" cy="28" r="4" fill="white" opacity="0.4"/>

            <defs>
              <linearGradient id="golfGradient" x1="8" y1="8" x2="56" y2="56">
                <stop offset="0%" stopColor="white"/>
                <stop offset="100%" stopColor="#f0f0f0"/>
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
