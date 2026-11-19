import ScoreInputPanel from './ScoreInputPanel';

/**
 * El teclado numérico (bottom-sheet) de la casilla abierta: el tuyo, el del
 * marcado o el del segundo marcado. Cada uno con su etiqueta y el par de
 * quien juega esa bola (RyderCupWeb#417).
 *
 * @param {{
 *   openPanel: 'own' | 'marked' | 'second' | null,
 *   cerrar: () => void,
 *   valores: { propio: number | null | undefined, marcado: number | null | undefined, segundo: number | null | undefined },
 *   alElegir: { propio: (valor: number | null) => void, marcado: (valor: number | null) => void, segundo: (valor: number | null) => void },
 *   etiquetas: { propia: string, marcado: string, segundo: string },
 *   pares: { propio: number, marcado: number, segundo: number },
 *   allowPickedUp: boolean,
 * }} props
 */
const TecladosDelHoyo = ({
  openPanel,
  cerrar,
  valores,
  alElegir,
  etiquetas,
  pares,
  allowPickedUp,
}) => (
  <>
    {openPanel === 'own' && (
      <ScoreInputPanel
        value={valores.propio}
        onSelect={alElegir.propio}
        onClose={cerrar}
        label={etiquetas.propia}
        par={pares.propio}
        allowPickedUp={allowPickedUp}
      />
    )}
    {openPanel === 'marked' && (
      <ScoreInputPanel
        value={valores.marcado}
        onSelect={alElegir.marcado}
        onClose={cerrar}
        label={etiquetas.marcado}
        par={pares.marcado}
        allowPickedUp={allowPickedUp}
      />
    )}
    {openPanel === 'second' && (
      <ScoreInputPanel
        value={valores.segundo}
        onSelect={alElegir.segundo}
        onClose={cerrar}
        label={etiquetas.segundo}
        par={pares.segundo}
        allowPickedUp={allowPickedUp}
      />
    )}
  </>
);

export default TecladosDelHoyo;
