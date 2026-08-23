/**
 * Si la aplicación ARRANCÓ en la portada.
 *
 * Se resuelve al cargar el paquete, que es cuando de verdad arranca la
 * aplicación, y no al montarse una pantalla: `Landing` es `lazy`, así que su
 * módulo puede evaluarse mucho después —al pulsar el logo de la cabecera, por
 * ejemplo— y para entonces la ruta ya no dice por dónde se entró.
 *
 * Sin esto, la app instalada de Android captura los enlaces de su ámbito: quien
 * abriera desde WhatsApp un enlace a una clasificación y luego pulsara el logo
 * montaba la portada por primera vez y salía rebotado al panel, sin poder verla
 * nunca.
 */
const MARCA_DE_ARRANQUE = 'app:arranque-en-la-portada';

const resolver = () => {
  // Se entró por otra pantalla: esta sesión no arrancó en la portada, y ninguna
  // visita posterior a `/` la convierte en arranque
  if (window.location.pathname !== '/') return false;

  try {
    // La marca sobrevive a las recargas de la pestaña, que es justo lo que hace
    // falta: el service worker recarga por su cuenta al entrar una versión
    // nueva, y sin ella esa recarga contaría como un arranque nuevo y se
    // llevaría al panel a quien estuviera leyendo la portada
    if (sessionStorage.getItem(MARCA_DE_ARRANQUE)) return false;
    sessionStorage.setItem(MARCA_DE_ARRANQUE, '1');
    return true;
  } catch {
    // Sin almacenamiento —modo privado de algunos navegadores— se prefiere no
    // redirigir: enseñar la portada de más molesta mucho menos que sacar a
    // alguien de ella cada vez que entra
    return false;
  }
};

export const ARRANCO_EN_LA_PORTADA = resolver();
