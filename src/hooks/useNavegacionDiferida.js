import { useEffect, useRef } from 'react';

/**
 * Ir a otra ruta pasado un rato (el aviso de «guardado» se ve antes de salir),
 * sin navegar si la pantalla ya se ha desmontado: el temporizador se limpia al
 * desmontar, o quedaría vivo y llevaría al usuario a donde ya no estaba. Y si
 * se desmonta antes de programarlo (salió mientras se guardaba), ni se
 * programa. Programar otro quita el anterior: nunca se navega dos veces.
 *
 * @param {(ruta: string) => void} navigate
 * @returns {(ruta: string, ms: number) => void}
 */
export const useNavegacionDiferida = (navigate) => {
  // Ref para cleanup del timer de navegación (prevenir memory leak)
  const navigationTimerRef = useRef(null);
  // Si la pantalla sigue ahí: lo que termina tras salir de ella no navega
  const montada = useRef(false);

  /**
   * Cleanup: limpiar timer de navegación al desmontar
   * Previene memory leak si el componente se desmonta antes de que se ejecute setTimeout
   */
  useEffect(() => {
    montada.current = true;
    return () => {
      montada.current = false;
      if (navigationTimerRef.current) {
        clearTimeout(navigationTimerRef.current);
      }
    };
  }, []);

  return (ruta, ms) => {
    if (!montada.current) return;
    clearTimeout(navigationTimerRef.current);
    navigationTimerRef.current = setTimeout(() => {
      navigate(ruta);
    }, ms);
  };
};
