import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Este modulo retira la capa de espera que pinta `index.html`. Si falla, la capa
 * se queda encima y la aplicacion es inusable: eso ya estuvo a punto de pasar
 * —la retirada vivia solo en dos paginas perezosas, asi que en el resto de rutas
 * ni el tope de seguridad llegaba a programarse—. Por eso se prueba.
 */
const montarCapa = () => {
  document.body.innerHTML = '<div id="arranque"></div><div id="root"></div>';
  return document.getElementById('arranque');
};

const cargarModulo = async () => {
  vi.resetModules();
  return import('./arranque');
};

describe('retirarPantallaDeArranque', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('deja de capturar toques antes de empezar el fundido', async () => {
    const capa = montarCapa();
    const { retirarPantallaDeArranque } = await cargarModulo();

    retirarPantallaDeArranque();

    // Lo que importa es el orden: durante el fundido la capa ya no debe
    // interceptar el primer toque sobre la pantalla recien montada
    expect(capa.style.pointerEvents).toBe('none');
    expect(capa.style.opacity).toBe('0');
  });

  it('se va del DOM aunque la transicion no llegue a dispararse', async () => {
    montarCapa();
    const { retirarPantallaDeArranque } = await cargarModulo();

    retirarPantallaDeArranque();
    vi.advanceTimersByTime(300);

    expect(document.getElementById('arranque')).toBeNull();
  });

  it('no falla si se la llama dos veces', async () => {
    montarCapa();
    const { retirarPantallaDeArranque } = await cargarModulo();

    retirarPantallaDeArranque();
    vi.advanceTimersByTime(300);

    expect(() => retirarPantallaDeArranque()).not.toThrow();
    expect(document.getElementById('arranque')).toBeNull();
  });

  it('no falla cuando no hay capa que retirar', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const { retirarPantallaDeArranque } = await cargarModulo();

    expect(() => retirarPantallaDeArranque()).not.toThrow();
  });

  it('el tope de seguridad la retira aunque nadie la llame', async () => {
    montarCapa();
    // Importar el modulo es lo que arma el tope: por eso lo importa `main.jsx`,
    // para que quede armado en CUALQUIER ruta y no solo donde alguien lo use
    await cargarModulo();

    expect(document.getElementById('arranque')).not.toBeNull();
    vi.advanceTimersByTime(8000 + 300);

    expect(document.getElementById('arranque')).toBeNull();
  });
});
