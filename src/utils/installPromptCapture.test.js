import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  startCapturingInstallPrompt,
  getCapturedInstallPrompt,
  onInstallPromptCaptured,
  resetInstallPromptCapture,
} from './installPromptCapture';

/**
 * Captura temprana de `beforeinstallprompt` (FE #334).
 *
 * Chrome lo dispara nada mas procesar el manifiesto, mucho antes de que monte
 * un componente — y la pagina que lo necesita se carga de forma diferida. Si
 * nadie escucha en ese momento, el evento se pierde y no vuelve: el boton
 * "Instalar" deja de instalar para el resto de la sesion.
 */

function fireBeforeInstallPrompt() {
  const event = new window.Event('beforeinstallprompt');
  event.preventDefault = vi.fn();
  window.dispatchEvent(event);
  return event;
}

describe('installPromptCapture', () => {
  beforeEach(() => {
    resetInstallPromptCapture();
  });

  it('keeps an event fired before anyone subscribes', () => {
    // El caso que rompia: el evento llega y solo despues monta React
    startCapturingInstallPrompt();
    fireBeforeInstallPrompt();

    expect(getCapturedInstallPrompt()).not.toBeNull();
  });

  it('hands the already-captured event to a late subscriber', () => {
    startCapturingInstallPrompt();
    const event = fireBeforeInstallPrompt();

    const notify = vi.fn();
    onInstallPromptCaptured(notify);

    expect(notify).toHaveBeenCalledWith(event);
  });

  it('notifies a subscriber that arrived first', () => {
    startCapturingInstallPrompt();
    const notify = vi.fn();
    onInstallPromptCaptured(notify);

    const event = fireBeforeInstallPrompt();

    expect(notify).toHaveBeenCalledWith(event);
  });

  it('stops the browser from showing its own install bar as well', () => {
    startCapturingInstallPrompt();

    const event = fireBeforeInstallPrompt();

    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('clears the captured event once the app is installed', () => {
    startCapturingInstallPrompt();
    fireBeforeInstallPrompt();

    window.dispatchEvent(new window.Event('appinstalled'));

    expect(getCapturedInstallPrompt()).toBeNull();
  });

  it('does not stack listeners when started more than once', () => {
    // main.jsx la arranca, y el hook la vuelve a arrancar al montar
    const notify = vi.fn();
    startCapturingInstallPrompt();
    startCapturingInstallPrompt();
    startCapturingInstallPrompt();
    onInstallPromptCaptured(notify);

    fireBeforeInstallPrompt();

    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('lets a subscriber unsubscribe', () => {
    startCapturingInstallPrompt();
    const notify = vi.fn();
    const unsubscribe = onInstallPromptCaptured(notify);

    unsubscribe();
    fireBeforeInstallPrompt();

    expect(notify).not.toHaveBeenCalled();
  });
});
