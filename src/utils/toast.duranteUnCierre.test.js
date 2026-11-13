import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Durante un cierre forzado, los avisos de error de las pantallas no salen (tabla A1 del
 * 8 nov 2026): la página se va al login en medio segundo, y el probador vio el texto en
 * bruto del backend y «Error al cargar las competiciones» encima del aviso del cierre.
 * El aviso del propio cierre (`delCierre`) sí sale. Sin cierre, todo como siempre (A3).
 */
const custom = vi.hoisted(() => vi.fn(() => 'id'));
vi.mock('react-hot-toast', () => ({ default: { custom, dismiss: vi.fn() } }));

const { customToast } = await import('./toast');
const { empiezaElCierreDeEstaCarga, olvidaElCierreDeEstaCarga } =
  await import('./cierreDeEstaCarga');

describe('los avisos de error durante un cierre forzado', () => {
  beforeEach(() => {
    custom.mockClear();
    olvidaElCierreDeEstaCarga();
  });

  it('A3: sin cierre, el aviso de error sale', () => {
    customToast.error('Error al cargar las competiciones');

    expect(custom).toHaveBeenCalledTimes(1);
  });

  it('A1: con un cierre en marcha, el aviso de error de una pantalla no sale', () => {
    empiezaElCierreDeEstaCarga();

    expect(
      customToast.error('Error al cargar las competiciones'),
    ).toBeUndefined();
    expect(custom).not.toHaveBeenCalled();
  });

  it('A1: el aviso del propio cierre sí sale, sin pasar su marca a la librería', () => {
    empiezaElCierreDeEstaCarga();

    customToast.error('Tu sesión ha terminado.', {
      delCierre: true,
      duration: 8000,
    });

    expect(custom).toHaveBeenCalledTimes(1);
    expect(custom.mock.calls[0][1]).toEqual({ duration: 8000 });
  });

  it('A3: los avisos que no son de error salen igual durante el cierre', () => {
    empiezaElCierreDeEstaCarga();

    customToast.info('Algo');

    expect(custom).toHaveBeenCalledTimes(1);
  });
});
