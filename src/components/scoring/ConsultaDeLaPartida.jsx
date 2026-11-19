import { PanelDePestana } from '../ui/Pestanas';
import ClasificacionDeLaFranja from './ClasificacionDeLaFranja';
import TarjetasDeLaPartida from './TarjetasDeLaPartida';

/**
 * Las pestañas de consulta de la anotación de una partida de stroke play
 * (`GroupScoringPage`): la clasificación de la franja y las tarjetas, con las
 * herramientas del organizador. Van dentro de su `GrupoDePestanas`.
 */
const ConsultaDeLaPartida = ({
  scoringView,
  userId,
  organiza,
  activa,
  onCambio,
}) => (
  <>
    {/* Montada siempre: se pide al abrir su pestaña y deja de releerse al cerrarla */}
    <PanelDePestana id="standings" montadoSiempre enfocable>
      <ClasificacionDeLaFranja
        roundId={scoringView.strokePlay.roundId}
        userId={userId}
        activa={activa === 'standings'}
      />
    </PanelDePestana>

    <PanelDePestana id="cards">
      <TarjetasDeLaPartida
        scoringView={scoringView}
        userId={userId}
        organiza={organiza}
        onCambio={onCambio}
      />
    </PanelDePestana>
  </>
);

export default ConsultaDeLaPartida;
