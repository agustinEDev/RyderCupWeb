import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router';
import { motion } from 'framer-motion';
import { Users, Calendar, CalendarClock, MapPin, Settings, ArrowLeft, Edit, Trash2, Play, CheckCircle, XCircle, AlertCircle, UserPlus, Shield, Mail, BarChart3, Undo2, Crown, Pause, Swords } from 'lucide-react';
import customToast from '../utils/toast';
import AccionesDeLaFicha from '../components/competition/AccionesDeLaFicha';
import { siguientePasoDeLaCompeticion } from '../utils/siguientePasoDeLaCompeticion';
import ConfirmModal from '../components/modals/ConfirmModal';
import NameCaptainsModal from '../components/competition/NameCaptainsModal';
import CaptainBadge from '../components/competition/CaptainBadge';
import { mensajeDeError } from '../utils/sinCobertura';
import { useTranslation } from 'react-i18next';
import HeaderAuth from '../components/layout/HeaderAuth';
import { useAuth } from '../hooks/useAuth';
import { useUserRoles } from '../hooks/useUserRoles';
import { CountryFlag } from '../utils/countryUtils';
import CompetitionGolfCoursesSection from '../components/competition/CompetitionGolfCoursesSection';
import AgendaDeLaCompeticion from '../components/competition/AgendaDeLaCompeticion';
import { aCamposDeLaCompeticion } from '../utils/camposDeLaCompeticion';
import { useGeneroParaApuntarse } from '../hooks/useGeneroParaApuntarse';
import EnrollmentRequestModal from '../components/enrollment/EnrollmentRequestModal';
import {
  getCompetitionDetailUseCase,
  getCompetitionGolfCoursesUseCase,
  activateCompetitionUseCase,
  closeEnrollmentsUseCase,
  nameCaptainsUseCase,
  startCompetitionUseCase,
  completeCompetitionUseCase,
  cancelCompetitionUseCase,
  deleteCompetitionUseCase,
  reopenEnrollmentsUseCase,
  revertCompetitionStatusUseCase,
  revertCompetitionToInProgressUseCase,
  listEnrollmentsUseCase,
  requestEnrollmentUseCase,
  approveEnrollmentUseCase,
  rejectEnrollmentUseCase,
  assignTeamsUseCase,
  setCustomHandicapUseCase,
  removeCustomHandicapUseCase,
  setNamePreferenceUseCase,
} from '../composition';
import {
  getStatusColor,
  getEnrollmentStatusColor,
  formatDateRange,
} from '../services/competitions';
import FullScreenLoader from '../components/ui/FullScreenLoader';
import { formatCountryName } from '../services/countries';
import { fechaDeApertura } from '../domain/services/aperturaDeInscripciones';
import { CompetitionStatus } from '../domain/value_objects/CompetitionStatus';

// «Volver» lleva a donde se vino: explorar, las invitaciones (FE #682) o, por
// defecto, las competiciones propias
const VUELTAS = {
  browse: { to: '/browse-competitions', clave: 'detail.backToBrowse' },
  invitations: { to: '/player/invitations', clave: 'detail.backToInvitations' },
};
const VUELTA_POR_DEFECTO = { to: '/competitions', clave: 'detail.backToCompetitions' };

const CompetitionDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { t, i18n } = useTranslation('competitions');
  const { t: tComun } = useTranslation('common');
  const { user, loading: isLoadingUser } = useAuth();
  // El género para apuntarse, solo a quien le falta (#710)
  const generoParaApuntarse = useGeneroParaApuntarse();
  const { isAdmin, isCreator: hasCreatorRole, isLoading: isLoadingRoles } = useUserRoles(id);
  const [competition, setCompetition] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [isLoadingCompetition, setIsLoadingCompetition] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  // Borrar pide confirmación en un modal que dice quién pierde su plaza (FE #667)
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  // Mientras borra, el modal desactiva sus botones: eso ya impide un segundo DELETE
  const [borrando, setBorrando] = useState(false);
  // Si la lista de inscripciones no llegó, el modal no puede decir cuántos pierden
  // su plaza: «no hay nadie más» sería afirmar lo que no se ha comprobado
  const [inscripcionesSinCargar, setInscripcionesSinCargar] = useState(false);
  // Nombrar a los capitanes es lo que cierra las inscripciones (FE #692)
  const [nombrandoCapitanes, setNombrandoCapitanes] = useState(false);
  const [guardandoCapitanes, setGuardandoCapitanes] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  // Por qué no se pudo pedir plaza: se lee en el modal, que sigue abierto (#710)
  const [errorAlApuntarse, setErrorAlApuntarse] = useState(null);
  const [editingHandicapId, setEditingHandicapId] = useState(null);
  const [handicapInput, setHandicapInput] = useState('');
  const [savingHandicapId, setSavingHandicapId] = useState(null);
  const [revertingHandicapId, setRevertingHandicapId] = useState(null);
  const [savingNamePreference, setSavingNamePreference] = useState(false);
  // La agenda y la sección de campos cargan cada una los suyos; esto es el aviso
  // de que cambiaron, para que la agenda los vuelva a leer (FE #715)
  const [versionCampos, setVersionCampos] = useState(0);
  const avisarDeLosCampos = useCallback(() => setVersionCampos((v) => v + 1), []);
  // La agenda que leyó su sección: sesiones y reparto. null mientras no se sabe
  const [agendaLeida, setAgendaLeida] = useState(null);
  const numeroDeSesiones = agendaLeida?.rounds?.length ?? null;

  // Determine where user came from (browse or my competitions)
  const origen = location.state?.from;
  const vuelta = Object.hasOwn(VUELTAS, origen ?? '') ? VUELTAS[origen] : VUELTA_POR_DEFECTO;
  const backLink = vuelta.to;
  const backText = t(vuelta.clave);

  // Por el id y no por el objeto: refrescar la sesión crea un `user` nuevo con el
  // mismo id, y la ficha se recargaba entera tras apuntarse (CodeRabbit, #720)
  const userId = user?.id;
  const loadCompetition = useCallback(async () => {
    if (!userId) return;

    setIsLoadingCompetition(true);
    try {
      // Use GetCompetitionDetailUseCase instead of direct service call
      const data = await getCompetitionDetailUseCase.execute(id);

      setCompetition(data);

      // Load enrollments for all authenticated users (approved players visible to everyone)
      try {
        const enrollmentsData = await listEnrollmentsUseCase.execute(id);
        setEnrollments(enrollmentsData);
        setInscripcionesSinCargar(false);
      } catch {
        setEnrollments([]);
        setInscripcionesSinCargar(true);
      }
    } catch (error) {
      console.error('Error loading competition:', error);
      customToast.error(error.message || t('detail.failedToLoadCompetition'));
      navigate('/competitions');
    } finally {
      setIsLoadingCompetition(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userId, navigate]);

  useEffect(() => {
    if (userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing pattern surfaced by eslint-plugin-react-hooks 7.1.1 bump; needs dedicated review (tracked in follow-up)
      loadCompetition();
    }
  }, [id, userId, loadCompetition]);

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

  const isLoading = isLoadingUser || isLoadingCompetition || isLoadingRoles;

  const approvedEnrollments = useMemo(
    () => enrollments.filter(e => e.status === 'APPROVED'),
    [enrollments]
  );

  const handleStatusChange = async (action) => {
    // Validate golf courses approval status before activation
    if (action === 'activate') {
      try {
        const golfCoursesResult = await getCompetitionGolfCoursesUseCase.execute(id);
        const golfCourses = aCamposDeLaCompeticion(golfCoursesResult);

        if (golfCourses.length === 0) {
          customToast.error(t('detail.errors.noGolfCourses'));
          return;
        }

        const pendingCourses = golfCourses.filter(gc => gc.approvalStatus === 'PENDING_APPROVAL');
        if (pendingCourses.length > 0) {
          const courseNames = pendingCourses.map(gc => gc.name).join(', ');
          customToast.error(t('detail.errors.golfCoursesPendingApproval', { courses: courseNames }));
          return;
        }

        const rejectedCourses = golfCourses.filter(gc => gc.approvalStatus === 'REJECTED');
        if (rejectedCourses.length > 0) {
          const courseNames = rejectedCourses.map(gc => gc.name).join(', ');
          customToast.error(t('detail.errors.golfCoursesRejected', { courses: courseNames }));
          return;
        }
      } catch (error) {
        console.error('Error validating golf courses for activation:', error);
        customToast.error(t('detail.errors.golfCoursesFetchFailed'));
        return;
      }
    }

    const confirmationKey = `detail.confirmations.${action}`;
    if (!window.confirm(t(confirmationKey))) {
      return;
    }

    setIsProcessing(true);
    try {
      let result;
      switch (action) {
        case 'activate':
          result = await activateCompetitionUseCase.execute(id);
          customToast.success(t('detail.success.activated'));
          break;
        case 'close-enrollments':
          result = await closeEnrollmentsUseCase.execute(id);
          customToast.success(t('detail.success.enrollmentsClosed'));
          if (competition.teamAssignment === 'AUTOMATIC') {
            try {
              await assignTeamsUseCase.execute(id, { mode: 'AUTOMATIC' });
              customToast.success(t('detail.success.teamsAutoAssigned'));
            } catch (assignError) {
              console.error('Error auto-assigning teams:', assignError);
              customToast.error(assignError.message || t('detail.errors.teamAssignmentFailed'));
            }
          }
          break;
        case 'start':
          result = await startCompetitionUseCase.execute(id);
          customToast.success(t('detail.success.started'));
          break;
        case 'complete':
          result = await completeCompetitionUseCase.execute(id);
          customToast.success(t('detail.success.completed'));
          break;
        case 'cancel':
          result = await cancelCompetitionUseCase.execute(id);
          customToast.success(t('detail.success.cancelled'));
          break;
        case 'reopen-enrollments':
          result = await reopenEnrollmentsUseCase.execute(id);
          customToast.success(t('detail.success.enrollmentsReopened'));
          break;
        case 'revert-status':
          result = await revertCompetitionStatusUseCase.execute(id);
          customToast.success(t('detail.success.statusReverted'));
          break;
        case 'revert-to-in-progress':
          result = await revertCompetitionToInProgressUseCase.execute(id);
          customToast.success(t('detail.success.revertedToInProgress'));
          break;
        default:
          throw new Error('Invalid action');
      }

      // Update only the changed fields (status and updatedAt)
      setCompetition(prev => ({
        ...prev,
        status: result.status,
        updatedAt: result.updatedAt
      }));
      refrescarCanDelete();
    } catch (error) {
      console.error(`Error ${action}:`, error);
      console.error('Error details:', error.stack || error.message || String(error));
      customToast.error(error.message || t('detail.failedToUpdateCompetition'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Si ahora se puede borrar: la respuesta de un cambio de estado no lo trae, y
  // el de antes ya no vale —cancelar la vuelve borrable— (FE #667). En silencio,
  // sin la espera de pantalla completa; si falla, no se ofrece lo que no se sabe
  const refrescarCanDelete = () =>
    getCompetitionDetailUseCase
      .execute(id)
      // Solo si esa ficha es la del estado de ahora: con dos cambios seguidos, la
      // del primero puede llegar tarde y decidiría el botón del segundo
      .then((data) =>
        setCompetition(prev =>
          prev.status === data.status
            ? { ...prev, canDelete: data.canDelete, teamsAssigned: data.teamsAssigned }
            : prev
        )
      )
      .catch(() => setCompetition(prev => ({ ...prev, canDelete: false })));

  const confirmarCapitanes = async (capitanes) => {
    const cerraba = competition.status === 'ACTIVE';
    setGuardandoCapitanes(true);
    try {
      const result = await nameCaptainsUseCase.execute(id, capitanes);
      setCompetition(prev => ({
        ...prev,
        status: result.status,
        captains: { ...prev.captains, ...result.captains },
      }));
      setNombrandoCapitanes(false);
      customToast.success(
        t(cerraba ? 'detail.success.captainsNamed' : 'detail.success.captainsChanged')
      );
      if (result.unevenTeams) {
        // Aviso, no bloqueo: los capitanes quedan nombrados. El reparto
        // automático no se intenta, porque con impares el servidor lo rechaza
        customToast.warning(t('detail.captains.uneven', { count: result.totalPlayers }));
      } else if (cerraba && competition.teamAssignment === 'AUTOMATIC') {
        // Lo mismo que hacía «Cerrar inscripciones»: el reparto automático vive
        // aquí, en el navegador, hasta que lo haga el servidor
        try {
          await assignTeamsUseCase.execute(id, { mode: 'AUTOMATIC' });
          // Con equipos, «Cambiar capitanes» ya no se ofrece: fallaría siempre
          setCompetition(prev => ({ ...prev, teamsAssigned: true }));
          customToast.success(t('detail.success.teamsAutoAssigned'));
        } catch (assignError) {
          console.error('Error auto-assigning teams:', assignError);
          customToast.error(assignError.message || t('detail.errors.teamAssignmentFailed'));
        }
      }
      refrescarCanDelete();
    } catch (error) {
      console.error('Error naming captains:', error);
      // El motivo del servidor tal cual («ya hay equipos»...): dice qué hacer.
      // El modal sigue abierto para corregir la elección
      customToast.error(
        mensajeDeError(error, {
          sinConexion: t('common:sinConexion.mensaje'),
          generico: t('detail.captains.failed'),
        })
      );
    } finally {
      setGuardandoCapitanes(false);
    }
  };

  const handleDelete = () => setConfirmandoBorrado(true);

  const confirmarBorrado = async () => {
    setBorrando(true);
    try {
      await deleteCompetitionUseCase.execute(id);
      customToast.success(t('detail.success.deleted'));
      navigate('/competitions');
    } catch (error) {
      console.error('Error deleting competition:', error);
      // El motivo del servidor se enseña tal cual («ya tiene calendario»...):
      // es lo que dice qué hacer. Sin red o sin respuesta, el texto de la app
      customToast.error(
        mensajeDeError(error, {
          sinConexion: t('common:sinConexion.mensaje'),
          generico: t('detail.failedToDeleteCompetition'),
        })
      );
      setConfirmandoBorrado(false);
    } finally {
      setBorrando(false);
    }
  };

  const handleEnroll = async (color = null, genero = null) => {
    setErrorAlApuntarse(null);
    setIsProcessing(true);
    let generoGuardado = false;
    try {
      // Antes que la plaza: sin género el servidor la rechaza (#710)
      if (genero) {
        await generoParaApuntarse.guardar(genero);
        generoGuardado = true;
      }
      await requestEnrollmentUseCase.execute(id, null, { color });
      // Se cierra solo si ha ido bien (#710): cerrarlo antes dejaba un fallo
      // con cara de éxito
      setShowEnrollModal(false);
      customToast.success(t('detail.success.enrollmentRequested'));
      await loadCompetition();
    } catch (error) {
      console.error('Error enrolling:', error);
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
      // Reload enrollments to update the list
      const enrollmentsData = await listEnrollmentsUseCase.execute(competition.id);
      setEnrollments(enrollmentsData);
    } catch (error) {
      console.error('Error approving enrollment:', error);
      customToast.error(error.message || t('detail.failedToApprove'));
    }
  };

  const handleRejectEnrollment = async (enrollmentId) => {
    if (!window.confirm(t('detail.confirmations.reject-enrollment'))) {
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

  if (isLoading) {
    return (
      <FullScreenLoader texto={t('detail.loadingCompetition')} />
    );
  }

  if (!user || !competition) {
    return null;
  }

  // User is considered creator if they created the competition OR have CREATOR/ADMIN role
  const isCreator = competition.creatorId === user.id;
  const canManage = isCreator || hasCreatorRole || isAdmin;
  // Cómo se repartieron los equipos DE VERDAD; sin reparto, el configurado
  // En estilo Ryder el configurado no dice nada —será draft o a mano, al
  // nombrar capitanes—, y salía «Manual» (#710): hasta que se hace, pendiente
  const repartoAMostrar =
    competition.actualTeamAssignment ??
    (competition.setupMode === 'RYDER_CUP' ? 'PENDING' : competition.teamAssignment);
  // La configuración se corrige mientras haya inscripciones abiertas (BE #323):
  // quien invita antes de poner el campo de golf tiene que poder ponerlo después
  const canEdit = canManage && new CompetitionStatus(competition.status).allowsModifications();
  // El equipo de cada uno sale del reparto que leyó la agenda (#710)
  const equipoDe = (userId) => {
    const reparto = agendaLeida?.teamAssignment;
    if (reparto?.teamAPlayerIds?.includes(userId)) return competition.team1Name;
    if (reparto?.teamBPlayerIds?.includes(userId)) return competition.team2Name;
    return null;
  };
  // Capitanes y subcapitanes: su insignia ya dice el equipo
  const esCapitan = (userId) =>
    Boolean(userId) &&
    ['teamA', 'teamB', 'viceTeamA', 'viceTeamB'].some((papel) => competition.captains?.[papel] === userId);
  // Quién puede y cuándo lo decide el backend con la misma regla que el borrado
  // (RyderCupAM#347): estado, calendario y rol. Copiar aquí la lista de estados
  // ofrecería el botón en una cancelada ya jugada, donde siempre falla (FE #667)
  const canDelete = competition.canDelete === true;
  // Los que perderían su plaza, sin contar a quien borra: el creador está
  // inscrito desde que la crea, y contarlo inflaría el aviso
  const otrosInscritos = approvedEnrollments.filter((e) => e.userId !== user.id).length;
  // Las acciones de la ficha: UNA principal —la que toca ahora— y el resto en
  // un menú. Antes eran hasta siete botones del mismo peso en seis colores y
  // el que de verdad tocaba se perdía entre los demás (FE #705)
  const paso = siguientePasoDeLaCompeticion(competition, {
    puedeGestionar: canManage,
    // Sin la lista no se sabe cuántos hay: se sugiere como antes
    inscritos: inscripcionesSinCargar ? undefined : approvedEnrollments.length,
  });

  const accionesPosibles = {
    activate: {
      id: 'activate',
      label: t('detail.actions.activate'),
      icon: Play,
      onClick: () => handleStatusChange('activate'),
      disabled: isProcessing,
      cuando: competition.status === 'DRAFT',
    },
    nameCaptains: {
      id: 'nameCaptains',
      // Lo decide si LOS HAY, no el estado: en una cerrada sin capitanes
      // salía «Cambiar capitanes», que es justo lo que no se puede hacer
      label: t(
        competition.captains?.teamA && competition.captains?.teamB
          ? 'detail.actions.changeCaptains'
          : 'detail.actions.nameCaptains'
      ),
      icon: Crown,
      onClick: () => setNombrandoCapitanes(true),
      disabled: isProcessing,
      // Nombrarlos es lo que cierra las inscripciones. Con equipos ya no se
      // tocan: el servidor lo rechaza, así que no se ofrece
      cuando: ['ACTIVE', 'CLOSED'].includes(competition.status) && !competition.teamsAssigned,
    },
    'close-enrollments': {
      id: 'close-enrollments',
      label: t('detail.actions.close-enrollments'),
      icon: Pause,
      onClick: () => handleStatusChange('close-enrollments'),
      disabled: isProcessing,
      cuando: competition.status === 'ACTIVE' && competition.teamsAssigned,
    },
    draft: {
      id: 'draft',
      label: t('draft.open'),
      icon: Swords,
      onClick: () => navigate(`/competitions/${id}/draft`),
      // Sin los dos capitanes la sala no tiene quién elija, y con los equipos
      // ya hechos la sala terminó: se ven en la agenda
      cuando:
        competition.status === 'CLOSED' &&
        competition.setupMode === 'RYDER_CUP' &&
        !competition.teamsAssigned &&
        Boolean(competition.captains?.teamA && competition.captains?.teamB),
    },
    'start-competition': {
      id: 'start-competition',
      label: t('detail.actions.start-competition'),
      icon: Play,
      onClick: () => handleStatusChange('start'),
      disabled: isProcessing,
      // Sin sesiones el servidor lo rechaza (FE #710); lo sabe la agenda, y
      // mientras no lo ha dicho no se ofrece
      cuando: competition.status === 'CLOSED' && numeroDeSesiones > 0,
    },
    'reopen-enrollments': {
      id: 'reopen-enrollments',
      label: t('detail.actions.reopen-enrollments'),
      icon: Undo2,
      onClick: () => handleStatusChange('reopen-enrollments'),
      disabled: isProcessing,
      cuando: competition.status === 'CLOSED',
    },
    complete: {
      id: 'complete',
      label: t('detail.actions.complete'),
      icon: CheckCircle,
      onClick: () => handleStatusChange('complete'),
      disabled: isProcessing,
      cuando: competition.status === 'IN_PROGRESS',
    },
    'revert-status': {
      id: 'revert-status',
      label: t('detail.actions.revert-status'),
      icon: Undo2,
      onClick: () => handleStatusChange('revert-status'),
      disabled: isProcessing,
      cuando: competition.status === 'IN_PROGRESS',
    },
    'revert-to-in-progress': {
      id: 'revert-to-in-progress',
      label: t('detail.actions.revert-to-in-progress'),
      icon: Undo2,
      onClick: () => handleStatusChange('revert-to-in-progress'),
      disabled: isProcessing,
      cuando: competition.status === 'COMPLETED',
    },
    manageSchedule: {
      id: 'manageSchedule',
      label: t('detail.actions.manageSchedule'),
      icon: Calendar,
      onClick: () => navigate(`/creator/competitions/${id}/schedule`),
      cuando: competition.status !== 'DRAFT' && competition.status !== 'CANCELLED',
    },
    manageInvitations: {
      id: 'manageInvitations',
      label: t('detail.actions.manageInvitations'),
      icon: Mail,
      onClick: () => navigate(`/creator/competitions/${id}/invitations`),
      cuando: competition.status !== 'CANCELLED',
    },
    edit: {
      id: 'edit',
      label: t('detail.actions.edit'),
      icon: Edit,
      onClick: () => navigate(`/competitions/${id}/edit`),
      cuando: canEdit,
    },
    leaderboard: {
      id: 'leaderboard',
      label: t('detail.actions.leaderboard'),
      icon: BarChart3,
      onClick: () => navigate(`/competitions/${id}/leaderboard`, { state: { from: 'detail' } }),
      cuando: competition.status === 'IN_PROGRESS' || competition.status === 'COMPLETED',
    },
  };

  const disponibles = Object.values(accionesPosibles).filter((accion) => accion.cuando);
  const accionPrincipal = disponibles.find((accion) => accion.id === paso) || null;
  const accionesDeGestion = disponibles.filter((accion) => accion.id !== paso);
  const accionesDestructivas = [
    {
      id: 'cancel',
      label: t('detail.actions.cancel'),
      icon: XCircle,
      onClick: () => handleStatusChange('cancel'),
      disabled: isProcessing,
      cuando: !['CANCELLED', 'COMPLETED'].includes(competition.status),
    },
    {
      id: 'delete',
      label: t('detail.actions.delete'),
      icon: Trash2,
      onClick: handleDelete,
      disabled: isProcessing,
      // Lo decide el backend con la misma regla que el borrado de verdad: si
      // se copia aquí la lista de estados, el botón sale en una cancelada ya
      // jugada, donde siempre falla (FE #667)
      cuando: canDelete,
    },
  ].filter((accion) => accion.cuando);

  const canEditHandicap =
    canManage && ['DRAFT', 'ACTIVE', 'CLOSED'].includes(competition.status);

  // Una programada es un borrador con días de antelación (RyderCupAM#332). En
  // cuanto abre deja de ser borrador, así que la fecha solo se enseña mientras
  // espera: una vez abierta ya no dice nada (FE #678)
  const aperturaProgramada =
    competition.status === 'DRAFT'
      ? fechaDeApertura(competition.startDate, competition.enrollmentOpensDaysBefore)
      : null;
  const fechaDeAperturaLegible = aperturaProgramada
    ? new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'long' }).format(
        aperturaProgramada
      )
    : null;

  // Check if competition has reached max players
  // For creators: use enrollments list. For non-creators: fallback to competition.enrolledCount from API
  const approvedCount = enrollments.length > 0
    ? approvedEnrollments.length
    : (competition.enrolledCount || 0);
  const isFull = competition.maxPlayers && approvedCount >= competition.maxPlayers;

  // Check for user enrollment from two sources:
  // 1. From enrollments list (when loaded from detail page)
  // 2. From competition.enrollment_status (mapped from backend's user_enrollment_status)
  const userEnrollment = enrollments.find((e) => e.userId === user.id);
  const hasEnrollment = userEnrollment || competition.enrollment_status;

  // Elegir entre alias y nombre legal solo tiene sentido si (FE #571):
  // - hay alias: sin él las dos opciones pintan lo mismo,
  // - la inscripción es la propia y llega de la lista, porque
  //   `competition.enrollment_status` viene sin `id` y sin él no hay PUT,
  // - y el nombre se ve en algún sitio: una inscripción rechazada, cancelada o
  //   retirada no aparece en ninguna pantalla.
  const NOMBRE_A_LA_VISTA = ['APPROVED', 'REQUESTED', 'INVITED'];
  const puedeElegirNombre =
    Boolean(user.alias) &&
    Boolean(userEnrollment?.id) &&
    NOMBRE_A_LA_VISTA.includes(userEnrollment.status);
  const nombreLegal = [user.first_name, user.last_name].filter(Boolean).join(' ');

  // El interruptor es el del ALIAS, no el del nombre real: una competición
  // muestra el nombre legal salvo que su dueño pida lo contrario, así que de
  // fábrica sale apagado
  const usaSuAlias = userEnrollment ? !userEnrollment.useRealName : false;

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-white">
      <div className="layout-container flex h-full grow flex-col">
        {/* El nombre del torneo solo se conoce en ejecucion: sustituye al
            titulo generico del mapa de rutas (FE #310).
            El destino tambien: el mapa lleva siempre a /competitions, pero esta
            pantalla sabe si se llego desde explorar, y esa vuelta es mejor. Sin
            pasarsela, ocultar el enlace de la pagina en movil perderia
            comportamiento en lugar de quitar ruido (FE #338) */}
        <HeaderAuth user={user} title={competition.name} backTo={backLink} />

        <ConfirmModal
          isOpen={confirmandoBorrado}
          title={t('detail.deleteModal.title')}
          message={
            inscripcionesSinCargar
              ? t('detail.deleteModal.unknownOthers')
              : otrosInscritos === 0
                ? t('detail.deleteModal.nobodyElse')
                : t('detail.deleteModal.othersLosePlace', { count: otrosInscritos })
          }
          confirmText={t('detail.deleteModal.confirm')}
          cancelText={t('detail.deleteModal.keep')}
          onConfirm={confirmarBorrado}
          onCancel={() => setConfirmandoBorrado(false)}
          isDestructive
          isLoading={borrando}
        />

        <NameCaptainsModal
          // Montado de nuevo al abrir: arranca con los capitanes de ahora
          key={nombrandoCapitanes ? 'capitanes-abierto' : 'capitanes-cerrado'}
          isOpen={nombrandoCapitanes}
          players={approvedEnrollments.map((e) => ({
            userId: e.userId,
            name: e.userName || t('detail.unknownUser'),
            // El que cuenta aquí: el propio de la competición, si se le puso
            handicap: e.hasCustomHandicap ? e.customHandicap : (e.userHandicap ?? null),
          }))}
          teamNames={{ a: competition.team1Name, b: competition.team2Name }}
          current={competition.captains}
          closesEnrollment={competition.status === 'ACTIVE'}
          playersUnavailable={inscripcionesSinCargar}
          onConfirm={confirmarCapitanes}
          onClose={() => setNombrandoCapitanes(false)}
          isLoading={guardandoCapitanes}
        />

        <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="p-4"
            >
              <button
                onClick={() => navigate(backLink)}
                className="hidden md:flex items-center gap-2 text-gray-600 hover:text-primary transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">{backText}</span>
              </button>

              <div className="bg-primary-50 rounded-xl border border-primary-200 p-6 shadow-md">
                <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                  <div className="flex-1">
                    <h1 className="hidden md:block text-gray-900 text-3xl md:text-4xl font-bold mb-2">
                      {competition.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          competition.status
                        )}`}
                      >
                        {competition.status && t(`status.${competition.status}`)}
                      </span>
                      {/* Junto al estado: quien la mira tiene que saber si le
                          pueden encontrar o si entra solo quien es invitado (FE #664) */}
                      <span
                        data-testid="visibilidad-competicion"
                        className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700"
                      >
                        {t(
                          competition.visibility === 'PUBLIC'
                            ? 'detail.visibilityPublic'
                            : 'detail.visibilityPrivate'
                        )}
                      </span>
                      {isCreator && (
                        <div className="flex items-center gap-1.5 text-accent text-sm font-medium">
                          <Shield className="w-4 h-4" />
                          <span>{t('detail.creator')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* La sala de draft, para TODO el grupo y no solo para los dos
                    capitanes: la gracia es que la ceremonia se vea en directo
                    desde el móvil de cada uno (FE #653). Se ofrece cuando ya hay
                    a quién elegir y todavía no hay equipos: después la sala ya
                    terminó, y los equipos se ven en la agenda.

                    A quien organiza no se le repite aquí: para él la sala es el
                    siguiente paso y ya la ofrece el botón de arriba (FE #705) */}
                {!canManage &&
                  competition.setupMode === 'RYDER_CUP' &&
                  competition.status === 'CLOSED' &&
                  !competition.teamsAssigned &&
                  competition.captains?.teamA &&
                  competition.captains?.teamB && (
                  <Link
                    to={`/competitions/${competition.id}/draft`}
                    data-testid="ir-a-la-sala-de-draft"
                    className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 font-semibold text-white shadow-md transition-colors hover:bg-green-700"
                  >
                    <Swords className="w-4 h-4" />
                    <span>{t('draft.open')}</span>
                  </Link>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-5 h-5" />
                    <div>
                      <p className="text-xs text-gray-500">{t('detail.dates')}</p>
                      <p className="text-sm font-medium">
                        {formatDateRange(competition.startDate, competition.endDate, i18n.language)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Users className="w-5 h-5" />
                    <div>
                      <p className="text-xs text-gray-500">{t('detail.players')}</p>
                      <p className="text-sm font-medium">
                        {approvedCount} /{' '}
                        {competition.maxPlayers || '∞'}
                      </p>
                    </div>
                  </div>
                  {/* Para todos, no solo el creador: quien la encuentra al explorar
                      ve «Borrador» sin botón y tiene que saber cuándo podrá entrar */}
                  {fechaDeAperturaLegible && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <CalendarClock className="w-5 h-5" />
                      <div>
                        <p className="text-xs text-gray-500">{t('detail.enrollment')}</p>
                        <p className="text-sm font-medium" data-testid="apertura-programada">
                          {t('detail.enrollmentOpensOn', { fecha: fechaDeAperturaLegible })}
                        </p>
                      </div>
                    </div>
                  )}
                  {competition.creator && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Shield className="w-5 h-5" />
                      <div>
                        <p className="text-xs text-gray-500">{t('detail.organizedBy')}</p>
                        <p className="text-sm font-medium">
                          {competition.creator.firstName} {competition.creator.lastName}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Countries Badges */}
                {competition.countries && competition.countries.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-primary-200">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-5 h-5 text-gray-700 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-2">{t('detail.countries')}</p>
                        <div className="flex flex-wrap gap-2">
                          {competition.countries.map((country, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium border border-primary/20"
                            >
                              <CountryFlag countryCode={country.code} className="w-5 h-5" />
                              <span>{formatCountryName(country, i18n.language)}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Action Buttons */}
            {canManage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="p-4"
              >
                <AccionesDeLaFicha
                  principal={accionPrincipal}
                  acciones={accionesDeGestion}
                  destructivas={accionesDestructivas}
                  t={t}
                />

                {competition.status === 'DRAFT' && (
                  // Invitar abre el torneo, y eso no se adivina mirando el botón.
                  // También una programada: la política solo mira el estado
                  <p
                    className="mt-3 w-full text-sm text-gray-600"
                    data-testid="invitar-abre-inscripciones"
                  >
                    {fechaDeAperturaLegible
                      ? t('detail.invitingOpensScheduled', { fecha: fechaDeAperturaLegible })
                      : t('detail.invitingOpensEnrollment')}
                  </p>
                )}
              </motion.div>
            )}

            {/* La clasificación, para todo el mundo. A quien organiza NO se le
                repite: en un torneo en juego es su acción principal, y
                ofrecerla dos veces es lo que venía a arreglar el FE #705 */}
            {!canManage &&
              (competition.status === 'IN_PROGRESS' || competition.status === 'COMPLETED') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="p-4"
              >
                <button
                  onClick={() => navigate(`/competitions/${id}/leaderboard`, { state: { from: 'detail' } })}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors shadow-md"
                >
                  <BarChart3 className="w-5 h-5" />
                  <span>{t('detail.actions.leaderboard')}</span>
                </button>
              </motion.div>
            )}

            {/* View Schedule Button - For enrolled players (not creators/admins) */}
            {!canManage && competition.status !== 'DRAFT' && competition.status !== 'CANCELLED' &&
              (userEnrollment?.status === 'APPROVED' || competition.enrollment_status === 'APPROVED') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="p-4"
              >
                <button
                  onClick={() => navigate(`/competitions/${id}/schedule`)}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-md"
                >
                  <Calendar className="w-5 h-5" />
                  <span>{t('detail.actions.viewSchedule')}</span>
                </button>
              </motion.div>
            )}

            {/* Enrollment Button - Show if competition is ACTIVE, user is not enrolled, not the creator, and not full */}
            {!isCreator && competition.status === 'ACTIVE' && !hasEnrollment && !isFull && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="p-4"
              >
                <button
                  onClick={() => {
                    setErrorAlApuntarse(null);
                    setShowEnrollModal(true);
                  }}
                  disabled={isProcessing}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-md disabled:opacity-50"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>{t('detail.actions.request-to-join')}</span>
                </button>
              </motion.div>
            )}

            {/* User Enrollment Status */}
            {hasEnrollment && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="p-4"
              >
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                    <span className="text-blue-900 font-medium">{t('detail.enrollmentStatus')}</span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getEnrollmentStatusColor(
                        userEnrollment?.status || competition.enrollment_status
                      )}`}
                    >
                      {(userEnrollment?.status || competition.enrollment_status) &&
                        t(`enrollmentStatus.${userEnrollment?.status || competition.enrollment_status}`)}
                    </span>
                  </div>

                  {puedeElegirNombre && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <div className="flex items-center justify-between gap-3">
                        <span id="name-preference-label" className="text-blue-900 font-medium text-sm">
                          {t('detail.namePreference.label')}
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={usaSuAlias}
                          aria-labelledby="name-preference-label"
                          aria-describedby="name-preference-help"
                          disabled={savingNamePreference}
                          onClick={() =>
                            handleToggleNamePreference(userEnrollment.id, usaSuAlias)
                          }
                          className={`relative w-11 h-6 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                            usaSuAlias ? 'bg-primary' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                              usaSuAlias ? 'translate-x-5' : ''
                            }`}
                          />
                        </button>
                      </div>
                      <p id="name-preference-help" className="text-blue-800 text-sm mt-2">
                        {usaSuAlias
                          ? t('detail.namePreference.helpUsingAlias', {
                              realName: nombreLegal,
                              alias: user.alias,
                            })
                          : t('detail.namePreference.helpUsingRealName', {
                              realName: nombreLegal,
                              alias: user.alias,
                            })}
                      </p>
                      <p className="text-blue-700 text-sm mt-1">
                        {t('detail.namePreference.visibility')}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Competition Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-4"
            >
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-gray-900 font-bold text-lg mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  {t('detail.settings.title')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500 text-sm">{t('detail.settings.teamOne')}</span>
                    <p className="text-gray-900 font-medium">{competition.team1Name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-sm">{t('detail.settings.teamTwo')}</span>
                    <p className="text-gray-900 font-medium">{competition.team2Name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-sm">{t('detail.settings.playMode')}</span>
                    {/* Salía «HANDICAP»: el valor del backend tal cual, en
                        mayúsculas y en inglés, en una pantalla en español */}
                    <p className="text-gray-900 font-medium">
                      {competition.playMode
                        ? t(`create.${String(competition.playMode).toLowerCase()}`, {
                            defaultValue: competition.playMode,
                          })
                        : ''}
                    </p>
                  </div>
                  {/* El modo elegido al crearla no salía en ningún sitio (#710) */}
                  {competition.setupMode && (
                    <div>
                      <span className="text-gray-500 text-sm">{t('detail.settings.setupMode')}</span>
                      <p className="text-gray-900 font-medium">
                        {t(`create.setupMode.${competition.setupMode}.title`, {
                          defaultValue: competition.setupMode,
                        })}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500 text-sm">{t('detail.settings.teamAssignment')}</span>
                    {/* Idem, y con respaldo: un modo que el backend añada
                        mañana sale con su nombre, no con la clave */}
                    <p className="text-gray-900 font-medium">
                      {repartoAMostrar
                        ? t(`detail.settings.assignment.${repartoAMostrar}`, {
                            defaultValue: repartoAMostrar,
                          })
                        : ''}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-sm">{t('detail.settings.maxPlayingHandicap')}</span>
                    {competition.maxPlayingHandicap != null ? (
                      <p className="text-gray-900 font-medium">{competition.maxPlayingHandicap}</p>
                    ) : (
                      <p className="text-gray-500 font-medium italic">{t('detail.settings.maxPlayingHandicapNone')}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-500 text-sm">{t('detail.settings.created')}</span>
                    <p className="text-gray-900 font-medium">
                      {new Date(competition.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* La agenda: el torneo ES su agenda, a la vista de todos, y el
                organizador la cambia aquí mismo (FE #654) */}
            <div className="p-4" data-testid="seccion-agenda">
              <AgendaDeLaCompeticion
                competitionId={competition.id}
                startDate={competition.startDate}
                endDate={competition.endDate}
                // Terminada o cancelada ya no se toca: el servidor lo rechaza
                canManage={canManage && !['COMPLETED', 'CANCELLED'].includes(competition.status)}
                jugadores={approvedEnrollments.length}
                // Cuando cambia la competición —estado, equipos— se vuelve a leer
                version={`${competition.updatedAt}|${competition.status}|${competition.teamsAssigned}`}
                // Y sus campos, cuando cambian en la sección de abajo (FE #715)
                versionCampos={versionCampos}
                onAgenda={setAgendaLeida}
              />
            </div>

            {/* Golf Courses Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              <CompetitionGolfCoursesSection
                competition={competition}
                canManage={canManage}
                onCamposCambiados={avisarDeLosCampos}
              />
            </motion.div>

            {/* Approved Players Section - Visible to all authenticated users */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="p-4"
            >
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-gray-900 font-bold text-lg mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  {t('detail.approvedPlayers', { count: approvedEnrollments.length })}
                </h3>

                {approvedEnrollments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>{t('detail.noApprovedPlayers')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {approvedEnrollments
                      .sort((a, b) => {
                        // Sort by team first, then by handicap
                        if (a.team && b.team && a.team !== b.team) {
                          return a.team.localeCompare(b.team);
                        }
                        return (a.userHandicap || 999) - (b.userHandicap || 999);
                      })
                      .map((enrollment) => (
                        <div
                          key={enrollment.id}
                          data-testid={`aprobado-${enrollment.userId}`}
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-green-50 hover:bg-green-100 transition-colors"
                        >
                          {/* `min-w-0`: sin él, la etiqueta de capitán con el nombre
                              largo de un equipo estiraba la tarjeta y la ficha
                              entera se salía por la derecha a 360 px (FE #692) */}
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-900 font-semibold">
                              {enrollment.userName || t('detail.unknownUser')}
                            </p>
                            <CaptainBadge
                              userId={enrollment.userId}
                              captains={competition.captains}
                              teamNames={{ a: competition.team1Name, b: competition.team2Name }}
                            />
                            {/* Con el reparto hecho, el equipo de cada uno: sin esto
                                solo los capitanes lo decían (#710). El capitán ya
                                lo dice con su insignia */}
                            {equipoDe(enrollment.userId) && !esCapitan(enrollment.userId) && (
                              <span
                                data-testid="equipo-del-aprobado"
                                className="inline-flex mt-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium max-w-full"
                              >
                                <span className="truncate min-w-0">{equipoDe(enrollment.userId)}</span>
                              </span>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {editingHandicapId === enrollment.id ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={handicapInput}
                                    onChange={(e) => setHandicapInput(e.target.value)}
                                    autoFocus
                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveHandicap(enrollment.id)}
                                    disabled={savingHandicapId === enrollment.id}
                                    className="text-green-600 hover:text-green-800 disabled:opacity-50"
                                    title={t('detail.saveHandicap')}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelEditHandicap}
                                    disabled={savingHandicapId === enrollment.id || revertingHandicapId === enrollment.id}
                                    className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                                    title={t('detail.cancelHandicap')}
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                  {enrollment.hasCustomHandicap && enrollment.userCountryCode === 'ES' && (
                                    <button
                                      type="button"
                                      onClick={() => handleRevertToRfegHandicap(enrollment.id)}
                                      disabled={savingHandicapId === enrollment.id || revertingHandicapId === enrollment.id}
                                      className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                                      title={t('detail.revertToRfegHandicap')}
                                    >
                                      <Undo2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <>
                                  {enrollment.hasCustomHandicap ? (
                                    <span className="text-amber-700 text-sm font-medium">
                                      {t('detail.handicapLabel', { handicap: Number(enrollment.customHandicap).toFixed(1) })}
                                      {' '}
                                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-semibold">
                                        {t('detail.customHandicapBadge')}
                                      </span>
                                    </span>
                                  ) : enrollment.userHandicap !== null && enrollment.userHandicap !== undefined ? (
                                    <span className="text-green-700 text-sm font-medium">
                                      {t('detail.handicapLabel', { handicap: Number(enrollment.userHandicap).toFixed(1) })}
                                    </span>
                                  ) : (
                                    <span className="text-gray-500 text-sm">{t('detail.noHandicap')}</span>
                                  )}
                                  {canEditHandicap && (
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditHandicap(enrollment)}
                                      className="text-gray-400 hover:text-primary"
                                      title={t('detail.editHandicap')}
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          {enrollment.team && (
                            <span className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-semibold">
                              {enrollment.team}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Pending & Rejected Enrollments - Only visible to creator/admin */}
            {canManage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="px-4 space-y-4"
              >
                {/* Pending Requests Section */}
                {enrollments.filter(e => e.status === 'REQUESTED').length > 0 && (
                  <div className="bg-white border border-orange-200 rounded-xl p-6 shadow-sm">
                    <h3 className="text-gray-900 font-bold text-lg mb-4 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      {t('detail.pendingRequests', { count: enrollments.filter(e => e.status === 'REQUESTED').length })}
                    </h3>

                    <div className="space-y-3">
                      {enrollments
                        .filter(e => e.status === 'REQUESTED')
                        .map((enrollment) => (
                          <div
                            key={enrollment.id}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-orange-200 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors"
                          >
                            <div className="flex-1">
                              <p className="text-gray-900 font-semibold">
                                {enrollment.userName || t('detail.unknownUser')}
                              </p>
                              <p className="text-gray-600 text-sm">
                                {enrollment.userEmail || t('detail.noEmail')}
                              </p>
                              {enrollment.userHandicap !== null && enrollment.userHandicap !== undefined && (
                                <p className="text-gray-500 text-sm mt-1">
                                  {t('detail.handicapLabel', { handicap: Number(enrollment.userHandicap).toFixed(1) })}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                              <button
                                onClick={() => handleApproveEnrollment(enrollment.id)}
                                disabled={isFull}
                                className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors shadow-sm ${
                                  isFull
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700'
                                }`}
                                title={isFull ? t('detail.competitionFull', { max: competition.maxPlayers }) : t('detail.approve')}
                              >
                                ✓ {t('detail.approve')}
                              </button>
                              <button
                                onClick={() => handleRejectEnrollment(enrollment.id)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-sm"
                                title="Reject enrollment"
                              >
                                ✗ {t('detail.reject')}
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Rejected Enrollments Section - Collapsible */}
                {enrollments.filter(e => e.status === 'REJECTED').length > 0 && (
                  <details className="bg-white border border-gray-200 rounded-xl shadow-sm">
                    <summary className="p-6 cursor-pointer hover:bg-gray-50 transition-colors">
                      <h3 className="text-gray-700 font-semibold text-md inline-flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-red-600" />
                        {t('detail.rejectedEnrollments', { count: enrollments.filter(e => e.status === 'REJECTED').length })}
                      </h3>
                    </summary>
                    <div className="px-6 pb-6 space-y-3">
                      {enrollments
                        .filter(e => e.status === 'REJECTED')
                        .map((enrollment) => (
                          <div
                            key={enrollment.id}
                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50"
                          >
                            <div className="flex-1">
                              <p className="text-gray-700 font-medium">
                                {enrollment.userName || t('detail.unknownUser')}
                              </p>
                              <p className="text-gray-500 text-sm">
                                {enrollment.userEmail || t('detail.noEmail')}
                              </p>
                            </div>
                            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                              {t('detail.rejected')}
                            </span>
                          </div>
                        ))}
                    </div>
                  </details>
                )}
              </motion.div>
            )}

            {/* Footer */}
            <footer className="flex flex-col gap-6 px-5 py-10 text-center">
              <p className="text-gray-500 text-base font-normal leading-normal">
                {t('footer', { year: new Date().getFullYear() })}
              </p>
            </footer>
          </div>
        </div>
      </div>

      <EnrollmentRequestModal
        isOpen={showEnrollModal}
        onClose={() => setShowEnrollModal(false)}
        error={errorAlApuntarse}
        onConfirm={handleEnroll}
        isProcessing={isProcessing}
        pideGenero={generoParaApuntarse.falta}
      />
    </div>
  );
};

export default CompetitionDetail;
