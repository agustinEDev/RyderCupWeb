import { useState, useEffect } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function matches(query) {
  return typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
}

function useMediaQuery(query) {
  const [isMatch, setIsMatch] = useState(() => matches(query));

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;

    const mediaQuery = window.matchMedia(query);
    const handleChange = (event) => setIsMatch(event.matches);

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return isMatch;
}

/**
 * Decides whether entry animations should run (FE #302).
 *
 * - `prefers-reduced-motion: reduce` disables every entry animation.
 * - On mobile, scroll reveals are disabled too: fast scrolling on a small
 *   viewport is where sections were being caught mid-animation (blank).
 *
 * @returns {{animateEntry: boolean, animateOnScroll: boolean}}
 */
export function useEntryMotion() {
  const prefersReducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const isMobile = useMediaQuery(MOBILE_QUERY);

  return {
    animateEntry: !prefersReducedMotion,
    animateOnScroll: !prefersReducedMotion && !isMobile,
  };
}
