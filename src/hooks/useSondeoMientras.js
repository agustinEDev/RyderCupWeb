import { useEffect } from 'react';

/**
 * Llama a `pedir` cada `cada` ms mientras `activo` sea cierto (FE #824, PR 5).
 * Para cuando deja de serlo y al desmontar. `pedir` tiene que ser estable
 * (`useCallback`): si no, el reloj se rearma en cada pintada.
 *
 * Los sondeos del proyecto van en hooks propios (CLAUDE.md), no en el componente.
 */
export const useSondeoMientras = (activo, pedir, cada) => {
  useEffect(() => {
    if (!activo || !pedir) return undefined;
    const reloj = setInterval(() => pedir(), cada);
    return () => clearInterval(reloj);
  }, [activo, pedir, cada]);
};

export default useSondeoMientras;
