import { useEffect, useRef } from 'react';
import { REDUCED_MOTION_QUERY } from './useEntryMotion';

// Lo que hace quien mira por su cuenta: a partir de ahí, no se le mueve
const GESTOS = ['wheel', 'touchmove', 'keydown', 'pointerdown'];

/**
 * Lo que le falta a la página para que la fila quede en el centro, como
 * espacio al final del bloque (FE #988): la fila «tu posición» del scratch va
 * la última, y la página no podía bajar lo bastante para centrarla.
 */
const hacerSitioDebajo = (bloque, fila) => {
  if (!bloque) return;
  // Lo de una vez anterior no cuenta: se calcula de nuevo
  bloque.style.paddingBottom = '';
  const caja = fila.getBoundingClientRect();
  // Ya se ve entera: no hace falta mover nada, ni dejar media pantalla en
  // blanco debajo de una tabla corta (revisor)
  if (caja.top >= 0 && caja.bottom <= globalThis.innerHeight) return;
  const hastaElCentro = caja.top + globalThis.scrollY + caja.height / 2 - globalThis.innerHeight / 2;
  const puedeBajar = document.documentElement.scrollHeight - globalThis.innerHeight;
  const falta = Math.ceil(hastaElCentro - puedeBajar);
  if (falta > 0) bloque.style.paddingBottom = `${falta}px`;
};

/**
 * Si participo, la clasificación me lleva a mi fila, centrada y con el foco
 * (14 oct 2026). `modo`: «una», la primera vez que se ve; «alAbrir», cada vez
 * que se abre. Cuenta la primera respuesta llegada después de abrir, buena o
 * mala: con la lectura de antes mi puesto puede haber cambiado, y si en lo
 * primero que se ve no estaba (o falló), un refresco que me trae no me mueve
 * mientras leo. Tampoco si quien mira ya se ha movido por su cuenta.
 *
 * @param {Object} opciones
 * @param {'una'|'alAbrir'|null} opciones.modo - Sin él, nunca
 * @param {boolean} opciones.activa - Si la clasificación está a la vista
 * @param {number} opciones.respuestas - Sube con cada lectura que responde, bien o mal
 * @returns {import('react').RefObject<HTMLElement>} El bloque donde buscar mi fila (`tr[data-yo="true"]`)
 */
export const useCentrarEnMiFila = ({ modo, activa, respuestas }) => {
  const bloqueRef = useRef(null);
  const yaVista = useRef(false);
  const abiertaTras = useRef(0);

  // Cerrada con «alAbrir»: la próxima vez que se abra, otra vez
  useEffect(() => {
    if (activa || modo !== 'alAbrir') return;
    yaVista.current = false;
    abiertaTras.current = respuestas;
  }, [activa, modo, respuestas]);

  // Abierta y sin centrar todavía: si quien mira se mueve, se respeta
  useEffect(() => {
    if (!modo || !activa) return undefined;
    const seMueve = () => {
      yaVista.current = true;
    };
    GESTOS.forEach((g) => globalThis.addEventListener(g, seMueve, { passive: true }));
    return () => GESTOS.forEach((g) => globalThis.removeEventListener(g, seMueve));
  }, [modo, activa]);

  useEffect(() => {
    if (!modo || !activa || yaVista.current || respuestas <= abiertaTras.current) return;
    yaVista.current = true;
    // También la de debajo del corte (scratch)
    const mia = bloqueRef.current?.querySelector('tr[data-yo="true"]');
    if (!mia) return;
    hacerSitioDebajo(bloqueRef.current, mia);
    const sinAnimacion = globalThis.matchMedia?.(REDUCED_MOTION_QUERY).matches;
    mia.scrollIntoView({ block: 'center', behavior: sinAnimacion ? 'auto' : 'smooth' });
    // El foco con ella, para el lector de pantalla, sin mover más la vista
    mia.focus({ preventScroll: true });
  }, [modo, activa, respuestas]);

  return bloqueRef;
};
