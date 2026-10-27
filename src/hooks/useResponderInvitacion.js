import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import customToast from '../utils/toast';
import { useGeneroParaApuntarse } from './useGeneroParaApuntarse';
import { respondToInvitationUseCase } from '../composition';

/**
 * Aceptar o rechazar una invitación: las mismas reglas en «Mis invitaciones» y
 * en el cuadro de la ficha (release social 2).
 *
 * - Sin género no se entra: se pregunta antes de aceptar (#710), y la sesión se
 *   refresca al terminar.
 * - Sin plaza al cerrarse, el servidor lo dice con su código; un 409 sin código
 *   es que ya no estaba pendiente (retirada, caducada o contestada en otra
 *   pestaña). Al aceptar se dice; al rechazar, silencio (FE #737, 5 oct). En los
 *   dos casos, lo de la pantalla se relee.
 *
 * @param {{
 *   alAceptar: (resultado: object) => void,
 *   alCambiar: () => unknown,
 *   textoYaNoPendiente?: string,
 * }} opciones - qué hacer al aceptar, cómo releer lo de la pantalla y con qué
 *   texto decir que ya no estaba pendiente
 */
export const useResponderInvitacion = ({ alAceptar, alCambiar, textoYaNoPendiente = 'errors.notPendingAnymore' }) => {
  const { t } = useTranslation('invitations');
  const generoParaApuntarse = useGeneroParaApuntarse();
  // Las que se están respondiendo: cada tarjeta, desactivada mientras la suya
  const [enProceso, setEnProceso] = useState([]);
  const [aceptandoSinGenero, setAceptandoSinGenero] = useState(null);
  // Un doble toque antes de que se pinte el botón desactivado: una sola
  // respuesta. De cada invitación: en la lista, otra tarjeta se sigue
  // pudiendo responder mientras tanto (revisor)
  const enCurso = useRef(new Set());

  const empezar = (invitationId) => {
    if (enCurso.current.has(invitationId)) return false;
    enCurso.current.add(invitationId);
    setEnProceso((ids) => [...ids, invitationId]);
    return true;
  };
  const terminar = (invitationId) => {
    enCurso.current.delete(invitationId);
    setEnProceso((ids) => ids.filter((id) => id !== invitationId));
  };

  const avisarDelFallo = (error) => {
    if (error?.errorCode === 'INVITATION_NO_ROOM') {
      customToast.error(t('errors.noRoom'));
      alCambiar();
      return;
    }
    if (error?.status === 409 && !error?.errorCode) {
      customToast.error(t(textoYaNoPendiente));
      alCambiar();
      return;
    }
    customToast.error(error?.message || t('errors.failedToRespond'));
  };

  const responderAceptando = async (invitationId) => {
    try {
      const result = await respondToInvitationUseCase.execute(invitationId, 'ACCEPT');
      customToast.success(t('success.accepted'));
      alAceptar(result);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      avisarDelFallo(error);
    } finally {
      terminar(invitationId);
    }
  };

  const aceptar = (invitationId) => {
    if (generoParaApuntarse.falta) {
      setAceptandoSinGenero(invitationId);
      return;
    }
    if (empezar(invitationId)) responderAceptando(invitationId);
  };

  const aceptarConGenero = async (genero) => {
    const invitationId = aceptandoSinGenero;
    setAceptandoSinGenero(null);
    if (!empezar(invitationId)) return;
    try {
      await generoParaApuntarse.guardar(genero);
    } catch (error) {
      console.error('Error saving gender:', error);
      customToast.error(error?.message || t('errors.failedToRespond'));
      terminar(invitationId);
      return;
    }
    await responderAceptando(invitationId);
    // Al final: refrescar la sesión antes recargaba la página en mitad
    generoParaApuntarse.refrescar();
  };

  const rechazar = async (invitationId) => {
    if (!empezar(invitationId)) return;
    try {
      await respondToInvitationUseCase.execute(invitationId, 'DECLINE');
      customToast.success(t('success.declined'));
      await alCambiar();
    } catch (error) {
      // Rechazar una que se quedó sin plaza, o que ya no estaba pendiente, no es
      // un fallo: no iba a jugarla y ya no la juega. Sin aviso (FE #737, 5 oct)
      if (error?.errorCode === 'INVITATION_NO_ROOM' || (error?.status === 409 && !error?.errorCode)) {
        await alCambiar();
        return;
      }
      console.error('Error declining invitation:', error);
      avisarDelFallo(error);
    } finally {
      terminar(invitationId);
    }
  };

  return {
    seEstaRespondiendo: (invitationId) => enProceso.includes(invitationId),
    aceptar,
    rechazar,
    preguntaDelGenero: {
      isOpen: aceptandoSinGenero !== null,
      onClose: () => setAceptandoSinGenero(null),
      onConfirm: aceptarConGenero,
    },
  };
};

export default useResponderInvitacion;
