import { useState } from 'react';

import TeeSelectPanel from './TeeSelectPanel';
import TeeColorBadge from '../golf_course/TeeColorBadge';
import { parseTeeKey } from './createQuickMatchModalConstants';

/**
 * Campo de selección de salida: enseña la elegida y abre el panel agrupado.
 *
 * Sustituye a la fila de botones planos que había antes. En un campo federado
 * cada barra viene valorada por separado para cada género, así que "Amarillas"
 * aparece dos veces seguidas y solo un sufijo "(M)"/"(F)" las distinguía. La
 * diferencia entre una y otra vale varios golpes de hándicap de juego —en Golf
 * de Meis, 6,3 de course rating y 7 de slope—, y elegir la equivocada no se
 * notaba hasta ver la tarjeta.
 *
 * El panel las agrupa bajo un encabezado de género, que es como se elegían ya
 * las salidas de los amigos. Ahora el creador y los invitados usan el mismo.
 */
const TeeSelectField = ({
  value,
  onChange,
  courseTees,
  placeholder,
  playerName,
  testIdPrefix,
}) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const { color, teeGender } = parseTeeKey(value);
  const selectedTee = color
    ? courseTees.find(
        (tee) => tee.color === color && (tee.gender ?? null) === (teeGender ?? null)
      )
    : null;

  const handleSelect = (key) => {
    setIsPanelOpen(false);
    onChange(key);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsPanelOpen(true)}
        // Sin `aria-label`: sustituiría al contenido y el lector de pantalla
        // anunciaría siempre "Tus barras", nunca "Amarillas (F)". Todo este
        // trabajo va de que se vea de qué género es la barra, así que
        // escondérselo a quien navega por voz deshace el arreglo justo para
        // quien más lo necesita. El contenido visible ya es un buen nombre.
        aria-haspopup="dialog"
        aria-expanded={isPanelOpen}
        data-testid={testIdPrefix}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm text-left hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {selectedTee ? (
          <TeeColorBadge
            color={selectedTee.color}
            identifier={selectedTee.identifier}
            gender={selectedTee.gender}
          />
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
        <span aria-hidden="true" className="text-gray-400 shrink-0">
          &rsaquo;
        </span>
      </button>

      {isPanelOpen && (
        <TeeSelectPanel
          courseTees={courseTees}
          playerName={playerName}
          selectedKey={value}
          onSelect={handleSelect}
          onClose={() => setIsPanelOpen(false)}
        />
      )}
    </>
  );
};

export default TeeSelectField;
