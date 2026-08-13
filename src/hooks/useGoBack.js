import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';

/**
 * Vuelta por historial para pantallas sin padre unico.
 *
 * Al perfil de un jugador se llega desde el feed, desde Amigos y desde la
 * busqueda: cualquier destino fijo se equivocaria dos de cada tres veces.
 *
 * Una `key` de 'default' significa que esta es la primera entrada del
 * historial —se ha entrado por URL directa, o recargando la pagina— y ahi
 * retroceder sacaria de la aplicacion, asi que se cae al destino de respaldo.
 *
 * @param {string} [fallback] - Adonde ir cuando no hay historial propio.
 */
export function useGoBack(fallback = '/feed') {
  const navigate = useNavigate();
  const location = useLocation();
  const hasHistory = location.key !== 'default';

  return useCallback(() => {
    if (hasHistory) navigate(-1);
    else navigate(fallback);
  }, [hasHistory, navigate, fallback]);
}

export default useGoBack;
