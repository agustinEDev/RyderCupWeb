import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import customToast from '../utils/toast';
import { mensajeDeError } from '../utils/sinCobertura';
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
  // Las que se están respondiendo, y con qué: cada tarjeta, desactivada (y con
  // «Aceptando…» o «Rechazando…») mientras la suya
  const [enProceso, setEnProceso] = useState([]);
  const [aceptandoSinGenero, setAceptandoSinGenero] = useState(null);
  // Un doble toque antes de que se pinte el botón desactivado: una sola
  // respuesta. De cada invitación: en la lista, otra tarjeta se sigue
  // pudiendo responder mientras tanto (revisor)
  const enCurso = useRef(new Set());

  const empezar = (invitationId, accion) => {
    if (enCurso.current.has(invitationId)) return false;
    enCurso.current.add(invitationId);
    setEnProceso((lista) => [...lista, { id: invitationId, accion }]);
    return true;
  };
  const terminar = (invitationId) => {
    enCurso.current.delete(invitationId);
    setEnProceso((lista) => lista.filter((p) => p.id !== invitationId));
  };

  // Releer lo de la pantalla tras una respuesta que SÍ se guardó: si falla, no
  // se dice que no se pudo responder (/code-review). Cada pantalla avisa ya de
  // sus propios fallos al cargar
  const releer = async (hacer, ...argumentos) => {
    try {
      await hacer(...argumentos);
    } catch (error) {
      console.error('Error reloading after answering an invitation:', error);
    }
  };

  // Sin conexión, el texto de la app y no el «Failed to fetch» del navegador;
  // con motivo del servidor, ese; un 5xx, el genérico (CodeRabbit)
  const textoDelFallo = (error) =>
    mensajeDeError(error, {
      sinConexion: t('common:sinConexion.mensaje'),
      generico: t('errors.failedToRespond'),
    });

  const avisarDelFallo = (error) => {
    if (error?.errorCode === 'INVITATION_NO_ROOM') {
      customToast.error(t('errors.noRoom'));
      releer(alCambiar);
      return;
    }
    if (error?.status === 409 && !error?.errorCode) {
      customToast.error(t(textoYaNoPendiente));
      releer(alCambiar);
      return;
    }
    customToast.error(textoDelFallo(error));
  };

  // Hasta que la pantalla se ha releído, sigue en curso: si no, el botón se
  // reactivaba antes y un segundo toque mandaba otra respuesta (/code-review)
  const responderAceptando = async (invitationId) => {
    try {
      let result;
      try {
        result = await respondToInvitationUseCase.execute(invitationId, 'ACCEPT');
      } catch (error) {
        console.error('Error accepting invitation:', error);
        avisarDelFallo(error);
        return;
      }
      customToast.success(t('success.accepted'));
      await releer(alAceptar, result);
    } finally {
      terminar(invitationId);
    }
  };

  const aceptar = (invitationId) => {
    if (generoParaApuntarse.falta) {
      setAceptandoSinGenero(invitationId);
      return;
    }
    if (empezar(invitationId, 'ACCEPT')) responderAceptando(invitationId);
  };

  const aceptarConGenero = async (genero) => {
    const invitationId = aceptandoSinGenero;
    setAceptandoSinGenero(null);
    if (!empezar(invitationId, 'ACCEPT')) return;
    try {
      await generoParaApuntarse.guardar(genero);
    } catch (error) {
      console.error('Error saving gender:', error);
      customToast.error(textoDelFallo(error));
      terminar(invitationId);
      return;
    }
    await responderAceptando(invitationId);
    // Al final: refrescar la sesión antes recargaba la página en mitad
    generoParaApuntarse.refrescar();
  };

  const rechazar = async (invitationId) => {
    if (!empezar(invitationId, 'DECLINE')) return;
    try {
      try {
        await respondToInvitationUseCase.execute(invitationId, 'DECLINE');
      } catch (error) {
        // Rechazar una que se quedó sin plaza, o que ya no estaba pendiente, no
        // es un fallo: no iba a jugarla y ya no la juega. Sin aviso (FE #737, 5 oct)
        if (error?.errorCode === 'INVITATION_NO_ROOM' || (error?.status === 409 && !error?.errorCode)) {
          await releer(alCambiar);
          return;
        }
        console.error('Error declining invitation:', error);
        avisarDelFallo(error);
        return;
      }
      customToast.success(t('success.declined'));
      await releer(alCambiar);
    } finally {
      terminar(invitationId);
    }
  };

  return {
    seEstaRespondiendo: (invitationId) => enProceso.some((p) => p.id === invitationId),
    accionEnCurso: (invitationId) => enProceso.find((p) => p.id === invitationId)?.accion ?? null,
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
