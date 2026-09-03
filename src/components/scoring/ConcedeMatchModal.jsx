import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ModalShell from '../ui/ModalShell';

const ConcedeMatchModalContent = ({ onConfirm, onClose }) => {
  const { t } = useTranslation('scoring');
  const [reason, setReason] = useState('');

  return (
    <>
      <h2 id="concede-title" className="text-lg font-semibold text-gray-900 mb-2">
        {t('concede.title')}
      </h2>
      <p id="concede-message" className="text-sm text-gray-600 mb-4">{t('concede.message')}</p>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('concede.reason')}</label>
        <input
          data-testid="concede-reason-input"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('concede.reasonPlaceholder')}
          maxLength={500}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary focus:border-primary"
        />
      </div>

      <div className="flex gap-3 justify-end">
        <button
          data-testid="concede-cancel"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          {t('concede.cancel')}
        </button>
        <button
          data-testid="concede-confirm"
          onClick={() => onConfirm(reason || null)}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
        >
          {t('concede.confirm')}
        </button>
      </div>
    </>
  );
};

// El contenido vive dentro del armazón, que no lo monta mientras está cerrado:
// así el motivo escrito y descartado no reaparece la próxima vez que se abre.
//
// Y por eso mismo el fondo no cierra: aquí dentro hay un motivo escrito a mano,
// y en un móvil el fondo es justo lo que se toca sin querer al ir a escribir.
// Para salir están «Cancelar» y Escape, que son deliberados.
const ConcedeMatchModal = ({ isOpen, onConfirm, onClose }) => (
  <ModalShell
    isOpen={isOpen}
    onClose={onClose}
    testId="concede-match-modal"
    labelledBy="concede-title"
    describedBy="concede-message"
    closeOnBackdrop={false}
  >
    <ConcedeMatchModalContent onConfirm={onConfirm} onClose={onClose} />
  </ModalShell>
);

export default ConcedeMatchModal;
