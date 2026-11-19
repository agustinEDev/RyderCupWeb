import { useMemo } from 'react';
import { PRECISION_PARA_MEDIR_M } from '../../../domain/services/distanciasDelHoyo';
import { estaLejosDelCampo } from '../../../domain/services/hoyoMarcado';
import { comunidadDelPunto } from '../../../domain/services/comunidadDelCampo';
import { usePosicionGps } from '../../../hooks/usePosicionGps';
import { useCentroSinMapa } from '../../../hooks/useCentroSinMapa';

// La posición y su precisión, solo con el GPS listo
const lecturaDelGps = (gps) =>
  gps.estado === 'listo'
    ? { posicion: gps.posicion, precision: gps.precision ?? null }
    : { posicion: null, precision: null };

// La que vale para medir desde ti: en el campo y con el GPS bueno
const posicionParaMedir = (posicionEnElCampo, precision) =>
  posicionEnElCampo && precision !== null && precision <= PRECISION_PARA_MEDIR_M
    ? posicionEnElCampo
    : null;

/**
 * El GPS del mapa del hoyo y dónde está el campo: la posición (solo mientras el
 * mapa está abierto), si estás en el campo, la que vale para medir desde ti
 * (`posicionBuena`) y la comunidad, por su ortofoto.
 */
export const useGpsDelHoyo = ({ golfCourseId, hoyo, conMapa }) => {
  const gps = usePosicionGps({ activo: true });
  const { posicion, precision } = lecturaDelGps(gps);
  // Sin permiso o sin GPS en el móvil, no hay posición que preguntar
  const sinUbicacion =
    gps.estado === 'denegado' || gps.estado === 'no-disponible';
  const centroSinMapa = useCentroSinMapa({ golfCourseId, activo: !conMapa });
  // Si estás en el campo: si el hoyo tiene salida (aunque no tenga green), se
  // mide desde ella; si no, desde la ubicación del campo (sin ninguna de las
  // dos, se da por hecho que sí)
  const referenciaDelCampo =
    hoyo?.playLine?.[0] ?? centroSinMapa ?? hoyo?.green?.center ?? null;
  // Lejos (no estás jugando): el mapa no se va a tu casa, no se mide desde ti
  // y «Céntrame» no se puede pulsar (16 oct)
  // Con ortofoto de su comunidad, más reciente que la PNOA, si la hay (19 oct)
  // Solo cuando cambia la posición, no en cada aviso del GPS (/code-review)
  const latDelCampo = referenciaDelCampo?.lat ?? null;
  const lonDelCampo = referenciaDelCampo?.lon ?? null;
  const comunidad = useMemo(
    () =>
      comunidadDelPunto(
        latDelCampo === null || lonDelCampo === null
          ? null
          : { lat: latDelCampo, lon: lonDelCampo },
      ),
    [latDelCampo, lonDelCampo],
  );
  const lejos = estaLejosDelCampo(posicion, referenciaDelCampo);
  const posicionEnElCampo = lejos ? null : posicion;
  return {
    estadoDelGps: gps.estado,
    posicion,
    precision,
    sinUbicacion,
    centroSinMapa,
    referenciaDelCampo,
    comunidad,
    lejos,
    posicionEnElCampo,
    posicionBuena: posicionParaMedir(posicionEnElCampo, precision),
  };
};
