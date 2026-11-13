import BarraDeEntrega from './BarraDeEntrega';

/**
 * La barra fija de entregar la tarjeta de la anotación de competición
 * (`ScoringPage`), con el hueco que ocupa para que no tape lo último. Sin
 * estado ni efectos. `estado` es el de `estadoDeEntrega`.
 */
const EntregaDelPartido = ({
  estado,
  marcador,
  onEntregar,
  enviando,
  esFoursomes,
  pendientes,
  scoringView,
  cerradoSinJugar,
  holesToSubmit,
  totalHoles,
}) => (
  <>
    {/* Lo que ocupa la barra fija, para que no tape lo último */}
    <div data-testid="hueco-de-la-barra" className="h-36" aria-hidden="true" />
    <BarraDeEntrega
      estado={estado}
      marcador={marcador}
      onEntregar={onEntregar}
      enviando={enviando}
      esFoursomes={esFoursomes}
      pendientes={pendientes}
      // Concedido o walkover también lo terminan: ya no se espera a nadie
      completado={scoringView?.matchStatus === 'COMPLETED' || cerradoSinJugar}
      // Todo anotado y sin validar, sin decidir: no «Partido terminado»
      soloAnotado={estado === 'faltaValidar' && !scoringView?.isDecided}
      // Decidido no es acabado: se puede seguir jugando hasta el 18
      sePuedeSeguir={Boolean(scoringView?.isDecided) && holesToSubmit < totalHoles}
    />
  </>
);

export default EntregaDelPartido;
