import { useEffect, useEffectEvent, useLayoutEffect } from 'react';

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
 */

export const ENFOCABLES =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Los diálogos abiertos, el de encima al final
const pila = [];

export const useFocoRetenido = (cajaRef, { activo = true, alEscape, escapeExclusivo = false } = {}) => {
  // El foco entra en la caja al abrir y vuelve a donde estaba al cerrar. Sin lo
  // segundo, cerrar el diálogo dejaba el foco en el `body` y el siguiente
  // tabulador empezaba desde la cabecera de la página.
  useEffect(() => {
    if (!activo) return undefined;

    const caja = cajaRef.current;
    const anterior = document.activeElement;
    // Con `:not([disabled])`: enfocar un botón desactivado no hace nada y el
    // foco se quedaba detrás del diálogo, que es donde no puede estar.
    (caja?.querySelector(ENFOCABLES) ?? caja)?.focus();

    return () => {
      // Solo si el foco sigue siendo mío. Con dos diálogos encima, al cerrarse
      // el de abajo devolvía el foco a la página y se lo robaba al que quedaba
      // abierto delante.
      const esMio = caja?.contains(document.activeElement) || document.activeElement === document.body;
      if (esMio && typeof anterior?.focus === 'function' && document.contains(anterior)) {
        anterior.focus();
      }
    };
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

    const yo = {};
    pila.push(yo);

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
