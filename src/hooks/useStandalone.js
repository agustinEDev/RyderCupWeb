import { useState, useEffect } from 'react';

/**
 * Detecta si la aplicacion corre instalada (standalone) en lugar de en una
 * pestana del navegador.
 *
 * `display-mode: standalone` cubre Android y escritorio. iOS no lo implementa
 * de forma fiable y expone `navigator.standalone` en su lugar, asi que alli se
 * mira SOLO eso: no valen los dos a la vez, porque los navegadores de iOS
 * basados en WebView —Chrome— dicen que si a `display-mode` estando en una
 * pestana normal.
 */
export function detectStandalone() {
  const ua = navigator.userAgent;
  // iPadOS 13+ se declara MacIntel, de ahi lo del touch
  const esIOS =
    /iphone|ipad|ipod/i.test(ua) ||
    ((/macintosh/i.test(ua) || navigator.platform === 'MacIntel') && navigator.maxTouchPoints > 1);

  // En iOS SOLO vale `navigator.standalone`: los navegadores basados en WebView
  // —Chrome en iOS— dicen que si a `display-mode: standalone` estando en una
  // pestana normal, y con el OR de antes cualquiera de ellos pasaba por
  // aplicacion instalada. Fuera de iOS es al reves: `navigator.standalone` no
  // existe y manda `display-mode`.
  if (esIOS) return window.navigator.standalone === true;

  // El mismo enredo que Chrome en iOS, en Android: los navegadores incrustados
  // en otras aplicaciones —Instagram, Facebook— van sobre WebView, no pintan
  // barra de direcciones y pueden decir que si a `display-mode: standalone`. Sin
  // esto, quien abriera el enlace desde ahi teniendo sesion no llegaria a ver la
  // portada nunca. `; wv` es la marca del WebView de Android; los demas anaden
  // su propia etiqueta al userAgent.
  const enOtraAplicacion = /;\s?wv\)|FBAN|FBAV|Instagram|Line\/|MicroMessenger|Twitter/i.test(ua);
  if (enOtraAplicacion) return false;

  return typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
}

export function useStandalone() {
  const [isStandalone, setIsStandalone] = useState(() => detectStandalone());

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;

    // El modo puede cambiar en vivo: al instalar la aplicacion desde la propia
    // pestana, esa pestana pasa a standalone sin recargarse
    const query = window.matchMedia('(display-mode: standalone)');
    const handler = () => setIsStandalone(detectStandalone());

    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, []);

  return isStandalone;
}

export default useStandalone;
