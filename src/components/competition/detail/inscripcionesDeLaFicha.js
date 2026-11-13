import customToast from '../../../utils/toast';
import { mensajeDeError } from '../../../utils/sinCobertura';
import { MOTIVOS_PARA_NO_APUNTARSE } from '../../../utils/fichaDeLaCompeticion';
import {
  listEnrollmentsUseCase,
  requestEnrollmentUseCase,
  approveEnrollmentUseCase,
  rejectEnrollmentUseCase,
  setNamePreferenceUseCase,
} from '../../../composition';

/**
 * Las inscripciones desde la ficha de una competición: apuntarse, aprobar o
 * rechazar una solicitud y elegir el nombre con el que se sale.
 *
 * Se crean en cada render con lo de ese render (`contexto`), igual que cuando
 * vivían en el cuerpo de la página.
 */
export const crearAccionesDeInscripcion = (contexto) => {
  const {
    id,
    t,
    tComun,
    competition,
    enrollments,
    setEnrollments,
    isFull,
    generoParaApuntarse,
    loadCompetition,
    releerTrasQuitar,
    preguntar,
    setIsProcessing,
    setErrorAlApuntarse,
    setShowEnrollModal,
    setVersionFranjas,
    setSavingNamePreference,
  } = contexto;

  /**
   * Elegir alias o nombre legal para ESTA competición (FE #571).
   *
   * El interruptor se pinta desde el estado, y el estado solo cambia con lo que
   * el backend confirma: si el guardado falla, el interruptor no se ha movido y
   * basta con decir que no se guardó.
   *
   * Guardar y recargar la lista van en dos `try` distintos a propósito. Con los
   * dos juntos, una recarga fallida detrás de un guardado bueno decía «no se
   * pudo guardar» sobre algo que sí se había guardado, y el reintento natural
   * lo dejaba como estaba al principio.
   */
  const handleToggleNamePreference = async (enrollmentId, siguiente) => {
    setSavingNamePreference(true);
    try {
      const guardado = await setNamePreferenceUseCase.execute(enrollmentId, siguiente);

      // Lo confirmado por el backend, no lo que se pidió
      setEnrollments((previos) =>
        previos.map((e) =>
          e.id === enrollmentId ? { ...e, useRealName: guardado.useRealName } : e
        )
      );
    } catch (error) {
      // El mensaje de la API es técnico y viene en inglés: a la consola
      console.error('Error updating name preference:', error);
      customToast.error(t('detail.namePreference.failed'));
      setSavingNamePreference(false);
      return;
    }

    try {
      // El nombre de la lista lo resuelve el servidor, así que se vuelve a
      // pedir en vez de recomponerlo aquí. Si esto falla, la preferencia ya
      // está guardada: el nombre se verá al siguiente refresco, y decir que no
      // se guardó sería mentir
      const enrollmentsData = await listEnrollmentsUseCase.execute(competition.id);
      setEnrollments(enrollmentsData);
    } catch (error) {
      console.error('Error reloading enrollments after name preference:', error);
    } finally {
      setSavingNamePreference(false);
    }
  };

  const handleEnroll = async (color = null, genero = null, eleccion = null) => {
    setErrorAlApuntarse(null);
    setIsProcessing(true);
    let generoGuardado = false;
    try {
      // Antes que la plaza: sin género el servidor la rechaza (#710)
      if (genero) {
        await generoParaApuntarse.guardar(genero);
        generoGuardado = true;
      }
      // En una pública se entra directamente, con la franja o su espera
      // (release social 3, 28 oct 2026)
      const hecho = await requestEnrollmentUseCase.execute(id, null, {
        color,
        roundId: eleccion?.roundId ?? null,
        waitingList: eleccion?.waiting ?? false,
      });
      // Se cierra solo si ha ido bien (#710): cerrarlo antes dejaba un fallo
      // con cara de éxito
      setShowEnrollModal(false);
      customToast.success(
        t(hecho?.waiting ? 'detail.success.joinedWaitingList' : 'detail.success.enrolled')
      );
      setVersionFranjas((n) => n + 1);
      await loadCompetition();
    } catch (error) {
      console.error('Error enrolling:', error);
      const motivo = MOTIVOS_PARA_NO_APUNTARSE[error?.errorCode];
      if (motivo) {
        setErrorAlApuntarse(t(motivo));
        if (error.errorCode.startsWith('TEE_WINDOW')) setVersionFranjas((n) => n + 1);
        return;
      }
      // Con los equipos formados ya no se entra: se dice y se pone al día
      if (error?.errorCode === 'TEAMS_FORMED') {
        setShowEnrollModal(false);
        customToast.error(t('detail.errors.teamsFormed'));
        await loadCompetition();
        return;
      }
      // Ya inscrito: no es un error que corregir, la ficha estaba vieja. Se
      // cierra y se pone al día (CodeRabbit en la #721)
      if (error?.status === 409) {
        setShowEnrollModal(false);
        await loadCompetition();
        return;
      }
      setErrorAlApuntarse(
        mensajeDeError(error, {
          sinConexion: tComun('sinConexion.mensaje'),
          generico: t('detail.failedToEnroll'),
        })
      );
    } finally {
      setIsProcessing(false);
      // Al final, aunque la plaza falle: el género ya quedó guardado
      if (generoGuardado) generoParaApuntarse.refrescar();
    }
  };

  const handleApproveEnrollment = async (enrollmentId) => {
    if (isFull) {
      customToast.error(t('detail.competitionFull', { max: competition.maxPlayers }));
      return;
    }
    try {
      // ApproveEnrollmentUseCase expects (competitionId, enrollmentId, teamId?)
      await approveEnrollmentUseCase.execute(competition.id, enrollmentId);
      customToast.success(t('detail.enrollmentApproved'));
      // Con equipos formados, el servidor los ha reiniciado para que entre
      // (30 oct 2026): la ficha también, no solo la lista (code-review)
      if (competition.teamsAssigned) {
        await releerTrasQuitar();
        return;
      }
      // Reload enrollments to update the list
      const enrollmentsData = await listEnrollmentsUseCase.execute(competition.id);
      setEnrollments(enrollmentsData);
    } catch (error) {
      console.error('Error approving enrollment:', error);
      // Solo falla así con partidos, que ya no se deshacen (30 oct 2026): se
      // dice y la ficha, al día
      if (error?.errorCode === 'TEAMS_FORMED') {
        customToast.error(t('detail.errors.teamsFormedWithMatches'));
        await releerTrasQuitar();
        return;
      }
      customToast.error(error.message || t('detail.failedToApprove'));
    }
  };

  const handleRejectEnrollment = async (enrollmentId) => {
    const solicitud = enrollments.find((e) => e.id === enrollmentId);
    const nombre = solicitud?.userName || t('detail.unknownUser');
    if (!(await preguntar('reject-enrollment', { destructiva: true, datos: { name: nombre } }))) {
      return;
    }
    try {
      // RejectEnrollmentUseCase expects (competitionId, enrollmentId)
      await rejectEnrollmentUseCase.execute(competition.id, enrollmentId);
      customToast.success(t('detail.enrollmentRejected'));
      // Reload enrollments to update the list
      const enrollmentsData = await listEnrollmentsUseCase.execute(competition.id);
      setEnrollments(enrollmentsData);
    } catch (error) {
      console.error('Error rejecting enrollment:', error);
      customToast.error(error.message || t('detail.failedToReject'));
    }
  };

  return { handleToggleNamePreference, handleEnroll, handleApproveEnrollment, handleRejectEnrollment };
};
