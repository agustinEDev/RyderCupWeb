import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cargarBarras } from '../composition/cargarBarras';
import customToast from '../utils/toast';
import { AVISO_ARRIBA } from '../utils/avisoArriba';
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
  // Cada comprobación con su número: la que llega tarde, si ya hubo otra
  // después, no se aplica (/code-review)
  const ultimaComprobacion = useRef(0);

  const comprobar = async (enrollmentId) => {
    if (!enrollmentId) return;
    const esta = ++ultimaComprobacion.current;
    try {
      const { getEnrollmentTeesUseCase } = await cargarBarras();
      const barras = await getEnrollmentTeesUseCase.execute(enrollmentId);
      if (esta !== ultimaComprobacion.current) return;
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

  // Quita ESE campo de ESA inscripción, no «el primero»: si se salta uno
  // mientras otro se guarda, o llega la cola de otra inscripción, el guardado
  // no se come lo que no es suyo (/code-review, CodeRabbit)
  const quitarCampo = (enrollmentId, golfCourseId) =>
    setPendiente((p) => {
      if (!p || p.enrollmentId !== enrollmentId) return p;
      const quedan = p.campos.filter((c) => c.golfCourseId !== golfCourseId);
      return quedan.length ? { ...p, campos: quedan } : null;
    });

  const guardar = async (color) => {
    if (!pendiente || guardando) return;
    const { enrollmentId, campos } = pendiente;
    const { golfCourseId } = campos[0];
    setGuardando(true);
    try {
      const { changeEnrollmentCourseTeeUseCase } = await cargarBarras();
      await changeEnrollmentCourseTeeUseCase.execute(
        enrollmentId,
        golfCourseId,
        color,
      );
      customToast.success(t('tees.saved'), AVISO_ARRIBA);
      alGuardar?.();
      quitarCampo(enrollmentId, golfCourseId);
    } catch (error) {
      registraElFallo(
        'useBarrasPendientes.error-saving-course-tee',
        'Error saving a course tee:',
        error,
      );
      customToast.error(t(claveDelFalloDeLaBarra(error)), AVISO_ARRIBA);
    } finally {
      setGuardando(false);
    }
  };

  return {
    comprobar,
    campo: pendiente?.campos[0] ?? null,
    guardando,
    guardar,
    saltar: () => {
      // Mientras guarda, no se salta: el guardado ya decide qué sigue
      if (!guardando && pendiente)
        quitarCampo(pendiente.enrollmentId, pendiente.campos[0].golfCourseId);
    },
    cerrar: () => {
      if (!guardando) setPendiente(null);
    },
  };
};
