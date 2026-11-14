import { useEffect, useState } from 'react';

// `setTimeout` no aguanta más de 2^31-1 ms: pasado eso dispara INMEDIATAMENTE y
// en bucle. Una ronda a más de 24 días vista no necesita despertar a nadie
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
  useEffect(() => {
    if (!hora) return undefined;
    const falta = hora.getTime() - Date.now();
    if (falta <= 0 || falta > MAXIMO_TEMPORIZADOR_MS) return undefined;
    const aviso = setTimeout(() => marcaLaHora((n) => n + 1), falta + 1000);
    return () => clearTimeout(aviso);
  }, [hora]);
};
