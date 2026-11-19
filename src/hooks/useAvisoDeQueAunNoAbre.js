import { abreMasTarde } from '../services/partidosSinCobertura';
import { useDespertarALaHora } from './useDespertarALaHora';

/**
 * La hora a la que abre la anotación de una partida programada, si aún no ha
 * llegado (o `null`). Y que el aviso caduque solo: sin cobertura el sondeo no
 * corre, así que la pantalla se vuelve a pintar un segundo después de esa hora.
 */
export const useAvisoDeQueAunNoAbre = (scoringView) => {
  const aunNoAbre = abreMasTarde({
    status: scoringView?.matchStatus,
    scoringOpensAt: scoringView?.scoringOpensAt,
  });
  useDespertarALaHora(aunNoAbre);
  return aunNoAbre;
};
