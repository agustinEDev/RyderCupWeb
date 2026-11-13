/**
 * Las reglas puras de la ficha de una competición (`pages/CompetitionDetail`):
 * de dónde se vuelve, qué se enseña y con qué texto. Salieron de la página al
 * partirla en piezas (fase 5 del plan de calidad); el comportamiento es el de
 * antes, línea a línea.
 */
import { categoriasQueSalen, salenDeLosInscritos } from '../domain/services/CategoriasQueSalen';
import { fechaDeApertura } from '../domain/services/aperturaDeInscripciones';
import { CompetitionStatus } from '../domain/value_objects/CompetitionStatus';
import { siguientePasoDeLaCompeticion } from './siguientePasoDeLaCompeticion';

// «Volver» lleva a donde se vino: explorar, las invitaciones (FE #682) o, por
// defecto, las competiciones propias
const VUELTAS = {
  browse: { to: '/browse-competitions', clave: 'detail.backToBrowse' },
  invitations: { to: '/player/invitations', clave: 'detail.backToInvitations' },
};
const VUELTA_POR_DEFECTO = { to: '/competitions', clave: 'detail.backToCompetitions' };

export const vueltaDeLaFicha = (origen) =>
  Object.hasOwn(VUELTAS, origen ?? '') ? VUELTAS[origen] : VUELTA_POR_DEFECTO;

// Antes de empezar se puede quitar a un inscrito (release social 2)
export const SE_PUEDE_QUITAR = new Set(['DRAFT', 'ACTIVE', 'CLOSED']);

// Sin franjas: el mismo array siempre
const SIN_FRANJAS = [];

// «sáb 3 mar»: el día de una franja, para saber cuál de las de esa hora
export const diaCortoDeLaFicha = (fecha, idioma) => {
  const d = new Date(`${fecha}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(idioma, { weekday: 'short', day: 'numeric', month: 'short' });
};

// Por qué no se pudo apuntar, por su código (release social 3, 28 oct 2026): las
// de la franja releen la agenda, que estaba vieja
export const MOTIVOS_PARA_NO_APUNTARSE = {
  TEE_WINDOW_FULL: 'detail.errors.teeWindowFull',
  TEE_WINDOW_HAS_ROOM: 'detail.errors.teeWindowHasRoom',
  TEE_WINDOW_REQUIRED: 'detail.errors.teeWindowRequired',
  TEE_WINDOW_NOT_FOUND: 'detail.errors.teeWindowNotFound',
  DRAFT_IN_PROGRESS: 'detail.errors.draftInProgress',
};

// Por qué no se formaron los equipos al cerrar (29 oct 2026)
const MOTIVOS_PARA_NO_FORMAR = {
  TEAMS_FORMED: 'detail.errors.teamsFormedOrganizer',
  DRAFT_IN_PROGRESS: 'detail.errors.waitForDraft',
};

// Si ya los había, la ficha lo apunta: con equipos no se ofrece cambiar
// capitanes ni pedir plaza (code-review)
export const yaLosHabia = (error, setCompetition) => {
  if (error?.errorCode === 'TEAMS_FORMED') setCompetition((prev) => ({ ...prev, teamsAssigned: true }));
};

export const porQueNoSeFormaron = (t, error) => {
  const motivo = MOTIVOS_PARA_NO_FORMAR[error?.errorCode];
  return motivo ? t(motivo) : error?.message || t('detail.errors.teamAssignmentFailed');
};

// Por qué no se pudo quitar, por el código del servidor
export const MOTIVOS_PARA_NO_QUITAR = {
  PLAYER_HAS_MATCHES: 'detail.errors.removePlayerHasMatches',
  DRAFT_IN_PROGRESS: 'detail.errors.removeDraftInProgress',
  REMOVAL_NOT_ALLOWED: 'detail.errors.removeNotAllowed',
  CANNOT_REMOVE_ORGANIZER: 'detail.errors.removeOrganizer',
};

// Con el hándicap ya fijado (stroke play cerrado), es ese el que se enseña
export const conFijado = (esStrokePlay, e) => esStrokePlay && e.fixedHandicap != null;

/**
 * Los aprobados en el orden de la lista. Un stroke play cerrado: por hándicap
 * fijado, que es también el orden de las categorías (salen de él) (FE #824,
 * PR 5). Los que no lo tienen, detrás: una sola regla, para que el orden no
 * dependa de con quién se compara (/code-review). Si no, por equipo y luego
 * por hándicap.
 */
export const ordenarAprobados = (aprobados, esStrokePlay) =>
  [...aprobados].sort((a, b) => {
    if (conFijado(esStrokePlay, a) || conFijado(esStrokePlay, b)) {
      if (!conFijado(esStrokePlay, b)) return -1;
      if (!conFijado(esStrokePlay, a)) return 1;
      return a.fixedHandicap - b.fixedHandicap;
    }
    // Sort by team first, then by handicap
    if (a.team && b.team && a.team !== b.team) {
      return a.team.localeCompare(b.team);
    }
    return (a.userHandicap || 999) - (b.userHandicap || 999);
  });

// El texto del modal de borrar: dice quién pierde su plaza (FE #667)
export const textoDelBorrado = (t, { inscripcionesSinCargar, estoyInscrito, otrosInscritos }) =>
  inscripcionesSinCargar
    ? t('detail.deleteModal.unknownOthers')
    : estoyInscrito
      ? otrosInscritos === 0
        ? t('detail.deleteModal.nobodyElse')
        : t('detail.deleteModal.othersLosePlace', { count: otrosInscritos })
      // Quien borra no está dentro (un admin): «más» no encaja (FE #728)
      : otrosInscritos === 0
        ? t('detail.deleteModal.nobodyEnrolled')
        : t('detail.deleteModal.playersLosePlace', { count: otrosInscritos });

// El equipo de cada uno sale del reparto que leyó la agenda (#710)
export const equipoDe = (reparto, competition, userId) => {
  if (reparto?.teamAPlayerIds?.includes(userId)) return competition.team1Name;
  if (reparto?.teamBPlayerIds?.includes(userId)) return competition.team2Name;
  return null;
};

// Capitanes y subcapitanes: su insignia ya dice el equipo
export const esCapitan = (captains, userId) =>
  Boolean(userId) &&
  ['teamA', 'teamB', 'viceTeamA', 'viceTeamB'].some((papel) => captains?.[papel] === userId);

/**
 * Qué se dice de las categorías en los ajustes. Lo que se pidió frente a lo
 * que salió al cerrar (QA del 11 oct 2026): «3 categorías iguales, repartidas:
 * 14,0» eran 2, y con una sola el jugador seguía viendo los límites pedidos.
 */
export const textoDeCategorias = (t, ajustes, { menosDeLasPedidas, salieron, unDecimal }) => {
  const limitesEnTexto = () => ajustes.categoryLimits.map(unDecimal).join(' · ');
  if (menosDeLasPedidas && menosDeLasPedidas.salen > 1) {
    // Los de «iguales» son los repartidos; los escritos a mano no dicen cuáles quedaron
    const conLimites = ajustes.categoryCount != null && ajustes.categoryLimits.length > 0;
    return t(conLimites ? 'detail.settings.categoriesCameOutWithLimits' : 'detail.settings.categoriesCameOut', {
      count: menosDeLasPedidas.pedidas,
      salen: menosDeLasPedidas.salen,
      limites: limitesEnTexto(),
    });
  }
  if (salieron === 1) return t('detail.settings.noCategories');
  if (ajustes.categoryCount != null) {
    return t(
      // Ya repartidas (desde el cierre), no «se reparten al cerrar» (revisor)
      ajustes.categoryLimits.length > 0 ? 'detail.settings.equalCategoriesSplit' : 'detail.settings.equalCategories',
      { count: ajustes.categoryCount, limites: limitesEnTexto() }
    );
  }
  return ajustes.categoryLimits.length > 0
    ? t('detail.settings.categoryLimits', { limites: limitesEnTexto() })
    : t('detail.settings.noCategories');
};

/**
 * Lo que se lee antes de tener la ficha: con `competition` aún sin cargar,
 * todo sale vacío. Salieron menos categorías de las pedidas (FE #824, PR 8,
 * caso 9): solo lo lee el organizador, en la ficha mientras no empiece y en un
 * aviso al cerrar. Y un Stableford o un Medal en juego o acabado tiene su
 * general, en su página, y la ficha pliega lo que ya no se mira (14 oct 2026).
 */
export const avisoYClasificacion = (t, competition, approvedEnrollments) => {
  const avisoDeCategorias =
    competition?.strokePlay && competition.hasTeams === false
      ? categoriasQueSalen(competition.strokePlay, approvedEnrollments.map((e) => e.category ?? null))
      : null;
  const textoDelAvisoDeCategorias = avisoDeCategorias
    ? t(`detail.fewerCategories.${avisoDeCategorias.motivo}`, { ...avisoDeCategorias, count: avisoDeCategorias.salen })
    : null;
  const conClasificacion =
    competition?.hasTeams === false && ['IN_PROGRESS', 'COMPLETED'].includes(competition?.status);
  return { textoDelAvisoDeCategorias, conClasificacion };
};

/**
 * Todo lo que la ficha deriva de la competición, la sesión y las listas, una
 * vez cargada. Sin estado: cada render lo vuelve a calcular, como antes.
 */
export const derivarLaFicha = ({
  t,
  idioma,
  competition,
  user,
  enrollments,
  approvedEnrollments,
  hasCreatorRole,
  isAdmin,
  inscripcionesSinCargar,
  agendaLeida,
  franjasDeLaAgenda,
}) => {
  // User is considered creator if they created the competition OR have CREATOR/ADMIN role
  const isCreator = competition.creatorId === user.id;
  const canManage = isCreator || hasCreatorRole || isAdmin;
  // Cómo se repartieron los equipos DE VERDAD; sin reparto, el configurado
  // En estilo Ryder el configurado no dice nada —será draft o a mano, al
  // nombrar capitanes—, y salía «Manual» (#710): hasta que se hace, pendiente
  // Solo una Ryder tiene equipos y reparto, en su pieza: a un Stableford no se
  // le enseñan filas de lo que no tiene (FE #791)
  const conEquipos = competition.hasTeams;
  // Un Stableford o un Medal (FE #824). Sin el dato, una Ryder: es lo que eran
  // todas, igual que una competición sin tipo
  const esStrokePlay = competition.hasTeams === false;
  const repartoAMostrar =
    competition.actualTeamAssignment ??
    (competition.setupMode === 'RYDER_CUP' ? 'PENDING' : competition.teamAssignment);
  // La configuración se corrige mientras haya inscripciones abiertas (BE #323):
  // quien invita antes de poner el campo de golf tiene que poder ponerlo después
  const canEdit = canManage && new CompetitionStatus(competition.status).allowsModifications();
  // Quién puede y cuándo lo decide el backend con la misma regla que el borrado
  // (RyderCupAM#347): estado, calendario y rol. Copiar aquí la lista de estados
  // ofrecería el botón en una cancelada ya jugada, donde siempre falla (FE #667)
  const canDelete = competition.canDelete === true;
  // Los que perderían su plaza, sin contar a quien borra: el creador está
  // inscrito desde que la crea, y contarlo inflaría el aviso
  const otrosInscritos = approvedEnrollments.filter((e) => e.userId !== user.id).length;
  const estoyInscrito = approvedEnrollments.some((e) => e.userId === user.id);
  // Las acciones de la ficha: UNA principal —la que toca ahora— y el resto en
  // un menú. Antes eran hasta siete botones del mismo peso en seis colores y
  // el que de verdad tocaba se perdía entre los demás (FE #705)
  const paso = siguientePasoDeLaCompeticion(competition, {
    puedeGestionar: canManage,
    // Sin la lista no se sabe cuántos hay: se sugiere como antes
    inscritos: inscripcionesSinCargar ? undefined : approvedEnrollments.length,
  });

  // En un stroke play el personalizado se cambia hasta cerrar: al cerrar se fija
  // (el servidor lo rechaza después). En una Ryder, hasta iniciar
  const canEditHandicap =
    canManage &&
    (esStrokePlay ? ['DRAFT', 'ACTIVE'] : ['DRAFT', 'ACTIVE', 'CLOSED']).includes(competition.status);
  // Un hándicap con un decimal en el idioma de quien mira: «12,3» / «12.3»
  const unDecimal = (n) => n.toLocaleString(idioma, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  // Check if competition has reached max players
  // Quien gestiona tiene la lista entera. Un jugador, desde la release social 2,
  // solo a sus amigos hasta que se publica: cuenta lo que dice el servidor
  // Un solo total para todo (cabecera, completa, agenda): nunca menos de las
  // filas que ve, por si el número aún no está al día (/code-review)
  const approvedCount = canManage && enrollments.length > 0
    ? approvedEnrollments.length
    : Math.max(competition.enrolledCount || 0, approvedEnrollments.length);
  // Qué ve de los inscritos lo dice el servidor, no se adivina comparando
  // la lista con el número (/code-review): sus amigos, o nadie (una privada
  // en la que no está)
  const soloVeASusAmigos = !canManage && competition.enrolledVisibility === 'FRIENDS';
  const noVeANadie = !canManage && competition.enrolledVisibility === 'NONE';
  const listaAMedias = soloVeASusAmigos || noVeANadie;
  // Con la lista a medias no se sabe qué categorías salieron: se cuentan solo
  // con la entera, y si no, se dice lo pedido (revisor de la release social 2)
  const categoriasVistas = listaAMedias ? [] : approvedEnrollments.map((e) => e.category ?? null);
  // Con una sola categoría no se nombra: «1.ª» en todos no dice nada (pasada, FE #824)
  const hayVariasCategorias = salenDeLosInscritos(categoriasVistas) > 1;
  const categoriasAsignadas = categoriasVistas;
  const salieron = salenDeLosInscritos(categoriasAsignadas);
  const menosDeLasPedidas = esStrokePlay && competition.strokePlay ? categoriasQueSalen(competition.strokePlay, categoriasAsignadas) : null;
  const textoDeCategoriasDe = (ajustes) => textoDeCategorias(t, ajustes, { menosDeLasPedidas, salieron, unDecimal });

  // Una programada es un borrador con días de antelación (RyderCupAM#332). En
  // cuanto abre deja de ser borrador, así que la fecha solo se enseña mientras
  // espera: una vez abierta ya no dice nada (FE #678)
  const aperturaProgramada =
    competition.status === 'DRAFT'
      ? fechaDeApertura(competition.startDate, competition.enrollmentOpensDaysBefore)
      : null;
  const fechaDeAperturaLegible = aperturaProgramada
    ? new Intl.DateTimeFormat(idioma, { day: 'numeric', month: 'long' }).format(
        aperturaProgramada
      )
    : null;

  const isFull = competition.maxPlayers && approvedCount >= competition.maxPlayers;

  // Check for user enrollment from two sources:
  // 1. From enrollments list (when loaded from detail page)
  // 2. From competition.enrollment_status (mapped from backend's user_enrollment_status)
  const userEnrollment = enrollments.find((e) => e.userId === user.id);
  const hasEnrollment = userEnrollment || competition.enrollment_status;
  // Con franjas el cupo es de sus plazas: el máximo no quita el botón
  // (release social 3, revisor)
  const rondasLeidas = agendaLeida?.rounds ?? [];
  const conFranjas = esStrokePlay && rondasLeidas.some((r) => r.teeSheet);
  // Sin la agenda aún, en un stroke play no se sabe si hay franjas: no se quita
  const bloqueaElMaximo = isFull && !(esStrokePlay && (agendaLeida == null || conFranjas));
  // Quien solo espera: sin plaza en ninguna franja y con su puesto en una espera
  // Su puesto como en las franjas: el del servidor o, si no viene, el de la lista
  const miEspera =
    esStrokePlay && userEnrollment?.status === 'APPROVED'
      ? rondasLeidas.find(
          (r) => r.teeSheet?.myWaitingPosition || r.teeSheet?.waitingIds?.includes(user.id)
        )
      : null;
  const puestoEnEspera = miEspera
    ? (miEspera.teeSheet.myWaitingPosition ?? miEspera.teeSheet.waitingIds.indexOf(user.id) + 1)
    : null;
  const soloEspero =
    miEspera != null && !rondasLeidas.some((r) => r.teeSheet?.playerIds?.includes(user.id));
  const franjasParaApuntarse = esStrokePlay ? franjasDeLaAgenda : SIN_FRANJAS;

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

  return {
    isCreator,
    canManage,
    conEquipos,
    esStrokePlay,
    repartoAMostrar,
    canEdit,
    canDelete,
    otrosInscritos,
    estoyInscrito,
    paso,
    canEditHandicap,
    approvedCount,
    noVeANadie,
    listaAMedias,
    hayVariasCategorias,
    salieron,
    textoDeCategorias: textoDeCategoriasDe,
    fechaDeAperturaLegible,
    isFull,
    userEnrollment,
    hasEnrollment,
    bloqueaElMaximo,
    miEspera,
    puestoEnEspera,
    soloEspero,
    franjasParaApuntarse,
    puedeElegirNombre,
    nombreLegal,
    usaSuAlias,
  };
};
