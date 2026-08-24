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
const LIMITE_MS = 4000;

let retirada = false;

/** Cuantas pantallas piden que la espera siga puesta. Existe porque «la ruta
 *  cargo» no es lo mismo que «hay pantalla»: `ProtectedRoute` no suspende, hace
 *  su propia consulta de sesion, y mientras tanto el Suspense ya resolvio. Sin
 *  esto la espera se iba y debajo asomaba su pantalla de carga: verde, blanco y
 *  pantalla, el parpadeo de siempre. */
let retenciones = 0;

/** La llama quien esta a punto de enseñar SU propia espera. */
export const retenerEspera = () => {
  retenciones += 1;
};

/** Y esta cuando ya tiene algo que enseñar. */
export const soltarEspera = () => {
  retenciones = Math.max(0, retenciones - 1);
};

export const retirarPantallaDeArranque = ({ forzar = false } = {}) => {
  if (retirada) return;
  if (retenciones > 0 && !forzar) return;
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
  // `forzar` porque el tope existe justo para los casos en que nadie llega a
  // soltar su retencion. Y son 4 s, no 8: la capa es opaca y esta por encima de
  // todo, asi que si un paquete falla y salta la pantalla de error, tapa tambien
  // su boton de recargar hasta que se cumpla el plazo.
  setTimeout(() => retirarPantallaDeArranque({ forzar: true }), LIMITE_MS);
}

export default retirarPantallaDeArranque;
