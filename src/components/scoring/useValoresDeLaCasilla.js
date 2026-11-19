import { useState } from 'react';

/**
 * Lo tecleado en una casilla, al día con la vista (FE #606). Solo se tomaba
 * al montar, y la pantalla no la vuelve a montar hasta cambiar de hoyo: si la
 * vista cargaba antes de que el vaciado de entrada mandara el golpe, la casilla
 * seguía vacía con el golpe ya en el servidor. Se adopta solo cuando lo que dice
 * la vista CAMBIA, no en cada render: así no se pisa lo que el jugador acaba de
 * elegir mientras la vista sigue diciendo lo mismo. Durante el render y no en un
 * efecto, que encadena renders y el lint del repo prohíbe.
 *
 * Si la casilla pasa a ser de otro jugador (`quien`), vuelve a la de la vista
 * aunque las dos digan lo mismo y la comprobación de abajo no lo vea
 * (CodeRabbit, FE #970).
 *
 * @param {number | null | undefined} deLaVista
 * @param {string | undefined} [quien] a quién es la casilla
 * @returns {[number | null | undefined, (valor: number | null) => void]}
 */
const useValorDeLaVista = (deLaVista, quien) => {
  const [valor, setValor] = useState(deLaVista);
  const [visto, setVisto] = useState(deLaVista);
  const [quienVisto, setQuienVisto] = useState(quien);
  if (quienVisto !== quien) {
    setQuienVisto(quien);
    setVisto(deLaVista);
    setValor(deLaVista);
  }
  if (visto !== deLaVista) {
    setVisto(deLaVista);
    setValor(deLaVista);
  }
  return [valor, setValor];
};

// undefined = hoyo sin anotar (nada guardado); null = raya (bola recogida)
const propioDeLaVista = (playerScore) =>
  playerScore?.ownSubmitted ? playerScore.ownScore : undefined;
const marcadoDeLaVista = (playerScore) =>
  playerScore?.markerSubmitted ? playerScore.markerScore : undefined;

/**
 * Los golpes de las tres casillas del hoyo (la tuya, la del marcado y la del
 * segundo marcado) y qué teclado está abierto.
 *
 * @param {{
 *   playerScore?: { ownScore?: number | null, ownSubmitted?: boolean } | null,
 *   markedPlayerScore?: { markerScore?: number | null, markerSubmitted?: boolean } | null,
 *   markedPlayerId?: string,
 *   secondMarked?: { id?: string, playerScore?: { markerScore?: number | null, markerSubmitted?: boolean } | null } | null,
 *   bloqueos: { soloLectura: boolean, propio: boolean, marcado: boolean, segundo: boolean },
 * }} entrada
 */
export const useValoresDeLaCasilla = ({
  playerScore,
  markedPlayerScore,
  markedPlayerId,
  secondMarked,
  bloqueos,
}) => {
  const [ownValue, setOwnValue] = useValorDeLaVista(
    propioDeLaVista(playerScore),
  );
  const [markedValue, setMarkedValue] = useValorDeLaVista(
    marcadoDeLaVista(markedPlayerScore),
    markedPlayerId,
  );
  // El segundo marcado, con la misma regla: lo tecleado se queda hasta que la
  // vista diga otra cosa, o hasta que el segundo pase a ser otro, como el primero
  const [segundoValue, setSegundoValue] = useValorDeLaVista(
    marcadoDeLaVista(secondMarked?.playerScore),
    secondMarked?.id,
  );

  /** @type {['own' | 'marked' | 'second' | null, (panel: 'own' | 'marked' | 'second' | null) => void]} */
  const [openPanel, setOpenPanel] = useState(null);
  // Si su casilla se bloquea con el teclado abierto (el rival entrega su
  // tarjeta), el teclado se cierra: abierto, sus números ya no hacían nada
  const panelBloqueado =
    (openPanel !== null && bloqueos.soloLectura) ||
    (openPanel === 'own' && bloqueos.propio) ||
    (openPanel === 'marked' && bloqueos.marcado) ||
    (openPanel === 'second' && bloqueos.segundo);
  if (panelBloqueado) setOpenPanel(null);

  return {
    ownValue,
    setOwnValue,
    markedValue,
    setMarkedValue,
    segundoValue,
    setSegundoValue,
    openPanel,
    setOpenPanel,
  };
};
