import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * El registro por defecto solo llamaba a `register()`. En el navegador eso se
 * disimula porque cada recarga vuelve a pasar por `load`, pero la aplicacion
 * instalada se reanuda sin recargar y se quedaba con el paquete viejo hasta
 * desinstalarla.
 */
describe('registerServiceWorker', () => {
  let oyentes;
  let registro;
  let recargar;

  const cargarModulo = async () => {
    // El modulo guarda si ya registro, asi que cada caso necesita uno nuevo
    vi.resetModules();
    return (await import('./serviceWorkerRegistration')).registerServiceWorker;
  };

  const prepararNavegador = ({ conControlador }) => {
    oyentes = {};
    registro = { update: vi.fn().mockResolvedValue(undefined) };

    navigator.serviceWorker = {
      controller: conControlador ? {} : null,
      register: vi.fn().mockResolvedValue(registro),
      addEventListener: (evento, fn) => {
        oyentes[evento] = fn;
      },
    };

    recargar = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: recargar },
    });

    // `load` ya ha pasado en el entorno de test: el modulo registra directamente
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      get: () => 'complete',
    });
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete navigator.serviceWorker;
  });

  it('reloads when a new service worker takes control', async () => {
    prepararNavegador({ conControlador: true });
    const registerServiceWorker = await cargarModulo();

    registerServiceWorker();
    oyentes.controllerchange();

    expect(recargar).toHaveBeenCalledTimes(1);
  });

  it('does not reload on the very first install', async () => {
    // Sin controlador previo, el primer `controllerchange` es el de la
    // instalacion inicial: recargar ahi solo hace parpadear la pantalla
    prepararNavegador({ conControlador: false });
    const registerServiceWorker = await cargarModulo();

    registerServiceWorker();
    oyentes.controllerchange();

    expect(recargar).not.toHaveBeenCalled();
  });

  it('reloads once even if control changes twice', async () => {
    // Dos recargas encadenadas dejan la aplicacion dando vueltas
    prepararNavegador({ conControlador: true });
    const registerServiceWorker = await cargarModulo();

    registerServiceWorker();
    oyentes.controllerchange();
    oyentes.controllerchange();

    expect(recargar).toHaveBeenCalledTimes(1);
  });

  it('asks for a new version when the app comes back to the foreground', async () => {
    // Es el unico momento fiable en una aplicacion instalada, que puede pasar
    // dias sin recargarse
    prepararNavegador({ conControlador: true });
    const registerServiceWorker = await cargarModulo();

    registerServiceWorker();
    await vi.waitFor(() => expect(navigator.serviceWorker.register).toHaveBeenCalled());

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
    document.dispatchEvent(new window.Event('visibilitychange'));

    await vi.waitFor(() => expect(registro.update).toHaveBeenCalled());
  });

  it('does not ask while the app is hidden', async () => {
    prepararNavegador({ conControlador: true });
    const registerServiceWorker = await cargarModulo();

    registerServiceWorker();
    await vi.waitFor(() => expect(navigator.serviceWorker.register).toHaveBeenCalled());

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    document.dispatchEvent(new window.Event('visibilitychange'));

    expect(registro.update).not.toHaveBeenCalled();
  });

  it('starts the application even if registering fails', async () => {
    // Quedarse sin funcionar sin conexion es malo; no arrancar es peor
    prepararNavegador({ conControlador: true });
    navigator.serviceWorker.register = vi.fn().mockRejectedValue(new Error('sin https'));
    const registerServiceWorker = await cargarModulo();

    await expect(async () => registerServiceWorker()).not.toThrow();
  });
});
