/**
 * La cortina del arranque (FE #485).
 *
 * `index.html` pinta una capa —`#arranque`— que tapa la pantalla entera. Hasta
 * ahora se retiraba en cuanto React montaba, y lo que quedaba debajo era una
 * cadena de esperas: la consulta de sesion de `/start`, el paquete del panel y
 * el propio panel, que se daba por cargado con DOS de sus cuatro peticiones. Las
 * otras dos aterrizaban despues y encendian su bloque cada una por su lado: esos
 * eran los dos parpadeos que se veian en el iPhone.
 *
 * Aqui la capa se queda puesta —de cortina— hasta que la pantalla de destino
 * avisa de que no le queda nada cargando. Como la capa esta fija y por encima de
 * todo, mientras siga puesta no se ve nada de lo de en medio: se ve el verde, y
 * despues el panel terminado.
 *
 * QUIEN espera se decide por la RUTA, no por que componente monte. Esto ya
 * fallo cuatro veces con caras distintas y las cuatro fueron lo mismo: el
 * resultado dependia del orden de montaje. Una ruta es un dato que se lee
 * cuando se quiera, y las redirecciones —`/start` al panel, el panel al
 * formulario— encadenan solas porque cada una vuelve a pasar por aqui.
 *
 * Ninguna ruta puede quedarse esperando un aviso que nadie manda: las que no
 * avisan retiran la cortina al llegar, y ademas hay un plazo maximo.
 */

import { detectStandalone } from '../hooks/useStandalone';

const ID_DE_LA_CAPA = 'arranque';

/**
 * Pasado este plazo la cortina se levanta aunque siga habiendo peticiones en
 * vuelo, y la pantalla enseña sus propias esperas. No es opcional: sin el, un
 * telefono sin cobertura se queda mirando un verde eterno, que es peor defecto
 * que el que esto viene a arreglar. La red de seguridad del CSS —6s, sin
 * JavaScript— sigue detras por si nada de esto llega a ejecutarse.
 *
 * Queda POR DEBAJO de los 5s que `useRedirectIfAuthenticated` espera a
 * `/current-user` antes de entrar sin red, asi que el arranque en el campo sin
 * cobertura no sale entero de detras de la cortina: se levanta a los 3s y
 * quedan un par de segundos de espera propia antes del salto al panel. Es a
 * proposito —tres segundos de verde ya son muchos— y se prefiere eso a atar
 * este plazo al de la sesion.
 */
export const PLAZO_MAXIMO_MS = 3000;

/**
 * Las rutas por las que se entra a la aplicacion y que SI mandan el aviso.
 * Cualquier otra —la portada, un enlace profundo, el formulario de acceso—
 * conserva lo de siempre: la cortina se retira al llegar.
 */
/**
 * `/` esta en la lista porque tambien es puerta de entrada: los iconos
 * instalados ANTES de FE #465 llevan la portada cocida como ruta de arranque
 * —iOS guarda la URL al crear el acceso directo y no la cambia cuando cambia el
 * manifiesto—, y sin ella todo esto no les haria nada. Que la portada sea
 * ademas la pantalla de todos los dias en el navegador no estorba: la cortina
 * solo se sostiene con la aplicacion instalada.
 */
const RUTAS_QUE_AVISAN = ['/', '/start', '/dashboard'];

let plazo = null;
let retirada = false;

export const rutaQueAvisa = (pathname) => RUTAS_QUE_AVISAN.includes(pathname);

/**
 * Levanta la cortina. Idempotente: da igual quien llegue primero.
 */
export const retiraLaCortina = () => {
  retirada = true;

  if (plazo !== null) {
    clearTimeout(plazo);
    plazo = null;
  }

  document.getElementById(ID_DE_LA_CAPA)?.remove();
};

/**
 * La ruta a la que se ha llegado manda aviso: se deja la cortina puesta, con su
 * plazo. Se llama en cada cambio de ruta, y solo el primero arma el plazo: el
 * salto de `/start` al panel es parte del MISMO arranque, y reiniciar la cuenta
 * en cada tramo convertiria el techo de 3s en 3s por pantalla.
 */
export const esperaElAviso = () => {
  if (retirada || plazo !== null) return;

  // Solo en la aplicacion instalada. En el navegador esta capa es blanca con el
  // monograma y la pagina se abre por su cuenta: sostenerla ahi convertiria un
  // F5 en el panel, o un enlace guardado, en una espera en blanco de hasta tres
  // segundos donde antes se veia la aplicacion cargando sus bloques. La saga de
  // los parpadeos es de la aplicacion instalada; el navegador no la sufre.
  if (!detectStandalone()) {
    retiraLaCortina();
    return;
  }

  plazo = setTimeout(retiraLaCortina, PLAZO_MAXIMO_MS);
};

/**
 * El aviso: la pantalla de destino no tiene nada mas cargando.
 */
export const laPantallaEstaLista = () => {
  retiraLaCortina();
};

/**
 * Solo para las pruebas: el estado vive en el modulo y sobrevive de un test al
 * siguiente.
 */
export const reiniciaLaCortina = () => {
  if (plazo !== null) clearTimeout(plazo);
  plazo = null;
  retirada = false;
};
