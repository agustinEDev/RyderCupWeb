import { describe, it, expect, vi, beforeEach } from 'vitest';
import { instalarRecargaPorTrozoViejo, ESPERA_ENTRE_RECARGAS_MS } from './recargaPorTrozoViejo';

/**
 * Una pantalla diferida que no carga (Sentry RYDERCUP-FRONTEND-23, 24 oct
 * 2026): la página seguía con el build viejo y su trozo ya no estaba en la
 * caché del service worker nuevo. Tabla E1-E4 aprobada por Agustín.
 */
const montar = ({ conServiceWorker = true, ultima = null, ahora = 100_000 } = {}) => {
  const oyentes = {};
  const guardado = new Map(ultima === null ? [] : [['rcf-recarga-por-trozo-viejo', String(ultima)]]);
  const ventana = {
    addEventListener: (tipo, fn) => {
      oyentes[tipo] = fn;
    },
    navigator: { serviceWorker: conServiceWorker ? { controller: {} } : { controller: null } },
    location: { reload: vi.fn() },
  };
  const almacen = {
    getItem: (k) => guardado.get(k) ?? null,
    setItem: (k, v) => guardado.set(k, v),
  };
  instalarRecargaPorTrozoViejo({ ventana, almacen, ahora: () => ahora });
  const evento = { preventDefault: vi.fn(), payload: new TypeError('Importing a module script failed.') };
  return { disparar: () => oyentes['vite:preloadError']?.(evento), ventana, evento, guardado };
};

describe('recarga por un trozo viejo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('E1: con service worker, recarga una vez y no deja saltar el error', () => {
    const { disparar, ventana, evento } = montar();

    disparar();

    expect(ventana.location.reload).toHaveBeenCalledTimes(1);
    expect(evento.preventDefault).toHaveBeenCalled();
  });

  it('E1: apunta cuándo recargó', () => {
    const { disparar, guardado } = montar({ ahora: 123_456 });

    disparar();

    expect(guardado.get('rcf-recarga-por-trozo-viejo')).toBe('123456');
  });

  it('E2: si ya recargó hace menos de 30 s, no vuelve a recargar: sale el error', () => {
    const { disparar, ventana, evento } = montar({ ultima: 100_000 - ESPERA_ENTRE_RECARGAS_MS + 1 });

    disparar();

    expect(ventana.location.reload).not.toHaveBeenCalled();
    expect(evento.preventDefault).not.toHaveBeenCalled();
  });

  it('E2: pasados los 30 s, vuelve a poder recargar', () => {
    const { disparar, ventana } = montar({ ultima: 100_000 - ESPERA_ENTRE_RECARGAS_MS });

    disparar();

    expect(ventana.location.reload).toHaveBeenCalledTimes(1);
  });

  it('E2: los 30 s', () => {
    expect(ESPERA_ENTRE_RECARGAS_MS).toBe(30_000);
  });

  it('E3: sin service worker no recarga: sin red saldría la página de error del navegador', () => {
    const { disparar, ventana, evento } = montar({ conServiceWorker: false });

    disparar();

    expect(ventana.location.reload).not.toHaveBeenCalled();
    expect(evento.preventDefault).not.toHaveBeenCalled();
  });

  it('sin almacenamiento (modo privado) recarga igual, sin romperse', () => {
    const oyentes = {};
    const ventana = {
      addEventListener: (tipo, fn) => {
        oyentes[tipo] = fn;
      },
      navigator: { serviceWorker: { controller: {} } },
      location: { reload: vi.fn() },
    };
    const roto = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('SecurityError');
      },
    };
    instalarRecargaPorTrozoViejo({ ventana, almacen: roto, ahora: () => 1 });

    oyentes['vite:preloadError']({ preventDefault: vi.fn() });

    expect(ventana.location.reload).toHaveBeenCalledTimes(1);
  });
});
