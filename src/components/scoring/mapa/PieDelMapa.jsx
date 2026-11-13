import { Compass, LocateFixed, Maximize2 } from 'lucide-react';
import { atribucionDeLaOrtofoto } from './teselas';
import { BOTON } from './clasesDelMapa';

const LICENCIA_OSM = 'https://www.openstreetmap.org/copyright';

// Abajo del todo: de quién son la ortofoto y el hoyo, y los botones del mapa
// («Ver hoyo» o «Norte», y «Céntrame», que solo vale en el campo)
const PieDelMapa = ({
  t,
  comunidad,
  atribucion,
  sinMapa,
  verHoyo,
  enElCampo,
  onVerHoyo,
  onNorte,
  onCentrame,
}) => (
  <div className="flex flex-wrap items-center justify-end gap-2">
    {/* Al lado de los botones encoge y parte por donde sea (si no,
        «OpenStreetMap» no baja de su ancho y a 320 px echaba los botones
        fuera; revisor). Con menos de 64 px, la fila se parte y baja a la
        suya en vez de quedar en una columna de 12 líneas (/code-review) */}
    <span className="pointer-events-auto min-w-16 flex-1 text-[10px] text-white/80 [overflow-wrap:anywhere] [text-shadow:0_1px_2px_#000]">
      <span>{t('mapa.atribucionPnoa')}</span>
      {atribucionDeLaOrtofoto(comunidad) && (
        <span>{` · ${t(atribucionDeLaOrtofoto(comunidad))}`}</span>
      )}
      {atribucion && (
        <>
          {' · '}
          <a
            href={LICENCIA_OSM}
            target="_blank"
            rel="noopener noreferrer"
            title={atribucion}
            className="underline"
          >
            {t('mapa.atribucionOsm')}
          </a>
        </>
      )}
    </span>
    {/* Juntos: si no caben al lado de la atribución, bajan los dos y no
        uno solo (medido en inglés a 360 px) */}
    {!sinMapa && (
      <div className="flex shrink-0 gap-2">
        {verHoyo ? (
          <button
            type="button"
            onClick={onVerHoyo}
            className={`${BOTON} pointer-events-auto whitespace-nowrap`}
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
            {t('mapa.verHoyo')}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNorte}
            className={`${BOTON} pointer-events-auto whitespace-nowrap`}
          >
            <Compass className="h-4 w-4" aria-hidden="true" />
            {t('mapa.norte')}
          </button>
        )}
        <button
          type="button"
          disabled={!enElCampo}
          onClick={onCentrame}
          className={`${BOTON} pointer-events-auto whitespace-nowrap`}
        >
          <LocateFixed className="h-4 w-4" aria-hidden="true" />
          {t('mapa.centrame')}
        </button>
      </div>
    )}
  </div>
);

export default PieDelMapa;
