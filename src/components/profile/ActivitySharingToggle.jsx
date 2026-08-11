import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmModal from '../modals/ConfirmModal';
import customToast from '../../utils/toast';
import { setActivitySharingUseCase } from '../../composition';

/**
 * Interruptor de publicación de logros (BE #175).
 *
 * Apagarlo no es reversible: el backend borra las entradas ya publicadas y
 * volver a encenderlo no las recupera. Por eso apagar pasa por una
 * confirmación destructiva y encender no: encender no destruye nada.
 *
 * El estado inicial llega en `user.share_activity`. Si el backend que responde
 * es anterior a ese campo llega `undefined`, y se asume encendido, que es el
 * valor por defecto de la columna: mostrar "apagado" haría creer que no se
 * está publicando cuando sí.
 */
const ActivitySharingToggle = ({ initialValue, onChange }) => {
  const { t } = useTranslation('profile');
  const [enabled, setEnabled] = useState(initialValue ?? true);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const apply = async (next) => {
    setIsSaving(true);

    try {
      const result = await setActivitySharingUseCase.execute(next);
      setEnabled(result.shareActivity);
      onChange?.(result.shareActivity);

      // Se ramifica por lo que confirmo el backend, no por lo que se pidio: es
      // el mismo estado con el que se pinta el interruptor, y si algun dia
      // difieren, el aviso y el interruptor no pueden decir cosas distintas
      if (result.shareActivity) {
        customToast.success(t('privacy.turnedOn'));
      } else {
        customToast.success(
          t('privacy.turnedOff', { count: result.removedEvents })
        );
      }
    } catch {
      // El interruptor no se movió: se pintó desde el estado, y el estado solo
      // cambia cuando el backend confirma. Basta con decir que no se guardó
      customToast.error(t('privacy.saveFailed'));
    } finally {
      setIsSaving(false);
      setIsConfirmOpen(false);
    }
  };

  const handleToggle = () => {
    if (isSaving) return;

    if (enabled) {
      setIsConfirmOpen(true);
      return;
    }

    apply(true);
  };

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={t('privacy.shareActivity')}
        disabled={isSaving}
        onClick={handleToggle}
        className={`relative w-11 h-6 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          enabled ? 'bg-primary' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
            enabled ? 'translate-x-5' : ''
          }`}
        />
      </button>

      <ConfirmModal
        isOpen={isConfirmOpen}
        isDestructive
        isLoading={isSaving}
        title={t('privacy.confirmOffTitle')}
        message={t('privacy.confirmOffMessage')}
        confirmText={t('privacy.confirmOffAction')}
        onConfirm={() => apply(false)}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </>
  );
};

export default ActivitySharingToggle;
