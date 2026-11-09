import { consultaLaSesion, loQueHaySobreLaSesion } from './sesionCompartida';
import { guardaEnMemoria, loGuardadoEnMemoria } from './memoriaDeLasListas';
import { debeAceptarLosTerminos } from '../domain/services/aceptacionDeTerminos';
import { esFalloDeRed } from '../utils/sinCobertura';

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
 * La petición de cada lista que sigue en camino: dos toques seguidos en la
 * pestaña son dos navegaciones, y cada una llamaba a su `loader`. Comparten la
 * misma (`/code-review`): el límite de peticiones de la API es compartido.
 */
const enCamino = new Map();

const pideUnaVez = (clave, usuario, pedir, nueva) => {
  const ya = enCamino.get(clave);
  if (!nueva && ya && ya.usuarioId === usuario.id) return ya.pedida;
  const pedida = Promise.resolve(pedir(usuario)).finally(() => {
    if (enCamino.get(clave)?.pedida === pedida) enCamino.delete(clave);
  });
  enCamino.set(clave, { usuarioId: usuario.id, pedida });
  return pedida;
};

/** Pasado el tope ya no se comparte: una que no contesta nunca dejaba sin
 *  volver a pedir a todas las siguientes. */
const dejaDeCompartir = (clave, pedida) => {
  if (enCamino.get(clave)?.pedida === pedida) enCamino.delete(clave);
};

/** Solo para las pruebas: cada una empieza sin nada en camino ni pedido. */
export const olvidaLoQueEstaEnCamino = () => {
  enCamino.clear();
  seVuelveAPedir = false;
  vecesPedida = 0;
  vecesConPeticionNueva = 0;
};

/**
 * Pulsar la pestaña de la pantalla en la que ya se está es una navegación a la
 * misma dirección, y React Router vuelve a llamar al `loader`: hoy eso no pide
 * nada, y así se queda (segundo revisor). Solo vuelve a pedir quien lo pide
 * aquí: «Reintentar», la vuelta de la señal o la primera carga.
 *
 * Y entonces con una petición nueva: la que siguiera en camino puede ser
 * justo la que no contesta, o la de antes de cambiar la sesión (tercer revisor).
 * Una por cada vez que se pide: los toques en la pestaña mientras llega
 * comparten esa, o cada uno gastaba el cupo de la API (cuarto revisor).
 *
 * Es una sola marca para toda la aplicación: vale mientras solo haya una
 * pantalla con `loader` montada a la vez.
 */
let seVuelveAPedir = false;
let vecesPedida = 0;
let vecesConPeticionNueva = 0;

/** @param {{revalidate: () => *}} revalidador El de `useRevalidator()` */
export const pideOtraVez = (revalidador) => {
  seVuelveAPedir = true;
  vecesPedida += 1;
  revalidador.revalidate();
};

/** La gasta la pantalla al recibir la carga, y al salir: si se navegó antes de
 *  que se usara, ya no vale (si no, la siguiente pulsación en la pestaña pedía;
 *  `/code-review`). */
export const olvidaQueSeVuelveAPedir = () => {
  seVuelveAPedir = false;
};

/** El `shouldRevalidate` de las rutas con `cargaDeLaPantalla`. No la gasta:
 *  si otra navegación corta la recarga, el router desecha lo que traiga, y
 *  esa navegación tiene que seguir pidiendo (tercer revisor). */
export const soloSiSePideOtraVez = () => seVuelveAPedir;

/**
 * @param {{clave: string, pedir: (usuario: Object) => Promise<*>}} opciones
 * @returns {Promise<{estado: 'ok'|'sinRed'|'error'|'sinSesion'|'pendiente', datos: *, usuarioId?: string, tardia?: Promise<*>}>}
 *   `usuarioId`, la cuenta de la que son los datos: si entra otra sin salir de
 *   la pantalla, no los ve mientras llegan los suyos (CodeRabbit)
 */
export const cargaDeLaPantalla = async ({ clave, pedir }) => {
  if (!arrancada) return { estado: 'pendiente', datos: null };
  // Antes de esperar a nada: lo que pase mientras con la marca no cambia que
  // esta carga la vio
  const nueva = vecesPedida !== vecesConPeticionNueva;
  vecesConPeticionNueva = vecesPedida;

  let reloj;
  const vence = new Promise((_, rechaza) => {
    reloj = setTimeout(() => rechaza(SIN_RESPUESTA), TOPE_DE_LA_CARGA_MS);
  });
  // Un solo tope para todo: la sesión y la lista comparten los 4 s
  const aTiempo = (promesa) => Promise.race([promesa, vence]);

  let usuario = null;
  let compartida = null;
  let pedida = null;
  try {
    try {
      usuario = await aTiempo(consultaLaSesion());
    } catch {
      // La sesión no contesta. Si ya se sabía quién es, como sin red y con lo
      // de antes (`/code-review`); si no, la pantalla pide al saberse quién es
      const sabido = loQueHaySobreLaSesion().user;
      return sabido && !debeAceptarLosTerminos(sabido)
        ? { estado: 'sinRed', datos: loGuardadoEnMemoria(clave, sabido.id), usuarioId: sabido.id }
        : { estado: 'sinSesion', datos: null };
    }
    if (!usuario || debeAceptarLosTerminos(usuario)) return { estado: 'sinSesion', datos: null };

    compartida = pideUnaVez(clave, usuario, pedir, nueva);
    pedida = compartida.then((datos) => {
      // Solo si la sesión sigue siendo la suya: un cierre de sesión mientras se
      // pedía ya vació la memoria, y esto la volvería a llenar
      if (loQueHaySobreLaSesion().user?.id === usuario.id) guardaEnMemoria(clave, usuario.id, datos);
      return datos;
    });
    const datos = await aTiempo(pedida);
    return { estado: 'ok', datos, usuarioId: usuario.id };
  } catch (error) {
    const sinRespuesta = error === SIN_RESPUESTA;
    if (sinRespuesta && compartida) dejaDeCompartir(clave, compartida);
    // Como antes del `loader`, todo fallo a la consola; el tope no es un fallo
    if (!sinRespuesta) console.error(`Error loading ${clave}:`, error);
    const resultado = {
      estado: sinRespuesta || esFalloDeRed(error) ? 'sinRed' : 'error',
      datos: usuario ? loGuardadoEnMemoria(clave, usuario.id) : null,
      usuarioId: usuario?.id,
    };
    // La que sigue en camino tras el tope; si al final falla, no entrega nada
    if (sinRespuesta && pedida) resultado.tardia = pedida.catch(() => new Promise(() => {}));
    return resultado;
  } finally {
    clearTimeout(reloj);
  }
};
