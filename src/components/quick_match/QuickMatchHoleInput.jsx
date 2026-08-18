import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ScoreInputPanel from '../scoring/ScoreInputPanel';
import GolfFigure from '../scoring/GolfFigure';

/**
 * Hole score entry for quick matches: one score button per participant the
 * current user is responsible for (their own, plus anyone delegated to them).
 * Reuses the same numpad (ScoreInputPanel) and score bubble (GolfFigure) as
 * the tournament scoring screen — only the "own + marker" pairing from
 * HoleInput doesn't fit the delegated (1-to-N) quick match model.
 *
 * Cada entrada trae SU hoyo (`entry.hole`), porque el par, el índice y los
 * metros son de la barra que juega cada uno. La cabecera es la de quien anota
 * —lo que necesita para su propia vuelta— y a los demás solo se les baja, al
 * lado de su casilla, aquello en lo que su barra difiera de ella. Así nadie ve
 * un par que no es el suyo y la cabecera no se parte por los metros, que entre
 * dos barras distintas no coinciden nunca.
 *
 * Quien anota no necesita excepción: su hoyo y la cabecera salen de la misma
 * resolución, así que no difiere de sí mismo y no se le duplica nada.
 */
const QuickMatchHoleInput = ({ holeNumber, par, strokeIndex, meters = null, entries, isReadOnly = false, onScoreChange }) => {
  const { t } = useTranslation('scoring');
  const [openParticipantId, setOpenParticipantId] = useState(null);

  const openEntry = entries.find((e) => e.participantId === openParticipantId) || null;

  // El hoyo de cada jugador. Quien no lo traiga se queda sin datos propios: la
  // cabecera es la barra de quien anota, y pintarla bajo otro nombre es el
  // error que esta pantalla existe para evitar.
  //
  // La figura si cae al par de la cabecera, y ese par puede no ser el suyo:
  // `GolfFigure` sin par no dibuja el golpe, lo esconde tras un guion, y perder
  // el numero anotado es peor. Hace falta que el hoyo no este ni en su barra ni
  // en la del campo, o sea una numeracion con huecos: de las 4307 barras
  // importadas no hay ninguna asi.
  const holeOf = (entry) => entry?.hole ?? null;

  const parOf = (entry) => holeOf(entry)?.par ?? par;

  // La cabecera es la barra de QUIEN ANOTA: es la que necesita para su propia
  // vuelta, y siempre esta en pantalla porque el backend incluye al anotador
  // entre sus cubiertos. A los demas solo se les baja lo que difiera de ella, y
  // solo el campo que difiera: lo comun arriba, lo distinto al lado de su
  // casilla. Comparar a todos contra todos partia la cabecera entera en cuanto
  // habia dos barras, que en los metros es siempre.
  // Campo a campo, no en bloque: de los 800 campos federados 56 cambian el
  // indice entre barras y solo 25 el par, asi que agrupar par e indice repetia
  // debajo un par que ya estaba arriba y era el mismo.
  const differsInPar = (hole) => hole !== null && hole.par !== par;

  const differsInStrokeIndex = (hole) => hole !== null && hole.strokeIndex !== strokeIndex;

  const differsInMeters = (hole) => hole !== null && (hole.meters ?? null) !== meters;

  const differsInAnything = (hole) =>
    differsInPar(hole) || differsInStrokeIndex(hole) || differsInMeters(hole);

  const parFact = (hole) => (
    <span className="whitespace-nowrap">{t('input.par')} {hole.par}</span>
  );

  const strokeIndexFact = (hole) => (
    <span className="whitespace-nowrap">{t('input.strokeIndex')} {hole.strokeIndex}</span>
  );

  const metersFact = (hole) => (
    <span className="whitespace-nowrap">{t('input.meters')} {hole.meters ?? '-'}</span>
  );

  const handleSelect = (participantId, value) => {
    setOpenParticipantId(null);
    if (onScoreChange) onScoreChange(participantId, value);
  };

  return (
    <div data-testid="quick-match-hole-input" className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-lg font-bold text-gray-900 whitespace-nowrap">{t('input.hole')} {holeNumber}</span>
        {/* Los metros son de la barra, y las salidas dadas de alta a mano no
            los traen. Se ensena siempre la etiqueta con un guion en vez de
            esconder el dato: el hueco se lee como "aqui falta", que es lo que
            pasa, y no mueve el resto de la cabecera al cargar. */}
        <span className="text-sm text-gray-500 flex flex-wrap items-center gap-x-3 gap-y-1">
          {parFact({ par })}
          {strokeIndexFact({ strokeIndex })}
          {metersFact({ meters })}
        </span>
      </div>

      {/* Cada casilla es una columna flex con el boton anclado abajo (`mt-auto`):
          los datos propios solo salen en las casillas que difieren de la
          cabecera, y sin anclarlo los botones de una misma fila quedaban a
          distinta altura segun quien llevara linea de datos. */}
      <div className="grid grid-cols-2 gap-3">
        {entries.map((entry) => (
          <div key={entry.participantId} className="space-y-1 flex flex-col">
            <label className="text-xs font-medium text-gray-500 truncate block">{entry.name}</label>
            {differsInAnything(holeOf(entry)) && (
              <span
                className="text-xs text-gray-500 flex flex-wrap items-center gap-x-2 gap-y-0.5"
                data-testid={`quick-match-hole-facts-${entry.participantId}`}
              >
                {differsInPar(holeOf(entry)) && parFact(holeOf(entry))}
                {differsInStrokeIndex(holeOf(entry)) && strokeIndexFact(holeOf(entry))}
                {differsInMeters(holeOf(entry)) && metersFact(holeOf(entry))}
              </span>
            )}
            {!isReadOnly ? (
              <button
                type="button"
                data-testid={`quick-match-score-button-${entry.participantId}`}
                onClick={() => setOpenParticipantId(entry.participantId)}
                className="w-full h-14 mt-auto flex items-center justify-center bg-gray-100 rounded-xl hover:bg-gray-200 active:bg-gray-300 transition-colors"
              >
                <GolfFigure score={entry.score} par={parOf(entry)} />
              </button>
            ) : (
              <div className="w-full h-14 mt-auto flex items-center justify-center">
                <GolfFigure score={entry.score} par={parOf(entry)} />
              </div>
            )}
          </div>
        ))}
      </div>

      {openEntry && (
        <ScoreInputPanel
          value={openEntry.score}
          onSelect={(value) => handleSelect(openEntry.participantId, value)}
          onClose={() => setOpenParticipantId(null)}
          label={openEntry.name}
          par={parOf(openEntry)}
        />
      )}
    </div>
  );
};

export default QuickMatchHoleInput;
