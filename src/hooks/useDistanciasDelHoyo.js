import { useEffect, useMemo, useState } from 'react';
import { getHoleMapUseCase } from '../composition';
import { useDistanciasActivadas } from './useDistanciasActivadas';
import { usePosicionGps } from './usePosicionGps';

/**
 * Lo que necesita la línea de distancias de la tarjeta (mapa de hoyos, BE #532):
 * el green del hoyo que se anota, si el campo tiene mapa aprobado; si el jugador
 * activó las distancias en esta partida; y su posición por GPS.
 *
 * La copia del móvil se pinta al momento y la red la refresca: con mala
 * cobertura la petición no falla, se queda sin contestar. El GPS solo se pide
 * con las distancias activadas, un mapa con el que medir y la anotación a la
 * vista (`visible`): en otra pestaña o con la anotación cerrada, apagado.
 */
export function useDistanciasDelHoyo({ golfCourseId, partida, hoyo, visible = true }) {
  const copia = useMemo(() => getHoleMapUseCase.guardado(golfCourseId), [golfCourseId]);
  const [delServidor, setDelServidor] = useState({ de: null, datos: null });

  useEffect(() => {
    if (!golfCourseId) return undefined;
    let vigente = true;
    getHoleMapUseCase
      .execute(golfCourseId)
      .then((datos) => {
        if (vigente) setDelServidor({ de: golfCourseId, datos });
      })
      .catch(() => {
        // Se queda la copia
      });
    return () => {
      vigente = false;
    };
  }, [golfCourseId]);

  const delCampo = delServidor.de === golfCourseId ? delServidor.datos : copia;
  const { activadas, activar, ocultar } = useDistanciasActivadas(partida);
  const gps = usePosicionGps({ activo: activadas && Boolean(delCampo) && visible });

  return {
    green: delCampo?.holes?.[hoyo]?.green ?? null,
    atribucion: delCampo?.attribution ?? null,
    activadas,
    activar,
    ocultar,
    gps,
  };
}
