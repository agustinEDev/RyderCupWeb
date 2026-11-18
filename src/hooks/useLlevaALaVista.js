import { useEffect } from 'react';

/**
 * Trae un aviso a la vista y le da el foco cada vez que cambia: en el móvil se
 * guarda desde abajo y el aviso queda arriba, así que pulsar «Crear» no hacía
 * nada visible (FE #731, `/code-review`).
 *
 * Instantáneo, no `smooth`: comprobado en Chrome, el suave no llega a
 * ejecutarse desde aquí y el aviso se quedaba fuera de pantalla. El foco, sin
 * volver a desplazar, para quien no lo ve.
 *
 * Se mira el aviso entero y no su texto: el mismo error repetido es otro objeto
 * y tiene que volver a llevar el foco (revisión local de la FE #731).
 *
 * @param {{current: ?HTMLElement}} ref el aviso
 * @param {*} aviso lo que se avisa; cada valor nuevo lo vuelve a traer
 * @param {boolean} [hayAviso] si hay algo que traer (por defecto, si hay aviso)
 */
export const useLlevaALaVista = (ref, aviso, hayAviso = Boolean(aviso)) => {
  useEffect(() => {
    if (!hayAviso) return;
    ref.current?.scrollIntoView({ block: 'center' });
    ref.current?.focus({ preventScroll: true });
  }, [ref, aviso, hayAviso]);
};
