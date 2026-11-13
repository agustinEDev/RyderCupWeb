import { useEffect, useState } from 'react';
import { getLeaderboardUseCase } from '../composition';

/**
 * La clasificación de la competición, pedida cada vez que se abre su pestaña
 * (`ScoringPage`). Sin competición no se pide; si falla, se queda la que había.
 */
export const useClasificacionAlAbrir = (pestanaAbierta, competitionId) => {
  const [leaderboard, setLeaderboard] = useState(null);

  // Load leaderboard when tab changes to leaderboard
  useEffect(() => {
    if (pestanaAbierta === 'leaderboard' && competitionId) {
      getLeaderboardUseCase.execute(competitionId)
        .then(setLeaderboard)
        .catch(() => {});
    }
  }, [pestanaAbierta, competitionId]);

  return leaderboard;
};
