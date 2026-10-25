import { describe, it, expect, vi } from 'vitest';

/**
 * Una pantalla diferida que no carga porque la página sigue con un build viejo
 * (Sentry RYDERCUP-FRONTEND-23, 24 oct 2026). Tabla E1-E4 aprobada por
 * Agustín, afinada en la revisión: solo con la página vieja.
 */
const NUEVO = '2.53.0 abc1234 2026-10-24T12:00:00.000Z';
const VIEJO = '2.52.0 adc31ce 2026-10-23T23:07:34.162Z';
const html = (marca) => `<!doctype html><head><meta name="app-build" content="${marca}"></head>`;

const montar = async ({
  corre = VIEJO,
  enCache = NUEVO,
  conServiceWorker = true,
  nota = null,
  almacen: almacenDado = null,
} = {}) => {
  vi.resetModules();
  const modulo = await import('./recargaPorTrozoViejo');
  const objetivo = new globalThis.EventTarget();
  const documento = new globalThis.EventTarget();
  documento.visibilityState = 'visible';
  documento.querySelector = () => (corre ? { getAttribute: () => corre } : null);
  const guardado = new Map(nota ? [['lazy_load_error_reloaded', JSON.stringify({ recargas: nota })]] : []);
  const almacen = almacenDado ?? {
    getItem: (k) => guardado.get(k) ?? null,
    setItem: (k, v) => guardado.set(k, v),
    removeItem: (k) => guardado.delete(k),
  };
  const ventana = {
    addEventListener: (tipo, fn) => objetivo.addEventListener(tipo, fn),
    navigator: { serviceWorker: { controller: conServiceWorker ? {} : null } },
    location: { reload: vi.fn(), pathname: '/scoring' },
  };
  const cachesApi = {
    match: vi.fn(async () => (enCache === null ? undefined : { text: async () => html(enCache) })),
  };
  const programado = [];
  await modulo.instalarRecargaPorTrozoViejo({
    ventana,
    documento,
    almacen,
    cachesApi,
    programar: (fn) => programado.push(fn),
  });
  const disparar = () => {
    const evento = new globalThis.Event('vite:preloadError', { cancelable: true });
    objetivo.dispatchEvent(evento);
    return evento;
  };
  return { modulo, disparar, ventana, guardado, documento, cachesApi, programado };
};

describe('recarga por un trozo viejo', () => {
  it('E1: con la página vieja y service worker, recarga y cancela el fallo', async () => {
    const { disparar, ventana, modulo } = await montar();

    const evento = disparar();

    expect(evento.defaultPrevented).toBe(true);
    expect(ventana.location.reload).toHaveBeenCalledTimes(1);
    expect(modulo.recargandoPorTrozoViejo()).toBe(true);
  });

  it('con el build al día, un fallo de red sigue su camino: lazyWithRetry reintenta', async () => {
    const { disparar, ventana, modulo } = await montar({ corre: NUEVO, enCache: NUEVO });

    const evento = disparar();

    expect(evento.defaultPrevented).toBe(false);
    expect(ventana.location.reload).not.toHaveBeenCalled();
    expect(modulo.recargandoPorTrozoViejo()).toBe(false);
  });

  it('sin la marca en la caché no se sabe si es vieja: no recarga', async () => {
    const { disparar, ventana } = await montar({ enCache: null });

    expect(disparar().defaultPrevented).toBe(false);
    expect(ventana.location.reload).not.toHaveBeenCalled();
  });

  it('sin la marca en la página tampoco', async () => {
    const { disparar, ventana } = await montar({ corre: null });

    disparar();

    expect(ventana.location.reload).not.toHaveBeenCalled();
  });

  it('busca el index.html del service worker sin mirar su revisión', async () => {
    const { cachesApi } = await montar();

    expect(cachesApi.match).toHaveBeenCalledWith('/index.html', { ignoreSearch: true });
  });

  it('al volver a primer plano lo mira otra vez: el service worker pudo cambiar en segundo plano', async () => {
    const { disparar, ventana, documento, cachesApi } = await montar({ corre: VIEJO, enCache: VIEJO });
    expect(disparar().defaultPrevented).toBe(false);

    cachesApi.match.mockImplementation(async () => ({ text: async () => html(NUEVO) }));
    documento.dispatchEvent(new globalThis.Event('visibilitychange'));
    await new Promise((r) => setTimeout(r, 0));

    expect(disparar().defaultPrevented).toBe(true);
    expect(ventana.location.reload).toHaveBeenCalledTimes(1);
  });

  it('E3: sin service worker no recarga: sin red saldría la página de error del navegador', async () => {
    const { disparar, ventana } = await montar({ conServiceWorker: false });

    expect(disparar().defaultPrevented).toBe(false);
    expect(ventana.location.reload).not.toHaveBeenCalled();
  });

  it('E1: apunta la versión a la que va y la página donde recarga', async () => {
    const { disparar, guardado } = await montar();

    disparar();

    expect(JSON.parse(guardado.get('lazy_load_error_reloaded')).recargas).toEqual([[NUEVO, '/scoring']]);
  });

  it('E2: si ya recargó a esa versión en esta página, no vuelve a recargar: sale el error', async () => {
    const { disparar, ventana } = await montar({ nota: [[NUEVO, '/scoring']] });

    expect(disparar().defaultPrevented).toBe(false);
    expect(ventana.location.reload).not.toHaveBeenCalled();
  });

  it('E2: en otra página, o con la nota de otra versión, sí recarga', async () => {
    const enOtra = await montar({ nota: [[NUEVO, '/otra']] });
    enOtra.disparar();
    expect(enOtra.ventana.location.reload).toHaveBeenCalledTimes(1);

    const deOtra = await montar({ nota: [[VIEJO, '/scoring']] });
    deOtra.disparar();
    expect(deOtra.ventana.location.reload).toHaveBeenCalledTimes(1);
  });

  it('R9: sin almacenamiento no puede apuntarla: no recarga, como la barrera', async () => {
    const roto = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('SecurityError');
      },
    };
    const { disparar, ventana } = await montar({ almacen: roto });

    expect(disparar().defaultPrevented).toBe(false);
    expect(ventana.location.reload).not.toHaveBeenCalled();
  });

  it('si la recarga no llega, el temporizador no toca la nota', async () => {
    const { disparar, programado, guardado } = await montar();
    disparar();

    programado.forEach((fn) => fn());

    expect(JSON.parse(guardado.get('lazy_load_error_reloaded')).recargas).toEqual([[NUEVO, '/scoring']]);
  });

  it('si la recarga no llega, la marca de recargando se apaga sola a los 10 s', async () => {
    const { disparar, programado, modulo } = await montar();
    disparar();
    expect(modulo.recargandoPorTrozoViejo()).toBe(true);
    expect(modulo.OLVIDAR_LA_RECARGA_MS).toBe(10_000);

    programado.forEach((fn) => fn());

    expect(modulo.recargandoPorTrozoViejo()).toBe(false);
  });
});

describe('el eco de la recarga', () => {
  it('mientras se recarga, solo el error del import cancelado', async () => {
    const { disparar, modulo } = await montar();
    disparar();

    expect(modulo.esElEcoDeLaRecarga(new TypeError("undefined is not an object (evaluating 'e.default')"))).toBe(true);
    expect(modulo.esElEcoDeLaRecarga(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(modulo.esElEcoDeLaRecarga(new Error('Failed to fetch dynamically imported module: x.js'))).toBe(true);
    expect(modulo.esElEcoDeLaRecarga(new Error('La API se cayó'))).toBe(false);
  });

  it('sin recarga en curso, nada es eco', async () => {
    const { modulo } = await montar({ corre: NUEVO, enCache: NUEVO });

    expect(modulo.esElEcoDeLaRecarga(new TypeError('Importing a module script failed.'))).toBe(false);
  });

  it('la marca se lee del HTML', async () => {
    const { modulo } = await montar();

    expect(modulo.marcaDelBuild(html(NUEVO))).toBe(NUEVO);
    expect(modulo.marcaDelBuild('<html></html>')).toBeNull();
  });

  it('con el almacenamiento bloqueado (leer sessionStorage ya lanza), se instala sin romper el arranque', async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      get: () => {
        throw new Error('SecurityError');
      },
    });
    try {
      vi.resetModules();
      const modulo = await import('./recargaPorTrozoViejo');
      const objetivo = new globalThis.EventTarget();
      const ventana = {
        addEventListener: (tipo, fn) => objetivo.addEventListener(tipo, fn),
        navigator: { serviceWorker: { controller: {} } },
        location: { reload: vi.fn(), pathname: '/scoring' },
      };
      const documento = new globalThis.EventTarget();
      documento.querySelector = () => ({ getAttribute: () => VIEJO });
      const cachesApi = { match: async () => ({ text: async () => html(NUEVO) }) };

      await modulo.instalarRecargaPorTrozoViejo({ ventana, documento, cachesApi, programar: () => {} });
      const evento = new globalThis.Event('vite:preloadError', { cancelable: true });
      objetivo.dispatchEvent(evento);

      // Sin almacenamiento no puede apuntarla: no recarga, y nada lanza
      expect(ventana.location.reload).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(globalThis, 'sessionStorage', original);
    }
  });
});
