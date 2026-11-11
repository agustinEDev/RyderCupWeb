import { useState } from 'react';
import { User } from 'lucide-react';
import { getApiBaseUrl, segmento } from '../../composition/http';

const SIZE_CLASSES = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-24 h-24',
  xl: 'w-32 h-32',
};

const ICON_SIZE_CLASSES = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

/**
 * Avatar - Displays a user's active avatar (preset or uploaded photo).
 *
 * Works for ANY user (self or other) with just their id: the backend resolves
 * whether the active avatar is a preset or an uploaded photo, so this
 * component never needs to know which. Falls back to a generic placeholder
 * icon on load error: the API answers 204 with no image when there is nothing to
 * show (no avatar, unknown user, a user who blocked you; BE #793), or the network failed.
 *
 * @param {string} userId - UUID of the user whose avatar to display
 * @param {'sm'|'md'|'lg'|'xl'} size - Preset size (default 'md')
 * @param {string} className - Extra classes merged onto the container
 * @param {string|number} version - Optional cache-busting value (e.g. user.updated_at)
 */
const Avatar = ({ userId, size = 'md', className = '', version }) => {
  // Guarda el `src` concreto que falló, no un booleano: así, si userId/version
  // cambian (p.ej. tras cambiar de avatar), el `src` nuevo ya no coincide con
  // el que falló y el componente reintenta cargarlo automáticamente en el
  // siguiente render, sin necesitar un efecto que resetee el estado.
  const [erroredSrc, setErroredSrc] = useState(null);

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const iconSizeClass = ICON_SIZE_CLASSES[size] || ICON_SIZE_CLASSES.md;
  const containerClass = `${sizeClass} rounded-full overflow-hidden flex items-center justify-center bg-gray-100 border border-gray-200 shrink-0 ${className}`;

  const src = userId
    ? `${getApiBaseUrl()}/api/v1/users/${segmento(userId)}/avatar${version ? `?v=${encodeURIComponent(version)}` : ''}`
    : null;
  const hasError = src !== null && erroredSrc === src;

  if (!src || hasError) {
    return (
      <div className={containerClass}>
        <User className={`${iconSizeClass} text-gray-400`} />
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <img
        src={src}
        alt="Avatar"
        crossOrigin="use-credentials"
        className="w-full h-full object-cover"
        onError={() => setErroredSrc(src)}
      />
    </div>
  );
};

export default Avatar;
