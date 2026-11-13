import { useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import HeaderAuth from '../components/layout/HeaderAuth';
import { useAuth } from '../hooks/useAuth';
import { useUserRoles } from '../hooks/useUserRoles';
import { useGeneroParaApuntarse } from '../hooks/useGeneroParaApuntarse';
import { useFichaDeLaCompeticion } from '../hooks/useFichaDeLaCompeticion';
import { useAgendaDeLaFicha } from '../hooks/useAgendaDeLaFicha';
import { useSePuedeTerminarLaCompeticion } from '../hooks/useSePuedeTerminarLaCompeticion';
import { useReleerHandicaps } from '../hooks/useReleerHandicaps';
import CompetitionGolfCoursesSection from '../components/competition/CompetitionGolfCoursesSection';
import EnrollmentRequestModal from '../components/enrollment/EnrollmentRequestModal';
import InvitacionEnLaFicha from '../components/invitation/InvitacionEnLaFicha';
import FullScreenLoader from '../components/ui/FullScreenLoader';
import DialogosDeLaFicha from '../components/competition/detail/DialogosDeLaFicha';
import ResumenDeLaCompeticion from '../components/competition/detail/ResumenDeLaCompeticion';
import GestionDeLaFicha from '../components/competition/detail/GestionDeLaFicha';
import AccesosDelJugador from '../components/competition/detail/AccesosDelJugador';
import MiInscripcion from '../components/competition/detail/MiInscripcion';
import AjustesDeLaCompeticion from '../components/competition/detail/AjustesDeLaCompeticion';
import PanelesDelOrganizador from '../components/competition/detail/PanelesDelOrganizador';
import AgendaDeLaFicha from '../components/competition/detail/AgendaDeLaFicha';
import InscritosAprobados from '../components/competition/detail/InscritosAprobados';
import SolicitudesDeInscripcion from '../components/competition/detail/SolicitudesDeInscripcion';
import { crearCambiosDeEstado } from '../components/competition/detail/cambiosDeEstado';
import { crearAccionesDeInscripcion } from '../components/competition/detail/inscripcionesDeLaFicha';
import { crearEdicionDeHandicaps } from '../components/competition/detail/edicionDeHandicaps';
import { accionesDelOrganizador } from '../components/competition/detail/accionesDelOrganizador';
import { avisoYClasificacion, derivarLaFicha, vueltaDeLaFicha } from '../utils/fichaDeLaCompeticion';
import { faltaElHandicap } from '../utils/datosQueFaltanSinConexion';
import { PANTALLA_MENOS_BARRA_INFERIOR } from '../utils/barraInferior';
import { hayHistorialPropio } from '../hooks/useGoBack';

/**
 * La ficha de una competición. Esta página orquesta: lee la ficha y sus
 * listas (hooks), deriva lo que se enseña (`utils/fichaDeLaCompeticion`), crea
 * los manejadores con lo de cada render (`components/competition/detail`) y
 * pinta las secciones, que viven en esa misma carpeta.
 */
const CompetitionDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { t, i18n } = useTranslation('competitions');
  const { t: tComun } = useTranslation('common');
  const { user, loading: isLoadingUser, sinConfirmar } = useAuth();
  // El género para apuntarse, solo a quien le falta (#710)
  const generoParaApuntarse = useGeneroParaApuntarse();
  const { isAdmin, isCreator: hasCreatorRole, isLoading: isLoadingRoles } = useUserRoles(id, user?.id);
  const [isProcessing, setIsProcessing] = useState(false);
  // Borrar pide confirmación en un modal que dice quién pierde su plaza (FE #667)
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  // Lo que espera un «sí» en el modal de la app, en lugar de `window.confirm`,
  // el diálogo nativo del navegador (FE #730)
  const [pregunta, setPregunta] = useState(null);
  // La inscripción que se está quitando (release social 2): su botón, desactivado
  const [quitandoId, setQuitandoId] = useState(null);
  // Mientras borra, el modal desactiva sus botones: eso ya impide un segundo DELETE
  const [borrando, setBorrando] = useState(false);
  // Nombrar a los capitanes es lo que cierra las inscripciones (FE #692)
  const [nombrandoCapitanes, setNombrandoCapitanes] = useState(false);
  const [guardandoCapitanes, setGuardandoCapitanes] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  // Por qué no se pudo pedir plaza: se lee en el modal, que sigue abierto (#710)
  const [errorAlApuntarse, setErrorAlApuntarse] = useState(null);
  const [editingHandicapId, setEditingHandicapId] = useState(null);
  // Los que el servidor dijo que no tienen hándicap al cerrar (FE #824, PR 5)
  const [sinHandicap, setSinHandicap] = useState(() => new Set());
  const [handicapInput, setHandicapInput] = useState('');
  const [savingHandicapId, setSavingHandicapId] = useState(null);
  const [revertingHandicapId, setRevertingHandicapId] = useState(null);
  const [savingNamePreference, setSavingNamePreference] = useState(false);
  // La agenda y la sección de campos cargan cada una los suyos; esto es el aviso
  // de que cambiaron, para que la agenda los vuelva a leer (FE #715)
  const [versionCampos, setVersionCampos] = useState(0);
  const avisarDeLosCampos = useCallback(() => setVersionCampos((v) => v + 1), []);
  const { agendaLeida, agendaFallo, recibirAgenda, franjasDeLaAgenda } = useAgendaDeLaFicha();
  // Para releer las franjas cuando el servidor dice que faltan jugadores (FE #824)
  const [versionFranjas, setVersionFranjas] = useState(0);
  const [irASinFranja, setIrASinFranja] = useState(0);
  // Mientras se releen la ficha y las inscripciones tras cerrar (PR 8)
  const [releyendoTrasCerrar, setReleyendoTrasCerrar] = useState(false);
  // Sube con cada cambio en las partidas: se vuelve a mirar si se puede
  // terminar el torneo (todas las franjas cerradas)
  const [versionDePartidas, setVersionDePartidas] = useState(0);
  const numeroDeSesiones = agendaLeida?.rounds?.length ?? null;

  // Determine where user came from (browse or my competitions)
  const origen = location.state?.from;
  const vuelta = vueltaDeLaFicha(origen);
  const backLink = vuelta.to;
  const backText = t(vuelta.clave);
  // Desde Torneos, volver es volver atrás de verdad, como el atrás del sistema:
  // así Torneos queda donde estaba (FE #647, fase 3; Agustín, 2 nov 2026). Sin
  // nada detrás —se entró por un enlace—, a Torneos como siempre
  const vuelveAtras = origen === 'my-competitions' && hayHistorialPropio(location);
  const volver = () => (vuelveAtras ? navigate(-1) : navigate(backLink));

  const userId = user?.id;
  const {
    competition,
    setCompetition,
    enrollments,
    setEnrollments,
    isLoadingCompetition,
    inscripcionesSinCargar,
    loadCompetition,
    idActual,
    lecturasDeLaFicha,
    lecturasDeInscripciones,
  } = useFichaDeLaCompeticion({ id, userId, t, navigate });

  const isLoading = isLoadingUser || isLoadingCompetition || isLoadingRoles;

  const approvedEnrollments = useMemo(
    () => enrollments.filter(e => e.status === 'APPROVED'),
    [enrollments]
  );

  const { leeSiTerminar, claveDeFranjas, cierre } = useSePuedeTerminarLaCompeticion({
    competition,
    hasCreatorRole,
    isAdmin,
    userId,
    agendaLeida,
    versionDePartidas,
  });
  const releerHandicaps = useReleerHandicaps({
    id,
    competition,
    setCompetition,
    setEnrollments,
    idActual,
    lecturasDeLaFicha,
    lecturasDeInscripciones,
  });

  if (isLoading) {
    return (
      <FullScreenLoader texto={t('detail.loadingCompetition')} />
    );
  }

  if (!user || !competition) {
    return null;
  }

  const { textoDelAvisoDeCategorias, conClasificacion } = avisoYClasificacion(t, competition, approvedEnrollments);
  const ficha = derivarLaFicha({
    t,
    idioma: i18n.language,
    competition,
    user,
    enrollments,
    approvedEnrollments,
    hasCreatorRole,
    isAdmin,
    inscripcionesSinCargar,
    agendaLeida,
    franjasDeLaAgenda,
  });
  const { isCreator, canManage, esStrokePlay, approvedCount, fechaDeAperturaLegible, isFull } = ficha;

  // Abre el modal y espera la respuesta: el flujo de cada acción no cambia.
  // Cada acción trae sus palabras —título, consecuencia y dos verbos—: con
  // «Cancelar» y «Confirmar» genéricos, quien quería cancelar la competición
  // pulsaba «Cancelar» y cerraba el modal sin hacer nada (FE #742)
  const preguntar = (accion, { destructiva = false, datos } = {}) =>
    new Promise((responder) => setPregunta({ accion, datos, destructiva, responder }));
  const contestar = (si) => {
    pregunta?.responder(si);
    setPregunta(null);
  };

  // Los manejadores, con lo de este render: como cuando vivían aquí mismo
  const contexto = {
    id, t, tComun, navigate, competition, setCompetition, enrollments, setEnrollments,
    approvedEnrollments, esStrokePlay, isFull, agendaLeida, idActual, lecturasDeLaFicha,
    lecturasDeInscripciones, loadCompetition, generoParaApuntarse, preguntar, handicapInput,
    setHandicapInput, setIsProcessing, setQuitandoId, setEditingHandicapId, setSinHandicap,
    setSavingHandicapId, setRevertingHandicapId, setVersionFranjas, setIrASinFranja,
    setReleyendoTrasCerrar, setGuardandoCapitanes, setNombrandoCapitanes, setBorrando,
    setConfirmandoBorrado, setErrorAlApuntarse, setShowEnrollModal, setSavingNamePreference,
  };
  const handicaps = crearEdicionDeHandicaps(contexto);
  const cambios = crearCambiosDeEstado({ ...contexto, handleStartEditHandicap: handicaps.handleStartEditHandicap });
  const inscripciones = crearAccionesDeInscripcion({ ...contexto, releerTrasQuitar: cambios.releerTrasQuitar });
  const { handleStatusChange } = cambios;

  // La de la Ryder o, en un Stableford o un Medal, su general: con 200
  // participantes no cabe en la ficha (14 oct 2026). Con lo que ya se sabe de
  // ella: la página no tiene que preguntarlo otra vez (/code-review)
  const irALaClasificacion = () =>
    navigate(`/competitions/${id}/leaderboard`, {
      state: {
        from: 'detail',
        ...(esStrokePlay && {
          competicion: { id: competition.id, hasTeams: false, name: competition.name, status: competition.status },
        }),
      },
    });

  const { accionPrincipal, accionesDeGestion, accionesDestructivas } = accionesDelOrganizador({
    ...ficha,
    t,
    id,
    navigate,
    competition,
    isProcessing,
    numeroDeSesiones,
    handleStatusChange,
    handleDelete: cambios.handleDelete,
    abrirCapitanes: () => setNombrandoCapitanes(true),
    irALaClasificacion,
  });

  return (
    <div className={`relative flex h-auto ${PANTALLA_MENOS_BARRA_INFERIOR} w-full flex-col bg-white`}>
      <div className="layout-container flex h-full grow flex-col">
        {/* El nombre del torneo solo se conoce en ejecucion: sustituye al
            titulo generico del mapa de rutas (FE #310).
            El destino tambien: el mapa lleva siempre a /competitions, pero esta
            pantalla sabe si se llego desde explorar, y esa vuelta es mejor. Sin
            pasarsela, ocultar el enlace de la pagina en movil perderia
            comportamiento en lugar de quitar ruido (FE #338) */}
        <HeaderAuth user={user} title={competition.name} backTo={backLink} alVolver={vuelveAtras ? volver : undefined} />

        <DialogosDeLaFicha
          t={t}
          pregunta={pregunta}
          contestar={contestar}
          confirmandoBorrado={confirmandoBorrado}
          inscripcionesSinCargar={inscripcionesSinCargar}
          estoyInscrito={ficha.estoyInscrito}
          otrosInscritos={ficha.otrosInscritos}
          confirmarBorrado={cambios.confirmarBorrado}
          alCancelarBorrado={() => setConfirmandoBorrado(false)}
          borrando={borrando}
          nombrandoCapitanes={nombrandoCapitanes}
          approvedEnrollments={approvedEnrollments}
          competition={competition}
          confirmarCapitanes={cambios.confirmarCapitanes}
          alCerrarCapitanes={() => setNombrandoCapitanes(false)}
          guardandoCapitanes={guardandoCapitanes}
        />

        <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            {/* Header */}
            <div
              className="p-4"
            >
              <button
                onClick={volver}
                className="hidden md:flex items-center gap-2 text-gray-600 hover:text-primary transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">{backText}</span>
              </button>

              <ResumenDeLaCompeticion
                competition={competition}
                t={t}
                i18n={i18n}
                isCreator={isCreator}
                canManage={canManage}
                approvedCount={approvedCount}
                fechaDeAperturaLegible={fechaDeAperturaLegible}
              />
            </div>

            {/* Mi invitación pendiente: aceptar o rechazar aquí mismo, sin pasar
                por «Mis invitaciones». Respondida, la ficha se relee (release
                social 2) */}
            <InvitacionEnLaFicha invitacion={competition.myPendingInvitation ?? null} alCambiar={loadCompetition} />

            {/* Action Buttons */}
            {canManage && (
              <GestionDeLaFicha
                accionPrincipal={accionPrincipal}
                accionesDeGestion={accionesDeGestion}
                accionesDestructivas={accionesDestructivas}
                competition={competition}
                fechaDeAperturaLegible={fechaDeAperturaLegible}
                t={t}
              />
            )}

            <AccesosDelJugador
              {...ficha}
              competition={competition}
              t={t}
              isProcessing={isProcessing}
              irALaClasificacion={irALaClasificacion}
              alVerCalendario={() => navigate(`/competitions/${id}/schedule`)}
              alPedirPlaza={() => {
                setErrorAlApuntarse(null);
                setShowEnrollModal(true);
              }}
            />

            {/* User Enrollment Status */}
            {ficha.hasEnrollment && (
              <MiInscripcion
                {...ficha}
                competition={competition}
                user={user}
                // El género, de la sesión: sin red la copia no lo guarda y la
                // etiqueta sale neutra (fase 3)
                generoDelUsuario={user?.gender}
                t={t}
                i18n={i18n}
                savingNamePreference={savingNamePreference}
                handleToggleNamePreference={inscripciones.handleToggleNamePreference}
              />
            )}

            {/* Competition Details */}
            <AjustesDeLaCompeticion {...ficha} competition={competition} t={t} conClasificacion={conClasificacion} />

            <PanelesDelOrganizador
              competition={competition}
              t={t}
              canManage={canManage}
              isProcessing={isProcessing}
              releerHandicaps={releerHandicaps}
              releyendoTrasCerrar={releyendoTrasCerrar}
              textoDelAvisoDeCategorias={textoDelAvisoDeCategorias}
              leeSiTerminar={leeSiTerminar}
              claveDeFranjas={claveDeFranjas}
              cierre={cierre}
              handleStatusChange={handleStatusChange}
            />

            <AgendaDeLaFicha
              {...ficha}
              competition={competition}
              user={user}
              genero={user.gender}
              t={t}
              approvedEnrollments={approvedEnrollments}
              versionFranjas={versionFranjas}
              versionCampos={versionCampos}
              recibirAgenda={recibirAgenda}
              irASinFranja={irASinFranja}
              setVersionDePartidas={setVersionDePartidas}
            />

            {/* Golf Courses Section */}
            <div>
              <CompetitionGolfCoursesSection
                competition={competition}
                canManage={canManage}
                onCamposCambiados={avisarDeLosCampos}
              />
            </div>

            {/* Approved Players Section - Visible to all authenticated users */}
            <InscritosAprobados
              t={t}
              i18n={i18n}
              canManage={canManage}
              conClasificacion={conClasificacion}
              approvedEnrollments={approvedEnrollments}
              approvedCount={approvedCount}
              listaAMedias={ficha.listaAMedias}
              noVeANadie={ficha.noVeANadie}
              esStrokePlay={esStrokePlay}
              competition={competition}
              reparto={agendaLeida?.teamAssignment}
              sinHandicap={sinHandicap}
              hayVariasCategorias={ficha.hayVariasCategorias}
              canEditHandicap={ficha.canEditHandicap}
              editingHandicapId={editingHandicapId}
              handicapInput={handicapInput}
              setHandicapInput={setHandicapInput}
              savingHandicapId={savingHandicapId}
              revertingHandicapId={revertingHandicapId}
              {...handicaps}
              quitandoId={quitandoId}
              handleQuitar={cambios.handleQuitar}
            />

            {/* Pending & Rejected Enrollments - Only visible to creator/admin */}
            {canManage && (
              <SolicitudesDeInscripcion
                competition={competition}
                enrollments={enrollments}
                t={t}
                i18n={i18n}
                isFull={isFull}
                handleApproveEnrollment={inscripciones.handleApproveEnrollment}
                handleRejectEnrollment={inscripciones.handleRejectEnrollment}
              />
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
        onConfirm={inscripciones.handleEnroll}
        isProcessing={isProcessing}
        pideGenero={generoParaApuntarse.falta}
        // Sin hándicap no se entra en un Stableford o un Medal (FE #824, PR 5). Sin red
        // no se sabe (la copia del dispositivo no lo guarda): no se avisa (fase 3)
        faltaHandicap={esStrokePlay && faltaElHandicap(user, sinConfirmar)}
        // Las franjas, para elegir en el mismo paso (release social 3)
        franjas={ficha.franjasParaApuntarse}
        // Sin la agenda leída no hay franjas que elegir: no se deja enviar;
        // leyéndose, se dice; si falló, se puede volver a leer (code-review)
        franjasCargando={esStrokePlay && agendaLeida == null && !agendaFallo}
        franjasSinCargar={esStrokePlay && agendaLeida == null && agendaFallo}
        onReintentar={() => setVersionFranjas((n) => n + 1)}
        // Al cambiar de franja, fuera el error de la anterior
        onElegir={() => setErrorAlApuntarse(null)}
      />
    </div>
  );
};

export default CompetitionDetail;
