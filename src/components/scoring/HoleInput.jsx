import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import CabeceraDelHoyo from './CabeceraDelHoyo';
import PieDelHoyo from './PieDelHoyo';
import HuecosDelHoyo from './HuecosDelHoyo';
import GolpesEnSoloLectura from './GolpesEnSoloLectura';
import TecladosDelHoyo from './TecladosDelHoyo';
import { etiquetasDeLaCasilla } from './textosDeLaCasilla';
import { useValoresDeLaCasilla } from './useValoresDeLaCasilla';
import { MatchFormat } from '../../domain/value_objects/MatchFormat';

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
  // 2.ª pasada del QA (12 oct 2026): sin nadie a quien marcar (retirado, solo,
  // reabierta), sin la segunda casilla; sin marcador, en solo lectura igual
  marksSomeone = true,
  hasMarker = true,
  // Quién puso el número del marcado, si no fuiste tú: tras cambiar el círculo
  // salía bajo «Anotas a X» un número del marcador anterior como si fuera tuyo
  markedScoredBy = null,
  strokeIndex,
  playerScore,
  markedPlayerScore,
  // A quién se marca: quien marca a dos lo cambia en el mismo hoyo
  markedPlayerId,
  // Quien marca a dos (fourball con un retirado, 26 oct 2026): el segundo
  // marcado, con su casilla debajo de la del primero. `{ name, par,
  // playerScore, validationStatus, isLocked }` con su `id`; su golpe sale por
  // `onSecondMarkedChange`, solo, sin el tuyo ni el del primero
  secondMarked = null,
  onSecondMarkedChange,
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
  // Por defecto no: la raya se ofrece solo donde se permite (23 oct 2026)
  allowPickedUp = false,
}) => {
  const { t } = useTranslation('scoring');
  // Cada etiqueta, atada a su botón: con los dos huecos vacíos los dos se
  // anunciaban «Anotar» y un lector de pantalla no sabía cuál era el tuyo
  // (CodeRabbit en la #747)
  const idPropio = useId();
  const idMarcado = useId();
  const idSegundo = useId();
  // En foursomes hay una bola por pareja (#710)
  const enParejas = matchFormat === MatchFormat.FOURSOMES;
  const etiquetas = etiquetasDeLaCasilla(t, {
    enParejas,
    markedName,
    markerName,
    nombreDelSegundo: secondMarked?.name,
  });
  const conMarcado = enParejas || marksSomeone;
  const conMarcador = enParejas || hasMarker;
  // Lo que puso otro marcador no se toca desde aquí
  const marcadoBloqueado =
    isMarkerScoreLocked || !conMarcado || Boolean(markedScoredBy);
  const segundoBloqueado = Boolean(secondMarked?.isLocked);
  const {
    ownValue,
    setOwnValue,
    markedValue,
    setMarkedValue,
    segundoValue,
    setSegundoValue,
    openPanel,
    setOpenPanel,
  } = useValoresDeLaCasilla({
    playerScore,
    markedPlayerScore,
    markedPlayerId,
    secondMarked,
    bloqueos: {
      soloLectura: isReadOnly,
      propio: isOwnScoreLocked,
      marcado: marcadoBloqueado,
      segundo: segundoBloqueado,
    },
  });

  const handleOwnSelect = (val) => {
    if (isReadOnly || isOwnScoreLocked) return;
    setOwnValue(val);
    setOpenPanel(null);
    // Con el golpe que se ha tocado: el envío lleva los dos, y quien lo recibe
    // necesita saber cuál volvió a anotar el jugador (FE #622)
    // El número de otro marcador no se reenvía como tuyo (/code-review)
    const marcado = markedScoredBy || !conMarcado ? undefined : markedValue;
    if (onScoreChange)
      onScoreChange({ ownScore: val, markedScore: marcado }, 'ownScore');
  };

  const handleMarkedSelect = (val) => {
    if (isReadOnly || marcadoBloqueado) return;
    setMarkedValue(val);
    setOpenPanel(null);
    if (onScoreChange)
      onScoreChange({ ownScore: ownValue, markedScore: val }, 'markedScore');
  };

  // Bloqueada, el teclado ya se ha cerrado (`panelBloqueado`)
  const handleSegundoSelect = (val) => {
    setSegundoValue(val);
    setOpenPanel(null);
    if (onSecondMarkedChange) onSecondMarkedChange(val);
  };

  return (
    <div
      data-testid="hole-input"
      className="bg-white rounded-lg border border-gray-200 p-4 space-y-4"
    >
      <CabeceraDelHoyo
        t={t}
        holeNumber={holeNumber}
        par={par}
        strokeIndex={strokeIndex}
        strokesReceived={strokesReceived}
        validationStatus={validationStatus}
      />

      {!isReadOnly && (
        <HuecosDelHoyo
          t={t}
          ids={{ propio: idPropio, marcado: idMarcado, segundo: idSegundo }}
          etiquetas={etiquetas}
          valores={{
            propio: ownValue,
            marcado: markedValue,
            segundo: segundoValue,
          }}
          bloqueos={{
            propio: isOwnScoreLocked,
            marcado: marcadoBloqueado,
            segundo: segundoBloqueado,
          }}
          conMarcado={conMarcado}
          enParejas={enParejas}
          validationStatus={validationStatus}
          markedValidationStatus={markedValidationStatus}
          playerScore={playerScore}
          markedPlayerScore={markedPlayerScore}
          markerName={markerName}
          markedName={markedName}
          markedScoredBy={markedScoredBy}
          secondMarked={secondMarked}
          onAbrir={setOpenPanel}
        />
      )}

      {isReadOnly && playerScore && (
        <GolpesEnSoloLectura
          t={t}
          playerScore={playerScore}
          conMarcador={conMarcador}
          etiquetaPropia={etiquetas.propia}
          etiquetaDelMarcador={etiquetas.delMarcador}
        />
      )}

      <PieDelHoyo
        t={t}
        netScore={netScore}
        holeResult={holeResult}
        standing={standing}
        teamAName={teamAName}
        teamBName={teamBName}
      />

      <TecladosDelHoyo
        openPanel={openPanel}
        cerrar={() => setOpenPanel(null)}
        valores={{
          propio: ownValue,
          marcado: markedValue,
          segundo: segundoValue,
        }}
        alElegir={{
          propio: handleOwnSelect,
          marcado: handleMarkedSelect,
          segundo: handleSegundoSelect,
        }}
        etiquetas={etiquetas}
        pares={{
          propio: par,
          marcado: markedPar ?? par,
          segundo: secondMarked?.par ?? par,
        }}
        allowPickedUp={allowPickedUp}
      />
    </div>
  );
};

export default HoleInput;
