import { useEffect, useState } from 'react';

// `setTimeout` no aguanta más de 2^31-1 ms: pasado eso dispara INMEDIATAMENTE y
// en bucle. Más lejos se encadena: se espera el máximo y se vuelve a calcular
const MAXIMO_TEMPORIZADOR_MS = 2 ** 31 - 1;

/**
 * Vuelve a pintar la pantalla un segundo después de `hora` (un `Date`, o nada).
 *
 * Para un aviso que se calcula en el render, como «la anotación abre a las
 * …» de `ScoringPage`: sin algo que vuelva a pintar se queda puesto. Con
 * cobertura lo resuelve el sondeo, pero sin ella no corre —y es justo cuando el
 * jugador está esperando a que abra para anotar en la cola—, así que se
 * despierta a la hora en punto.
 */
export const useDespertarALaHora = (hora) => {
  const [, marcaLaHora] = useState(0);
  // El instante, no el objeto: quien llama suele construir un `Date` nuevo en
  // cada render, y con él de dependencia el temporizador se rearmaba cada vez
  const instante = hora ? hora.getTime() : null;
  useEffect(() => {
    if (instante === null) return undefined;
    let aviso;
    // Con el efecto atado al instante ya no hay renders que lo rearmen: a más
    // de 24 días vista se espera el máximo y se vuelve a mirar (CodeRabbit #1204)
    const armar = () => {
      const falta = instante - Date.now() + 1000;
      if (falta <= 1000) return;
      aviso =
        falta > MAXIMO_TEMPORIZADOR_MS
          ? setTimeout(armar, MAXIMO_TEMPORIZADOR_MS)
          : setTimeout(() => marcaLaHora((n) => n + 1), falta);
    };
    armar();
    return () => clearTimeout(aviso);
  }, [instante]);
};
