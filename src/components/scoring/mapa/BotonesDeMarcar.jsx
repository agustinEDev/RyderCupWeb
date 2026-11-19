import { MapPin } from 'lucide-react';
import { BOTON } from './clasesDelMapa';

// Tras el «No», por si quiere marcarlo igualmente (D1, D6, D8); y tras «Ahora
// no», «Marcar hoyo». Reportando, ninguno
const BotonesDeMarcar = ({
  t,
  sinMapa,
  reporte,
  marca,
  desdeMi,
  marcandoSalida,
  pidiendo,
  enlaceEnteroRef,
  onMarcarEntero,
  onEmpezarAMarcar,
}) => {
  if (reporte) return null;
  const conEnlaceEntero =
    (desdeMi && marcandoSalida) || (pidiendo && marca.soloGreen);
  return (
    <>
      {conEnlaceEntero && (
        <button
          ref={enlaceEnteroRef}
          type="button"
          onClick={onMarcarEntero}
          className="pointer-events-auto min-h-11 self-end px-2 text-sm font-semibold text-white underline [text-shadow:0_1px_2px_#000]"
        >
          {t('mapa.marcarEntero')}
        </button>
      )}

      {marca.fase === 'pausado' && !sinMapa && (
        <button
          type="button"
          onClick={onEmpezarAMarcar}
          className={`${BOTON} pointer-events-auto self-end`}
        >
          <MapPin className="h-4 w-4" aria-hidden="true" />
          {t('mapa.marcarHoyo')}
        </button>
      )}
    </>
  );
};

export default BotonesDeMarcar;
