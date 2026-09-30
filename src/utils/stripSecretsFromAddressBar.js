/**
 * Quita de la barra de direcciones los secretos que trae la URL: el token del
 * enlace de restablecimiento o de verificacion, y el code/state de Google.
 *
 * La pagina lo llama en cuanto los ha leido. Replay graba el href de la pagina
 * sin pasar por ningun gancho de Sentry, y la barra acaba tambien en el
 * Referer y en el historial del navegador (revision del 30 sep 2026).
 *
 * Va por `history.replaceState` directo, sin el router: asi el router no se
 * entera y la pagina sigue teniendo su token. Recargar la pagina ya no lo trae.
 */
import { SENSITIVE_PATH_PREFIXES, SENSITIVE_QUERY_PARAMS } from './scrubUrl';

export const stripSecretsFromAddressBar = () => {
  const { pathname, search, hash } = window.location;

  const params = new URLSearchParams(search);
  for (const param of SENSITIVE_QUERY_PARAMS) params.delete(param);
  const query = params.toString();

  const prefijo = SENSITIVE_PATH_PREFIXES.find((p) => pathname.startsWith(p));
  const ruta = prefijo ? prefijo.replace(/\/$/, '') : pathname;

  const limpia = `${ruta}${query ? `?${query}` : ''}${hash}`;
  if (limpia !== `${pathname}${search}${hash}`) {
    window.history.replaceState(window.history.state, '', limpia);
  }
};
