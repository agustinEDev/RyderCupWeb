import SoloLectura from './SoloLectura';
import FormatoDeLaCompeticion from './FormatoDeLaCompeticion';
import AjustesDeStrokePlayDelAlta from './AjustesDeStrokePlayDelAlta';
import MasOpciones from './MasOpciones';

/**
 * Cómo se juega: el formato a la vista, los ajustes de un Stableford o un
 * Medal y lo plegado en «Más opciones». Cerrada por el plazo, se ve pero no se
 * cambia.
 */
const ConfiguracionDeLaCompeticion = ({
  soloFechas,
  conEquipos,
  formData,
  cambia,
  onChange,
  onBlurDelCupo,
  inscritos,
  masOpciones,
  onAlternarMasOpciones,
  faltaAlgoPlegado,
}) => (
  <SoloLectura activa={soloFechas} className="flex flex-col gap-6">
    <FormatoDeLaCompeticion
      playMode={formData.playMode}
      onElegirModo={(mode) => cambia('playMode', mode)}
      numberOfPlayers={formData.numberOfPlayers}
      onChange={onChange}
      onBlurDelCupo={onBlurDelCupo}
      inscritos={inscritos}
    />

    {!conEquipos && (
      <AjustesDeStrokePlayDelAlta
        formData={formData}
        onCambio={(strokePlay) => cambia('strokePlay', strokePlay)}
      />
    )}

    <MasOpciones
      abierto={masOpciones}
      onAlternar={onAlternarMasOpciones}
      faltaAlgoPlegado={faltaAlgoPlegado}
      conEquipos={conEquipos}
      formData={formData}
      onChange={onChange}
    />
  </SoloLectura>
);

export default ConfiguracionDeLaCompeticion;
