import { useEffect, useRef } from 'react';

/**
 * Ir a otra ruta pasado un rato (el aviso de «guardado» se ve antes de salir),
 * sin navegar si la pantalla ya se ha desmontado: el temporizador se limpia al
 * desmontar, o quedaría vivo y llevaría al usuario a donde ya no estaba.
 *
 * @param {(ruta: string) => void} navigate
 * @returns {(ruta: string, ms: number) => void}
 */
export const useNavegacionDiferida = (navigate) => {
  // Ref para cleanup del timer de navegación (prevenir memory leak)
  const navigationTimerRef = useRef(null);

  /**
   * Cleanup: limpiar timer de navegación al desmontar
   * Previene memory leak si el componente se desmonta antes de que se ejecute setTimeout
   */
  useEffect(() => {
    return () => {
      if (navigationTimerRef.current) {
        clearTimeout(navigationTimerRef.current);
      }
    };
  }, []);

  return (ruta, ms) => {
    navigationTimerRef.current = setTimeout(() => {
      navigate(ruta);
    }, ms);
  };
};
