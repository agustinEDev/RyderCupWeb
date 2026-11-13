import { claveDelAvisoDelVaciado } from '../../utils/erroresDeAnotacion';
import { textoDelFallo } from '../../utils/lecturaDelPartido';

/**
 * Tres avisos de la anotación de competición (`ScoringPage`) con el partido
 * pintado: el vaciado parado por el almacenamiento, la vista que sale de la
 * foto del móvil y el recuadro rojo de los fallos. Sin estado ni efectos.
 */
const AvisosDelPartido = ({
  t,
  scoringView,
  isOffline,
  avisoDelVaciado,
  pintadoDeMemoria,
  error,
  origenDelError,
  falloDeUnaAccion,
  refetch,
}) => (
  <>
    {/* El vaciado se paró porque el móvil no admite escrituras. Aparte del
        error general: ese lo limpia cada sondeo, y esto tiene que durar
        hasta que un vaciado termine bien (FE #551) */}
    {avisoDelVaciado && (
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <p
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {t(claveDelAvisoDelVaciado(avisoDelVaciado))}
        </p>
      </div>
    )}

    {/* Lo que se ve salió de la foto del móvil, no del servidor (FE #614). Hay
        que decirlo, y en ámbar y no en rojo: con un 5xx esto pasa CON cobertura,
        y sin avisar se lee como si fuera lo de ahora mismo —con su resultado, su
        tarjeta y su botón de entregar— cuando puede ser de hace rato */}
    {/* Sin conexión ya lo dice su aviso: dos casi iguales sobraban (QA del 11 oct 2026) */}
    {pintadoDeMemoria && scoringView && !isOffline && (
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <p
          data-testid="pintado-de-memoria"
          className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm"
        >
          {t('offline.noSeActualiza')}
        </p>
      </div>
    )}

    {/* Inline error banner for post-load errors. Si la pantalla viene de la
        foto, el fallo AL CARGAR ya está contado arriba y el rojo encima sobra;
        el de una acción no: callarlo dejaba una casilla vaciada sin decir que
        el golpe no se pudo guardar (FE #626) */}
    {error && scoringView && (!pintadoDeMemoria || falloDeUnaAccion) && (
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
          <p className="text-sm text-red-600">{textoDelFallo(t, error, origenDelError)}</p>
          <button
            onClick={refetch}
            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    )}
  </>
);

export default AvisosDelPartido;
