import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SelectorDeGenero from './SelectorDeGenero';

/**
 * Pregunta el género a quien se apunta sin tenerlo (#710): aceptar una
 * invitación es un botón suelto, sin modal propio donde preguntarlo.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Function} props.onConfirm - Con el género elegido
 * @param {boolean} [props.isProcessing]
 */
const GeneroParaApuntarseModal = ({ isOpen, onClose, onConfirm, isProcessing = false }) => {
  if (!isOpen) return null;
  return <Contenido onClose={onClose} onConfirm={onConfirm} isProcessing={isProcessing} />;
};

const Contenido = ({ onClose, onConfirm, isProcessing }) => {
  const { t } = useTranslation('profile');
  const [genero, setGenero] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (genero) onConfirm(genero);
        }}
        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4"
      >
        <h2 className="text-lg font-bold text-gray-900">{t('genderModal.title')}</h2>
        <SelectorDeGenero value={genero} onChange={setGenero} />
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200"
          >
            {t('genderModal.cancel')}
          </button>
          <button
            type="submit"
            data-testid="genero-confirmar"
            disabled={!genero || isProcessing}
            className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {t('genderModal.confirm')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GeneroParaApuntarseModal;
