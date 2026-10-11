import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ValidationIcon from './ValidationIcon';
import ScoreInputPanel from './ScoreInputPanel';
import { HuecoParaAnotar } from './HuecoParaAnotar';
import { clasesDelHueco } from './clasesDelHueco';

const HoleInput = ({
  holeNumber,
  par,
  // El par del jugador al que se marca, cuando sale de otra barra: el teclado
  // etiqueta Par/Birdie/Bogey contra el par de quien juega esa bola, no contra
  // el de quien anota. Sin él, marcar a alguien de otra barra le ponía las
  // etiquetas del par propio. Ver RyderCupWeb#417.
  markedPar = null,
  // Nombres de a quién anotas y de quién te anota (QA del 11 oct 2026):
  // «Anotación marcador» se leía como lo que tu marcador te apuntó a ti
  markedName = null,
  markerName = null,
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
  // En Medal no se recoge: el teclado no ofrece la raya (FE #824, PR 7)
  allowPickedUp = true,
}) => {
  const { t } = useTranslation('scoring');
  // Cada etiqueta, atada a su botón: con los dos huecos vacíos los dos se
  // anunciaban «Anotar» y un lector de pantalla no sabía cuál era el tuyo
  // (CodeRabbit en la #747)
  const idPropio = useId();
  const idMarcado = useId();
  // En foursomes hay una bola por pareja (#710): «Tu anotación» y «Anotación
  // marcador» hablaban como si cada uno jugara la suya
  const enParejas = matchFormat === 'FOURSOMES';
  const etiquetaPropia = t(enParejas ? 'input.pairBall' : 'input.yourScore');
  const etiquetaMarcado = enParejas
    ? t('input.rivalBall')
    : markedName
      ? t('input.youMark', { nombre: markedName })
      : t('input.markerScore');
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
    // Con el golpe que se ha tocado: el envío lleva los dos, y quien lo recibe
    // necesita saber cuál volvió a anotar el jugador (FE #622)
    if (onScoreChange) onScoreChange({ ownScore: val, markedScore: markedValue }, 'ownScore');
  };

  const handleMarkedSelect = (val) => {
    if (isReadOnly || isMarkerScoreLocked) return;
    setMarkedValue(val);
    setOpenPanel(null);
    if (onScoreChange) onScoreChange({ ownScore: ownValue, markedScore: val }, 'markedScore');
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

  // En foursomes la bola es de la pareja: «La pareja rival puso…» (/code-review)
  const nombreDelOtro = (nombre, porDefecto) => (enParejas ? t('input.rivalPair') : nombre || t(porDefecto));
  const golpesEnTexto = (golpes) => (golpes === null ? t('input.pickedUp') : golpes);
  const loQuePuso = {
    own:
      validationStatus === 'mismatch' && playerScore?.markerSubmitted
        ? t('input.otherPut', { nombre: nombreDelOtro(markerName, 'input.yourMarker'), golpes: golpesEnTexto(playerScore.markerScore) })
        : null,
    marked:
      markedValidationStatus === 'mismatch' && markedPlayerScore?.ownSubmitted
        ? t('input.otherPut', { nombre: nombreDelOtro(markedName, 'input.theMarkedPlayer'), golpes: golpesEnTexto(markedPlayerScore.ownScore) })
        : null,
  };

  // El siguiente hueco por anotar: el tuyo antes que el del rival (FE #725).
  // La raya ya es un golpe anotado; solo cuenta lo que se puede tocar
  const siguienteHueco =
    !isOwnScoreLocked && ownValue === undefined
      ? 'own'
      : !isMarkerScoreLocked && markedValue === undefined
        ? 'marked'
        : null;

  return (
    <div data-testid="hole-input" className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-gray-900">{t('input.hole')} {holeNumber}</span>
          <span className="text-sm text-gray-500">{t('input.par')} {par}</span>
          {/* Las partidas de stroke play no traen el índice: sin él, ni la etiqueta (pasada, FE #824) */}
          {strokeIndex != null && <span className="text-sm text-gray-500">{t('input.strokeIndex')} {strokeIndex}</span>}
          {/* Cuántos: con 2 golpes decía lo mismo que con 1, y el plus que da
              golpe no veía nada (QA del 11 oct 2026) */}
          {strokesReceived > 0 && (
            <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
              {t('input.strokesReceived', { count: strokesReceived })}
            </span>
          )}
          {strokesReceived < 0 && (
            <span className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
              {t('input.strokesGiven', { count: -strokesReceived })}
            </span>
          )}
        </div>
        <ValidationIcon status={validationStatus || 'pending'} />
      </div>

      {!isReadOnly && (
        // Etiquetas en una fila de la rejilla y huecos en la siguiente (FE #736):
        // la cabecera del marcado lleva su marca y es más alta que la tuya, y con
        // una columna por jugador su hueco quedaba más abajo. Así comparten fila
        <div data-testid="huecos-del-hoyo" className="grid grid-cols-2 gap-x-4 gap-y-1 items-end">
          <label htmlFor={idPropio} className="text-xs font-medium text-gray-500">{etiquetaPropia}</label>
          {/* La marca del jugador al que anotas va aquí y no en la cabecera:
              la de arriba es la de TU resultado, y son dos acuerdos distintos.
              Sin esta, un anotador veía su tick verde mientras la tira de
              hoyos se ponía roja por el otro, sin forma de saber por quién.
              La tarjeta ya no la lleva, así que este es el único sitio. */}
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={idMarcado} className="text-xs font-medium text-gray-500">{etiquetaMarcado}</label>
            {markedValidationStatus && (
              <span data-testid="marked-validation">
                <ValidationIcon status={markedValidationStatus} />
              </span>
            )}
          </div>

          {/* Own score */}
          {!isOwnScoreLocked ? (
            <button
              id={idPropio}
              data-testid="own-score-button"
              onClick={() => setOpenPanel('own')}
              className={`w-full h-12 flex items-center justify-center rounded-xl transition-colors ${
                ownValue === undefined
                  ? clasesDelHueco(siguienteHueco === 'own')
                  : 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300'
              }`}
            >
              {ownValue === undefined ? (
                <HuecoParaAnotar siguiente={siguienteHueco === 'own'} />
              ) : (
                <span data-testid="own-score-value" className="text-2xl font-bold text-gray-900">
                  {displayScore(ownValue, t('input.pickedUp'))}
                </span>
              )}
            </button>
          ) : (
            <p data-testid="own-score-value" className="h-12 flex items-center justify-center text-2xl font-bold text-gray-400">
              {displayScore(ownValue, t('input.pickedUp'))}
            </p>
          )}

          {/* Marker score */}
          {!isMarkerScoreLocked ? (
            <button
              id={idMarcado}
              data-testid="marked-score-button"
              onClick={() => setOpenPanel('marked')}
              className={`w-full h-12 flex items-center justify-center rounded-xl transition-colors ${
                markedValue === undefined
                  ? clasesDelHueco(siguienteHueco === 'marked')
                  : 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300'
              }`}
            >
              {markedValue === undefined ? (
                <HuecoParaAnotar siguiente={siguienteHueco === 'marked'} />
              ) : (
                <span data-testid="marked-score-value" className="text-2xl font-bold text-gray-900">
                  {displayScore(markedValue, t('input.pickedUp'))}
                </span>
              )}
            </button>
          ) : (
            <p data-testid="marked-score-value" className="h-12 flex items-center justify-center text-2xl font-bold text-gray-400">
              {displayScore(markedValue, t('input.pickedUp'))}
            </p>
          )}

          {/* En un desacuerdo, lo que puso el otro: con solo la ✗ no se sabía
              qué discutir (QA del 11 oct 2026) */}
          {(validationStatus === 'mismatch' || markedValidationStatus === 'mismatch') && (
            <>
              {/* Cada uno en su columna; vacío, un hueco sin texto (revisor) */}
              <p className="text-xs text-red-700">
                {loQuePuso.own && <span data-testid="lo-que-puso-el-otro-own">{loQuePuso.own}</span>}
              </p>
              <p className="text-xs text-red-700">
                {loQuePuso.marked && <span data-testid="lo-que-puso-el-otro-marked">{loQuePuso.marked}</span>}
              </p>
            </>
          )}
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
          label={etiquetaPropia}
          par={par}
          allowPickedUp={allowPickedUp}
        />
      )}
      {openPanel === 'marked' && (
        <ScoreInputPanel
          value={markedValue}
          onSelect={handleMarkedSelect}
          onClose={() => setOpenPanel(null)}
          label={etiquetaMarcado}
          par={markedPar ?? par}
          allowPickedUp={allowPickedUp}
        />
      )}
    </div>
  );
};

export default HoleInput;
