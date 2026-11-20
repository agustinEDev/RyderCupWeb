/**
 * La anotación de partida rápida (`QuickMatchScoringPage`) lleva un rato sin
 * actualizarse. Que no haya golpes pendientes no quita que la pantalla lleve
 * un rato sin actualizarse: sin decirlo, se lee como si estuviera al día. Sin
 * red ya lo dice el aviso de arriba: uno solo (revisor). Sin estado ni efectos.
 */
const AvisoSinActualizarRapida = ({ t, visible }) =>
  visible && (
    <div className="max-w-4xl mx-auto px-4 pt-4">
      <p
        data-testid="quick-match-sin-conexion"
        className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm"
      >
        {t('scoring.offline.noSeActualiza')}
      </p>
    </div>
  );

export default AvisoSinActualizarRapida;
