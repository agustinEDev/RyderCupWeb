/**
 * La sesión, consultada UNA vez por carga de página (FE #489).
 *
 * `useAuth` era un hook plano —`useState` más un `fetch` al montar—, así que
 * **cada componente que lo llamaba preguntaba por su cuenta**, y lo llaman veinte
 * ficheros. Un arranque de la aplicación instalada pedía `/current-user` cuatro
 * veces —el contexto de Sentry, la pantalla de entrada, el guardia de rutas y el
 * propio panel— antes de que el panel pidiera su primer dato, y las dos últimas
 * en serie: el guardia no pinta nada hasta que la suya vuelve, y solo entonces
 * monta el panel, que arranca la suya.
 *
 * Aquí la consulta vive una sola vez: quien llega mientras hay una en vuelo se
 * engancha a ella, quien llega después recibe lo que ya se sabe sin tocar la
 * red, y quien quiera enterarse de los cambios se suscribe.
 *
 * ## Lo que se aprendió montándolo
 *
 * - **Solo se guarda lo que dice el backend.** Sembrar esto con el usuario de
 *   `AuthContext` parecía gratis y no lo era: ahí vive una **entidad de dominio**
 *   —camelCase, con el correo como objeto— y quien lee de aquí espera el DTO en
 *   snake_case. El panel habría intentado pintar un objeto como texto, y un
 *   administrador recién entrado se habría quedado sin `is_admin`.
 * - **Un fallo no se guarda como respuesta.** Cachear «no hay sesión» tras un
 *   error de red dejaba el arranque sin cobertura en un ida y vuelta entre el
 *   guardia y el formulario, cada uno rebotando al otro sin volver a preguntar.
 * - **Refrescar no es cargar.** `ProtectedRoute` y `RoleGuard` desmontan a sus
 *   hijos mientras `loading` esté en alto: si `refetch` lo levantara, guardar el
 *   perfil desmontaría el formulario a media faena.
 * - **Una respuesta que llega tarde no manda.** Si entre la pregunta y la
 *   respuesta se cierra la sesión, la respuesta no puede resucitarla; por eso
 *   cada consulta lleva su número y solo escribe la que sigue siendo la actual.
 *
 * Lo que NO entra aquí, a propósito: la consulta de `useRedirectIfAuthenticated`.
 * Esa no puede pasar por `fetchWithTokenRefresh` —en una ruta pública el
 * interceptor se niega a refrescar ante un 401, que es justo el caso de la
 * aplicación abierta horas después— y lo documenta su propio fichero.
 */

import { clearDeviceRevocationFlag } from '../utils/deviceRevocationLogout';
import { fetchWithTokenRefresh } from '../utils/tokenRefreshInterceptor';

// Misma prioridad que el resto: la configuración de ejecución manda sobre la del
// build, o en un despliegue en contenedor se acaba preguntando a hosts distintos
const API_URL = globalThis.APP_CONFIG?.API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';

/**
 * Lo mínimo entre dos comprobaciones al volver a la aplicación o a la red
 * (hotfix 2.50.1): volver y salir diez veces seguidas no son diez peticiones.
 */
export const MINIMO_ENTRE_REVALIDACIONES_MS = 60_000;

/** Lo que se espera antes de volver a intentarlo cuando la consulta falla. */
export const ESPERA_TRAS_FALLO_MS = 3_000;

/**
 * Cuantas veces se reintenta solo. Con espera creciente y un tope: un corte
 * breve se recupera sin que nadie haga nada, y un backend caido no se lleva una
 * peticion cada tres segundos por pestaña abierta durante el resto del dia.
 */
const REINTENTOS_AUTOMATICOS = 3;

/**
 * A quién pertenece la sesión, apuntado en el dispositivo (FE #524).
 *
 * Al agotar los reintentos, esto bajaba a «resuelto y sin usuario», y para
 * `ProtectedRoute` eso es «no has entrado»: al formulario de acceso, en mitad
 * del campo, con la sesión intacta —comprobado: en cuanto vuelve la señal,
 * `/current-user` responde 200 sin volver a entrar—. Y ahí ya no se puede
 * anotar, que es justo para lo que hace falta la aplicación sin cobertura.
 *
 * Se guarda lo que devuelve el backend, no la entidad de dominio de
 * `AuthContext`: quien lee de aquí espera el DTO, y sembrar con aquello hacía
 * que el panel pintara un objeto como texto.
 *
 * El servidor sigue mandando. Esto solo evita el rebote al formulario mientras
 * no hay a quién preguntar: la primera petición que llegue dirá si vale.
 */
const RECUERDO = 'rydercup-sesion-conocida';

const apunta = (usuario) => {
  try {
    localStorage.setItem(RECUERDO, JSON.stringify(usuario));
  } catch {
    // Sin espacio, o en una ventana privada. Se seguirá echando al formulario
    // sin cobertura, que es como estaba antes: no hay nada peor que perder
  }
};

const olvidaElApunte = () => {
  try {
    localStorage.removeItem(RECUERDO);
  } catch {
    // Nada que hacer
  }
};

/**
 * Sin privilegios: esto vive en el dispositivo y se puede tocar a mano. El
 * panel de administración lo defiende el backend de todas formas, pero enseñar
 * sus botones sin poder confirmar nada sobra.
 */
const loApuntado = () => {
  try {
    const crudo = localStorage.getItem(RECUERDO);
    if (!crudo) return null;
    const usuario = JSON.parse(crudo);
    return usuario && typeof usuario === 'object' ? { ...usuario, is_admin: false } : null;
  } catch {
    return null;
  }
};

/** `sinConfirmar`: lo que se enseña sale del apunte del dispositivo y el
 *  servidor todavia no lo ha respaldado. Es SUYO y no se deduce de
 *  `refrescando`, que tambien se levanta en un refresco corriente de una sesion
 *  ya confirmada: derivarlo de ahi bloqueaba la pantalla entera en cada
 *  `refetch`, que es justo lo que el comentario de `consultaLaSesion` prohibe. */
const NADA_SABIDO = {
  user: null,
  cargando: true,
  refrescando: false,
  error: null,
  resuelta: false,
  sinConfirmar: false,
};

let instantanea = NADA_SABIDO;
// La página se está yendo (una salida que recarga): preguntar ya no sirve de
// nada, la recarga cortaría la petición a medias (FE #865)
let seVa = false;
let enVuelo = null;
let generacion = 0;
let reintento = null;
let fallosSeguidos = 0;
// Cuándo respondió el servidor por última vez, o se le volvió a preguntar
let ultimaComprobacion = 0;
const oyentes = new Set();

/**
 * La instantánea es inmutable y se comparte tal cual: `useSyncExternalStore`
 * compara por identidad, y devolver un objeto nuevo en cada lectura dejaría la
 * aplicación repintando sin parar.
 */
const anota = (cambios) => {
  instantanea = { ...instantanea, ...cambios };
  for (const oyente of oyentes) oyente();
};

/**
 * Lo programa quien FALLA, no quien llegue despues.
 *
 * Antes se armaba dentro de la rama de espera de `consultaLaSesion`, asi que
 * hacia falta que llegara otra llamada durante esos tres segundos. En un
 * arranque corriente no llega ninguna: todos los consumidores han preguntado ya
 * y comparten la misma peticion, asi que al fallar no quedaba nadie que la
 * rearmara y la pagina se quedaba sin sesion hasta recargar.
 */
const programaReintento = () => {
  if (reintento !== null) return;
  if (fallosSeguidos > REINTENTOS_AUTOMATICOS) return;

  // Creciente: 3s, 6s, 12s. Un corte breve se recupera solo; uno largo no se
  // convierte en una peticion cada tres segundos hasta que alguien cierre la app
  const espera = ESPERA_TRAS_FALLO_MS * 2 ** (fallosSeguidos - 1);

  reintento = setTimeout(() => {
    reintento = null;
    // Forzando: el reintento quiere preguntar de verdad, y desde que se pinta
    // con la sesión apuntada (FE #529) esto se publica como resuelto —para que
    // el guardia deje pasar y nadie abra su propia petición—, así que el atajo
    // de «ya está resuelta» lo cortaba en seco y no se volvía a preguntar
    // nunca: la aplicación se quedaba con lo apuntado hasta recargar
    consultaLaSesion({ forzar: true });
  }, espera);
};

/** Lo que contestó el servidor, cuando ya no manda o dice que no hay sesión. */
const DESCARTADA = Symbol('descartada');
const SIN_SESION = Symbol('sin sesión');

/**
 * La pregunta a current-user, la misma para la consulta y para la revalidación
 * al volver (hotfix 2.50.1). Un fallo de red o una respuesta que no sea 200,
 * 401 ni 404 se lanza: no es una respuesta sobre la sesión.
 *
 * @param {() => boolean} sigoValiendo Si la pregunta sigue siendo la actual
 * @returns {Promise<Object|typeof DESCARTADA|typeof SIN_SESION>}
 */
const preguntaAlServidor = async (sigoValiendo) => {
  const respuesta = await fetchWithTokenRefresh(`${API_URL}/api/v1/auth/current-user`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  // Una respuesta de una consulta ya invalidada —porque entre medias se cerró la
  // sesión, o porque alguien forzó otra— no escribe nada
  if (!sigoValiendo()) return DESCARTADA;

  // El dispositivo revocado NO se atiende aqui: `fetchWithTokenRefresh` lo
  // detecta antes, llama a `handleDeviceRevocationLogout` y se queda
  // esperando una promesa que no resuelve, asi que ese 401 no llega
  if (respuesta.status === 401 || respuesta.status === 404) return SIN_SESION;
  if (!respuesta.ok) throw new Error(`Failed to fetch user: ${respuesta.status}`);

  const usuario = await respuesta.json();
  // Otra vez: en el `await` de arriba cabe un login o un cierre de sesión
  return sigoValiendo() ? usuario : DESCARTADA;
};

/** El servidor dice que no hay sesión: sin usuario y sin la copia del dispositivo. */
const publicaSinSesion = () => {
  olvidaElApunte();
  anota({ user: null, cargando: false, refrescando: false, error: null, resuelta: true, sinConfirmar: false });
};

/**
 * El servidor confirma la sesión. Se publica un objeto NUEVO: `useEditProfile`
 * se re-sincroniza con `useEffect([user])`, y tras un `refetch` eso es lo que se
 * espera. Quien no quiera re-sincronizar —la revalidación al volver— no llama
 * a esto si la respuesta es la misma.
 */
const publicaConfirmada = (usuario) => {
  clearDeviceRevocationFlag();
  fallosSeguidos = 0;
  // Y el reintento que quedara armado se cancela: desde que fuerza (FE #529)
  // dispararia una peticion de mas, y al forzar sube la generacion, con lo que
  // un `refetch` en vuelo veria su respuesta descartada
  if (reintento !== null) clearTimeout(reintento);
  reintento = null;
  ultimaComprobacion = Date.now();
  apunta(usuario);
  anota({ user: usuario, cargando: false, refrescando: false, error: null, resuelta: true, sinConfirmar: false });
};

const pideAlBackend = async (miGeneracion) => {
  const sigoValiendo = () => miGeneracion === generacion;

  try {
    const usuario = await preguntaAlServidor(sigoValiendo);
    if (usuario === DESCARTADA) return null;
    if (usuario === SIN_SESION) {
      publicaSinSesion();
      return null;
    }

    publicaConfirmada(usuario);
    return usuario;
  } catch (error) {
    console.error('Error loading user:', error);
    if (!sigoValiendo()) return null;

    // Un tropiezo no es una respuesta. Con nada apuntado, `resuelta` se queda
    // como estaba: darlo por resuelto dejaba a quien montara despues sin volver
    // a intentarlo. Con la sesion apuntada SI se resuelve —abajo—, para que el
    // guardia deje pasar y nadie abra su propia peticion; a cambio, recuperarse
    // pasa a depender solo del temporizador, que por eso fuerza la consulta
    fallosSeguidos += 1;
    programaReintento();

    if (reintento !== null) {
      // Con la sesión apuntada en el dispositivo no hace falta esperar a nadie:
      // se pinta YA y se sigue preguntando por detrás.
      //
      // Antes esto mantenía `cargando` arriba hasta agotar los reintentos, y
      // como van a 3, 6 y 12 segundos, abrir la aplicación sin cobertura eran
      // **21 segundos de pantalla en blanco** antes siquiera de pedir la
      // partida —medido—. En el campo eso es una aplicación rota, y es justo el
      // caso para el que se guarda todo esto (FE #529).
      //
      // No se arriesga nada que no estuviera decidido ya: aquí solo se llega
      // por un fallo de red o un 5xx. Un 401 o un 404 no pasan por el `catch`,
      // se resuelven arriba borrando el apunte y mandando al formulario, así
      // que una sesión que de verdad no vale se corrige en cuanto haya
      // respuesta. El servidor sigue mandando; esto solo evita esperarle
      // mirando una pantalla vacía
      const recordado = instantanea.user ?? loApuntado();
      if (recordado) {
        anota({
          user: recordado,
          cargando: false,
          // Lo que dice que aún se está preguntando, sin bloquear a nadie
          refrescando: true,
          error: error.message,
          resuelta: true,
          // Solo si sale del apunte: un usuario que ya venía confirmado sigue
          // estándolo aunque ahora no se pueda preguntar
          sinConfirmar: instantanea.user === null,
        });
        return recordado;
      }

      // Sin nada apuntado no hay qué pintar, y esto sigue siendo «no se sabe»,
      // no «no hay sesión»: bajarlo a resuelto es el rebote al formulario
      anota({ cargando: true, refrescando: false, error: error.message });
      return null;
    }

    // Se acabaron los reintentos y no hay a quién preguntar. Antes se bajaba
    // aquí a «resuelto y sin usuario» y el guardia mandaba al formulario
    const deLaMemoria = instantanea.user === null;
    const recordado = instantanea.user ?? loApuntado();
    anota({
      user: recordado,
      cargando: false,
      refrescando: false,
      error: error.message,
      resuelta: recordado !== null,
      sinConfirmar: deLaMemoria && recordado !== null,
    });

    return recordado;
  }
};

/** Lo que se sabe ahora mismo, sin tocar la red. */
export const loQueHaySobreLaSesion = () => instantanea;

/** @returns {() => void} La baja. */
export const suscribeALaSesion = (oyente) => {
  oyentes.add(oyente);

  return () => oyentes.delete(oyente);
};

/**
 * @param {{forzar?: boolean}} opciones `forzar` vuelve a preguntar aunque ya se
 *   sepa: es lo que hace `refetch` tras guardar algo del perfil.
 */
export const consultaLaSesion = ({ forzar = false } = {}) => {
  // Con la página yéndose no se sale a la red: se sigue en «no se sabe»
  // (`cargando` arriba) hasta que la recarga empiece de cero. Con el usuario
  // que haya, no con un `null` que se leería como «no hay sesión» (/code-review).
  // Si el navegador guardara la página en su caché del historial con esto
  // puesto, al volver la recarga `useRecargaAlVolverDeLaCache`
  if (seVa) return Promise.resolve(instantanea.user);
  if (!forzar) {
    if (instantanea.resuelta) return Promise.resolve(instantanea.user);
    if (enVuelo) return enVuelo;
    // Con el backend caido, cada componente que montara abriria la suya: guardias
    // que redirigen, pantallas que se montan, y vuelta a empezar. Es el abanico
    // de peticiones que esto vino a quitar, justo cuando menos se aguanta.
    //
    // Pero esperar NO es haber contestado: mientras dura, esto sigue siendo
    // «no se sabe» —`cargando` arriba—, o `ProtectedRoute` leeria «resuelto y sin
    // usuario» en su primer render y mandaria al formulario a alguien que tiene
    // la sesion abierta. Y al vencer se reintenta solo: si dependiera de que
    // monte otro componente, un tropiezo de red se llevaria por delante toda la
    // carga de pagina
    // Con un reintento ya en camino, quien llegue se espera a el en vez de abrir
    // otra: es el abanico de peticiones que esto vino a quitar, justo cuando el
    // backend menos lo aguanta
    if (reintento !== null) return Promise.resolve(instantanea.user);
  }

  generacion += 1;
  const mia = generacion;

  // Con un usuario ya sabido esto es un REFRESCO, y no puede levantar `cargando`:
  // los guardias desmontan a sus hijos mientras eso este en alto, asi que
  // guardar el perfil desmontaria el formulario a media faena
  anota(instantanea.user ? { refrescando: true, error: null } : { cargando: true, error: null });

  const promesa = pideAlBackend(mia).finally(() => {
    // Por identidad: con dos refrescos solapados, el primero en terminar borraba
    // la referencia del segundo y quien llegara despues no veia ninguno en vuelo
    if (enVuelo === promesa) enVuelo = null;
  });
  enVuelo = promesa;

  return promesa;
};

/**
 * Acaba de confirmarse la sesión: se anota sin gastar otra consulta.
 *
 * **Solo con lo que devuelve el backend.** Lo que hay en `AuthContext` es una
 * entidad de dominio —camelCase, el correo como objeto— y quien lee de aquí
 * espera el DTO: sembrar con aquello hacía que el panel pintara un objeto como
 * texto y que un administrador recién entrado se quedara sin `is_admin`.
 */
export const anotaLaSesion = (usuarioDelBackend) => {
  // Como el camino de exito de arriba: es el UNICO sitio de la aplicacion que
  // limpia la marca de dispositivo revocado, y sin esto los dos caminos
  // divergen. Con la sesion ya sembrada, `consultaLaSesion` no vuelve a
  // preguntar en toda la carga de pagina, asi que la marca se quedaba puesta y
  // el siguiente cierre de sesion salia sin su aviso
  clearDeviceRevocationFlag();
  generacion += 1;
  enVuelo = null;
  fallosSeguidos = 0;
  if (reintento !== null) clearTimeout(reintento);
  reintento = null;
  ultimaComprobacion = Date.now();
  // Y la copia del dispositivo, como en el camino de éxito de arriba: lo que se
  // siembra lo acaba de confirmar el backend. Sin esto, tras aceptar los
  // Términos el apunte seguía con `terms_accepted: false`, y abrir la
  // aplicación sin cobertura arrancaba con él: a la pantalla de aceptar, con la
  // cola de anotaciones apagada y sin red para aceptar
  apunta(usuarioDelBackend);
  // Y confirmada: viene del servidor. Si no, tras aceptar desde una sesión
  // arrancada sin red, `RoleGuard` seguía esperando y cada revalidación
  // publicaba un objeto nuevo, borrando lo escrito en el perfil (revisión)
  anota({ user: usuarioDelBackend, cargando: false, refrescando: false, error: null, resuelta: true, sinConfirmar: false });
};

/**
 * La sesión se acabó: al salir, porque el servidor la dio por caducada o porque
 * otra pestaña lo dijo.
 * Sin esto, lo que quedara guardado aquí sobreviviría al cierre de sesión.
 */
export const olvidaLaSesion = () => {
  // Y lo apuntado se va con ella: si no, la próxima vez sin cobertura se
  // entraría como quien acaba de salir
  olvidaElApunte();
  // Y los fallos se cuentan desde cero. Si no, un arranque sin cobertura que
  // quemara los cuatro intentos dejaba el contador arriba, y el siguiente fallo
  // —ya con la sesión cerrada por el servidor o por otra pestaña— se pasaba del
  // tope: sin reintento, sin apunte, y al formulario a la primera, que es
  // justo lo que no puede pasar en mitad del campo
  fallosSeguidos = 0;
  ultimaComprobacion = 0;
  // Sube la generación: si hay una respuesta en vuelo, ya no manda. Si no,
  // llegaría con el usuario de antes y volvería a dar por buena una sesión que
  // acaba de cerrarse
  generacion += 1;
  enVuelo = null;
  if (reintento !== null) clearTimeout(reintento);
  reintento = null;
  // Vuelve al estado de partida, `cargando` incluido. Publicarlo con `cargando`
  // en falso le decía a los guardias «resuelto y sin usuario», y `ProtectedRoute`
  // rebotaba al formulario en su primer render —antes de que a nadie le diera
  // tiempo a preguntar—, justo despues de entrar. `resuelta` en falso porque se
  // olvida lo que se sabia, no se guarda un «aqui no hay sesion»
  anota(NADA_SABIDO);
};

/*
 * La revalidación al volver a la aplicación (hotfix 2.50.1).
 *
 * Hubo una y se retiró (FE #505), por dos motivos que aquí se evitan:
 *
 * - **Echaba a quien volvía sin cobertura.** Pasa por `fetchWithTokenRefresh`
 *   con el access caducado, y un refresco sin respuesta se tomaba por sesión
 *   muerta. Eso lo cerró FE #514: el interceptor solo cierra sesión si el
 *   refresco responde 401, y un fallo de red la conserva.
 * - **Borraba lo escrito en el perfil.** Publicar un objeto nuevo re-sincroniza
 *   `useEditProfile`. Por eso aquí, con la misma respuesta, no se publica nada.
 *
 * Y vuelve porque hace falta: la instalada vive días abierta, o arranca sin red
 * con una copia escrita por una versión anterior (sin `terms_accepted`), y quien
 * tuviera los Términos pendientes no llegaba nunca a la pantalla de aceptarlos.
 *
 * De fondo y sin tocar nada más que lo que cambie: ni `cargando` ni
 * `refrescando`, ni reintentos, ni el contador de fallos. Un 401 o un 404 se
 * tratan como al cargar (sin sesión); un fallo de red o un 5xx dejan la sesión
 * como estaba y no gastan el minuto.
 */

/** El contenido, sin depender del orden de las claves. */
const canonico = (valor) => {
  if (Array.isArray(valor)) return valor.map(canonico);
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.keys(valor).sort().map((clave) => [clave, canonico(valor[clave])]));
  }
  return valor;
};

const mismaRespuesta = (usuario) =>
  JSON.stringify(canonico(usuario)) === JSON.stringify(canonico(instantanea.user)) &&
  !instantanea.sinConfirmar &&
  instantanea.error === null;

// Una revalidación en camino: frente y red a la vez son una sola petición
let revalidando = false;

export const revalidaLaSesion = async () => {
  if (seVa || revalidando || !instantanea.resuelta || !instantanea.user) return;
  // Ya se está preguntando, o hay un reintento en camino: ese responde
  if (enVuelo || reintento !== null) return;
  // Solo lo gasta una respuesta del servidor: un intento sin red (iOS despierta
  // la aplicación antes que la radio) no puede tapar el de cuando vuelve
  if (Date.now() - ultimaComprobacion < MINIMO_ENTRE_REVALIDACIONES_MS) return;

  revalidando = true;
  // Sin subir la generación: si entretanto se cierra la sesión o alguien fuerza
  // otra consulta, la sube él y esta respuesta deja de mandar
  const mia = generacion;

  try {
    const usuario = await preguntaAlServidor(() => mia === generacion && !seVa);
    if (usuario === DESCARTADA) return;
    // Como al cargar: en '/', '/start' o '/login' el interceptor no refresca, y
    // una sesión muerta o una cuenta borrada seguían dándose por buenas
    if (usuario === SIN_SESION) {
      publicaSinSesion();
      return;
    }

    if (mismaRespuesta(usuario)) {
      ultimaComprobacion = Date.now();
      return;
    }
    publicaConfirmada(usuario);
  } catch {
    // Sin red o un 5xx: se sigue con lo que había
  } finally {
    revalidando = false;
  }
};

/**
 * Un arranque sin red, sin copia en el dispositivo y con los reintentos
 * agotados se queda en «no se sabe» (`cargando`) sin nadie que vuelva a
 * preguntar. Al volver la red, la consulta normal. Solo tras haber fallado: en
 * una ruta pública no se consulta la sesión, y no hay que empezar aquí.
 */
const alVolverLaRedSinSaberNada = () => {
  if (seVa || instantanea.resuelta || enVuelo || reintento !== null || fallosSeguidos === 0) return;
  consultaLaSesion({ forzar: true });
};

/**
 * Pregunta otra vez al volver al frente o al volver la red, con el mínimo de
 * arriba. Lo monta `App.jsx` una vez.
 *
 * @returns {() => void} Dejar de vigilar.
 */
export const vigilaLaVueltaALaAplicacion = () => {
  const alCambiarLaVisibilidad = () => {
    if (globalThis.document.visibilityState === 'visible') revalidaLaSesion();
  };
  const alVolverLaRed = () => {
    alVolverLaRedSinSaberNada();
    revalidaLaSesion();
  };
  globalThis.document.addEventListener('visibilitychange', alCambiarLaVisibilidad);
  globalThis.addEventListener('online', alVolverLaRed);

  return () => {
    globalThis.document.removeEventListener('visibilitychange', alCambiarLaVisibilidad);
    globalThis.removeEventListener('online', alVolverLaRed);
  };
};

/**
 * La página se va: una salida que recarga ya ha pedido la navegación. Desde
 * aquí la consulta no vuelve a preguntar —limpiar la sesión la devolvía a «no
 * se sabe» y `useAuth` preguntaba otra vez, una petición que la recarga cortaba
 * a medias y que el servidor recibía igual (FE #865)—. Lo deshace la recarga.
 * Las salidas sin recarga no la llaman: ahí preguntar es lo que saca a los
 * guardias de «Cargando...».
 */
export const laPaginaSeVa = () => {
  seVa = true;
};

/** Solo para las pruebas: esto vive en el módulo y sobrevive de una a otra. */
export const reiniciaLaSesionCompartida = () => {
  generacion += 1;
  enVuelo = null;
  if (reintento !== null) clearTimeout(reintento);
  reintento = null;
  fallosSeguidos = 0;
  ultimaComprobacion = 0;
  revalidando = false;
  instantanea = NADA_SABIDO;
  seVa = false;
  // Los oyentes NO se tocan: darlos de baja aquí dejaría a los componentes
  // montados sin enterarse de nada mas, sin que nada lo delatara
};
