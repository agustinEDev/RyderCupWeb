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
const MARCA_DE_ARRANQUE = 'app:arranque-registrado';

const resolver = () => {
  try {
    // La marca dice «esta pestaña ya arrancó», y se pone SIEMPRE, se haya
    // entrado por donde se haya entrado. Marcarla solo en `/` dejaba un hueco:
    // quien entraba por una ruta profunda no dejaba marca, y si luego llegaba a
    // la portada y el service worker recargaba la pestaña —lo hace por su
    // cuenta al entrar una versión nueva—, esa recarga se leía como un arranque
    // en `/` y se llevaba al panel a quien estuviera leyendo la portada
    const yaArranco = sessionStorage.getItem(MARCA_DE_ARRANQUE);
    sessionStorage.setItem(MARCA_DE_ARRANQUE, '1');

    // Solo el PRIMER arranque de la pestaña cuenta, y solo si fue en la
    // portada: ninguna visita posterior a `/` convierte la sesión en arranque
    if (yaArranco) return false;
    return window.location.pathname === '/';
  } catch {
    // Sin almacenamiento —modo privado de algunos navegadores— se prefiere no
    // redirigir: enseñar la portada de más molesta mucho menos que sacar a
    // alguien de ella cada vez que entra
    return false;
  }
};

export const ARRANCO_EN_LA_PORTADA = resolver();
