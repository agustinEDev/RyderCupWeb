/**
 * ¿Sigue viva la sesión? Preguntado a `/current-user` SIN el interceptor.
 *
 * Lo usan las dos páginas públicas que necesitan saberlo: la de acceso
 * (`useRedirectIfAuthenticated`, FE #305) y «Volver» de los documentos legales
 * (`sesionEnPaginaPublica`). Antes cada una tenía su copia de esto.
 *
 * Por qué no `fetchWithTokenRefresh`: en una página pública se niega a refrescar
 * ante un 401 de `/current-user`, y si el refresco da 401 cierra sesión y manda
 * a `/login`. Aquí se refresca a mano, que no arrastra ni el logout ni la
 * redirección. A cambio, la revocación del dispositivo que el interceptor sí
 * atiende se devuelve aparte, para que cada página haga con ella lo suyo.
 *
 * El refresco SÍ es el del interceptor (`refrescoCompartido`): si ya hay uno
 * en vuelo se espera a ese, y dos a la vez son un solo POST.
 *
 * Aquí solo se pregunta: qué hacer con la respuesta —redirigir, tirar el `user`
 * guardado, avisar— lo decide quien llama.
 */

import { refrescoCompartido } from '../utils/tokenRefreshInterceptor';
import { isDeviceRevoked } from '../utils/deviceRevocationLogout';

// Misma prioridad que `api.js` y el interceptor: la configuración de ejecución
// manda sobre la del build. Sin esto, `/current-user` y el refresco pueden
// acabar apuntando a hosts distintos en un despliegue en contenedor
const API_URL = globalThis.APP_CONFIG?.API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';

const pideElUsuario = (signal) =>
  fetch(`${API_URL}/api/v1/auth/current-user`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    signal,
  });

const cuerpoDelRechazo = async (respuesta) => {
  try {
    return (await respuesta.json()) ?? {};
  } catch {
    return {};
  }
};

/**
 * @param {AbortSignal} [signal]
 * @returns {Promise<
 *   | {estado: 'ok', usuario: object}
 *   | {estado: 'revocada', detalle: object}
 *   | {estado: 'rechazada'}
 *   | {estado: 'fallo', error: unknown}
 * >} `rechazada` y `revocada` son un «no» del backend: la sesión está muerta.
 *   `fallo` es no haber podido preguntar (red, 5xx, plazo cortado): no dice
 *   nada de la sesión.
 */
export const preguntaLaSesionSinInterceptor = async (signal) => {
  try {
    let respuesta = await pideElUsuario(signal);

    if (respuesta.status === 401) {
      const detalle = await cuerpoDelRechazo(respuesta);
      if (isDeviceRevoked(respuesta, detalle)) {
        return { estado: 'revocada', detalle };
      }

      // El access caduca a los 15 minutos; que esté caducado no dice nada
      // sobre la sesión, solo que toca renovarlo. El compartido: si otra pregunta
      // o el interceptor ya están refrescando, se espera a ese
      await refrescoCompartido();
      respuesta = await pideElUsuario(signal);

      // La revocación también puede llegar en la segunda pregunta
      if (respuesta.status === 401) {
        const detalleTrasRefrescar = await cuerpoDelRechazo(respuesta);
        if (isDeviceRevoked(respuesta, detalleTrasRefrescar)) {
          return { estado: 'revocada', detalle: detalleTrasRefrescar };
        }
        return { estado: 'rechazada' };
      }
    }

    if (!respuesta.ok) {
      return { estado: 'fallo', error: new Error(`current-user respondió ${respuesta.status}`) };
    }

    return { estado: 'ok', usuario: await respuesta.json() };
  } catch (error) {
    // El refresco contesta 401 cuando el refresh token ya no vale. Lo de
    // «Dispositivo revocado» aquí es defensivo: hoy el backend solo lo emite en
    // `get_current_user` (RyderCupAm src/config/dependencies.py), no en el refresco
    if (error?.response?.status === 401) {
      const detalle = error.errorData ?? {};
      if (isDeviceRevoked(error.response, detalle)) return { estado: 'revocada', detalle };
      return { estado: 'rechazada' };
    }
    return { estado: 'fallo', error };
  }
};
