import { useState } from 'react';
import {
  esNombrePorDefecto,
  nombrePorDefecto,
} from '../../utils/nombrePorDefecto';
import {
  DEFAULT_ALLOWANCE_BY_MATCH_FORMAT,
  DEFAULT_FREE_PLAY_ALLOWANCE,
  FORMAT_CAPACITY,
  FREE_PLAY_CAPACITY,
} from './createQuickMatchModalConstants';
import {
  MatchFormat,
  isTeamMatchFormat,
} from '../../domain/value_objects/MatchFormat';
import { ScoringFormat } from '../../domain/value_objects/ScoringFormat';
import { PlayModeType } from '../../domain/value_objects/HandicapSettings';
import { QuickMatchMode } from '../../domain/value_objects/QuickMatchMode';

// El nombre lleva escrito «Campo · dd/mm» y sigue al campo hasta que alguien
// escribe el suyo; vacío, viaja ese (Agustín, 4 nov 2026). Al repetir, uno de
// por defecto no se copia: llevaría la fecha de aquella
const nombreCopiado = (copia) =>
  esNombrePorDefecto(copia?.matchName, copia?.selectedCourse?.name)
    ? ''
    : (copia?.matchName ?? '');

const nombreCopiadoAMano = (copia) =>
  Boolean(copia?.matchName) &&
  !esNombrePorDefecto(copia.matchName, copia?.selectedCourse?.name);

// El % de la partida repetida, con su modalidad: el paso 1 lo ofrece como un
// botón más aunque no sea de los habituales (pasada del Kind, 4 nov 2026)
const porcentajeDeLaCopia = (copia) =>
  copia?.allowanceOverride != null
    ? {
        pct: copia.allowanceOverride,
        libre: copia.mode === QuickMatchMode.FREE_PLAY,
      }
    : null;

// Lo que se deduce de la modalidad y el formato: el % por defecto, cuántos
// caben y si va por equipos o es foursomes
const loQueDiceElFormato = (mode, matchFormat) => {
  const isFreePlay = mode === QuickMatchMode.FREE_PLAY;
  return {
    isFreePlay,
    defaultAllowance: isFreePlay
      ? DEFAULT_FREE_PLAY_ALLOWANCE
      : (DEFAULT_ALLOWANCE_BY_MATCH_FORMAT[matchFormat] ?? 100),
    capacity: isFreePlay
      ? FREE_PLAY_CAPACITY
      : (FORMAT_CAPACITY[matchFormat] ?? 2),
    isTeamFormat: !isFreePlay && isTeamMatchFormat(matchFormat),
    isFoursomes: !isFreePlay && matchFormat === MatchFormat.FOURSOMES,
  };
};

/**
 * Los ajustes del paso 1 del asistente de partida rápida: nombre, modalidad,
 * formato, campo, % de hándicap y modo de juego; con lo copiado al repetir
 * (`copia`) como punto de partida.
 *
 * @param {Object|null} copia - Lo copiado al repetir, o `null`
 */
export const useAjustesDelBorrador = (copia) => {
  const [matchName, setMatchName] = useState(() => nombreCopiado(copia));
  const [nombreAMano, setNombreAMano] = useState(() =>
    nombreCopiadoAMano(copia),
  );
  const [abiertoEl] = useState(() => new Date());
  const [mode, setMode] = useState(copia?.mode ?? QuickMatchMode.MATCH_PLAY);
  const [matchFormat, setMatchFormat] = useState(
    copia?.matchFormat ?? MatchFormat.SINGLES,
  );
  const [scoringFormat, setScoringFormat] = useState(
    copia?.scoringFormat ?? ScoringFormat.STABLEFORD,
  );
  const [selectedCourse, setSelectedCourse] = useState(
    copia?.selectedCourse ?? null,
  );
  const nombreSugerido = selectedCourse?.name
    ? nombrePorDefecto(selectedCourse.name, abiertoEl)
    : '';
  // null while following the WHS default for the current format; a number once the user overrides it
  const [allowanceOverride, setAllowanceOverride] = useState(
    copia?.allowanceOverride ?? null,
  );
  // Por defecto con hándicap: es como se juega normalmente, y el scratch es
  // la excepción que hay que pedir a propósito.
  const [playMode, setPlayMode] = useState(
    copia?.playMode ?? PlayModeType.HANDICAP,
  );

  const formato = loQueDiceElFormato(mode, matchFormat);
  const allowancePercentage = allowanceOverride ?? formato.defaultAllowance;

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setAllowanceOverride(null);
  };
  // El de por defecto elegido a mano no es «a mano»: así no sale en la
  // cabecera ni se pierde al cruzar de modalidad
  const cambiaElPorcentaje = (valor) =>
    setAllowanceOverride(valor === formato.defaultAllowance ? null : valor);
  const cambiaElNombre = (nombre) => {
    setNombreAMano(true);
    setMatchName(nombre);
  };

  return {
    ...formato,
    matchName,
    nombreAMano,
    nombreSugerido,
    cambiaElNombre,
    mode,
    handleModeChange,
    matchFormat,
    setMatchFormat,
    scoringFormat,
    setScoringFormat,
    selectedCourse,
    setSelectedCourse,
    allowancePercentage,
    cambiaElPorcentaje,
    porcentajeCopiado: porcentajeDeLaCopia(copia),
    playMode,
    setPlayMode,
  };
};
