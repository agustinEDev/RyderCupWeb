/**
 * ¿Hay sesión de verdad? Preguntado desde una página pública, a petición.
 *
 * Lo usa «Volver» de los documentos legales cuando no hay página anterior: con
 * sesión al panel, sin ella a la portada (20 oct 2026).
 *
 * Por qué no `consultaLaSesion`: va por `fetchWithTokenRefresh`, y en `/terms`
 * con un `user` rancio guardado el interceptor SÍ refresca; si el refresco da
 * 401, cierra sesión y manda a `/login` con «tu sesión expiró». Es justo lo que
 * no puede pasarle a quien solo quería salir de un documento. Se pregunta sin
 * interceptor, con la misma pieza que `useRedirectIfAuthenticated`
 * (`sondaDeSesion`), que no arrastra ni el logout ni la redirección.
 *
 * Y nada de decidir por el `user` guardado: sobrevive a las cookies. Solo sirve
 * para no tocar la red cuando no hay ni eso, que es el visitante de siempre.
 */

import { anotaLaSesion } from './sesionCompartida';
import { preguntaLaSesionSinInterceptor } from './sondaDeSesion';

/** Más allá de esto se da por no sabido: quien pulsa no se queda esperando. */
export const TOPE_DE_LA_COMPROBACION_MS = 5000;

/**
 * - `confirmada`: el backend dice que sí (y queda anotada para el panel).
 * - `muerta`: el backend dice que no, así que el `user` guardado es resto de
 *   una sesión anterior.
 * - `revocada`: también un «no», pero porque se revocó este dispositivo: quien
 *   llama limpia además lo que limpia el cierre por revocación.
 * - `no-sabida`: no hay nada guardado, o no se pudo preguntar a tiempo.
 */
export const ESTADO_DE_LA_SESION = Object.freeze({
  CONFIRMADA: 'confirmada',
  MUERTA: 'muerta',
  REVOCADA: 'revocada',
  NO_SABIDA: 'no-sabida',
});

const hayUsuarioGuardado = () => {
  try {
    return Boolean(localStorage.getItem('user'));
  } catch {
    return false;
  }
};

/**
 * @returns {Promise<'confirmada'|'muerta'|'revocada'|'no-sabida'>} Qué hacer con cada uno
 *   lo decide quien llama; en la duda, a la portada.
 */
export const estadoDeLaSesion = async () => {
  if (!hayUsuarioGuardado()) return ESTADO_DE_LA_SESION.NO_SABIDA;

  const corte = new AbortController();
  let vencido = false;
  let temporizador;

  const plazo = new Promise((resolver) => {
    temporizador = setTimeout(() => {
      vencido = true;
      corte.abort();
      resolver(ESTADO_DE_LA_SESION.NO_SABIDA);
    }, TOPE_DE_LA_COMPROBACION_MS);
  });

  const pregunta = async () => {
    try {
      const resultado = await preguntaLaSesionSinInterceptor(corte.signal);
      // Tarde no manda: la página ya se fue a la portada
      if (vencido) return ESTADO_DE_LA_SESION.NO_SABIDA;

      if (resultado.estado === 'revocada') return ESTADO_DE_LA_SESION.REVOCADA;
      if (resultado.estado === 'rechazada') return ESTADO_DE_LA_SESION.MUERTA;
      if (resultado.estado !== 'ok') return ESTADO_DE_LA_SESION.NO_SABIDA;

      // Ya se ha preguntado: el panel no tiene por qué volver a hacerlo
      anotaLaSesion(resultado.usuario);
      return ESTADO_DE_LA_SESION.CONFIRMADA;
    } finally {
      clearTimeout(temporizador);
    }
  };

  return Promise.race([pregunta(), plazo]);
};
