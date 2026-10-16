import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useMapaDelCampo } from './useMapaDelCampo';

const ANCLA = '#mapa';
// Al recargar, el navegador repone el estado del historial: con un `true`, el
// mapa se reabría solo y en el hoyo 1 (la anotación empieza por ahí). Con la
// marca de esta carga, el de otra no cuenta
const ESTA_CARGA = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * El mapa del hoyo a pantalla completa, desde la anotación (BE #532).
 *
 * Abierto = `#mapa` en la dirección: así el botón atrás del móvil lo cierra en
 * vez de sacar de la anotación, y como la ruta no cambia, la anotación de
 * debajo no se mueve (el salto arriba solo va con la ruta).
 */
export function useMapaDelHoyo({ golfCourseId, cerrarSi = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const mapaDelCampo = useMapaDelCampo(golfCourseId);
  const abiertoAqui = location.state?.mapaAbiertoAqui === ESTA_CARGA;
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
    navigate({ search: location.search, hash: ANCLA }, { state: { ...location.state, mapaAbiertoAqui: ESTA_CARGA } });
  }, [navigate, abierto, location.search, location.state]);

  const cerrar = useCallback(() => {
    if (navegando.current || !abierto) return;
    navegando.current = true;
    navigate(-1);
  }, [navigate, abierto]);

  // Con la sesión tomada desde otro móvil: el «Volver» de su aviso navega atrás,
  // y con el mapa abierto solo lo cerraba
  useEffect(() => {
    if (cerrarSi) cerrar();
  }, [cerrarSi, cerrar]);

  return { abierto, abrir, cerrar, mapaDelCampo };
}
