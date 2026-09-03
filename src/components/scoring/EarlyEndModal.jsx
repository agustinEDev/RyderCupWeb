import { useTranslation } from 'react-i18next';
import ModalShell from '../ui/ModalShell';

const EarlyEndModalContent = ({ decidedResult, onConfirm }) => {
  const { t } = useTranslation('scoring');

  return (
    <>
      <h2 id="early-end-title" className="text-lg font-semibold text-gray-900 mb-2">
        {t('earlyEnd.title')}
      </h2>
      <p id="early-end-message" className="text-sm text-gray-600 mb-2">
        {t('earlyEnd.message', { team: decidedResult?.winner, score: decidedResult?.score })}
      </p>
      <p className="text-sm text-gray-500 mb-6">{t('earlyEnd.description')}</p>
      <div className="flex gap-3 justify-end">
        <button
          data-testid="early-end-confirm"
          onClick={onConfirm}
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90"
        >
          {t('earlyEnd.confirm')}
        </button>
      </div>
    </>
  );
};

/**
 * El partido está decidido y lo único que queda es entregar, así que el botón
 * lleva a la pestaña de la tarjeta. Cerrarlo con Escape o pulsando fuera es
 * quedarse mirando los hoyos: el aviso vuelve a salir en la siguiente visita
 * mientras la tarjeta siga sin entregar.
 */
const EarlyEndModal = ({ isOpen, decidedResult, onConfirm, onClose }) => (
  <ModalShell
    isOpen={isOpen}
    onClose={onClose}
    testId="early-end-modal"
    labelledBy="early-end-title"
    describedBy="early-end-message"
  >
    <EarlyEndModalContent decidedResult={decidedResult} onConfirm={onConfirm} />
  </ModalShell>
);

export default EarlyEndModal;
