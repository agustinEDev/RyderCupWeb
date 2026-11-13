import { Calendar, Edit, Trash2, Play, CheckCircle, XCircle, Mail, BarChart3, Undo2, Crown, Pause, Swords } from 'lucide-react';

/**
 * Las acciones de la ficha: UNA principal —la que toca ahora (`paso`)— y el
 * resto en un menú. Antes eran hasta siete botones del mismo peso en seis
 * colores y el que de verdad tocaba se perdía entre los demás (FE #705).
 */
export const accionesDelOrganizador = ({
  t,
  id,
  navigate,
  competition,
  paso,
  isProcessing,
  conEquipos,
  esStrokePlay,
  canEdit,
  canDelete,
  numeroDeSesiones,
  handleStatusChange,
  handleDelete,
  abrirCapitanes,
  irALaClasificacion,
}) => {
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
      onClick: abrirCapitanes,
      disabled: isProcessing,
      // Nombrarlos es lo que cierra las inscripciones. Con equipos ya no se
      // tocan: el servidor lo rechaza, así que no se ofrece
      cuando:
        conEquipos &&
        ['ACTIVE', 'CLOSED'].includes(competition.status) &&
        !competition.teamsAssigned,
    },
    'close-enrollments': {
      id: 'close-enrollments',
      label: t('detail.actions.close-enrollments'),
      icon: Pause,
      onClick: () => handleStatusChange('close-enrollments'),
      disabled: isProcessing,
      // Una Ryder abierta se cierra nombrando a los capitanes, y este botón
      // solo vuelve con los equipos ya hechos (una reabierta). Un Stableford o
      // un Medal no tiene capitanes: se cierra aquí (FE #824)
      cuando: competition.status === 'ACTIVE' && (competition.teamsAssigned || esStrokePlay),
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
      // Esa pantalla es de la Ryder (formatos, partidos): un stroke play tiene
      // sus franjas en la ficha, y sus partidas llegan con la PR 6 (FE #824)
      cuando: !esStrokePlay && competition.status !== 'DRAFT' && competition.status !== 'CANCELLED',
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
      onClick: irALaClasificacion,
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

  return { accionPrincipal, accionesDeGestion, accionesDestructivas };
};
