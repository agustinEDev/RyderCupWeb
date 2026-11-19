import { useCallback, useState } from 'react';
import { holeMarkingGuideUseCase } from '../composition';

/**
 * Si este jugador ya vio la guía para marcar un hoyo en este móvil (G1, T1). Se
 * lee al abrir el mapa (y otra vez si cambia el jugador); al cerrarla se apunta y deja de salir sola.
 *
 * @param {string|null} userId
 * @returns {{vista: boolean, marcarVista: () => void}}
 */
export const useGuiaParaMarcarVista = (userId) => {
  const [vista, setVista] = useState(() =>
    holeMarkingGuideUseCase.yaVista(userId),
  );
  // Si cambia el jugador con el mapa abierto, se vuelve a leer: lo del anterior
  // no le vale (ajuste en el render, sin efecto: no se pinta lo viejo)
  const [deQuien, setDeQuien] = useState(userId);
  if (deQuien !== userId) {
    setDeQuien(userId);
    setVista(holeMarkingGuideUseCase.yaVista(userId));
  }
  const marcarVista = useCallback(() => {
    holeMarkingGuideUseCase.marcarVista(userId);
    setVista(true);
  }, [userId]);
  return { vista, marcarVista };
};
