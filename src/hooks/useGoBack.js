import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';

/**
 * Vuelta por historial para pantallas sin padre unico.
 *
 * Al perfil de un jugador se llega desde el feed, desde Amigos y desde la
 * busqueda: cualquier destino fijo se equivocaria dos de cada tres veces.
 *
 * Retroceder sin tener adonde sacaria de la aplicacion, asi que antes hay que
 * saber si esta pantalla es la primera del historial. La `key` de la ubicacion
 * NO sirve para averiguarlo: un `replace` estrena `key` sin añadir una entrada,
 * y basta con abrir un perfil compartido sin sesion para encadenar dos —el
 * redirect a /login y la vuelta tras entrar—, de modo que la `key` ya no es
 * 'default' aunque no haya ni una entrada propia detras.
 *
 * Lo que sí lo dice es el indice que React Router mantiene en
 * `window.history.state.idx`, que un `replace` deja intacto. Bajo MemoryRouter
 * —los tests— no existe ese estado, y ahi se cae a la `key`, que es exacta
 * porque ese router no pasa por `window.history`.
 *
 * @param {string} [fallback] - Adonde ir cuando no hay historial propio.
 */
export function useGoBack(fallback = '/feed') {
  const navigate = useNavigate();
  const location = useLocation();

  const historyIndex = window.history.state?.idx;
  const hasHistory = historyIndex !== undefined ? historyIndex > 0 : location.key !== 'default';

  return useCallback(() => {
    if (hasHistory) navigate(-1);
    // Se reemplaza, no se apila: si no, el gesto de retroceso del telefono
    // devuelve al perfil, cuya flecha vuelve a empujar el respaldo, y se queda
    // dando vueltas entre dos paginas
    else navigate(fallback, { replace: true });
  }, [hasHistory, navigate, fallback]);
}

export default useGoBack;
