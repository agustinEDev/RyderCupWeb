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

const ID_DE_LA_CAPA = 'arranque';

/**
 * Pasado este plazo la cortina se levanta aunque siga habiendo peticiones en
 * vuelo, y la pantalla enseña sus propias esperas. No es opcional: sin el, un
 * telefono sin cobertura se queda mirando un verde eterno, que es peor defecto
 * que el que esto viene a arreglar. La red de seguridad del CSS —6s, sin
 * JavaScript— sigue detras por si nada de esto llega a ejecutarse.
 */
export const PLAZO_MAXIMO_MS = 3000;

/**
 * Las rutas por las que se entra a la aplicacion y que SI mandan el aviso.
 * Cualquier otra —la portada, un enlace profundo, el formulario de acceso—
 * conserva lo de siempre: la cortina se retira al llegar.
 */
const RUTAS_QUE_AVISAN = ['/start', '/dashboard'];

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
