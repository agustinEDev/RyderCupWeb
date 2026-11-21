import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cargarBarras } from '../composition/cargarBarras';
import customToast from '../utils/toast';
import { registraElFallo } from '../utils/registraElFallo';
import { claveDelFalloDeLaBarra } from '../utils/falloDeLaBarra';
import { TeeSource } from '../domain/value_objects/TeeSource';

/**
 * Tras apuntarse o aceptar una invitación (barras por campo, F1): si algún
 * campo no tiene su barra general (`source: NONE`), se le pide en el mismo
 * flujo, campo a campo. Cerrarlo sin elegir no rompe nada: la ficha sigue
 * avisando (F2). Sin poder leer sus barras, tampoco se dice nada aquí.
 *
 * @param {{ alGuardar?: () => void }} [opciones] - Tras guardar una: la ficha
 *   vuelve a leer «Mis barras»
 */
export const useBarrasPendientes = ({ alGuardar } = {}) => {
  const { t } = useTranslation('competitions');
  const [pendiente, setPendiente] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const comprobar = async (enrollmentId) => {
    if (!enrollmentId) return;
    try {
      const { getEnrollmentTeesUseCase } = await cargarBarras();
      const barras = await getEnrollmentTeesUseCase.execute(enrollmentId);
      // Sin opciones no hay nada que elegir: lo dice la ficha
      const campos = barras.courses.filter(
        (campo) => campo.source === TeeSource.NONE && campo.options.length > 0,
      );
      if (campos.length > 0) setPendiente({ enrollmentId, campos });
    } catch (error) {
      registraElFallo(
        'useBarrasPendientes.error-reading-tees',
        'Error reading the enrollment tees:',
        error,
      );
    }
  };

  const siguiente = () =>
    setPendiente((p) =>
      p && p.campos.length > 1 ? { ...p, campos: p.campos.slice(1) } : null,
    );

  const guardar = async (color) => {
    const { enrollmentId, campos } = pendiente;
    setGuardando(true);
    try {
      const { changeEnrollmentCourseTeeUseCase } = await cargarBarras();
      await changeEnrollmentCourseTeeUseCase.execute(
        enrollmentId,
        campos[0].golfCourseId,
        color,
      );
      customToast.success(t('tees.saved'));
      alGuardar?.();
      siguiente();
    } catch (error) {
      registraElFallo(
        'useBarrasPendientes.error-saving-course-tee',
        'Error saving a course tee:',
        error,
      );
      customToast.error(t(claveDelFalloDeLaBarra(error)));
    } finally {
      setGuardando(false);
    }
  };

  return {
    comprobar,
    campo: pendiente?.campos[0] ?? null,
    guardando,
    guardar,
    saltar: siguiente,
    cerrar: () => setPendiente(null),
  };
};
