import { MoreVertical, X } from 'lucide-react';
import { BOTON, PLACA } from './clasesDelMapa';

// Arriba: el título del hoyo, «⋮» para reportar (si se puede) y «Cerrar»
const CabeceraDelMapa = ({
  t,
  arribaRef,
  numeroDeHoyo,
  par,
  sePuedeReportar,
  botonDeReportarRef,
  onReportar,
  onCerrar,
}) => (
  <div
    ref={arribaRef}
    data-testid="mapa-arriba"
    className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 pt-[calc(1rem+env(safe-area-inset-top))] pr-[calc(1rem+env(safe-area-inset-right))] pl-[calc(1rem+env(safe-area-inset-left))]"
  >
    <h2
      id="titulo-del-mapa"
      className={`${PLACA} px-3.5 py-2 text-lg font-extrabold`}
    >
      {t('mapa.titulo', { numero: numeroDeHoyo, par })}
    </h2>
    <span className="flex gap-2">
      {sePuedeReportar && (
        <button
          ref={botonDeReportarRef}
          type="button"
          onClick={onReportar}
          aria-label={t('mapa.reportar')}
          aria-haspopup="true"
          className={`${BOTON} pointer-events-auto px-3`}
        >
          <MoreVertical className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
      <button
        type="button"
        onClick={onCerrar}
        className={`${BOTON} pointer-events-auto`}
      >
        <X className="h-4 w-4" aria-hidden="true" />
        {t('mapa.cerrar')}
      </button>
    </span>
  </div>
);

export default CabeceraDelMapa;
