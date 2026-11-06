import { useState, useEffect } from 'react';
import { escucharConsulta } from '../utils/escucharConsulta';
import { detectStandalone } from '../utils/standalone';

// La detección vive en utils: la usa también la capa de red (la cabecera
// X-App-Mode, FE #1046), que no debe depender de un hook de React
export { detectStandalone } from '../utils/standalone';

export function useStandalone() {
  const [isStandalone, setIsStandalone] = useState(() => detectStandalone());

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;

    // El modo puede cambiar en vivo: al instalar la aplicacion desde la propia
    // pestana, esa pestana pasa a standalone sin recargarse
    const query = window.matchMedia('(display-mode: standalone)');
    const handler = () => setIsStandalone(detectStandalone());

    // Con el respaldo de Safari anterior al 14, que no tiene addEventListener
    return escucharConsulta(query, handler);
  }, []);

  return isStandalone;
}

export default useStandalone;
