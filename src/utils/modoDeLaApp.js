import { detectStandalone } from '../hooks/useStandalone';

/**
 * La cabecera que dice si la petición sale de la app instalada (FE #1046).
 *
 * El backend la usa para que la app instalada y Safari del mismo móvil sean dos
 * dispositivos: cada una tiene sus propias cookies, y con la misma huella se fundían
 * en uno. En el navegador no se manda nada. Nunca lanza.
 *
 * @returns {Record<string, string>}
 */
export const cabeceraDelModoDeLaApp = () => {
  try {
    return detectStandalone() ? { 'X-App-Mode': 'standalone' } : {};
  } catch {
    return {};
  }
};
