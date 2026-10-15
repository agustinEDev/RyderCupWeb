import { useEffect, useState } from 'react';
import { getHoleMapUseCase } from '../composition';
import { useDistanciasActivadas } from './useDistanciasActivadas';
import { usePosicionGps } from './usePosicionGps';

/**
 * Lo que necesita la línea de distancias de la tarjeta (mapa de hoyos, BE #532):
 * el green del hoyo que se anota, si el campo tiene mapa aprobado; si el jugador
 * activó las distancias en esta partida; y su posición por GPS.
 *
 * El mapa se pide una vez por campo (con red se guarda; sin red, la copia). El
 * GPS solo se pide con las distancias activadas Y un mapa con el que medir.
 */
export function useDistanciasDelHoyo({ golfCourseId, partida, hoyo }) {
  const [mapa, setMapa] = useState({ de: null, datos: null });

  useEffect(() => {
    if (!golfCourseId) return undefined;
    let vigente = true;
    getHoleMapUseCase
      .execute(golfCourseId)
      .then((datos) => {
        if (vigente) setMapa({ de: golfCourseId, datos });
      })
      .catch(() => {
        if (vigente) setMapa({ de: golfCourseId, datos: null });
      });
    return () => {
      vigente = false;
    };
  }, [golfCourseId]);

  const delCampo = mapa.de === golfCourseId ? mapa.datos : null;
  const { activadas, activar } = useDistanciasActivadas(partida);
  const gps = usePosicionGps({ activo: activadas && Boolean(delCampo) });

  return {
    green: delCampo?.holes?.[hoyo]?.green ?? null,
    activadas,
    activar,
    gps,
  };
}
