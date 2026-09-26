import ModalShell from '../ui/ModalShell';

/**
 * Rehacer los sobres de una sesión (FE #655).
 *
 * Cuando un capitán no llega a tiempo, la aplicación rellena su sobre y salen
 * los enfrentamientos. Lo que viene después no es editar el resultado: es
 * rehacer el proceso, y lo pide el organizador porque es quien arbitra.
 *
 * Se pregunta antes porque se lleva los partidos por delante: unos partidos
 * que ya no salen de ningún sobre son enfrentamientos inventados.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onConfirm
 * @param {() => void} props.onClose
 * @param {boolean} props.isLoading
 * @param {Function} props.t
 */
const ResetEnvelopesModal = ({ isOpen, onConfirm, onClose, isLoading, t }) => (
  <ModalShell
    isOpen={isOpen}
    onClose={onClose}
    testId="modal-rehacer-sobres"
    labelledBy="rehacer-sobres-titulo"
    closeOnBackdrop={false}
    closeOnEscape={!isLoading}
    busy={isLoading}
  >
    <div className="px-6 pt-6 pb-2">
      <h2 id="rehacer-sobres-titulo" className="text-xl font-semibold text-gray-900">
        {t('envelope.resetTitle')}
      </h2>
      <p className="mt-1 text-sm text-gray-600">{t('envelope.resetExplanation')}</p>
    </div>

    <div className="flex flex-col-reverse gap-3 px-6 pt-4 pb-6 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onClose}
        disabled={isLoading}
        className="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 sm:w-auto"
      >
        {t('envelope.cancel')}
      </button>
      <button
        type="button"
        data-testid="confirmar-rehacer-sobres"
        onClick={onConfirm}
        disabled={isLoading}
        className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 sm:w-auto"
      >
        {t('envelope.resetConfirm')}
      </button>
    </div>
  </ModalShell>
);

export default ResetEnvelopesModal;
