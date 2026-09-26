import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import GolfFigure from './GolfFigure';
import CarruselDeTarjetas from './CarruselDeTarjetas';
import TarjetaVertical from './TarjetaVertical';
import { useEsMovil } from '../../hooks/useEsMovil';
import { conLaMiaPrimero, conMiNombrePrimero } from '../../utils/ordenDeLasTarjetas';

/**
 * La coincidencia entre los dos anotadores no se marca aquí. Es un dato de la
 * anotación —dice si hay que hablar con el otro anotador ANTES de seguir— y
 * vive donde se actúa sobre él: la cabecera de `HoleInput` y el color de cada
 * hoyo en `HoleSelector`. Repetirlo en cada celda de la tarjeta llenaba la
 * rejilla de iconos y competía con el propio resultado, que es lo que se viene
 * a leer aquí.
 */
const ScorecardTable = ({ holes = [], scores = [], players = [], currentUserId, teamAName, teamBName, matchFormat }) => {
  const { t } = useTranslation('scoring');
  const [showNet, setShowNet] = useState(false);
  const esMovil = useEsMovil();

  // El par es de la barra de cada jugador —el backend lo manda resuelto por
  // jugador desde RyderCupAm#213— y esta rejilla lo comparte entre todas las
  // filas. Las filas Par y SI son comunes por diseño: con jugadores en barras
  // distintas no hay un par que enseñar ahí, así que se quedan con la del
  // campo. La FIGURA de cada casilla sí es de quien juega esa bola: ahí no hay
  // nada compartido que decidir, y era donde un jugador de otra barra veía su
  // 4 pintado como birdie contra un par que no era el suyo. Ver
  // RyderCupWeb#417.
  const cardOf = (userId) => players.find(p => p.userId === userId)?.holeCard ?? [];

  // Se resuelve por FILA, no por jugador: en foursomes la fila es el bando
  // entero, y leer el par del primero le pinta al otro un par que no juega.
  // Con los dos en barras de distinto par —o si a alguno le falta la tarjeta—
  // se usa la del campo: no es la de ninguno de los dos, que es justo lo que la
  // hace preferible a la de uno.
  const parFor = (playerIds, holeNumber, fallbackPar) => {
    const pars = playerIds.map(id => cardOf(id).find(h => h.holeNumber === holeNumber)?.par);
    const [first] = pars;
    if (first == null) return fallbackPar;
    return pars.every(par => par === first) ? first : fallbackPar;
  };

  const outHoles = holes.filter(h => h.holeNumber <= 9);
  const inHoles = holes.filter(h => h.holeNumber > 9);

  const isTeamFormat = matchFormat === 'FOURBALL' || matchFormat === 'FOURSOMES';

  // El bando de foursomes ocupa UNA fila, así que subirla no basta para que
  // quien mira se lea a sí mismo primero: el nombre propio va delante dentro de
  // la etiqueta. Se ordenan los nombres, no `teamA` / `teamB`: de esos arrays
  // salen los `playerIds` con los que se busca el golpe del bando.
  const nombreDelBando = (miembros) =>
    conMiNombrePrimero(miembros, p => p.userId === currentUserId)
      .map(p => p.userName)
      .join(' / ');

  // Build display rows based on match format
  const displayRows = (() => {
    if (matchFormat === 'FOURSOMES') {
      const teamA = players.filter(p => p.team === 'A');
      const teamB = players.filter(p => p.team === 'B');
      const rows = [];
      if (teamA.length > 0) {
        rows.push({
          id: 'team-a',
          label: nombreDelBando(teamA),
          team: 'A',
          playerIds: teamA.map(p => p.userId),
          isCurrentUser: teamA.some(p => p.userId === currentUserId),
        });
      }
      if (teamB.length > 0) {
        rows.push({
          id: 'team-b',
          label: nombreDelBando(teamB),
          team: 'B',
          playerIds: teamB.map(p => p.userId),
          isCurrentUser: teamB.some(p => p.userId === currentUserId),
        });
      }
      return rows;
    }
    return players.map(p => ({
      id: p.userId,
      label: p.userName,
      team: p.team,
      playerIds: [p.userId],
      isCurrentUser: p.userId === currentUserId,
    }));
  })();

  // La fila de quien mira, delante; detrás la de su compañero, que en fourball
  // es otra fila y en foursomes viaja ya dentro de la suya. Se ordena la lista
  // PINTADA y no `players`: la etiqueta del equipo se resuelve por `row.team`,
  // así que viaja con su fila, y el reparto de golpes sigue leyendo el array
  // original. Mirando una partida que no se juega, esto no cambia nada.
  const filasOrdenadas = conLaMiaPrimero(displayRows, {
    esMia: row => row.isCurrentUser,
    equipoDe: row => row.team,
  });

  const getPlayerScore = (holeNumber, userId) => {
    const holeData = scores.find(s => s.holeNumber === holeNumber);
    if (!holeData) return null;
    return holeData.playerScores?.find(ps => ps.userId === userId) || null;
  };

  // Get score for a display row (first non-null from playerIds)
  const getRowScore = (holeNumber, row) => {
    for (const userId of row.playerIds) {
      const ps = getPlayerScore(holeNumber, userId);
      if (ps?.ownScore != null) return ps;
    }
    for (const userId of row.playerIds) {
      const ps = getPlayerScore(holeNumber, userId);
      if (ps) return ps;
    }
    return null;
  };

  const getHoleResult = (holeNumber) => {
    const holeData = scores.find(s => s.holeNumber === holeNumber);
    return holeData?.holeResult || null;
  };

  const sumRowScores = (holeRange, row) => {
    return holeRange.reduce((sum, h) => {
      const ps = getRowScore(h.holeNumber, row);
      const val = showNet ? (ps?.netScore ?? ps?.ownScore) : ps?.ownScore;
      return val !== null && val !== undefined ? sum + val : sum;
    }, 0);
  };

  const hasAnyStrokes = players.some(p => p.strokesReceived?.length > 0);

  const getTeamBorderClass = (team) => {
    if (!isTeamFormat) return '';
    return team === 'A' ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-red-500';
  };

  // En fourball, si la bola de esta fila fue la que contó en el hoyo. En
  // foursomes la bola es del bando entero y no hay nada que resaltar
  const esMejorBola = (holeNumber, row) => {
    if (matchFormat === 'FOURSOMES') return false;
    const result = getHoleResult(holeNumber);
    return Boolean(
      (row.team === 'A' && result?.bestBallPlayerA?.includes(row.playerIds[0])) ||
      (row.team === 'B' && result?.bestBallPlayerB?.includes(row.playerIds[0]))
    );
  };

  // Lo que se pinta en la casilla de un hoyo: la figura con los golpes (bruto o
  // neto) y los puntitos de los golpes recibidos. La comparten la tarjeta
  // horizontal y la vertical del móvil
  const casillaDeGolpes = (h, row) => {
    const ps = getRowScore(h.holeNumber, row);
    if (!ps) {
      // Sin anotación: hueco. Un guion aquí se confundía con la raya, que
      // significa lo contrario.
      return <span className="inline-flex w-7 h-7" />;
    }
    const displayScore = showNet ? (ps?.netScore ?? ps?.ownScore) : ps?.ownScore;
    // La raya: hoyo anotado (`ownSubmitted`) y sin número porque el jugador
    // recogió. No es lo mismo que un hoyo pendiente, aunque los dos lleguen
    // aquí sin golpes, y con el mismo guion gris para ambos no había forma de
    // saber cuál era cuál.
    const isPickedUp = Boolean(ps?.ownSubmitted) && ps?.ownScore == null;
    const strokeCount = ps?.strokesReceivedThisHole ?? 0;
    return (
      <div className="flex flex-col items-center">
        {showNet && strokeCount > 0 && (
          <div className="flex gap-px justify-center">
            {Array.from({ length: strokeCount }).map((_, i) => (
              <span key={i} className="block w-1.5 h-1.5 bg-blue-500 rounded-full" />
            ))}
          </div>
        )}
        <GolfFigure
          score={isPickedUp ? null : displayScore}
          par={parFor(row.playerIds, h.holeNumber, h.par)}
          pickedUp={isPickedUp}
        />
      </div>
    );
  };

  // Quién se llevó el hoyo, visto desde esta tarjeta
  const resultadoPara = (holeNumber, row) => {
    const result = getHoleResult(holeNumber);
    if (!result) return { texto: '', clase: '' };
    if (result.winner === 'HALVED') return { texto: t('scorecard.halved'), clase: 'text-gray-500' };
    return result.winner === row.team
      ? { texto: t('scorecard.holeWon'), clase: 'bg-green-100 text-green-800' }
      : { texto: t('scorecard.holeLost'), clase: 'bg-red-100 text-red-700' };
  };

  // FE #739 · en el móvil, una tarjeta por participante con los hoyos de arriba
  // abajo: la horizontal no cabía a 360 px y se desplazaba de lado
  const tarjetaVertical = (row) => {
    const nombreDelEquipo = row.team === 'A' ? teamAName : row.team === 'B' ? teamBName : null;
    return (
      <TarjetaVertical
        clave={row.id}
        testId={`tarjeta-vertical-${row.id}`}
        equipo={row.team}
        conResultado
        cabecera={
          <>
            <p className="text-sm font-bold text-gray-900 break-words">{row.label}</p>
            {nombreDelEquipo && <p className="text-[11px] text-gray-500">{nombreDelEquipo}</p>}
          </>
        }
        hoyos={holes.map((h) => ({
          holeNumber: h.holeNumber,
          par: parFor(row.playerIds, h.holeNumber, h.par),
          strokeIndex: h.strokeIndex,
          casilla: casillaDeGolpes(h, row),
          resultado: resultadoPara(h.holeNumber, row),
          mejorBola: esMejorBola(h.holeNumber, row),
        }))}
        sumas={{
          ida: inHoles.length > 0 ? sumRowScores(outHoles, row) : undefined,
          vuelta: inHoles.length > 0 ? sumRowScores(inHoles, row) : undefined,
          total: sumRowScores(holes, row),
        }}
      />
    );
  };

  const renderSection = (sectionHoles, label) => (
    <div data-testid="vuelta-horizontal" className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-2 py-1 text-left font-medium text-gray-500">{t('scorecard.hole')}</th>
            {sectionHoles.map(h => (
              <th key={h.holeNumber} className="px-2 py-1 text-center font-medium text-gray-500 w-8">{h.holeNumber}</th>
            ))}
            <th className="px-2 py-1 text-center font-bold text-gray-700">{label}</th>
          </tr>
          <tr className="bg-gray-50">
            <th scope="row" className="px-2 py-1 text-left text-gray-400 font-normal">{t('scorecard.par')}</th>
            {sectionHoles.map(h => (
              <th key={h.holeNumber} scope="col" className="px-2 py-1 text-center text-gray-400 font-normal">{h.par}</th>
            ))}
            <th scope="col" className="px-2 py-1 text-center font-medium text-gray-500">
              {sectionHoles.reduce((s, h) => s + h.par, 0)}
            </th>
          </tr>
          <tr className="bg-gray-50">
            <th scope="row" className="px-2 py-1 text-left text-gray-400 font-normal">{t('scorecard.si')}</th>
            {sectionHoles.map(h => (
              <th key={h.holeNumber} scope="col" className="px-2 py-1 text-center text-gray-400 font-normal">{h.strokeIndex}</th>
            ))}
            <th scope="col" className="px-2 py-1"></th>
          </tr>
        </thead>
        <tbody>
          {filasOrdenadas.map(row => {
            const borderClass = getTeamBorderClass(row.team);
            return (
              <tr key={row.id} className={row.isCurrentUser ? 'bg-blue-50' : ''}>
                {/* El nombre se parte en líneas y no se corta: con « / » la
                    pareja se leía «Nacho Noche / …», sin saber con quién (#727) */}
                <td className={`px-2 py-1.5 text-left font-medium text-gray-700 whitespace-normal break-words leading-tight ${matchFormat === 'FOURSOMES' ? 'min-w-[96px] max-w-[120px]' : 'min-w-[80px] max-w-[96px]'} ${borderClass}`}>
                  {isTeamFormat && (
                    <span className="block text-[10px] text-gray-400 leading-tight">
                      {row.team === 'A' ? teamAName : teamBName}
                    </span>
                  )}
                  {row.label}
                </td>
                {sectionHoles.map(h => (
                  <td key={h.holeNumber} className={`px-1 py-1 text-center ${esMejorBola(h.holeNumber, row) ? 'bg-yellow-50' : ''}`}>
                    {casillaDeGolpes(h, row)}
                  </td>
                ))}
                <td className="px-2 py-1 text-center font-bold">
                  {sumRowScores(sectionHoles, row) || '-'}
                </td>
              </tr>
            );
          })}
          <tr className="border-t">
            <td className="px-2 py-1 text-left text-gray-500">{t('scorecard.result')}</td>
            {sectionHoles.map(h => {
              const result = getHoleResult(h.holeNumber);
              const bestBallIds = result?.winner === 'A'
                ? result.bestBallPlayerA
                : result?.winner === 'B'
                  ? result.bestBallPlayerB
                  : [];
              const bestNames = (bestBallIds ?? []).map(id => {
                const parts = players.find(p => p.userId === id)?.userName?.split(' ') ?? [];
                const name = parts[0] ? (parts[1] ? `${parts[0]} ${parts[1][0]}.` : parts[0]) : null;
                return name ? { id, name } : null;
              }).filter(Boolean);
              const fallbackLabel = result?.winner === 'A' ? (teamAName || 'A') : result?.winner === 'B' ? (teamBName || 'B') : null;
              const winnerColor = result?.winner === 'A' ? 'bg-blue-100 text-blue-700 font-bold' : result?.winner === 'B' ? 'bg-red-100 text-red-700 font-bold' : '';
              const winnerContent = !result
                ? ''
                : result.winner === 'HALVED'
                  ? t('scorecard.halved')
                  : bestNames.length > 0
                    ? (
                      <span className="flex flex-col items-center leading-tight">
                        {bestNames.map((entry, i) => (
                          <span key={entry.id}>
                            {i > 0 && <span className="block text-gray-400 font-normal">{t('scorecard.and')}</span>}
                            <span className="whitespace-nowrap">{entry.name}</span>
                          </span>
                        ))}
                      </span>
                    )
                    : fallbackLabel;
              return (
                <td key={h.holeNumber} className={`px-1 py-1 text-center text-xs ${winnerColor}`}>
                  {winnerContent}
                </td>
              );
            })}
            <td className="px-2 py-1"></td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div data-testid="scorecard-table" className="space-y-4">
      {hasAnyStrokes && (
        <div className="flex items-center justify-end gap-2 mb-2">
          <span className="text-xs text-gray-500">{t('scorecard.gross')}</span>
          <button
            type="button"
            role="switch"
            aria-checked={showNet}
            aria-label={t('scorecard.grossNet')}
            onClick={() => setShowNet(!showNet)}
            className={`relative w-10 h-5 rounded-full transition-colors ${showNet ? 'bg-primary' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${showNet ? 'translate-x-5' : ''}`} />
          </button>
          <span className="text-xs text-gray-500">{t('scorecard.net')}</span>
        </div>
      )}
      {esMovil ? (
        <CarruselDeTarjetas
          tarjetas={filasOrdenadas.map((row) => ({
            clave: row.id,
            nombre: row.label,
            equipo: row.team,
            contenido: tarjetaVertical(row),
          }))}
        />
      ) : (
        <>
          {renderSection(outHoles, t('scorecard.out'))}
          {inHoles.length > 0 && renderSection(inHoles, t('scorecard.in'))}
        </>
      )}
    </div>
  );
};

export default ScorecardTable;
