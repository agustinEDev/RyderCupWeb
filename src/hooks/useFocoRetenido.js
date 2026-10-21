import { useEffect, useEffectEvent, useLayoutEffect } from 'react';

// Lo que puede recibir el foco con el tabulador. Sin lo desactivado: enfocar
// un botón desactivado no hace nada y el foco se quedaba detrás del diálogo. Y
// sin lo que lleva tabindex -1: una pestaña cerrada (o cualquier cosa sacada a
// propósito del tabulador) no puede ser el primer foco ni el destino de la vuelta
const NO_SACADO = ':not([tabindex="-1"])';
export const ENFOCABLES = [
  `button:not([disabled])${NO_SACADO}`,
  `[href]${NO_SACADO}`,
  `input:not([disabled])${NO_SACADO}`,
  `select:not([disabled])${NO_SACADO}`,
  `textarea:not([disabled])${NO_SACADO}`,
  `[tabindex]${NO_SACADO}`,
].join(', ');

// Sin desplazar: en el móvil, enfocar desplazaba la página o el carril de las
// tarjetas hasta el elemento, y la pantalla saltaba al abrir o cerrar una hoja
const SIN_DESPLAZAR = { preventScroll: true };

// Los diálogos abiertos, el de encima al final
const pila = [];

/**
 * El foco de un diálogo modal: entra al abrir, no se sale con el tabulador y
 * vuelve a donde estaba al cerrar; y Escape cierra (RyderCupWeb#389).
 *
 * Salió de `ModalShell` para que lo usen también las hojas inferiores, que se
 * anunciaban modales sin serlo: con el tabulador se acababa en el formulario de
 * detrás, que no se ve.
 *
 * Con varios diálogos abiertos a la vez —una hoja sobre el modal de crear
 * partida— solo manda el de encima: el de debajo no se pelea por el foco ni se
 * cierra con el Escape de la hoja.
 *
 * @param {React.RefObject<HTMLElement>} cajaRef La caja del diálogo
 * @param {Object} [opciones]
 * @param {boolean} [opciones.activo=true] Mientras sea falso no hace nada
 * @param {Function} [opciones.alEscape] Qué hace Escape; se lee al pulsar
 * @param {boolean} [opciones.escapeExclusivo=false] Escucha en captura y no deja
 *   que el Escape llegue más allá. Para las hojas que se abren encima de un
 *   diálogo que tiene su propia escucha de Escape, fuera de esta pila
 * @param {React.RefObject<HTMLElement>} [opciones.inicialRef] Dónde entra el
 *   foco al abrir, si no es en lo primero (el campo de una hoja para escribir)
 */
export const useFocoRetenido = (cajaRef, { activo = true, alEscape, escapeExclusivo = false, inicialRef } = {}) => {
  // El foco entra en la caja al abrir y vuelve a donde estaba al cerrar. Sin lo
  // segundo, cerrar el diálogo dejaba el foco en el `body` y el siguiente
  // tabulador empezaba desde la cabecera de la página.
  useEffect(() => {
    if (!activo) return undefined;

    const caja = cajaRef.current;
    const anterior = document.activeElement;
    // Con el foco ya dentro no se toca: es un diálogo de dentro montado a la
    // vez que este, cuyo efecto corre antes (los hijos van primero), y
    // quitárselo dejaría sin foco al de encima
    const yaDentro = caja?.contains(anterior) && anterior !== caja;
    if (!yaDentro) (inicialRef?.current ?? caja?.querySelector(ENFOCABLES) ?? caja)?.focus(SIN_DESPLAZAR);

    return () => {
      // Solo si el foco sigue siendo mío. Con dos diálogos encima, al cerrarse
      // el de abajo devolvía el foco a la página y se lo robaba al que quedaba
      // abierto delante.
      const esMio = caja?.contains(document.activeElement) || document.activeElement === document.body;
      if (esMio && typeof anterior?.focus === 'function' && document.contains(anterior)) {
        anterior.focus(SIN_DESPLAZAR);
      }
    };
    // `inicialRef` es una ref: no cambia, y se lee al abrir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, cajaRef]);

  // Lo que hace Escape, leído en el momento de pulsar. Por `useEffectEvent` y no
  // como dependencia del efecto de abajo: `alEscape` suele ser una función nueva
  // en cada render, y con ella la escucha se soltaba y se volvía a poner cada
  // vez que la página de debajo se pintaba. Un Escape que caía en ese hueco se
  // perdía —con carga, los tests de los modales de admin fallaban así—
  const alPulsarEscape = useEffectEvent(() => alEscape?.());

  // Escape cierra, y el tabulador da la vuelta dentro de la caja en vez de
  // salirse a lo que hay debajo. En `useLayoutEffect`: corre en el mismo paso
  // que pone el diálogo en la página, mientras que un `useEffect` llega después
  // de pintarlo, y un Escape en ese hueco se perdía —un modal que se abre tras
  // una espera, como editar, lo tenía siempre—
  useLayoutEffect(() => {
    if (!activo) return undefined;

    // Se apila en el orden en que se abren, que es el de encima al final: una
    // hoja se abre sobre un diálogo que ya estaba. Si se montan a la vez uno
    // dentro de otro, el efecto del de dentro corre antes y quedaría debajo;
    // por eso el de fuera se mete por debajo de los que contiene
    const yo = { caja: cajaRef.current };
    const contenido = pila.findIndex((otro) => otro.caja && otro.caja !== yo.caja && yo.caja?.contains(otro.caja));
    if (contenido === -1) pila.push(yo);
    else pila.splice(contenido, 0, yo);

    const alPulsar = (e) => {
      if (pila.at(-1) !== yo) return;

      if (e.key === 'Escape') {
        if (escapeExclusivo) e.stopPropagation();
        alPulsarEscape();
        return;
      }
      if (e.key !== 'Tab') return;

      const caja = cajaRef.current;
      const enfocables = [...(caja?.querySelectorAll(ENFOCABLES) ?? [])];

      // Sin nada enfocable dentro no se deja salir: es justo lo que pasa
      // mientras la tarjeta va de camino, con los dos botones desactivados, y
      // es el momento en que el jugador NO puede acabar en la página de detrás.
      if (enfocables.length === 0) {
        e.preventDefault();
        caja?.focus();
        return;
      }

      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      const dentro = caja?.contains(document.activeElement);

      if (e.shiftKey && (document.activeElement === primero || !dentro)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (document.activeElement === ultimo || !dentro)) {
        e.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener('keydown', alPulsar, escapeExclusivo);
    return () => {
      document.removeEventListener('keydown', alPulsar, escapeExclusivo);
      pila.splice(pila.indexOf(yo), 1);
    };
  }, [activo, cajaRef, escapeExclusivo]);
};
