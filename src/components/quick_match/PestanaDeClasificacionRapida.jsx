import QuickMatchClassificationTable from './QuickMatchClassificationTable';

/**
 * La pestaña «Clasificación» de la anotación de partida rápida
 * (`QuickMatchScoringPage`): la tabla, con el aviso de que puede ir atrasada
 * mientras queden golpes en el móvil. Sin estado ni efectos.
 */
const PestanaDeClasificacionRapida = ({
  t,
  quickMatch,
  holes,
  tees,
  holeScoresVisibles,
  myParticipant,
  coveredParticipantIds,
  esJuegoLibre,
  faltanDatosDeOtros,
  pendientes,
  yaCerrada,
}) => (
  <>
    {/* Lo nuestro sí está al día —sale de este móvil—, pero de los demás
        solo tenemos la última foto del servidor: lo que hayan anotado
        desde el corte no ha llegado. Así que se pintan los dos, cada
        jugador atrasado va marcado, y no se afirma quién va primero */}
    {esJuegoLibre && faltanDatosDeOtros && (
      <p
        data-testid="quick-match-clasificacion-atrasada"
        className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm mb-3"
      >
        {t('scoring.offline.classificationStale')}
      </p>
    )}

    {/* En match play no hay tabla que recalcular: el «2 up» viene ya
        hecho del servidor, y le faltan los golpes que siguen en el móvil
        aunque los hayamos anotado nosotros todos */}
    {!esJuegoLibre && pendientes > 0 && (
      <p
        data-testid="quick-match-resultado-atrasado"
        className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm mb-3"
      >
        {t('scoring.offline.standingStale')}
      </p>
    )}
    <QuickMatchClassificationTable
      holes={holes}
      holeScores={holeScoresVisibles}
      participants={quickMatch?.participants ?? []}
      currentParticipantId={myParticipant?.participantId}
      participantesAlDia={faltanDatosDeOtros ? coveredParticipantIds : null}
      scoringFormat={quickMatch?.scoringFormat}
      standing={quickMatch?.standing}
      tees={tees}
      allowancePercentage={quickMatch?.effectiveAllowance}
      playMode={quickMatch?.playMode}
      participantStrokes={quickMatch?.participantStrokes ?? []}
      matchFormat={quickMatch?.matchFormat}
      holeScoresDelServidor={quickMatch?.holeScores}
      showFinalBadge={yaCerrada}
      isCancelled={!!quickMatch?.isCancelled}
    />
  </>
);

export default PestanaDeClasificacionRapida;
