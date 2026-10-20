/**
 * ¿Hay sesión de verdad? Preguntado desde una página pública, a petición.
 *
 * Lo usa «Volver» de los documentos legales cuando no hay página anterior: con
 * sesión al panel, sin ella a la portada (20 oct 2026).
 *
 * Por qué no `consultaLaSesion`: va por `fetchWithTokenRefresh`, y en `/terms`
 * con un `user` rancio guardado el interceptor SÍ refresca; si el refresco da
 * 401, cierra sesión y manda a `/login` con «tu sesión expiró». Es justo lo que
 * no puede pasarle a quien solo quería salir de un documento. Aquí se pide el
 * refresco a mano, como `useRedirectIfAuthenticated`, que no arrastra ni el
 * logout ni la redirección.
 *
 * Y nada de decidir por el `user` guardado: sobrevive a las cookies. Solo sirve
 * para no tocar la red cuando no hay ni eso, que es el visitante de siempre.
 */

import { refreshAccessToken } from '../utils/tokenRefreshInterceptor';
import { anotaLaSesion } from './sesionCompartida';

const API_URL = globalThis.APP_CONFIG?.API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';

/** Más allá de esto se da por no sabido: quien pulsa no se queda esperando. */
export const TOPE_DE_LA_COMPROBACION_MS = 5000;

const hayUsuarioGuardado = () => {
  try {
    return Boolean(localStorage.getItem('user'));
  } catch {
    return false;
  }
};

const pideElUsuario = (signal) =>
  fetch(`${API_URL}/api/v1/auth/current-user`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    signal,
  });

/**
 * @returns {Promise<boolean>} `true` solo si el backend lo confirma. Un fallo,
 *   un rechazo o el plazo vencido dan `false`: en la duda, a la portada.
 */
export const haySesionConfirmada = async () => {
  if (!hayUsuarioGuardado()) return false;

  const corte = new AbortController();
  let vencido = false;
  let temporizador;

  const plazo = new Promise((resolver) => {
    temporizador = setTimeout(() => {
      vencido = true;
      corte.abort();
      resolver(false);
    }, TOPE_DE_LA_COMPROBACION_MS);
  });

  const pregunta = async () => {
    try {
      let respuesta = await pideElUsuario(corte.signal);

      // El access dura 15 minutos: caducado no dice nada de la sesión
      if (respuesta.status === 401) {
        await refreshAccessToken();
        respuesta = await pideElUsuario(corte.signal);
      }

      if (!respuesta.ok) return false;

      const usuario = await respuesta.json();
      // Tarde no manda: la página ya se fue a la portada
      if (vencido) return false;

      // Ya se ha preguntado: el panel no tiene por qué volver a hacerlo
      anotaLaSesion(usuario);
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(temporizador);
    }
  };

  return Promise.race([pregunta(), plazo]);
};
