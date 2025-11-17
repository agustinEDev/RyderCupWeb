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
            {/* Shield Background - Simple gradient */}
            <path d="M32 6 L52 14 L52 32 Q52 46 32 58 Q12 46 12 32 L12 14 Z" fill="url(#shieldGradient)" stroke="#1a5a2a" strokeWidth="2.5"/>

            {/* Golf ball - White with strong contrast */}
            <circle cx="32" cy="32" r="16" fill="white" stroke="#1a5a2a" strokeWidth="2.5"/>

            {/* Simple dimples pattern */}
            <circle cx="26" cy="26" r="2" fill="#2d7b3e" opacity="0.4"/>
            <circle cx="32" cy="24" r="2" fill="#2d7b3e" opacity="0.4"/>
            <circle cx="38" cy="26" r="2" fill="#2d7b3e" opacity="0.4"/>
            <circle cx="24" cy="32" r="2" fill="#2d7b3e" opacity="0.4"/>
            <circle cx="32" cy="32" r="2" fill="#2d7b3e" opacity="0.4"/>
            <circle cx="40" cy="32" r="2" fill="#2d7b3e" opacity="0.4"/>
            <circle cx="26" cy="38" r="2" fill="#2d7b3e" opacity="0.4"/>
            <circle cx="32" cy="40" r="2" fill="#2d7b3e" opacity="0.4"/>
            <circle cx="38" cy="38" r="2" fill="#2d7b3e" opacity="0.4"/>

            {/* Golf flag - Simple and clean */}
            <line x1="44" y1="24" x2="44" y2="40" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round"/>
            <path d="M44 24 L54 27 L54 33 L44 36 Z" fill="#D4AF37"/>

            {/* Shine on ball */}
            <circle cx="26" cy="26" r="4" fill="white" opacity="0.5"/>

            <defs>
              <linearGradient id="shieldGradient" x1="32" y1="6" x2="32" y2="58">
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
