import { PLACA } from './clasesDelMapa';

const AVISO = `${PLACA} self-start px-3.5 py-2 text-sm`;

// Los avisos de abajo: sin mapa en este móvil, el del GPS, el de la marca y las
// gracias del reporte
const AvisosDelMapa = ({
  t,
  sinMapa,
  aviso,
  avisoDeMarca,
  gracias,
  reporte,
}) => (
  <>
    {sinMapa && <p className={AVISO}>{t('mapa.sinMapaEnEsteMovil')}</p>}
    {aviso && <p className={AVISO}>{aviso}</p>}

    {avisoDeMarca && (
      <p role="alert" className={`${AVISO} text-yellow-300`}>
        {avisoDeMarca}
      </p>
    )}

    {/* Siempre montado, para que el lector de pantalla diga las gracias */}
    <div aria-live="polite" className="contents">
      {gracias && !reporte && (
        <p className={AVISO}>{t('mapa.reporteGracias')}</p>
      )}
    </div>
  </>
);

export default AvisosDelMapa;
