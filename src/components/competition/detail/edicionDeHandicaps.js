import customToast from '../../../utils/toast';
import {
  listEnrollmentsUseCase,
  setCustomHandicapUseCase,
  removeCustomHandicapUseCase,
} from '../../../composition';

/**
 * El hándicap personalizado de un inscrito, desde la ficha: abrir el editor,
 * guardarlo y volver al de la RFEG.
 *
 * Se crean en cada render con lo de ese render (`contexto`), igual que cuando
 * vivían en el cuerpo de la página.
 */
export const crearEdicionDeHandicaps = (contexto) => {
  const {
    t,
    competition,
    enrollments,
    setEnrollments,
    handicapInput,
    setHandicapInput,
    setEditingHandicapId,
    setSavingHandicapId,
    setRevertingHandicapId,
    setSinHandicap,
  } = contexto;

  const handleStartEditHandicap = (enrollment) => {
    setEditingHandicapId(enrollment.id);
    setHandicapInput(
      enrollment.hasCustomHandicap
        ? String(enrollment.customHandicap)
        : (enrollment.userHandicap ?? '')
    );
  };

  const handleCancelEditHandicap = () => {
    setEditingHandicapId(null);
    setHandicapInput('');
  };

  const handleSaveHandicap = async (enrollmentId) => {
    const value = parseFloat(String(handicapInput).replace(',', '.'));
    if (isNaN(value) || value < -10.0 || value > 54.0) {
      customToast.error(t('detail.invalidHandicap'));
      return;
    }
    setSavingHandicapId(enrollmentId);
    try {
      await setCustomHandicapUseCase.execute(competition.id, enrollmentId, value);
      customToast.success(t('detail.handicapUpdated'));
      // Con su personalizado ya no le falta: deja de estar marcado (revisor)
      const suyo = enrollments.find((e) => e.id === enrollmentId)?.userId;
      setSinHandicap((s) => {
        const sin = new Set(s);
        sin.delete(suyo);
        return sin;
      });
      const enrollmentsData = await listEnrollmentsUseCase.execute(competition.id);
      setEnrollments(enrollmentsData);
      setEditingHandicapId(null);
    } catch (error) {
      console.error('Error setting custom handicap:', error);
      customToast.error(error.message || t('detail.failedToUpdateHandicap'));
    } finally {
      setSavingHandicapId(null);
    }
  };

  const handleRevertToRfegHandicap = async (enrollmentId) => {
    setRevertingHandicapId(enrollmentId);
    try {
      await removeCustomHandicapUseCase.execute(competition.id, enrollmentId);
      customToast.success(t('detail.handicapReverted'));
      const enrollmentsData = await listEnrollmentsUseCase.execute(competition.id);
      setEnrollments(enrollmentsData);
      setEditingHandicapId(null);
    } catch (error) {
      console.error('Error reverting custom handicap:', error);
      customToast.error(error.message || t('detail.failedToRevertHandicap'));
    } finally {
      setRevertingHandicapId(null);
    }
  };

  return { handleStartEditHandicap, handleCancelEditHandicap, handleSaveHandicap, handleRevertToRfegHandicap };
};
