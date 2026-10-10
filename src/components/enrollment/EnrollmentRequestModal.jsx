import { useState } from 'react';
import { Link } from 'react-router';
import ModalShell, { CAJA_PROPIA } from '../ui/ModalShell';
import { motion } from 'framer-motion';
import { X, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SelectorDeGenero from '../profile/SelectorDeGenero';

const TEE_CATEGORIES = ['WHITE', 'YELLOW', 'BLUE', 'RED', 'GREEN'];

/**
 * @param {Object} props
 * @param {boolean} [props.pideGenero=false] - Si quien se apunta no tiene el
 *   género en su perfil (#710): se le pregunta aquí y `onConfirm` lo recibe
 *   como segundo argumento, para guardarlo antes de pedir plaza
 * @param {string|null} [props.error=null] - Por qué no se pudo pedir (#710):
 *   el modal sigue abierto y lo dice, en vez de cerrarse como si hubiera ido bien
 */
const EnrollmentRequestModal = ({
  isOpen,
  onClose,
  onConfirm,
  isProcessing,
  pideGenero = false,
  faltaHandicap = false,
  error = null,
}) => {
  if (!isOpen) return null;
  return (
    <EnrollmentRequestModalContent
      onClose={onClose}
      onConfirm={onConfirm}
      isProcessing={isProcessing}
      pideGenero={pideGenero}
      faltaHandicap={faltaHandicap}
      error={error}
    />
  );
};

const EnrollmentRequestModalContent = ({ onClose, onConfirm, isProcessing, pideGenero, faltaHandicap, error }) => {
  const { t } = useTranslation(['competitions', 'golfCourses']);
  const [selectedTee, setSelectedTee] = useState('');
  const [genero, setGenero] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (faltaHandicap || (pideGenero && !genero)) return;
    onConfirm(selectedTee || null, pideGenero ? genero : null);
  };

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      labelledBy="pedir-inscripcion-titulo"
      closeOnBackdrop={false}
      closeOnEscape={!isProcessing}
      busy={isProcessing}
      boxClassName={CAJA_PROPIA}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-md w-full"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            <h2 id="pedir-inscripcion-titulo" className="text-xl font-bold text-gray-900">
              {t('competitions:enrollment.modalTitle')}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label={t('common:close')}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <p data-testid="apuntarse-error" role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          {/* Sin hándicap no se entra en un Stableford o un Medal: se dice y se
              lleva al perfil, en vez de esperar al rechazo del servidor
              (FE #824, PR 5) */}
          {faltaHandicap && (
            <p data-testid="falta-handicap" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              {t('competitions:enrollment.needsHandicap')}{' '}
              <Link to="/profile/edit" className="font-semibold underline">
                {t('competitions:enrollment.addHandicap')}
              </Link>
            </p>
          )}
          {pideGenero && <SelectorDeGenero value={genero} onChange={setGenero} />}

          {/* Tee Category Select */}
          <div>
            <label
              htmlFor="tee-category"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t('competitions:enrollment.colorLabel')}
            </label>
            <select
              id="tee-category"
              value={selectedTee}
              onChange={(e) => setSelectedTee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            >
              <option value="">{t('competitions:enrollment.noPreference')}</option>
              {TEE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t(`golfCourses:form.teeColors.${cat}`)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {t('competitions:enrollment.colorHint')}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              {t('competitions:enrollment.cancel')}
            </button>
            <button
              type="submit"
              disabled={isProcessing || faltaHandicap || (pideGenero && !genero)}
              className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isProcessing ? '...' : t('competitions:enrollment.confirm')}
            </button>
          </div>
        </form>
      </motion.div>
    </ModalShell>
  );
};

export default EnrollmentRequestModal;
