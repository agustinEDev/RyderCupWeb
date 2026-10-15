import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useMapaDelCampo } from './useMapaDelCampo';

const ANCLA = '#mapa';

/**
 * El mapa del hoyo a pantalla completa, desde la anotación (BE #532).
 *
 * Abierto = `#mapa` en la dirección: así el botón atrás del móvil lo cierra en
 * vez de sacar de la anotación, y como la ruta no cambia, la anotación de
 * debajo no se mueve (el salto arriba solo va con la ruta).
 */
export function useMapaDelHoyo({ golfCourseId }) {
  const location = useLocation();
  const navigate = useNavigate();
  const mapaDelCampo = useMapaDelCampo(golfCourseId);
  const abierto = location.hash === ANCLA;

  const abrir = useCallback(() => {
    navigate({ search: location.search, hash: ANCLA }, { state: { ...location.state, mapaAbiertoAqui: true } });
  }, [navigate, location.search, location.state]);

  const cerrar = useCallback(() => {
    // Abierto desde aquí: se vuelve a la entrada de antes. Entrando ya con
    // `#mapa` (recargar), no hay entrada a la que volver: se quita el ancla
    if (location.state?.mapaAbiertoAqui) navigate(-1);
    else navigate({ search: location.search, hash: '' }, { replace: true });
  }, [navigate, location.search, location.state]);

  return { abierto, abrir, cerrar, mapaDelCampo };
}
