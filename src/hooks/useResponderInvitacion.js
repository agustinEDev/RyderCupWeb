import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import customToast from '../utils/toast';
import { mensajeDeError } from '../utils/sinCobertura';
import { useGeneroParaApuntarse } from './useGeneroParaApuntarse';
import { respondToInvitationUseCase } from '../composition';
import { cargarBarras } from '../composition/cargarBarras';
import { registraElFallo } from '../utils/registraElFallo';
import { claveDelFalloDeLaBarra } from '../utils/falloDeLaBarra';
import { aceptadaConPlaza } from '../utils/entraConPlaza';

// Sin plaza, o con los equipos ya formados (29 oct 2026): se dice por qué y
// la pantalla se pone al día
const MOTIVOS_PARA_NO_ENTRAR = {
  INVITATION_NO_ROOM: 'errors.noRoom',
  TEAMS_FORMED: 'errors.teamsFormed',
  // Pasadas las 12:00 del día anterior (15 nov 2026, RyderCupAm #865)
  ENROLLMENT_DEADLINE_PASSED: 'errors.enrollmentDeadlinePassed',
  // En lista de espera hasta que se reabra, y la sala de draft abierta (15 nov
  // 2026, RyderCupAm B-02)
  INVITATION_ON_HOLD: 'errors.onHold',
  DRAFT_IN_PROGRESS: 'errors.draftInProgress',
};

/**
 * Aceptar o rechazar una invitación: las mismas reglas en «Mis invitaciones» y
 * en el cuadro de la ficha (release social 2).
 *
 * - Se acepta con la barra general, obligatoria (barras por campo): se elige
 *   antes, con la habitual de su género marcada, y se guarda en la inscripción
 *   que crea la aceptación. Los campos que no la tengan los pide la ficha de
 *   la competición, que es la que queda a la vista (`alAceptar` recibe el
 *   resultado, con su `enrollmentId`). Sin género no se entra: se pregunta a
 *   la vez (#710), y la sesión se refresca al terminar.
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
export const useResponderInvitacion = ({
  alAceptar,
  alCambiar,
  textoYaNoPendiente = 'errors.notPendingAnymore',
}) => {
  const { t } = useTranslation(['invitations', 'competitions']);
  const generoParaApuntarse = useGeneroParaApuntarse();
  // Las que se están respondiendo, y con qué: cada tarjeta, desactivada (y con
  // «Aceptando…» o «Rechazando…») mientras la suya
  const [enProceso, setEnProceso] = useState([]);
  // La invitación que se va a aceptar: primero se elige la barra
  const [aceptando, setAceptando] = useState(null);
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
      registraElFallo(
        'useResponderInvitacion.reloading-after-answering',
        'Error reloading after answering an invitation:',
        error,
      );
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
    const motivo = MOTIVOS_PARA_NO_ENTRAR[error?.errorCode];
    if (motivo) {
      customToast.error(t(motivo));
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

  // La barra general, en la inscripción que acaba de crear la aceptación. Si
  // no se guarda, la invitación ya está aceptada: se dice por qué y se cambia
  // en la ficha, que pide además la de los campos que no la tengan
  const guardarLaBarra = async (enrollmentId, barra) => {
    if (!enrollmentId) return;
    try {
      const { changeEnrollmentTeeUseCase } = await cargarBarras();
      await changeEnrollmentTeeUseCase.execute(enrollmentId, barra);
    } catch (error) {
      registraElFallo(
        'useResponderInvitacion.error-saving-tee',
        'Error saving the tee after accepting:',
        error,
      );
      customToast.error(t(claveDelFalloDeLaBarra(error)));
    }
  };

  // Hasta que la pantalla se ha releído, sigue en curso: si no, el botón se
  // reactivaba antes y un segundo toque mandaba otra respuesta (/code-review)
  const responderAceptando = async (invitationId, barra) => {
    try {
      let result;
      try {
        result = await respondToInvitationUseCase.execute(
          invitationId,
          'ACCEPT',
        );
      } catch (error) {
        registraElFallo(
          'useResponderInvitacion.error-accepting-invitation',
          'Error accepting invitation:',
          error,
        );
        avisarDelFallo(error);
        return;
      }
      customToast.success(t('success.accepted'));
      // Solo si quedó dentro: en lista de espera no hay barra que guardar
      if (aceptadaConPlaza(result))
        await guardarLaBarra(result.enrollmentId, barra);
      await releer(alAceptar, result);
    } finally {
      terminar(invitationId);
    }
  };

  // Aceptar pide antes la barra (y el género, a quien le falta)
  const aceptar = (invitationId) => {
    if (enCurso.current.has(invitationId)) return;
    setAceptando(invitationId);
  };

  const aceptarConBarra = async (barra, genero) => {
    const invitationId = aceptando;
    setAceptando(null);
    // Sin invitación que aceptar (ya en curso, o cerrada la pregunta), nada
    if (!invitationId || !empezar(invitationId, 'ACCEPT')) return;
    if (genero) {
      try {
        await generoParaApuntarse.guardar(genero);
      } catch (error) {
        registraElFallo(
          'useResponderInvitacion.error-saving-gender',
          'Error saving gender:',
          error,
        );
        customToast.error(textoDelFallo(error));
        terminar(invitationId);
        return;
      }
    }
    await responderAceptando(invitationId, barra);
    // Al final: refrescar la sesión antes recargaba la página en mitad
    if (genero) generoParaApuntarse.refrescar();
  };

  const rechazar = async (invitationId) => {
    if (!empezar(invitationId, 'DECLINE')) return;
    try {
      try {
        await respondToInvitationUseCase.execute(invitationId, 'DECLINE');
      } catch (error) {
        // Rechazar una que se quedó sin plaza, o que ya no estaba pendiente, no
        // es un fallo: no iba a jugarla y ya no la juega. Sin aviso (FE #737, 5 oct)
        if (
          error?.errorCode === 'INVITATION_NO_ROOM' ||
          (error?.status === 409 && !error?.errorCode)
        ) {
          await releer(alCambiar);
          return;
        }
        registraElFallo(
          'useResponderInvitacion.error-declining-invitation',
          'Error declining invitation:',
          error,
        );
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
    seEstaRespondiendo: (invitationId) =>
      enProceso.some((p) => p.id === invitationId),
    accionEnCurso: (invitationId) =>
      enProceso.find((p) => p.id === invitationId)?.accion ?? null,
    aceptar,
    rechazar,
    preguntaDeLaBarra: {
      isOpen: aceptando !== null,
      pideGenero: generoParaApuntarse.falta,
      generoDelJugador: generoParaApuntarse.genero,
      onClose: () => setAceptando(null),
      onConfirm: aceptarConBarra,
    },
  };
};
