import HandicapsDeLaCompeticion from '../HandicapsDeLaCompeticion';

/**
 * Lo que solo lee quien organiza bajo los ajustes: la tarjeta de hándicaps,
 * el aviso de que salieron menos categorías y, con todas las franjas
 * cerradas, «Terminar competición».
 */
const PanelesDelOrganizador = ({
  competition,
  t,
  canManage,
  isProcessing,
  releerHandicaps,
  releyendoTrasCerrar,
  textoDelAvisoDeCategorias,
  leeSiTerminar,
  claveDeFranjas,
  cierre,
  handleStatusChange,
}) => (
  <>
    {/* Los hándicaps del organizador, desde el cierre (FE #824, PR 5):
        cómo fue la última actualización con la RFEG, el botón y la
        programada. La ventana solo le llega al organizador */}
    {canManage &&
      competition.handicapUpdateWindow &&
      ['CLOSED', 'IN_PROGRESS'].includes(competition.status) && (
        <div className="p-4">
          <HandicapsDeLaCompeticion
            competitionId={competition.id}
            handicapUpdate={competition.handicapUpdate}
            handicapUpdateWindow={competition.handicapUpdateWindow}
            onReleer={releerHandicaps}
          />
        </div>
      )}

    {/* Salieron menos categorías: al organizador, hasta que empiece (PR 8) */}
    {canManage &&
      competition.status === 'CLOSED' &&
      !releyendoTrasCerrar &&
      textoDelAvisoDeCategorias && (
        <div className="px-4 pt-4">
          <p
            data-testid="aviso-categorias"
            role="status"
            className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          >
            {textoDelAvisoDeCategorias}
          </p>
        </div>
      )}

    {leeSiTerminar &&
      claveDeFranjas &&
      cierre.clave === claveDeFranjas &&
      cierre.cerradas && (
        <div className="px-4 pt-4">
          <div
            data-testid="terminar-competicion"
            role="status"
            className="flex flex-wrap items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900"
          >
            <span className="w-full">{t('detail.allWindowsClosed')}</span>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleStatusChange('complete')}
              className="min-h-11 rounded-lg bg-primary px-4 font-semibold text-white disabled:opacity-50"
            >
              {t('detail.actions.complete')}
            </button>
          </div>
        </div>
      )}
  </>
);

export default PanelesDelOrganizador;
