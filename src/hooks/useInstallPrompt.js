import { useState, useEffect } from 'react';
import { detectStandalone } from './useStandalone';
import {
  getCapturedInstallPrompt,
  onInstallPromptCaptured,
  startCapturingInstallPrompt,
} from '../utils/installPromptCapture';

const DISMISSED_KEY = 'pwa_install_dismissed';
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function isDismissed() {
  const raw = localStorage.getItem(DISMISSED_KEY);
  if (!raw) return false;
  try {
    const ts = parseInt(raw, 10);
    if (isNaN(ts)) return false; // legacy '1' value → treat as not dismissed
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function detectIOS() {
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  // iPadOS 13+ reports as MacIntel with touch support
  const isIPadOS =
    (/macintosh/i.test(ua) || navigator.platform === 'MacIntel') &&
    navigator.maxTouchPoints > 1;
  // Only navigator.standalone here — matchMedia('display-mode: standalone') is unreliable
  // in some mobile WebView-based browsers (e.g. Chrome iOS) and falsely reports true in
  // regular tabs, which would wrongly hide the "Add to Home Screen" instructions.
  const isStandalone = window.navigator.standalone === true;
  return (isIOS || isIPadOS) && !isStandalone;
}

/**
 * Donde vive el boton de compartir y como se llega a "Anadir a pantalla de
 * inicio" cambia segun el navegador y el aparato (FE #332).
 *
 * Solo se afirma una posicion concreta en Safari, que es la unica que se puede
 * dar por cierta: barra inferior en iPhone, barra superior en iPad. El resto de
 * navegadores de iOS llegan por su propio menu, y prometerles un sitio exacto
 * seria peor que no decir nada.
 *
 * @returns {'safari-iphone'|'safari-ipad'|'other-browser'}
 */
function detectIOSInstallRoute() {
  const ua = navigator.userAgent;

  // Los navegadores de iOS son WebKit por obligacion y arrastran "Safari" en su
  // UA, asi que Safari se reconoce por descarte de los tokens de los demas
  const isOtherBrowser = /crios|fxios|edgios|opt\//i.test(ua);
  if (isOtherBrowser) return 'other-browser';

  // Un UA que se identifica como iPhone o iPod manda, y corta aqui: la regla de
  // abajo mira `navigator.platform`, que en algunos entornos vale 'MacIntel'
  // junto a un UA de iPhone y lo mandaria a las instrucciones de iPad
  if (/iphone|ipod/i.test(ua)) return 'safari-iphone';

  // iPadOS 13+ se presenta como MacIntel, de ahi el maxTouchPoints
  const isIPad = /ipad/i.test(ua) || ((/macintosh/i.test(ua) || navigator.platform === 'MacIntel') && navigator.maxTouchPoints > 1);

  return isIPad ? 'safari-ipad' : 'safari-iphone';
}

function detectDesktopSafari() {
  const ua = navigator.userAgent;
  const isSafari = /safari/i.test(ua) && !/chrome|chromium|android/i.test(ua);
  const isMac = /macintosh/i.test(ua) && navigator.maxTouchPoints === 0;
  return isSafari && isMac;
}

export function useInstallPrompt() {
  // El evento pudo llegar antes de montar: se recoge ya capturado (FE #334)
  const [deferredPrompt, setDeferredPrompt] = useState(() => getCapturedInstallPrompt());
  const [isIOS] = useState(() => detectIOS());
  const [iosInstallRoute] = useState(() => detectIOSInstallRoute());
  const [isDesktopSafari] = useState(() => !detectIOS() && detectDesktopSafari());
  const [isInstalled, setIsInstalled] = useState(() => detectStandalone());
  const [canInstall, setCanInstall] = useState(
    () => !isDismissed() && (detectIOS() || detectDesktopSafari() || getCapturedInstallPrompt() !== null)
  );

  useEffect(() => {
    if (isDismissed() || isIOS || isDesktopSafari) return;

    // No hace nada si main.jsx ya la arranco; cubre el caso de que no
    startCapturingInstallPrompt();

    // La suscripcion avisa tambien de lo ya capturado, asi que cubre por igual
    // el evento que llego antes de montar y el que llegue despues
    const unsubscribe = onInstallPromptCaptured((event) => {
      setDeferredPrompt(event);
      setCanInstall(event !== null);
      if (event === null) setIsInstalled(true);
    });

    return unsubscribe;
  }, [isIOS, isDesktopSafari]);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setCanInstall(false);
    if (outcome === 'dismissed') {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setCanInstall(false);
  };

  return { canInstall, isIOS, iosInstallRoute, isDesktopSafari, isInstalled, install, dismiss };
}
