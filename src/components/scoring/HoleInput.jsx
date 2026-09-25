import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ValidationIcon from './ValidationIcon';
import ScoreInputPanel from './ScoreInputPanel';

const HoleInput = ({
  holeNumber,
  par,
  // El par del jugador al que se marca, cuando sale de otra barra: el teclado
  // etiqueta Par/Birdie/Bogey contra el par de quien juega esa bola, no contra
  // el de quien anota. Sin él, marcar a alguien de otra barra le ponía las
  // etiquetas del par propio. Ver RyderCupWeb#417.
  markedPar = null,
  strokeIndex,
  playerScore,
  markedPlayerScore,
  validationStatus,
  markedValidationStatus,
  netScore,
  strokesReceived,
  holeResult,
  standing,
  isReadOnly = false,
  isOwnScoreLocked = false,
  isMarkerScoreLocked = false,
  onScoreChange,
  teamAName,
  teamBName,
  matchFormat,
}) => {
  const { t } = useTranslation('scoring');
  // En foursomes hay una bola por pareja (#710): «Tu anotación» y «Anotación
  // marcador» hablaban como si cada uno jugara la suya
  const enParejas = matchFormat === 'FOURSOMES';
  const etiquetaPropia = t(enParejas ? 'input.pairBall' : 'input.yourScore');
  const etiquetaMarcado = t(enParejas ? 'input.rivalBall' : 'input.markerScore');
  const etiquetaDelMarcador = t(enParejas ? 'input.rivalCount' : 'input.markerScore');
  // undefined = hole not scored yet (nothing persisted); null = explicitly picked up.
  const ownDeLaVista = playerScore?.ownSubmitted ? playerScore.ownScore : undefined;
  const markedDeLaVista = markedPlayerScore?.markerSubmitted ? markedPlayerScore.markerScore : undefined;
  const [ownValue, setOwnValue] = useState(ownDeLaVista);
  const [markedValue, setMarkedValue] = useState(markedDeLaVista);

  // Una vista más nueva tiene que llegar a la casilla (FE #606). Solo se tomaba
  // al montar, y la pantalla no la vuelve a montar hasta cambiar de hoyo: si la
  // vista cargaba antes de que el vaciado de entrada mandara el golpe, la casilla
  // seguía vacía con el golpe ya en el servidor. Se adopta solo cuando lo que dice
  // la vista CAMBIA, no en cada render: así no se pisa lo que el jugador acaba de
  // elegir mientras la vista sigue diciendo lo mismo. Durante el render y no en un
  // efecto, que encadena renders y el lint del repo prohíbe
  const [ownVisto, setOwnVisto] = useState(ownDeLaVista);
  if (ownVisto !== ownDeLaVista) {
    setOwnVisto(ownDeLaVista);
    setOwnValue(ownDeLaVista);
  }
  const [markedVisto, setMarkedVisto] = useState(markedDeLaVista);
  if (markedVisto !== markedDeLaVista) {
    setMarkedVisto(markedDeLaVista);
    setMarkedValue(markedDeLaVista);
  }
  const [openPanel, setOpenPanel] = useState(null); // 'own' | 'marked' | null

  const handleOwnSelect = (val) => {
    if (isReadOnly || isOwnScoreLocked) return;
    setOwnValue(val);
    setOpenPanel(null);
    if (onScoreChange) onScoreChange({ ownScore: val, markedScore: markedValue });
  };

  const handleMarkedSelect = (val) => {
    if (isReadOnly || isMarkerScoreLocked) return;
    setMarkedValue(val);
    setOpenPanel(null);
    if (onScoreChange) onScoreChange({ ownScore: ownValue, markedScore: val });
  };

  // La raya (`null`, bola recogida) se pinta distinta del hoyo sin anotar
  // (`undefined`): los dos llegan sin número y significan lo contrario, y con
  // el mismo guion para ambos solo los distinguía quien usara lector de
  // pantalla. Mismo trazo que `GolfFigure` en la tarjeta, para que la casilla y
  // la tarjeta digan lo mismo.
  const displayScore = (val, ariaLabelNull = null) => {
    // Hoyo sin anotar: hueco, no guion. El guion se confundía con la raya
    // (`null`, bola recogida), que es lo contrario: un hoyo ya cerrado. Se
    // sigue anunciando a quien no lo ve.
    if (val === undefined) {
      return <span className="sr-only">{t('input.notEntered')}</span>;
    }
    return val === null
      ? <span aria-label={ariaLabelNull || undefined} className="text-gray-600">—</span>
      : val;
  };

  return (
    <div data-testid="hole-input" className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-gray-900">{t('input.hole')} {holeNumber}</span>
          <span className="text-sm text-gray-500">{t('input.par')} {par}</span>
          <span className="text-sm text-gray-500">{t('input.strokeIndex')} {strokeIndex}</span>
          {strokesReceived > 0 && (
            <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
              {t('input.strokeReceived')}
            </span>
          )}
        </div>
        <ValidationIcon status={validationStatus || 'pending'} />
      </div>

      {!isReadOnly && (
        <div className="grid grid-cols-2 gap-4">
          {/* Own score */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">{etiquetaPropia}</label>
            {!isOwnScoreLocked ? (
              <button
                data-testid="own-score-button"
                onClick={() => setOpenPanel('own')}
                className={`w-full h-12 flex items-center justify-center rounded-xl transition-colors ${
                  ownValue === undefined
                    ? 'bg-white border-2 border-dashed border-gray-300 hover:border-gray-400'
                    : 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                <span
                  data-testid="own-score-value"
                  className={`text-2xl font-bold ${ownValue === undefined ? 'text-gray-400' : 'text-gray-900'}`}
                >
                  {displayScore(ownValue, t('input.pickedUp'))}
                </span>
              </button>
            ) : (
              <p data-testid="own-score-value" className="h-12 flex items-center justify-center text-2xl font-bold text-gray-400">
                {displayScore(ownValue, t('input.pickedUp'))}
              </p>
            )}
          </div>

          {/* Marker score */}
          <div className="space-y-1">
            {/* La marca del jugador al que anotas va aquí y no en la cabecera:
                la de arriba es la de TU resultado, y son dos acuerdos distintos.
                Sin esta, un anotador veía su tick verde mientras la tira de
                hoyos se ponía roja por el otro, sin forma de saber por quién.
                La tarjeta ya no la lleva, así que este es el único sitio. */}
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-gray-500">{etiquetaMarcado}</label>
              {markedValidationStatus && (
                <span data-testid="marked-validation">
                  <ValidationIcon status={markedValidationStatus} />
                </span>
              )}
            </div>
            {!isMarkerScoreLocked ? (
              <button
                data-testid="marked-score-button"
                onClick={() => setOpenPanel('marked')}
                className={`w-full h-12 flex items-center justify-center rounded-xl transition-colors ${
                  markedValue === undefined
                    ? 'bg-white border-2 border-dashed border-gray-300 hover:border-gray-400'
                    : 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                <span
                  data-testid="marked-score-value"
                  className={`text-2xl font-bold ${markedValue === undefined ? 'text-gray-400' : 'text-gray-900'}`}
                >
                  {displayScore(markedValue, t('input.pickedUp'))}
                </span>
              </button>
            ) : (
              <p data-testid="marked-score-value" className="h-12 flex items-center justify-center text-2xl font-bold text-gray-400">
                {displayScore(markedValue, t('input.pickedUp'))}
              </p>
            )}
          </div>
        </div>
      )}

      {isReadOnly && playerScore && (
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500">{etiquetaPropia}</p>
            <p className="text-xl font-bold">{displayScore(playerScore.ownScore)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{etiquetaDelMarcador}</p>
            <p className="text-xl font-bold">{displayScore(playerScore.markerScore)}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-3">
        {netScore !== null && netScore !== undefined && (
          <span className="text-gray-600">{t('input.netScore')}: <strong>{netScore}</strong></span>
        )}
        {holeResult && (
          <span className="text-gray-600">
            {holeResult.winner === 'HALVED'
              ? t('input.halved')
              : holeResult.winner === 'A' ? (teamAName || 'A') : holeResult.winner === 'B' ? (teamBName || 'B') : holeResult.winner}
          </span>
        )}
        {standing && (
          <span className="font-medium text-primary">
            {standing === 'AS'
              ? t('input.allSquare')
              : `${holeResult?.standingTeam === 'A' ? (teamAName || 'A') : holeResult?.standingTeam === 'B' ? (teamBName || 'B') : ''} ${standing}`}
          </span>
        )}
      </div>

      {openPanel === 'own' && (
        <ScoreInputPanel
          value={ownValue}
          onSelect={handleOwnSelect}
          onClose={() => setOpenPanel(null)}
          label={t('input.yourScore')}
          par={par}
        />
      )}
      {openPanel === 'marked' && (
        <ScoreInputPanel
          value={markedValue}
          onSelect={handleMarkedSelect}
          onClose={() => setOpenPanel(null)}
          label={t('input.markerScore')}
          par={markedPar ?? par}
        />
      )}
    </div>
  );
};

export default HoleInput;
