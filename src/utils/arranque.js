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
const LIMITE_MS = 12000;

let retirada = false;

/** Cuantas pantallas piden que la espera siga puesta. Existe porque «la ruta
 *  cargo» no es lo mismo que «hay pantalla»: `ProtectedRoute` no suspende, hace
 *  su propia consulta de sesion, y mientras tanto el Suspense ya resolvio. Sin
 *  esto la espera se iba y debajo asomaba su pantalla de carga: verde, blanco y
 *  pantalla, el parpadeo de siempre. */
let retenciones = 0;

/** Si alguien ya dijo «hay pantalla». Hace falta porque las dos condiciones
 *  —hay pantalla, y nadie retiene— se cumplen en momentos distintos y en
 *  cualquier orden: sin recordar la primera, quien llegaba segundo no tenia a
 *  quien avisar y la capa se quedaba puesta hasta el tope. */
let pantallaDeclarada = false;

/** La llama quien esta a punto de enseñar SU propia espera. */
export const retenerEspera = () => {
  retenciones += 1;
};

/** Y esta cuando ya tiene algo que enseñar.
 *
 *  Soltar NO retira la capa, a proposito. Quien suelta sabe que EL ya termino,
 *  no que haya pantalla: al resolver la sesion, el paquete del panel puede no
 *  haberse pedido siquiera, y retirar ahi destapaba la espera blanca durante
 *  toda la descarga. La unica autoridad para retirar es `RetiraLaEspera`, que
 *  vive dentro del `Suspense` y por tanto solo corre cuando hay algo montado
 *  —y el tope, como red—. */
export const soltarEspera = () => {
  retenciones = Math.max(0, retenciones - 1);

  // Si ya se habia declarado pantalla mientras esto retenia, aquel intento se
  // descarto y NADIE va a volver a pedirlo: React no repite los efectos pasivos
  // cuando un `Suspense` oculta y reaparece un subarbol —comprobado—, asi que el
  // aviso no vuelve. Sin este reintento la capa se quedaba hasta el tope: doce
  // segundos tapando la aplicacion entera y comiendose los toques, que es MUCHO
  // peor que el parpadeo que todo esto viene a quitar.
  if (retenciones === 0 && pantallaDeclarada) {
    intentarRetirada();
  }
};

export const retirarPantallaDeArranque = ({ forzar = false } = {}) => {
  if (retirada) return;

  // La decision se aplaza un tick a proposito. React ejecuta los efectos de
  // izquierda a derecha dentro del mismo commit, asi que quien retira puede
  // correr ANTES de que quien enseña su propia espera haya podido retener: sin
  // este aplazamiento el resultado dependia del orden de los componentes en el
  // arbol, y eso ya se colo cuatro revisiones seguidas. Aplazando, cuando llega
  // el momento de decidir todas las retenciones del commit estan hechas.
  pantallaDeclarada = true;

  if (!forzar) {
    intentarRetirada();
    return;
  }

  aplicarRetirada();
};

/** La decision se aplaza un tick: React ejecuta los efectos de izquierda a
 *  derecha dentro del mismo commit, asi que quien retira puede correr antes de
 *  que quien enseña su propia espera haya podido retener. Aplazando, cuando
 *  toca decidir todas las retenciones de ese render ya estan hechas. */
const intentarRetirada = () => {
  setTimeout(() => {
    if (retirada || retenciones > 0) return;
    aplicarRetirada();
  }, 0);
};

const aplicarRetirada = () => {
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
  // `forzar` porque el tope existe justo para los casos en que nadie llega a
  // soltar su retencion.
  //
  // Es holgado, y a proposito: la propia aplicacion se concede 5 s para decidir
  // la sesion (`useRedirectIfAuthenticated`) y el `fetch` de `useAuth` no tiene
  // tope. Con 4 s la capa se levantaba A MITAD de una comprobacion lenta —una
  // instancia de Render arrancando en frio— y dejaba ver la espera blanca justo
  // en el caso que esto viene a arreglar. Que no tape la pantalla de error no
  // depende de este plazo: de eso se encarga `LazyLoadErrorBoundary`, que la
  // retira en cuanto hay error.
  setTimeout(() => retirarPantallaDeArranque({ forzar: true }), LIMITE_MS);
}

export default retirarPantallaDeArranque;
