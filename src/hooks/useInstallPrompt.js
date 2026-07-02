import { useState, useEffect } from 'react';

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
  const isStandalone = window.navigator.standalone === true;
  return (isIOS || isIPadOS) && !isStandalone;
}

function detectDesktopSafari() {
  const ua = navigator.userAgent;
  const isSafari = /safari/i.test(ua) && !/chrome|chromium|android/i.test(ua);
  const isMac = /macintosh/i.test(ua) && navigator.maxTouchPoints === 0;
  return isSafari && isMac;
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isDesktopSafari, setIsDesktopSafari] = useState(false);

  useEffect(() => {
    if (isDismissed()) return;

    if (detectIOS()) {
      setIsIOS(true);
      setCanInstall(true);
      return;
    }

    if (detectDesktopSafari()) {
      setIsDesktopSafari(true);
      setCanInstall(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    const installedHandler = () => setCanInstall(false);

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

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

  return { canInstall, isIOS, isDesktopSafari, install, dismiss };
}
