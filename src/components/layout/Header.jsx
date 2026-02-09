import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../ui/LanguageSwitcher';

const Header = () => {
  const { t } = useTranslation('common');
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
    <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-gray-200 px-4 md:px-10 py-3 overflow-visible">
      <Link to="/" className="flex items-center gap-3 text-gray-900 hover:opacity-80 transition-opacity">
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

      {/* Desktop Menu */}
      <div className="hidden md:flex flex-1 justify-end gap-8">
        <div className="flex items-center gap-9">
          <a className="text-gray-900 text-sm font-medium leading-normal" href="/#features">
            {t('header.features')}
          </a>
          <Link className="text-gray-900 text-sm font-medium leading-normal" to="/pricing">
            {t('header.pricing')}
          </Link>
          <Link className="text-gray-900 text-sm font-medium leading-normal" to="/contact">
            {t('header.support')}
          </Link>
        </div>

        {/* Language Switcher */}
        <LanguageSwitcher />

        <div className="flex gap-2">
          <Link to="/register">
            <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-wide hover:bg-primary/90 transition-colors">
              <span className="truncate">{t('header.register')}</span>
            </button>
          </Link>
          <Link to="/login">
            <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-100 text-gray-900 text-sm font-bold leading-normal tracking-wide hover:bg-gray-200 transition-colors">
              <span className="truncate">{t('header.signIn')}</span>
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
              href="/#features"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 transition-colors"
            >
              {t('header.features')}
            </a>
            <Link
              to="/pricing"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 transition-colors"
            >
              {t('header.pricing')}
            </Link>
            <Link
              to="/contact"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 transition-colors"
            >
              {t('header.support')}
            </Link>
            <div className="border-t border-gray-200 my-2"></div>

            {/* Language Switcher - Mobile */}
            <div className="px-4 py-2">
              <LanguageSwitcher />
            </div>

            <div className="border-t border-gray-200 my-2"></div>
            <Link
              to="/register"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-4 py-2 text-sm text-white bg-primary hover:bg-primary/90 transition-colors mx-2 rounded-lg text-center font-bold"
            >
              {t('header.register')}
            </Link>
            <Link
              to="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-4 py-2 text-sm text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors mx-2 mt-2 rounded-lg text-center font-bold"
            >
              {t('header.signIn')}
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
