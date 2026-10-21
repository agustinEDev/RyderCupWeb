import { useState } from 'react';
import ModalShell, { CAJA_PROPIA } from '../ui/ModalShell';
import { motion } from 'framer-motion';
import { X, TrendingUp, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import customToast from '../../utils/toast';
import FuenteRfeg from '../golf_course/FuenteRfeg';
import { GrupoDePestanas, ListaDePestanas, PanelDePestana } from '../ui/Pestanas';
import { updateRfegHandicapUseCase, updateManualHandicapUseCase } from '../../composition';
import { formatoDeIndice } from '../../utils/formatoDeHandicap';

/**
 * @param {number|null} [handicapActual] - El hándicap guardado cuando se abre.
 *   Con uno, el modal no dice que falta: dice cuál es y que hoy no se ha podido
 *   actualizar (FE #677). Antes decía «no tienes hándicap» en los dos casos.
 */
const HandicapRequestModal = ({ isOpen, user, handicapActual = null, onClose, onSaved }) => {
  if (!isOpen) return null;
  return (
    <HandicapRequestModalContent
      user={user}
      handicapActual={handicapActual}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
};

const HandicapRequestModalContent = ({ user, handicapActual, onClose, onSaved }) => {
  const { t } = useTranslation('profile');

  const isSpanish = user?.country_code === 'ES';
  const [activeTab, setActiveTab] = useState(isSpanish ? 'rfeg' : 'manual');
  const [manualValue, setManualValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDismiss = () => {
    onClose();
  };

  const handleRfegFetch = async () => {
    setIsSubmitting(true);
    try {
      await updateRfegHandicapUseCase.execute({ userId: user.id });
      customToast.success(t('toasts.handicapUpdatedRFEG'));
      onSaved();
    } catch {
      customToast.error(t('toasts.failedToUpdateHandicapRFEG'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSave = async (e) => {
    e.preventDefault();
    const parsed = parseFloat(manualValue);
    if (isNaN(parsed) || parsed < -10 || parsed > 54) {
      customToast.error(t('edit.handicap.manualHelp'));
      return;
    }
    setIsSubmitting(true);
    try {
      await updateManualHandicapUseCase.execute({ userId: user.id, handicap: parsed });
      customToast.success(t('toasts.handicapUpdated'));
      onSaved();
    } catch {
      customToast.error(t('toasts.failedToUpdateHandicap'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell
      isOpen
      onClose={handleDismiss}
      labelledBy="pedir-handicap-titulo"
      closeOnBackdrop={false}
      closeOnEscape={!isSubmitting}
      busy={isSubmitting}
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
            <TrendingUp className="w-5 h-5 text-amber-500" />
            <h2 id="pedir-handicap-titulo" className="text-xl font-bold text-gray-900">{t('handicapModal.title')}</h2>
          </div>
          <button
            onClick={handleDismiss}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            aria-label={t('handicapModal.dismiss')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">
              {handicapActual == null
                ? t('handicapModal.subtitle')
                : t('handicapModal.subtitleStale', { handicap: formatoDeIndice(handicapActual) })}
            </p>
          </div>

          {/* Tabs — solo si el usuario es español; si no, el manual sin más */}
          <GrupoDePestanas actual={isSpanish ? activeTab : 'manual'} onElegir={setActiveTab} sinPestanas={!isSpanish}>
            {isSpanish && (
              <ListaDePestanas
                etiqueta={t('handicapModal.tabsLabel')}
                className="flex border-b border-gray-200"
                pestanas={[
                  { id: 'rfeg', contenido: t('handicapModal.rfegTab') },
                  { id: 'manual', contenido: t('handicapModal.manualTab') },
                ]}
                claseDePestana={(abierta) =>
                  `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    abierta
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`
                }
              />
            )}

            {/* RFEG tab */}
            <PanelDePestana id="rfeg" className="space-y-4">
              <p className="text-sm text-gray-600">{t('edit.handicap.rfegHelp')}</p>
              <button
                onClick={handleRfegFetch}
                disabled={isSubmitting}
                className="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? t('edit.handicap.updatingFromRFEG') : t('handicapModal.fetchRfeg')}
              </button>
              {/* De dónde sale el hándicap que se trae (auditoría legal, F4) */}
              <FuenteRfeg variante="handicap" />
            </PanelDePestana>

            {/* Manual tab */}
            <PanelDePestana id="manual" como="form" onSubmit={handleManualSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('edit.handicap.manual')}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="-10"
                  max="54"
                  value={manualValue}
                  onChange={(e) => setManualValue(e.target.value)}
                  placeholder={t('edit.handicap.manualPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">{t('edit.handicap.manualHelp')}</p>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? t('edit.handicap.updating') : t('edit.handicap.updateManually')}
              </button>
            </PanelDePestana>
          </GrupoDePestanas>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 pb-6">
          <button
            onClick={handleDismiss}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {t('handicapModal.dismiss')}
          </button>
        </div>
      </motion.div>
    </ModalShell>
  );
};

export default HandicapRequestModal;
