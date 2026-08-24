import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createElement, useEffect } from 'react';
import { render } from '@testing-library/react';

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
    // La decision se toma un tick despues, para no depender del orden en que
    // monten las pantallas
    vi.advanceTimersByTime(0);

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

  /** El tope tiene que ser CORTO: la capa es opaca y esta por encima de todo, asi
   *  que mientras siga puesta tapa tambien el aviso de error y su boton de
   *  recargar —de eso se encarga el error boundary—. Pero tampoco puede quedarse
   *  CORTO: por debajo de los 5 s que se concede la comprobacion de sesion, la
   *  capa se levanta a mitad y vuelve el parpadeo. Se comprueba el valor, no
   *  «que en algun momento se vaya». */
  const LIMITE_ESPERADO_MS = 12000;

  it('el tope de seguridad la retira aunque nadie la llame', async () => {
    montarCapa();
    // Importar el modulo es lo que arma el tope: por eso lo importa `main.jsx`,
    // para que quede armado en CUALQUIER ruta y no solo donde alguien lo use
    await cargarModulo();

    vi.advanceTimersByTime(LIMITE_ESPERADO_MS - 100);
    expect(document.getElementById('arranque')).not.toBeNull();

    vi.advanceTimersByTime(100 + 300);
    expect(document.getElementById('arranque')).toBeNull();
  });

  it('el tope vence aunque una pantalla se quede reteniendo', async () => {
    montarCapa();
    const { retenerEspera } = await cargarModulo();

    retenerEspera();
    vi.advanceTimersByTime(LIMITE_ESPERADO_MS + 300);

    expect(document.getElementById('arranque')).toBeNull();
  });

  it('soltar la ultima retencion NO la retira por si solo', async () => {
    montarCapa();
    const { retenerEspera, soltarEspera } = await cargarModulo();

    retenerEspera();
    soltarEspera();
    vi.advanceTimersByTime(300);

    // Quien suelta sabe que EL termino, no que haya pantalla: al resolver la
    // sesion el paquete del destino puede no haberse pedido aun. Retirar ahi
    // destapaba la espera blanca durante toda la descarga.
    expect(document.getElementById('arranque')).not.toBeNull();
  });

  it('tras soltar, quien sabe que hay pantalla si la retira', async () => {
    montarCapa();
    const { retenerEspera, soltarEspera, retirarPantallaDeArranque } = await cargarModulo();

    retenerEspera();
    soltarEspera();
    retirarPantallaDeArranque();
    vi.advanceTimersByTime(300);

    expect(document.getElementById('arranque')).toBeNull();
  });

  it('mientras alguien retiene, no se retira', async () => {
    montarCapa();
    const { retenerEspera, retirarPantallaDeArranque } = await cargarModulo();

    retenerEspera();
    retirarPantallaDeArranque();
    vi.advanceTimersByTime(300);

    expect(document.getElementById('arranque')).not.toBeNull();
  });
});

/**
 * La carrera que se colo CUATRO rondas de revision seguidas: la capa se retiraba
 * antes de que hubiera pantalla. La ultima vez fue por el orden de los efectos
 * —React los ejecuta de izquierda a derecha, asi que quien retira puesto ANTES
 * corre antes de que nadie haya podido retener— y la suite no se enteraba porque
 * nada montaba las dos piezas juntas. Esto las monta.
 */
describe('quien retira y quien retiene, juntos', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  const arbol = (modulo, ordenRetirarPrimero) => {
    const Retiene = () => {
      useEffect(() => {
        modulo.retenerEspera();
        return () => modulo.soltarEspera();
      }, []);
      return null;
    };
    const Retira = () => {
      useEffect(() => {
        modulo.retirarPantallaDeArranque();
      }, []);
      return null;
    };
    const hijos = ordenRetirarPrimero
      ? [createElement(Retira, { key: 'r' }), createElement(Retiene, { key: 'h' })]
      : [createElement(Retiene, { key: 'h' }), createElement(Retira, { key: 'r' })];
    return createElement('div', null, hijos);
  };

  it('la capa sigue puesta mientras una pantalla retiene, monte en el orden que monte', async () => {
    for (const retirarPrimero of [true, false]) {
      document.body.innerHTML = '<div id="arranque"></div>';
      const modulo = await (async () => {
        vi.resetModules();
        return import('./arranque');
      })();

      render(arbol(modulo, retirarPrimero));
      vi.advanceTimersByTime(300);

      expect(
        document.getElementById('arranque'),
        `se retiro con retirarPrimero=${retirarPrimero}`
      ).not.toBeNull();
    }
  });
});
