import { useState } from 'react';
import { changeEnrollmentTeeUseCase } from '../../../composition';
import customToast from '../../../utils/toast';
import { registraElFallo } from '../../../utils/registraElFallo';

// Los rechazos del servidor con su propio texto (RyderCupAm#912)
const CON_SU_TEXTO = new Set([
  'TEE_NOT_AVAILABLE',
  'TEE_CHANGE_CLOSED',
  'ENROLLMENT_NOT_APPROVED',
  'PENDING_GAME_NOT_RECALCULABLE',
]);

/**
 * El texto de un fallo al cambiar la barra (FE #1214): por su código, nunca
 * el del servidor, que es técnico y en inglés.
 *
 * @param {Error & {status?: number, errorCode?: string|null}} error
 * @returns {string} La clave de la traducción
 */
export const claveDelFalloDeLaBarra = (error) => {
  if (CON_SU_TEXTO.has(error?.errorCode))
    return `detail.tee.errors.${error.errorCode}`;
  if (error?.status === 403) return 'detail.tee.errors.FORBIDDEN';
  return 'detail.tee.errors.generic';
};

/**
 * Cambiar la barra de un inscrito desde la ficha (FE #1214): qué inscripción
 * se está cambiando, si se guarda y el guardado. La lista se queda con la
 * barra que confirma el servidor; un fallo avisa y deja el modal abierto para
 * elegir otra.
 *
 * @param {Object} p
 * @param {Function} p.t
 * @param {Function} p.setEnrollments
 */
export const useCambioDeBarra = ({ t, setEnrollments }) => {
  const [cambiandoDe, setCambiandoDe] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const guardar = async (color) => {
    const inscripcion = cambiandoDe;
    if (!inscripcion) return;
    setGuardando(true);
    try {
      const quedo = await changeEnrollmentTeeUseCase.execute(
        inscripcion.id,
        color,
      );
      setEnrollments((previas) =>
        previas.map((e) =>
          e.id === inscripcion.id ? { ...e, color: quedo.teeColor } : e,
        ),
      );
      customToast.success(t('detail.tee.saved'));
      setCambiandoDe(null);
    } catch (error) {
      registraElFallo(
        'useCambioDeBarra.error-changing-tee',
        'Error changing tee:',
        error,
      );
      customToast.error(t(claveDelFalloDeLaBarra(error)));
    } finally {
      setGuardando(false);
    }
  };

  return {
    cambiandoDe,
    guardando,
    abrir: setCambiandoDe,
    cerrar: () => setCambiandoDe(null),
    guardar,
  };
};
