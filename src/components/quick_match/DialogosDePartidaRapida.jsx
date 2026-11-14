/**
 * Los tres avisos a pantalla completa de la anotación de partida rápida
 * (`QuickMatchScoringPage`): terminar, el desacuerdo con otro anotador y
 * cancelar. Sin estado ni efectos: el foco lo lleva `useFocoDeLosDialogos`, y
 * sus referencias llegan aquí.
 */
const DialogosDePartidaRapida = ({
  t,
  finishDialogRef,
  discrepanciaDialogRef,
  cancelDialogRef,
  showFinishConfirm,
  showCancelConfirm,
  hayDiscrepancia,
  discrepancia,
  yaCerrada,
  isSubmitting,
  finishFailedKey,
  cancelFailedKey,
  onCerrarTerminar,
  onTerminar,
  onCerrarCancelar,
  onCancelar,
  resuelveDiscrepancia,
  myParticipant,
  jugadorEnDisputa,
  nombreDelAnotador,
  comoSeLee,
}) => (
  <>
    {showFinishConfirm && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div
          ref={finishDialogRef}
          tabIndex={-1}
          className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4 focus:outline-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-match-finish-title"
        >
          <h3
            id="quick-match-finish-title"
            className="text-lg font-semibold text-gray-900 mb-1"
          >
            {t('scoring.finish.confirmTitle')}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {t('scoring.finish.confirmBody')}
          </p>
          {yaCerrada && !finishFailedKey && !isSubmitting && (
            <p
              role="alert"
              className="text-sm text-red-600 mb-4"
              data-testid="quick-match-finish-stale"
            >
              {t('scoring.finish.failed')}
            </p>
          )}
          {finishFailedKey && (
            <p
              role="alert"
              className="text-sm text-red-600 mb-4"
              data-testid="quick-match-finish-error"
            >
              {t(finishFailedKey)}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={onCerrarTerminar}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              {t('scoring.finish.cancel')}
            </button>
            <button
              onClick={onTerminar}
              disabled={isSubmitting || yaCerrada}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {t('scoring.finish.confirm')}
            </button>
          </div>
        </div>
      </div>
    )}

    {hayDiscrepancia && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div
          ref={discrepanciaDialogRef}
          tabIndex={-1}
          data-testid="quick-match-discrepancia"
          className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4 focus:outline-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-match-discrepancia-title"
        >
          <h3
            id="quick-match-discrepancia-title"
            data-testid="quick-match-discrepancia-title"
            className="text-lg font-semibold text-gray-900 mb-1"
          >
            {/* Un anotador cubre a invitados, y en foursomes a los cuatro:
                sin el nombre no se sabe qué tarjeta está en disputa. Cuando
                es la propia, el nombre sobra y queda raro */}
            {discrepancia.participantId === myParticipant?.participantId
              ? t('scoring.offline.conflictTitle', {
                  hole: discrepancia.holeNumber,
                })
              : t('scoring.offline.conflictTitlePlayer', {
                  hole: discrepancia.holeNumber,
                  player: jugadorEnDisputa?.name ?? '',
                })}
          </h3>
          <p
            className="text-sm text-gray-500 mb-4"
            data-testid="quick-match-discrepancia-body"
          >
            {t('scoring.offline.conflictBody', {
              scorer:
                nombreDelAnotador || t('scoring.offline.conflictScorerUnknown'),
              theirs: comoSeLee(discrepancia.enElServidor),
              mine: comoSeLee(discrepancia.mio),
            })}
          </p>
          <div className="flex justify-end gap-3">
            <button
              data-testid="quick-match-discrepancia-servidor"
              onClick={() =>
                resuelveDiscrepancia(
                  discrepancia.holeNumber,
                  discrepancia.participantId,
                  'elQueHay',
                )
              }
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              {t('scoring.offline.conflictTheirs', {
                theirs: comoSeLee(discrepancia.enElServidor),
              })}
            </button>
            <button
              data-testid="quick-match-discrepancia-mio"
              onClick={() =>
                resuelveDiscrepancia(
                  discrepancia.holeNumber,
                  discrepancia.participantId,
                  'mio',
                )
              }
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
            >
              {t('scoring.offline.conflictMine', {
                mine: comoSeLee(discrepancia.mio),
              })}
            </button>
          </div>
        </div>
      </div>
    )}

    {showCancelConfirm && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div
          ref={cancelDialogRef}
          tabIndex={-1}
          className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4 focus:outline-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-match-cancel-title"
        >
          <h3
            id="quick-match-cancel-title"
            className="text-lg font-semibold text-gray-900 mb-1"
          >
            {t('scoring.cancelMatch.confirmTitle')}
          </h3>
          <p
            className="text-sm text-gray-500 mb-4"
            data-testid="quick-match-cancel-body"
          >
            {t('scoring.cancelMatch.confirmBody')}
          </p>
          {yaCerrada && !cancelFailedKey && !isSubmitting && (
            <p
              role="alert"
              className="text-sm text-red-600 mb-4"
              data-testid="quick-match-cancel-stale"
            >
              {t('scoring.cancelMatch.failed')}
            </p>
          )}
          {cancelFailedKey && (
            <p
              role="alert"
              className="text-sm text-red-600 mb-4"
              data-testid="quick-match-cancel-error"
            >
              {t(cancelFailedKey)}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={onCerrarCancelar}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              {t('scoring.cancelMatch.cancel')}
            </button>
            <button
              onClick={onCancelar}
              disabled={isSubmitting || yaCerrada}
              data-testid="quick-match-cancel-confirm"
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {t('scoring.cancelMatch.confirm')}
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);

export default DialogosDePartidaRapida;
