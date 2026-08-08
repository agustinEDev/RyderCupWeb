import { useState, useEffect } from 'react';

/**
 * Detecta si la aplicacion corre instalada (standalone) en lugar de en una
 * pestana del navegador.
 *
 * `display-mode: standalone` cubre Android y escritorio; iOS no lo implementa
 * de forma fiable y expone `navigator.standalone` en su lugar, asi que hacen
 * falta los dos.
 *
 * Ojo: esta deteccion no sirve para decidir si mostrar las instrucciones de
 * "Anadir a pantalla de inicio" en iOS. Ahi `useInstallPrompt` mira solo
 * `navigator.standalone`, porque algunos navegadores basados en WebView
 * (Chrome en iOS) devuelven cierto en `display-mode: standalone` estando en una
 * pestana normal, y las instrucciones desaparecerian sin motivo.
 */
export function detectStandalone() {
  return (
    window.navigator.standalone === true ||
    (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches)
  );
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
