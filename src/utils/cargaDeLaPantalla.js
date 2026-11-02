import { consultaLaSesion } from '../services/sesionCompartida';
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
 * - **Espera 4 s como mucho.** Con dos barras la petición se queda colgada sin
 *   fallar, y el jugador vería que pulsar no hace nada. Pasado el tope se entra
 *   como sin red; la petición sigue y su respuesta se pierde.
 * - **Sin red, o con un error del servidor, lo último que se cargó** en esta
 *   visita (`memoriaDeLasListas`). Nunca se dice «no tienes ninguna» por no
 *   haber podido preguntar.
 * - **Sin sesión no se pide nada:** lleva a entrar (o a aceptar los Términos)
 *   el guardia de la ruta, como siempre, sin una petición que acabe en 401/403.
 *
 * @param {{clave: string, pedir: (usuario: Object) => Promise<*>}} opciones
 * @returns {Promise<{estado: 'ok'|'sinRed'|'error'|'sinSesion', datos: *}>}
 */
export const TOPE_DE_LA_CARGA_MS = 4000;

const SIN_RESPUESTA = Symbol('sin respuesta');

const conTope = (promesa) => {
  let reloj;
  const vence = new Promise((_, rechaza) => {
    reloj = setTimeout(() => rechaza(SIN_RESPUESTA), TOPE_DE_LA_CARGA_MS);
  });
  return Promise.race([promesa, vence]).finally(() => clearTimeout(reloj));
};

export const cargaDeLaPantalla = async ({ clave, pedir }) => {
  const usuario = await consultaLaSesion();
  if (!usuario || debeAceptarLosTerminos(usuario)) return { estado: 'sinSesion', datos: null };

  try {
    const datos = await conTope(pedir(usuario));
    guardaEnMemoria(clave, usuario.id, datos);
    return { estado: 'ok', datos };
  } catch (error) {
    const sinRed = error === SIN_RESPUESTA || esFalloDeRed(error);
    if (!sinRed) console.error(`Error loading ${clave}:`, error);
    return { estado: sinRed ? 'sinRed' : 'error', datos: loGuardadoEnMemoria(clave, usuario.id) };
  }
};
