import { useState } from 'react';
import { getCompetitionGolfCoursesUseCase } from '../composition';
import { barrasDeLosCampos } from '../utils/camposDeLaCompeticion';
import { useCargaCancelableEffect } from './useCargaCancelableEffect';

/**
 * Las barras de los campos de una competición (FE #1214), para elegir la
 * propia al apuntarse o cambiar la de un inscrito. Solo se piden mientras
 * hacen falta (`activa`), y lo que llega de otra competición no se usa.
 *
 * @param {string|null|undefined} competitionId
 * @param {boolean} activa
 * @returns {{ barras: Array<{color: string, gender: string|null}>|null, cargando: boolean, fallo: boolean, reintentar: () => void }}
 *   `barras` es null mientras no se sabe (cargando, fallida o inactiva)
 */
export const useBarrasDeLaCompeticion = (competitionId, activa) => {
  const [leidas, setLeidas] = useState({
    de: null,
    barras: null,
    fallo: false,
  });
  const { cargando, recargar } = useCargaCancelableEffect(
    () => getCompetitionGolfCoursesUseCase.execute(competitionId),
    [competitionId],
    {
      activa: Boolean(activa && competitionId),
      alCargar: (resultado) =>
        setLeidas({
          de: competitionId,
          barras: barrasDeLosCampos(resultado),
          fallo: false,
        }),
      alFallar: () =>
        setLeidas({ de: competitionId, barras: null, fallo: true }),
    },
  );
  const deEsta = leidas.de === competitionId;
  return {
    barras: deEsta ? leidas.barras : null,
    cargando,
    fallo: deEsta && leidas.fallo && !cargando,
    reintentar: () => {
      recargar();
    },
  };
};
