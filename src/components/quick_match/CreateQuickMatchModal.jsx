import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import HandicapInputPanel from './HandicapInputPanel';
import CourseStep from './CourseStep';
import ParticipantsStep from './ParticipantsStep';
import ScorersStep from './ScorersStep';
import SummaryStep from './SummaryStep';
import CabeceraDelAsistente from './CabeceraDelAsistente';
import AvisosDelAsistente from './AvisosDelAsistente';
import { useAvisoDelAsistente } from './useAvisoDelAsistente';
import { useBarrasDelCampo } from './useBarrasDelCampo';
import { useJugadoresDelBorrador } from './useJugadoresDelBorrador';
import { useAnotadoresDelBorrador } from './useAnotadoresDelBorrador';
import { useEnvioDelBorrador } from './useEnvioDelBorrador';
import { useAjustesDelBorrador } from './useAjustesDelBorrador';
import { peticionDelBorrador } from '../../utils/peticionDelBorrador';

// Vive con la carga de tus partidas (`useBarrasDelCampo`); se sigue
// exportando desde aquí, que es donde se buscaba

/**
 * El asistente de partida rápida (FE #848): un BORRADOR local hasta «Confirmar
 * e iniciar», que crea la partida, la inicia y fija los hándicaps en una sola
 * petición. Crearla en el paso 1 dejaba una «Pendiente» a quien salía a medias.
 *
 * Los jugadores del borrador tienen la forma de los de una partida (para que
 * los pasos los pinten igual); `participantId` es el UserId de un registrado,
 * y uno local para un invitado. `profileHandicap` es el del perfil: si el
 * hándicap no se cambió, no viaja como override.
 *
 * Con `borrador` (repetir una partida, FE #1021) arranca relleno, en el paso
 * que diga, y enseña los avisos de lo que no se pudo copiar.
 *
 * Cada parte vive en su hook: el aviso (`useAvisoDelAsistente`), las barras
 * del campo (`useBarrasDelCampo`), los jugadores (`useJugadoresDelBorrador`),
 * los anotadores (`useAnotadoresDelBorrador`) y el envío
 * (`useEnvioDelBorrador`), igual que los ajustes del paso 1
 * (`useAjustesDelBorrador`). Aquí quedan el paso y lo que los une.
 */
const CreateQuickMatchModal = ({
  onClose,
  onStarted,
  currentUser,
  borrador = null,
}) => {
  const { t } = useTranslation('quickMatch');
  const { t: tComun } = useTranslation('common');
  const { t: tCampos } = useTranslation('golfCourses');
  const navigate = useNavigate();

  const copia = borrador?.inicial ?? null;
  const [step, setStep] = useState(borrador?.paso ?? 1);
  const ajustes = useAjustesDelBorrador(copia);
  const {
    mode,
    matchFormat,
    scoringFormat,
    selectedCourse,
    isFreePlay,
    capacity,
    isTeamFormat,
    isFoursomes,
  } = ajustes;
  // Lo que no se pudo copiar al repetir (FE #1021), hasta cerrar el asistente
  const avisosDelBorrador = borrador?.avisos ?? [];
  // Cada uno, solo en el paso donde se arregla: fuera de él ya no dice nada
  // útil, y seguía a la vista con lo descrito ya arreglado (`/code-review`)
  const avisosAlRepetir = avisosDelBorrador.filter(
    (aviso) => aviso.paso === step,
  );

  const { error, setError, quitaElAviso, ponElAviso, refDelAviso } =
    useAvisoDelAsistente();
  const {
    courseTees,
    courseFromRfeg,
    teesLoading,
    creatorTeeKey,
    setCreatorTeeKey,
    eligeCampo,
    barraDeAmigo,
  } = useBarrasDelCampo({
    selectedCourse,
    setSelectedCourse: ajustes.setSelectedCourse,
    copia,
    avisosDelBorrador,
    currentUser,
    error,
    setError,
  });

  const jugadores = useJugadoresDelBorrador({
    copia,
    currentUser,
    step,
    setStep,
    selectedCourse,
    mode,
    matchFormat,
    isTeamFormat,
    capacity,
    courseTees,
    teesLoading,
    creatorTeeKey,
    setError,
  });
  const { participants, registeredParticipants, guestForm } = jugadores;
  const anotadores = useAnotadoresDelBorrador({
    copia,
    currentUser,
    participants,
    registeredParticipants,
    mode,
    matchFormat,
    isFoursomes,
    setStep,
    setError,
  });
  const { isProcessing, handleStart } = useEnvioDelBorrador({
    armaLaPeticion: () =>
      peticionDelBorrador({
        participants,
        currentUserId: currentUser.id,
        creatorTeeKey,
        selectedCourse,
        isFreePlay,
        matchFormat,
        scoringFormat,
        matchName: ajustes.matchName,
        nombreSugerido: ajustes.nombreSugerido,
        allowancePercentage: ajustes.allowancePercentage,
        playMode: ajustes.playMode,
        scorerIds: anotadores.scorerIds,
      }),
    onStarted,
    t,
    ponElAviso,
  });

  // No hay nada en el servidor hasta confirmar: cerrar es solo cerrar
  const handleClose = onClose;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isProcessing) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isProcessing, handleClose]);

  const handleRequestNewCourse = () => {
    handleClose();
    navigate('/creator/golf-courses/new');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-match-modal-title"
      >
        <CabeceraDelAsistente
          titulo={borrador ? t('create.repetir.titulo') : t('create.title')}
          pasoActual={step}
          t={t}
          etiquetaCerrar={tComun('close')}
          onClose={handleClose}
          isProcessing={isProcessing}
        />

        <AvisosDelAsistente
          error={error}
          refDelAviso={refDelAviso}
          avisosAlRepetir={avisosAlRepetir}
          t={t}
          tComun={tComun}
          tCampos={tCampos}
        />

        {step === 1 && (
          <CourseStep
            t={t}
            matchName={
              ajustes.nombreAMano ? ajustes.matchName : ajustes.nombreSugerido
            }
            nombreAMano={ajustes.nombreAMano && ajustes.matchName.trim() !== ''}
            onMatchNameChange={ajustes.cambiaElNombre}
            mode={mode}
            onModeChange={ajustes.handleModeChange}
            isFreePlay={isFreePlay}
            scoringFormat={scoringFormat}
            onScoringFormatChange={ajustes.setScoringFormat}
            matchFormat={matchFormat}
            onMatchFormatChange={ajustes.setMatchFormat}
            countryCode={currentUser?.country_code}
            selectedCourse={selectedCourse}
            onCourseSelect={eligeCampo}
            onRequestNewCourse={handleRequestNewCourse}
            courseTees={courseTees}
            courseFromRfeg={courseFromRfeg}
            creatorTeeKey={creatorTeeKey}
            generoDeQuienCrea={currentUser?.gender ?? null}
            allowanceAMano={
              ajustes.allowancePercentage !== ajustes.defaultAllowance
            }
            porcentajeCopiado={ajustes.porcentajeCopiado}
            onCreatorTeeKeyChange={(clave) => {
              setCreatorTeeKey(clave);
              quitaElAviso('create.course.errorTeeRequired');
            }}
            allowancePercentage={ajustes.allowancePercentage}
            onAllowanceChange={ajustes.cambiaElPorcentaje}
            playMode={ajustes.playMode}
            onPlayModeChange={ajustes.setPlayMode}
            isProcessing={isProcessing}
            teesLoading={teesLoading}
            onClose={handleClose}
            onNext={jugadores.handleCourseNext}
          />
        )}

        {step === 2 && (
          <ParticipantsStep
            t={t}
            currentUser={currentUser}
            participants={participants}
            capacity={capacity}
            rosterFull={jugadores.rosterFull}
            isTeamFormat={isTeamFormat}
            isFreePlay={isFreePlay}
            selectedTeam={jugadores.selectedTeam}
            onSelectedTeamChange={(team) => {
              jugadores.setSelectedTeam(team);
              setError(null);
            }}
            participantTab={jugadores.participantTab}
            onParticipantTabChange={jugadores.setParticipantTab}
            availableFriends={jugadores.availableFriends}
            courseTees={courseTees}
            barraDeAmigo={barraDeAmigo}
            onAddFriend={jugadores.handleAddFriend}
            guestForm={guestForm}
            onGuestFirstNameChange={jugadores.handleGuestFirstNameChange}
            onGuestLastNameChange={jugadores.handleGuestLastNameChange}
            onAddGuest={jugadores.handleAddGuest}
            onOpenGuestHandicapPanel={() =>
              jugadores.setShowGuestHandicapPanel(true)
            }
            guestTeeKey={jugadores.guestTeeKey}
            onGuestTeeKeyChange={(clave) => {
              jugadores.setGuestTeeKey(clave);
              quitaElAviso('create.participants.errorTeeRequired');
            }}
            onRemoveParticipant={jugadores.handleRemoveParticipant}
            isProcessing={isProcessing}
            onBack={jugadores.handleBackToCourse}
            onClose={handleClose}
            onNext={anotadores.goToScorers}
          />
        )}

        {step === 3 && (
          <ScorersStep
            t={t}
            registeredParticipants={registeredParticipants}
            currentUser={currentUser}
            scorerIds={anotadores.scorerIds}
            onToggleScorer={anotadores.toggleScorer}
            isFoursomes={isFoursomes}
            rivalCanScore={anotadores.rivalCanScore()}
            partnerCanScore={anotadores.partnerCanScore()}
            onChooseScoringSides={anotadores.eligeParejas}
            isProcessing={isProcessing}
            onBack={anotadores.handleBackToParticipants}
            onClose={handleClose}
            onNext={anotadores.goToSummary}
          />
        )}

        {step === 4 && (
          <SummaryStep
            t={t}
            selectedCourse={selectedCourse}
            isFreePlay={isFreePlay}
            scoringFormat={scoringFormat}
            matchFormat={matchFormat}
            allowancePercentage={ajustes.allowancePercentage}
            playMode={ajustes.playMode}
            courseTees={courseTees}
            participants={participants}
            currentUser={currentUser}
            isTeamFormat={isTeamFormat}
            onEditHandicap={jugadores.setEditingHandicapParticipant}
            isProcessing={isProcessing}
            registeredParticipants={registeredParticipants}
            scorerIds={anotadores.scorerIds}
            onBack={anotadores.handleBackToScorers}
            onClose={handleClose}
            onStart={handleStart}
          />
        )}
      </div>

      {jugadores.showGuestHandicapPanel && (
        <HandicapInputPanel
          label={t('create.participants.guestHandicap')}
          value={guestForm.handicap ? Number(guestForm.handicap) : null}
          onClose={() => jugadores.setShowGuestHandicapPanel(false)}
          onConfirm={jugadores.handleConfirmGuestHandicap}
        />
      )}

      {jugadores.editingHandicapParticipant && (
        <HandicapInputPanel
          label={jugadores.editingHandicapParticipant.name}
          value={jugadores.editingHandicapParticipant.handicap}
          onClose={() => jugadores.setEditingHandicapParticipant(null)}
          onConfirm={jugadores.handleConfirmParticipantHandicap}
        />
      )}
    </div>
  );
};

export default CreateQuickMatchModal;
