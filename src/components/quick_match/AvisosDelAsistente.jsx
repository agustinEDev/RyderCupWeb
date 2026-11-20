import { textoDelAviso } from '../../utils/textoDelAvisoAlRepetir';

/**
 * Los avisos de arriba del asistente de partida rápida: el de error (uno a la
 * vez, ver `useAvisoDelAsistente`) y, al repetir, lo que no se pudo copiar y
 * se arregla en este paso (FE #1021).
 *
 * `t` es el de quickMatch, `tComun` el de common y `tCampos` el de
 * golfCourses. `refDelAviso` va en el recuadro del error, para llevarlo a la
 * vista.
 */
const AvisosDelAsistente = ({
  error,
  refDelAviso,
  avisosAlRepetir,
  t,
  tComun,
  tCampos,
}) => (
  <>
    {error && (
      <div
        ref={refDelAviso}
        className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600"
        data-testid="quick-match-modal-error"
      >
        {error.clave ? (error.comun ? tComun : t)(error.clave) : error.texto}
      </div>
    )}

    {avisosAlRepetir.length > 0 && (
      <div
        role="status"
        className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900"
      >
        <ul className="space-y-1" data-testid="avisos-al-repetir">
          {avisosAlRepetir.map((aviso, i) => (
            // Por posición (no cambia mientras está abierto): dos
            // invitados pueden llamarse igual
            <li key={i}>{textoDelAviso(t, tCampos, aviso)}</li>
          ))}
        </ul>
      </div>
    )}
  </>
);

export default AvisosDelAsistente;
