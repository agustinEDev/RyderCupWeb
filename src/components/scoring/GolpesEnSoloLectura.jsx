import { pintaGolpe } from './golpeDeLaCasilla';

/**
 * En solo lectura, tu golpe y el que te apuntó tu marcador, sin botones.
 *
 * @param {{
 *   t: (clave: string, valores?: object) => string,
 *   playerScore: { ownScore?: number | null, ownSubmitted?: boolean, markerScore?: number | null, markerSubmitted?: boolean },
 *   conMarcador: boolean,
 *   etiquetaPropia: string,
 *   etiquetaDelMarcador: string,
 * }} props
 */
const GolpesEnSoloLectura = ({
  t,
  playerScore,
  conMarcador,
  etiquetaPropia,
  etiquetaDelMarcador,
}) => {
  return (
    <div
      className={`grid ${conMarcador ? 'grid-cols-2' : 'grid-cols-1'} gap-4 text-center`}
    >
      <div>
        <p className="text-xs text-gray-500">{etiquetaPropia}</p>
        {/* Sin anotar, hueco y no la raya de «recogió» (revisor, QA 3) */}
        <p className="text-xl font-bold">
          {pintaGolpe(
            playerScore.ownSubmitted === false
              ? undefined
              : playerScore.ownScore,
            t,
          )}
        </p>
      </div>
      {conMarcador && (
        <div>
          <p className="text-xs text-gray-500">{etiquetaDelMarcador}</p>
          <p className="text-xl font-bold">
            {pintaGolpe(
              playerScore.markerSubmitted === false
                ? undefined
                : playerScore.markerScore,
              t,
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default GolpesEnSoloLectura;
