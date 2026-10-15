import { useCallback, useEffect, useRef } from 'react';
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
  const abiertoAqui = Boolean(location.state?.mapaAbiertoAqui);
  const abierto = location.hash === ANCLA && abiertoAqui;
  // Un segundo toque antes de que cambie la dirección no navega otra vez: dos
  // «Cerrar» seguidos sacaban de la anotación, y dos «Mapa» dejaban dos entradas
  const navegando = useRef(false);

  useEffect(() => {
    navegando.current = false;
  }, [location.key]);

  // Entrando ya con `#mapa` (recargar): no hay entrada a la que volver ni se
  // sabe en qué hoyo estaba; se quita y se queda en la tarjeta
  useEffect(() => {
    if (location.hash === ANCLA && !abiertoAqui) {
      navigate({ search: location.search, hash: '' }, { replace: true, state: location.state });
    }
  }, [location.hash, abiertoAqui, location.search, location.state, navigate]);

  const abrir = useCallback(() => {
    if (navegando.current || abierto) return;
    navegando.current = true;
    navigate({ search: location.search, hash: ANCLA }, { state: { ...location.state, mapaAbiertoAqui: true } });
  }, [navigate, abierto, location.search, location.state]);

  const cerrar = useCallback(() => {
    if (navegando.current || !abierto) return;
    navegando.current = true;
    navigate(-1);
  }, [navigate, abierto]);

  return { abierto, abrir, cerrar, mapaDelCampo };
}
