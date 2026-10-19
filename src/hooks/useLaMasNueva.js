import { useMemo, useRef } from 'react';

/**
 * Para lecturas de lo mismo que pueden cruzarse (FE #824, PR 5): `turno()` al
 * pedir, y `aplicar(turno)` al llegar la respuesta dice si se aplica.
 *
 * Nunca se retrocede: una respuesta no se aplica si ya se aplicó otra pedida
 * después. Pero sí mientras esa no ha llegado: si gana «la última pedida», una
 * que falla o que tarda más que el sondeo deja la pantalla sin poner al día
 * (/code-review).
 */
export const useLaMasNueva = () => {
  const pedidas = useRef(0);
  const aplicada = useRef(0);

  return useMemo(
    () => ({
      turno: () => ++pedidas.current,
      aplicar: (turno) => {
        if (turno <= aplicada.current) return false;
        aplicada.current = turno;
        return true;
      },
    }),
    []
  );
};

export default useLaMasNueva;
