/**
 * Retira la espera del arranque que pinta `index.html`.
 *
 * Esa capa vive fuera de React a proposito: dentro de la aplicacion se veia
 * hasta tres veces seguidas al abrir con sesion —al bajar la portada, al
 * comprobar la sesion y al bajar el panel—, desmontandose y montandose entre
 * medias, y esos cortes son lo que parpadea. Fuera, se pinta una sola vez y
 * desaparece una sola vez.
 *
 * La retira la primera pantalla REAL que se monta, no la primera que se monta:
 * quitarla antes devolveria el parpadeo con otro nombre.
 */
const ID = 'arranque';

/** Tope de seguridad: si algo impide que una pantalla llegue a montarse, la capa
 *  taparia la aplicacion entera. Mas vale un salto feo que una app inusable.
 *
 *  IMPORTANTE: este modulo tiene que evaluarse SIEMPRE, y por eso lo importa
 *  `main.jsx`. Cuando solo lo importaban dos paginas perezosas, el tope ni
 *  siquiera se programaba en el resto de rutas: abrir `/login`, volver de Google,
 *  seguir un enlace de correo o simplemente recargar en una pantalla profunda
 *  dejaba la capa puesta para siempre, tapando la aplicacion entera. */
const LIMITE_MS = 8000;

let retirada = false;

export const retirarPantallaDeArranque = () => {
  if (retirada) return;
  retirada = true;

  const capa = document.getElementById(ID);
  if (!capa) return;

  // Deja de capturar toques ya, no al acabar el fundido: si no, durante esos
  // 180 ms una capa invisible se come el primer toque sobre la pantalla recien
  // montada, que es justo cuando alguien que abre la aplicacion va a tocar
  capa.style.pointerEvents = 'none';
  capa.style.opacity = '0';
  capa.addEventListener('transitionend', () => capa.remove(), { once: true });
  // Si la transicion no llega a dispararse —pestaña en segundo plano, o el
  // usuario pidio no animar— la capa se va igual
  setTimeout(() => capa.remove(), 300);
};

if (typeof window !== 'undefined') {
  setTimeout(retirarPantallaDeArranque, LIMITE_MS);
}

export default retirarPantallaDeArranque;
