import { consultaLaSesion, loQueHaySobreLaSesion } from '../services/sesionCompartida';
import { guardaEnMemoria, loGuardadoEnMemoria } from '../services/memoriaDeLasListas';
import { debeAceptarLosTerminos } from '../domain/services/aceptacionDeTerminos';
import { esFalloDeRed } from './sinCobertura';

/**
 * Lo común de los `loader` de las pantallas (FE #647, fase 3; diseño aprobado
 * el 2 nov 2026).
 *
 * Con `loader`, la pantalla siguiente no aparece hasta que llegan sus datos: es
 * lo que deja a `<ScrollRestoration />` devolverte a donde estabas al volver.
 * La pega es que, mientras, se sigue viendo la anterior. Por eso:
 *
 * - **Nunca lanza.** Un error en un `loader` cambia la pantalla entera por la de
 *   error; aquí lo que pasó va en `estado` y la pantalla decide qué enseñar.
 * - **En la primera carga no espera nada** (`pendiente`): la pantalla carga
 *   dentro, como siempre. Si esperase, la carcasa —el aviso de sin conexión, la
 *   cola de golpes sin enviar— no se montaría hasta tener los datos, y sin red
 *   en el arranque eso es mucho rato (revisor).
 * - **Espera 4 s como mucho**, sesión incluida. Con dos barras la petición se
 *   queda colgada sin fallar, y el jugador vería que pulsar no hace nada. Pasado
 *   el tope se entra como sin red; si la lista llega después, se guarda y la
 *   entrega `tardia`, para que la pantalla la pinte sin volver a pedirla.
 * - **Sin red, o con un error del servidor, lo último que se cargó** en esta
 *   visita (`memoriaDeLasListas`). Nunca se dice «no tienes ninguna» por no
 *   haber podido preguntar.
 * - **Sin sesión no se pide nada:** lleva a entrar (o a aceptar los Términos)
 *   el guardia de la ruta, como siempre, sin una petición que acabe en 401/403.
 */
export const TOPE_DE_LA_CARGA_MS = 4000;

let arrancada = false;

/** La carcasa de la aplicación, al montarse; antes, todo es la primera carga. */
export const marcaElArranque = (si = true) => {
  arrancada = si;
};

const SIN_RESPUESTA = Symbol('sin respuesta');

/**
 * Pulsar la pestaña de la pantalla en la que ya se está es una navegación a la
 * misma dirección, y React Router vuelve a llamar al `loader`: hoy eso no pide
 * nada, y así se queda (segundo revisor). Solo vuelve a pedir quien lo pide
 * aquí: «Reintentar», la vuelta de la señal o la primera carga.
 */
let seVuelveAPedir = false;

/** @param {{revalidate: () => *}} revalidador El de `useRevalidator()` */
export const pideOtraVez = (revalidador) => {
  seVuelveAPedir = true;
  revalidador.revalidate();
};

/** El `shouldRevalidate` de las rutas con `cargaDeLaPantalla`. */
export const soloSiSePideOtraVez = () => {
  const si = seVuelveAPedir;
  seVuelveAPedir = false;
  return si;
};

/**
 * @param {{clave: string, pedir: (usuario: Object) => Promise<*>}} opciones
 * @returns {Promise<{estado: 'ok'|'sinRed'|'error'|'sinSesion'|'pendiente', datos: *, tardia?: Promise<*>}>}
 */
export const cargaDeLaPantalla = async ({ clave, pedir }) => {
  if (!arrancada) return { estado: 'pendiente', datos: null };

  let reloj;
  const vence = new Promise((_, rechaza) => {
    reloj = setTimeout(() => rechaza(SIN_RESPUESTA), TOPE_DE_LA_CARGA_MS);
  });
  // Un solo tope para todo: la sesión y la lista comparten los 4 s
  const aTiempo = (promesa) => Promise.race([promesa, vence]);

  let usuario = null;
  let pedida = null;
  try {
    try {
      usuario = await aTiempo(consultaLaSesion());
    } catch {
      // Sin saber aún quién es: la pantalla vuelve a pedir en cuanto se sepa
      // (con `sinRed` se quedaba ahí; segundo revisor)
      return { estado: 'sinSesion', datos: null };
    }
    if (!usuario || debeAceptarLosTerminos(usuario)) return { estado: 'sinSesion', datos: null };

    pedida = Promise.resolve(pedir(usuario)).then((datos) => {
      // Solo si la sesión sigue siendo la suya: un cierre de sesión mientras se
      // pedía ya vació la memoria, y esto la volvería a llenar
      if (loQueHaySobreLaSesion().user?.id === usuario.id) guardaEnMemoria(clave, usuario.id, datos);
      return datos;
    });
    const datos = await aTiempo(pedida);
    return { estado: 'ok', datos };
  } catch (error) {
    const sinRespuesta = error === SIN_RESPUESTA;
    // Como antes del `loader`, todo fallo a la consola; el tope no es un fallo
    if (!sinRespuesta) console.error(`Error loading ${clave}:`, error);
    const resultado = {
      estado: sinRespuesta || esFalloDeRed(error) ? 'sinRed' : 'error',
      datos: usuario ? loGuardadoEnMemoria(clave, usuario.id) : null,
    };
    // La que sigue en camino tras el tope; si al final falla, no entrega nada
    if (sinRespuesta && pedida) resultado.tardia = pedida.catch(() => new Promise(() => {}));
    return resultado;
  } finally {
    clearTimeout(reloj);
  }
};
