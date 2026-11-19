import BarraDeEntrega from './BarraDeEntrega';
import TeeGroupStatus from '../../domain/value_objects/TeeGroupStatus';

/**
 * La barra fija de entregar la tarjeta de una partida de stroke play
 * (`GroupScoringPage`), con el hueco que ocupa para que no tape lo último.
 * `estado` es el de `estadoDeEntregaDeLaPartida`. Sin estado ni efectos.
 */
const EntregaDeLaPartida = ({ estado, onEntregar, enviando, scoringView }) => (
  <div data-testid="estado-de-entrega" data-estado={estado}>
    <div className="h-36" aria-hidden="true" />
    <BarraDeEntrega
      estado={estado}
      marcador={null}
      onEntregar={onEntregar}
      enviando={enviando}
      esFoursomes={false}
      pendientes={[]}
      completado={scoringView.matchStatus === TeeGroupStatus.COMPLETED}
      sePuedeSeguir={false}
      dePartida
    />
  </div>
);

export default EntregaDeLaPartida;
