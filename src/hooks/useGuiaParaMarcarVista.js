import { useCallback, useState } from 'react';
import { holeMarkingGuideUseCase } from '../composition';

/**
 * Si este jugador ya vio la guía para marcar un hoyo en este móvil (G1, T1). Se
 * lee una vez, al abrir el mapa; al cerrarla se apunta y deja de salir sola.
 *
 * @param {string|null} userId
 * @returns {{vista: boolean, marcarVista: () => void}}
 */
export const useGuiaParaMarcarVista = (userId) => {
  const [vista, setVista] = useState(() =>
    holeMarkingGuideUseCase.yaVista(userId),
  );
  const marcarVista = useCallback(() => {
    holeMarkingGuideUseCase.marcarVista(userId);
    setVista(true);
  }, [userId]);
  return { vista, marcarVista };
};
