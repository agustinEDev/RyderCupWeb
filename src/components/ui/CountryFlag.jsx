import { useState } from 'react';
import { getCountryFlag } from '../../utils/countryUtils';

// La bandera como imagen. Vivía en `utils/countryUtils.js` y se trajo aquí el
// 9 nov 2026 para que esa ayuda quede sin React (los casos de uso la usan).

/**
 * Get flag image component for a country code
 * Uses flagcdn.com CDN for consistent rendering across all browsers
 * (fixes Chrome/Windows issues with Unicode flag emojis)
 *
 * @param {string} countryCode - ISO 3166-1 alpha-2 code (e.g., 'ES', 'FR', 'US')
 * @param {string} className - Optional CSS class names
 * @param {Object} style - Optional inline styles
 * @param {string} title - Optional title/tooltip text
 * @returns {JSX.Element|null} - img element or null if invalid
 *
 * Examples:
 *   <CountryFlag countryCode="ES" className="w-6 h-6" />
 *   <CountryFlag countryCode="FR" style={{ width: '24px', height: 'auto' }} />
 */
export const CountryFlag = ({
  countryCode,
  className = '',
  style = {},
  title = '',
}) => {
  const [fallbackCode, setFallbackCode] = useState(null);
  const useFallback = fallbackCode === countryCode;

  const isValid =
    countryCode &&
    typeof countryCode === 'string' &&
    /^[A-Z]{2}$/.test(countryCode.trim().toUpperCase());

  if (!isValid) {
    return null;
  }

  const code = countryCode.trim().toUpperCase();
  const lowerCode = code.toLowerCase();

  if (useFallback) {
    const fallback = getCountryFlag(code);
    if (!fallback) return null;
    return (
      <span
        role="img"
        aria-label={title || code}
        title={title || undefined}
        className={className}
        style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
      >
        {fallback}
      </span>
    );
  }

  return (
    <img
      src={`https://flagcdn.com/w40/${lowerCode}.png`}
      srcSet={`https://flagcdn.com/w80/${lowerCode}.png 2x`}
      width={40}
      height={30}
      alt={title || code}
      title={title || undefined}
      className={className}
      loading="lazy"
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
      onError={() => setFallbackCode(countryCode)}
    />
  );
};
