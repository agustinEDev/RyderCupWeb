/**
 * Captura de `beforeinstallprompt` antes de que arranque React (FE #334).
 *
 * Chrome dispara el evento en cuanto procesa el manifiesto, que ocurre mucho
 * antes de que se monte ningun componente: la pagina que lo necesita se carga
 * de forma diferida, asi que para cuando `useInstallPrompt` registraba su
 * listener el evento ya habia pasado y no vuelve. El resultado era un boton
 * "Instalar" que no instalaba y ademas afirmaba que el navegador no podia.
 *
 * El evento se guarda aqui, en un modulo cargado desde `main.jsx` antes de
 * montar la aplicacion, y el hook lo recoge cuando le toca.
 */

let capturedPrompt = null;
let started = false;
let promptHandler = null;
let installedHandler = null;
const subscribers = new Set();

/**
 * Idempotente a proposito: `main.jsx` la llama cuanto antes para no perder el
 * evento, y el hook la llama tambien al montar, de modo que sigue funcionando
 * aunque nadie la haya arrancado (un test, o un punto de entrada distinto).
 */
export function startCapturingInstallPrompt() {
  if (typeof window === 'undefined' || started) return;
  started = true;

  promptHandler = (event) => {
    // Sin esto Chrome pinta su propia barra de instalacion ademas de la nuestra
    event.preventDefault();
    capturedPrompt = event;
    subscribers.forEach((notify) => notify(event));
  };

  installedHandler = () => {
    capturedPrompt = null;
    subscribers.forEach((notify) => notify(null));
  };

  window.addEventListener('beforeinstallprompt', promptHandler);
  window.addEventListener('appinstalled', installedHandler);
}

/** El evento ya capturado, o null si aun no ha llegado (o no llegara). */
export function getCapturedInstallPrompt() {
  return capturedPrompt;
}

/**
 * Avisa cuando el evento llegue. Devuelve la funcion para darse de baja.
 * Si ya estaba capturado, avisa de inmediato: el hook puede montarse despues.
 */
export function onInstallPromptCaptured(notify) {
  subscribers.add(notify);
  if (capturedPrompt) notify(capturedPrompt);
  return () => subscribers.delete(notify);
}

/**
 * Solo para tests: devuelve el modulo a su estado inicial, listeners incluidos.
 * Sin quitarlos, un test seguiria apoyandose en los del anterior y la guardia
 * de idempotencia dejaria de poder comprobarse.
 */
export function resetInstallPromptCapture() {
  if (typeof window !== 'undefined') {
    if (promptHandler) window.removeEventListener('beforeinstallprompt', promptHandler);
    if (installedHandler) window.removeEventListener('appinstalled', installedHandler);
  }
  promptHandler = null;
  installedHandler = null;
  capturedPrompt = null;
  started = false;
  subscribers.clear();
}
