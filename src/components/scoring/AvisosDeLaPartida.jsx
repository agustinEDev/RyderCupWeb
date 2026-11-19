import { claveDelAvisoDelVaciado } from '../../utils/erroresDeAnotacion';
import { textoDelFalloDeLaPartida } from '../../utils/lecturaDeLaPartida';

/**
 * Los avisos de arriba de la anotación de una partida de stroke play
 * (`GroupScoringPage`): hoyos sin guardar, el vaciado de la cola, lo pintado
 * de memoria y el recuadro del fallo con «Reintentar». Sin estado ni efectos.
 */
const AvisosDeLaPartida = ({
  t,
  hoyosNoGuardados,
  noPresentado,
  avisoDelVaciado,
  pintadoDeMemoria,
  isOffline,
  error,
  origenDelError,
  onReintentar,
}) => (
  <>
    {hoyosNoGuardados.length > 0 && !noPresentado && (
      <p
        data-testid="no-guardados"
        className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
      >
        {t('offline.noGuardados', {
          count: hoyosNoGuardados.length,
          holes: hoyosNoGuardados.join(', '),
        })}
      </p>
    )}
    {avisoDelVaciado && (
      <p
        role="status"
        className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
      >
        {t(claveDelAvisoDelVaciado(avisoDelVaciado))}
      </p>
    )}
    {/* Lo que se ve es la foto del móvil, no el servidor (FE #614): con
        un 5xx o sin cobertura se leería como lo de ahora mismo */}
    {/* Sin conexión ya lo dice el aviso de arriba: dos casi iguales a la
        vez sobraban (QA del 11 oct 2026) */}
    {pintadoDeMemoria && !isOffline && (
      <p
        data-testid="pintado-de-memoria"
        className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
      >
        {t('offline.noSeActualiza')}
      </p>
    )}
    {error && (
      <div
        role="alert"
        className="flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-3"
      >
        <p className="text-sm text-red-600">
          {textoDelFalloDeLaPartida(t, error, origenDelError)}
        </p>
        <button
          type="button"
          onClick={onReintentar}
          className="rounded bg-red-600 px-3 py-1 text-xs text-white"
        >
          {t('retry')}
        </button>
      </div>
    )}
  </>
);

export default AvisosDeLaPartida;
