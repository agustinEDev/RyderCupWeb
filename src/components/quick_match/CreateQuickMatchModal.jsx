import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { esFalloDeRed, mensajeDeError } from '../../utils/sinCobertura';
import { idAleatorio } from '../../utils/idAleatorio';
import customToast from '../../utils/toast';
import { nombreVisible } from '../../utils/nombreVisible';
import { X } from 'lucide-react';
import HandicapInputPanel from './HandicapInputPanel';
import CourseStep from './CourseStep';
import ParticipantsStep from './ParticipantsStep';
import ScorersStep from './ScorersStep';
import SummaryStep from './SummaryStep';
import {
  createAndStartQuickMatchUseCase,
  listFriendsUseCase,
  getGolfCourseUseCase,
} from '../../composition';
import {
  DEFAULT_ALLOWANCE_BY_MATCH_FORMAT,
  DEFAULT_FREE_PLAY_ALLOWANCE,
  FORMAT_CAPACITY,
  FREE_PLAY_CAPACITY,
  MAX_SCORERS,
  oppositeTeam,
  NO_TEE_KEY,
  TEAM_FORMATS,
  initialGuestForm,
  parseTeeKey,
  teeKey,
} from './createQuickMatchModalConstants';

const AMIGOS_POR_PAGINA = 100;

/** La lista de amigos entera, página a página. */
const leeTodosLosAmigos = async (userId) => {
  const amigos = [];
  for (let page = 1; ; page += 1) {
    const { friendships, totalCount } = await listFriendsUseCase.execute(userId, {
      limit: AMIGOS_POR_PAGINA,
      page,
    });
    amigos.push(...friendships);
    // Ya están todos; o una página vacía, por si el total no cuadra: sin
    // eso, un total mal contado pediría páginas para siempre
    if (amigos.length >= totalCount || friendships.length === 0) return amigos;
  }
};

// Por qué no se pudo empezar, por el código del servidor (FE #848): todo se
// comprueba al confirmar, así que el motivo se dice en el resumen
const MOTIVO_POR_CODIGO = {
  403: 'create.errors.notFriends',
  404: 'create.errors.notFound',
  409: 'create.errors.conflict',
  422: 'create.errors.invalid',
};

/**
 * El asistente de partida rápida (FE #848): un BORRADOR local hasta «Confirmar
 * e iniciar», que crea la partida, la inicia y fija los hándicaps en una sola
 * petición. Crearla en el paso 1 dejaba una «Pendiente» a quien salía a medias.
 *
 * Los jugadores del borrador tienen la forma de los de una partida (para que
 * los pasos los pinten igual); `participantId` es el UserId de un registrado,
 * y uno local para un invitado. `profileHandicap` es el del perfil: si el
 * hándicap no se cambió, no viaja como override.
 */
const CreateQuickMatchModal = ({ onClose, onStarted, currentUser }) => {
  const { t } = useTranslation('quickMatch');
  const { t: tComun } = useTranslation('common');
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [matchName, setMatchName] = useState('');
  const [mode, setMode] = useState('MATCH_PLAY');
  const [matchFormat, setMatchFormat] = useState('SINGLES');
  const [scoringFormat, setScoringFormat] = useState('STABLEFORD');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseTees, setCourseTees] = useState([]);
  const [teesLoading, setTeesLoading] = useState(false);
  // null while following the WHS default for the current format; a number once the user overrides it
  const [allowanceOverride, setAllowanceOverride] = useState(null);
  // Por defecto con hándicap: es como se juega normalmente, y el scratch es
  // la excepción que hay que pedir a propósito.
  const [playMode, setPlayMode] = useState('HANDICAP');
  const [creatorTeeKey, setCreatorTeeKey] = useState(NO_TEE_KEY);
  const [participants, setParticipants] = useState([]);
  // El id del último intento y lo que se mandó: reintentar LO MISMO tras un
  // fallo reusa el id —si la respuesta se perdió, el servidor devuelve la que
  // ya creó—; cualquier cambio en el borrador estrena uno
  const ultimoIntento = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  // El aviso va arriba y el botón que lo provoca, abajo: en un móvil se
  // pintaba fuera de la vista y parecía que no pasaba nada
  const avisoDeError = useRef(null);
  useEffect(() => {
    if (error) avisoDeError.current?.scrollIntoView?.({ block: 'nearest' });
  }, [error]);

  const [participantTab, setParticipantTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('A');
  const [guestTeeKey, setGuestTeeKey] = useState(NO_TEE_KEY);
  const [guestForm, setGuestForm] = useState(initialGuestForm);

  const [scorerIds, setScorerIds] = useState([]);
  // Which participant's handicap keypad is open (step 4 summary), or null when closed.
  const [editingHandicapParticipant, setEditingHandicapParticipant] = useState(null);
  // Whether the guest-form handicap keypad (step 2) is open.
  const [showGuestHandicapPanel, setShowGuestHandicapPanel] = useState(false);

  useEffect(() => {
    if (step === 2 && currentUser?.id) {
      // Todos, de 100 en 100 (el máximo del servidor): con los 20 de por
      // defecto, a quien tiene más amigos le faltaban en la lista
      leeTodosLosAmigos(currentUser.id)
        .then(setFriends)
        .catch(() => setFriends([]));
    }
  }, [step, currentUser?.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset tee/tees state on every course change (including to none), mirrors useQuickMatchScoring's course-fetch pattern
    setCreatorTeeKey(NO_TEE_KEY);
    if (!selectedCourse?.id) {
      setCourseTees([]);
      return;
    }
    let cancelled = false;
    setTeesLoading(true);
    getGolfCourseUseCase
      .execute(selectedCourse.id)
      .then((course) => {
        if (!cancelled) setCourseTees(course.tees || []);
      })
      .catch(() => {
        if (!cancelled) setCourseTees([]);
      })
      .finally(() => {
        if (!cancelled) setTeesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCourse?.id]);

  const isFreePlay = mode === 'FREE_PLAY';
  const defaultAllowance = isFreePlay
    ? DEFAULT_FREE_PLAY_ALLOWANCE
    : DEFAULT_ALLOWANCE_BY_MATCH_FORMAT[matchFormat] ?? 100;
  const allowancePercentage = allowanceOverride ?? defaultAllowance;
  const capacity = isFreePlay ? FREE_PLAY_CAPACITY : (FORMAT_CAPACITY[matchFormat] ?? 2);
  const isTeamFormat = !isFreePlay && TEAM_FORMATS.includes(matchFormat);
  const isFoursomes = !isFreePlay && matchFormat === 'FOURSOMES';
  const rosterFull = participants.length >= capacity;
  const registeredParticipants = participants.filter((p) => !p.isGuest);
  const availableFriends = friends.filter(
    (f) => !participants.some((p) => p.userId === f.otherUserId)
  );

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

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setAllowanceOverride(null);
  };

  const handleCourseNext = () => {
    if (!selectedCourse) {
      setError(t('create.course.errorCourseRequired'));
      return;
    }
    if (teesLoading) {
      setError(t('create.course.errorTeeRequired'));
      return;
    }
    const creatorTeeIsValid = courseTees.some((tee) => teeKey(tee.color, tee.gender) === creatorTeeKey);
    if (courseTees.length > 0 && !creatorTeeIsValid) {
      setError(t('create.course.errorTeeRequired'));
      return;
    }
    setError('');
    const { color, teeGender } = parseTeeKey(creatorTeeKey);
    // Quien crea, el primero, con su hándicap del perfil y su salida
    const handicap = currentUser?.handicap ?? null;
    setParticipants([
      {
        participantId: currentUser.id,
        userId: currentUser.id,
        name: nombreVisible(currentUser),
        handicap,
        profileHandicap: handicap,
        team: isTeamFormat ? 'A' : null,
        isGuest: false,
        color,
        teeGender,
      },
    ]);
    setStep(2);
  };

  // La salida llega del panel que abre el + del propio amigo, así que ya no
  // hace falta guardarla por amigo mientras se decide: se elige y se añade en
  // el mismo gesto.
  // El equipo elegido ya tiene a los suyos: lo diría el servidor al confirmar,
  // pero aquí se puede arreglar en el momento
  const teamIsFull = () =>
    isTeamFormat &&
    participants.filter((p) => p.team === selectedTeam).length >= capacity / 2;

  const handleAddFriend = (friend, friendTeeKeyValue) => {
    if (courseTees.length > 0 && (!friendTeeKeyValue || friendTeeKeyValue === NO_TEE_KEY)) {
      setError(t('create.participants.errorTeeRequired'));
      return;
    }
    if (teamIsFull()) {
      setError(t('create.participants.errorTeamFull'));
      return;
    }
    setError('');
    const { color, teeGender } = parseTeeKey(friendTeeKeyValue ?? NO_TEE_KEY);
    const handicap = friend.otherUserHandicap ?? null;
    setParticipants((prev) => [
      ...prev,
      {
        participantId: friend.otherUserId,
        userId: friend.otherUserId,
        name: friend.otherUserName,
        handicap,
        profileHandicap: handicap,
        team: isTeamFormat ? selectedTeam : null,
        isGuest: false,
        color,
        teeGender,
      },
    ]);
  };

  const handleGuestFirstNameChange = (value) => setGuestForm((g) => ({ ...g, firstName: value }));
  const handleGuestLastNameChange = (value) => setGuestForm((g) => ({ ...g, lastName: value }));

  const handleAddGuest = (e) => {
    e.preventDefault();
    const firstName = guestForm.firstName.trim();
    const lastName = guestForm.lastName.trim();
    if (!firstName || !lastName) return;
    if (courseTees.length > 0 && guestTeeKey === NO_TEE_KEY) {
      setError(t('create.participants.errorTeeRequired'));
      return;
    }
    if (teamIsFull()) {
      setError(t('create.participants.errorTeamFull'));
      return;
    }
    setError('');
    const { color, teeGender } = parseTeeKey(guestTeeKey);
    setParticipants((prev) => [
      ...prev,
      {
        // Sin cuenta: un id solo del borrador, que no viaja
        participantId: `invitado-${idAleatorio()}`,
        userId: null,
        name: `${firstName} ${lastName}`,
        firstName,
        lastName,
        handicap: guestForm.handicap.trim() ? Number(guestForm.handicap) : null,
        team: isTeamFormat ? selectedTeam : null,
        isGuest: true,
        color,
        teeGender,
      },
    ]);
    setGuestForm(initialGuestForm);
    setGuestTeeKey(NO_TEE_KEY);
  };

  const handleRemoveParticipant = (participantId) => {
    setError('');
    // Los anotadores se vuelven a elegir al entrar en el paso 3
    setParticipants((prev) => prev.filter((p) => p.participantId !== participantId));
  };

  // Volver a elegir campo o formato deja la plantilla sin sentido (equipos,
  // salidas): se empieza de nuevo al avanzar otra vez, como antes, pero sin
  // nada que cancelar
  const handleBackToCourse = () => {
    setError('');
    setGuestTeeKey(NO_TEE_KEY);
    setGuestForm(initialGuestForm);
    setStep(1);
  };

  const handleBackToParticipants = () => {
    setError('');
    setStep(2);
  };

  // En foursomes la pareja juega UNA bola, asi que no se elige quien anota a
  // quien jugador a jugador: se elige si apuntan las dos parejas —cada una
  // marca a la otra, como se juega— o solo la de quien crea la partida, que
  // entonces lleva las dos tarjetas. Dentro de una pareja puede apuntar
  // cualquiera de los dos, asi que entran todos sus registrados.
  const myTeam = () => participants.find((p) => p.userId === currentUser.id)?.team ?? null;

  const registeredOfTeam = (team) =>
    registeredParticipants.filter((p) => (p.team ?? null) === team);

  const rivalCanScore = () => isFoursomes && registeredOfTeam(oppositeTeam(myTeam())).length > 0;

  // Dentro de una pareja puede apuntar cualquiera de los dos, asi que aqui solo
  // importa si hay ALGUN registrado mas en mi bando.
  const partnerCanScore = () =>
    isFoursomes && registeredOfTeam(myTeam()).some((p) => p.userId !== currentUser.id);

  // `choice` y no `mode`: `mode` es el estado del modal (MATCH_PLAY/FREE_PLAY).
  const chooseScoringSides = (choice) => {
    const mine = registeredOfTeam(myTeam());
    if (choice === 'MINE') {
      setScorerIds(mine.map((p) => p.participantId));
      return;
    }
    // Los DOS bandos, no todos los registrados: un registrado sin equipo no
    // juega en ninguna de las dos parejas y se colaba como anotador.
    setScorerIds(
      [...mine, ...registeredOfTeam(oppositeTeam(myTeam()))].map((p) => p.participantId)
    );
  };

  const goToScorers = () => {
    const creatorParticipant = participants.find((p) => p.userId === currentUser.id);
    if (isFoursomes) {
      // Las dos parejas por defecto; si enfrente no hay ninguna cuenta con la
      // que anotar, esa opcion ni se ofrece y se queda la del creador. Con los
      // mismos helpers que usa el paso: escrito aparte, "rival" era aqui todo
      // el que no fuera de mi bando —un registrado sin equipo incluido— y el
      // paso acababa ofreciendo una cosa distinta de la que quedaba marcada.
      chooseScoringSides(rivalCanScore() ? 'BOTH' : 'MINE');
    } else {
      setScorerIds(creatorParticipant ? [creatorParticipant.participantId] : []);
    }
    setError('');
    setStep(3);
  };

  const toggleScorer = (participantId) => {
    setScorerIds((prev) => {
      if (prev.includes(participantId)) return prev.filter((id) => id !== participantId);
      if (prev.length >= MAX_SCORERS) return prev;
      return [...prev, participantId];
    });
  };

  const goToSummary = () => {
    if (scorerIds.length === 0) {
      setError(t('create.scorers.errorMinScorers'));
      return;
    }
    setError('');
    setStep(4);
  };

  const handleBackToScorers = () => {
    setError('');
    setStep(3);
  };

  // Vacío, un registrado juega con el de su perfil —el servidor no tiene «sin
  // hándicap» para él—, así que es eso lo que se enseña; un invitado, sin él
  const handleConfirmParticipantHandicap = (newHandicap) => {
    const { participantId } = editingHandicapParticipant;
    setEditingHandicapParticipant(null);
    setParticipants((prev) =>
      prev.map((p) =>
        p.participantId === participantId
          ? { ...p, handicap: newHandicap === null && !p.isGuest ? p.profileHandicap : newHandicap }
          : p
      )
    );
  };

  const handleConfirmGuestHandicap = (newHandicap) => {
    setGuestForm((g) => ({ ...g, handicap: newHandicap === null ? '' : String(newHandicap) }));
    setShowGuestHandicapPanel(false);
  };

  // Un hándicap que no se tocó no viaja: el servidor usa el del perfil
  const override = (p) => (p.handicap !== p.profileHandicap ? p.handicap : null);

  const peticionDelBorrador = () => {
    const creador = participants.find((p) => p.userId === currentUser.id);
    const { color: creatorTeeColor, teeGender: creatorTeeGender } = parseTeeKey(creatorTeeKey);
    return {
      golfCourseId: selectedCourse.id,
      matchFormat: isFreePlay ? null : matchFormat,
      scoringFormat: isFreePlay ? scoringFormat : null,
      name: matchName.trim() || null,
      allowancePercentage,
      playMode,
      creatorTeeColor,
      creatorTeeGender,
      creatorHandicap: creador ? override(creador) : null,
      participants: participants
        .filter((p) => p.userId !== currentUser.id)
        .map((p) =>
          p.isGuest
            ? {
                kind: 'GUEST',
                firstName: p.firstName,
                lastName: p.lastName,
                handicap: p.handicap,
                team: p.team,
                teeColor: p.color,
                teeGender: p.teeGender,
              }
            : {
                kind: 'FRIEND',
                friendUserId: p.userId,
                handicap: override(p),
                team: p.team,
                teeColor: p.color,
                teeGender: p.teeGender,
              }
        ),
      // El `participantId` de un registrado es su UserId
      scorerUserIds: scorerIds,
    };
  };

  // Tras un fallo SIN respuesta (sin red, 5xx, tiempo agotado) la partida
  // pudo crearse: el id se conserva aunque cambie el borrador, y el servidor
  // devuelve la que ya hay en vez de crear otra. Tras un rechazo claro (4xx)
  // no se creó nada, y un borrador distinto estrena id
  const idDelIntento = (peticion) => {
    const firma = JSON.stringify(peticion);
    const previo = ultimoIntento.current;
    if (!previo || (previo.firma !== firma && !previo.quizaCreada)) {
      ultimoIntento.current = { firma, id: idAleatorio(), quizaCreada: false };
    }
    return ultimoIntento.current.id;
  };

  // Pudo llegar: sin red, cortada por tiempo o un 5xx. Un fallo en el propio
  // móvil antes de mandar nada (o un 4xx) dice que no se creó
  const pudoLlegar = (err) =>
    esFalloDeRed(err) || err?.name === 'AbortError' || err?.status >= 500;

  const handleStart = async () => {
    setIsProcessing(true);
    setError('');
    try {
      const peticion = peticionDelBorrador();
      const quickMatchId = idDelIntento(peticion);
      // Con el id de un intento que quizá se creó y el borrador cambiado, el
      // servidor devuelve la que ya hay: se dice que valió lo de antes
      const cambiado =
        ultimoIntento.current.quizaCreada && ultimoIntento.current.firma !== JSON.stringify(peticion);
      const started = await createAndStartQuickMatchUseCase.execute({ quickMatchId, ...peticion });
      if (cambiado) customToast.info(t('create.alreadyCreated'));
      onStarted(started.id);
    } catch (err) {
      if (ultimoIntento.current) ultimoIntento.current.quizaCreada = pudoLlegar(err);
      const motivo = MOTIVO_POR_CODIGO[err?.status];
      setError(
        motivo
          ? t(motivo)
          : mensajeDeError(err, { sinConexion: tComun('sinConexion.mensaje'), generico: t('create.errors.generic') })
      );
    } finally {
      setIsProcessing(false);
    }
  };

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
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 id="quick-match-modal-title" className="text-lg font-semibold text-gray-900">{t('create.title')}</h2>
            <p className="text-xs text-gray-500">{t('create.step', { current: step, total: 4 })}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label={tComun('close')}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div
            ref={avisoDeError}
            className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600"
            data-testid="quick-match-modal-error"
          >
            {error}
          </div>
        )}

        {step === 1 && (
          <CourseStep
            t={t}
            matchName={matchName}
            onMatchNameChange={setMatchName}
            mode={mode}
            onModeChange={handleModeChange}
            isFreePlay={isFreePlay}
            scoringFormat={scoringFormat}
            onScoringFormatChange={setScoringFormat}
            matchFormat={matchFormat}
            onMatchFormatChange={setMatchFormat}
            countryCode={currentUser?.country_code}
            selectedCourse={selectedCourse}
            onCourseSelect={setSelectedCourse}
            onRequestNewCourse={handleRequestNewCourse}
            courseTees={courseTees}
            creatorTeeKey={creatorTeeKey}
            onCreatorTeeKeyChange={setCreatorTeeKey}
            allowancePercentage={allowancePercentage}
            onAllowanceChange={setAllowanceOverride}
            playMode={playMode}
            onPlayModeChange={setPlayMode}
            isProcessing={isProcessing}
            teesLoading={teesLoading}
            onClose={handleClose}
            onNext={handleCourseNext}
          />
        )}

        {step === 2 && (
          <ParticipantsStep
            t={t}
            currentUser={currentUser}
            participants={participants}
            capacity={capacity}
            rosterFull={rosterFull}
            isTeamFormat={isTeamFormat}
            isFreePlay={isFreePlay}
            selectedTeam={selectedTeam}
            onSelectedTeamChange={(team) => {
              setSelectedTeam(team);
              setError('');
            }}
            participantTab={participantTab}
            onParticipantTabChange={setParticipantTab}
            availableFriends={availableFriends}
            courseTees={courseTees}
            onAddFriend={handleAddFriend}
            guestForm={guestForm}
            onGuestFirstNameChange={handleGuestFirstNameChange}
            onGuestLastNameChange={handleGuestLastNameChange}
            onAddGuest={handleAddGuest}
            onOpenGuestHandicapPanel={() => setShowGuestHandicapPanel(true)}
            guestTeeKey={guestTeeKey}
            onGuestTeeKeyChange={setGuestTeeKey}
            onRemoveParticipant={handleRemoveParticipant}
            isProcessing={isProcessing}
            onBack={handleBackToCourse}
            onClose={handleClose}
            onNext={goToScorers}
          />
        )}

        {step === 3 && (
          <ScorersStep
            t={t}
            registeredParticipants={registeredParticipants}
            currentUser={currentUser}
            scorerIds={scorerIds}
            onToggleScorer={toggleScorer}
            isFoursomes={isFoursomes}
            rivalCanScore={rivalCanScore()}
            partnerCanScore={partnerCanScore()}
            onChooseScoringSides={chooseScoringSides}
            isProcessing={isProcessing}
            onBack={handleBackToParticipants}
            onClose={handleClose}
            onNext={goToSummary}
          />
        )}

        {step === 4 && (
          <SummaryStep
            t={t}
            selectedCourse={selectedCourse}
            isFreePlay={isFreePlay}
            scoringFormat={scoringFormat}
            matchFormat={matchFormat}
            allowancePercentage={allowancePercentage}
            playMode={playMode}
            courseTees={courseTees}
            participants={participants}
            currentUser={currentUser}
            isTeamFormat={isTeamFormat}
            onEditHandicap={setEditingHandicapParticipant}
            isProcessing={isProcessing}
            registeredParticipants={registeredParticipants}
            scorerIds={scorerIds}
            onBack={handleBackToScorers}
            onClose={handleClose}
            onStart={handleStart}
          />
        )}
      </div>

      {showGuestHandicapPanel && (
        <HandicapInputPanel
          label={t('create.participants.guestHandicap')}
          value={guestForm.handicap ? Number(guestForm.handicap) : null}
          onClose={() => setShowGuestHandicapPanel(false)}
          onConfirm={handleConfirmGuestHandicap}
        />
      )}

      {editingHandicapParticipant && (
        <HandicapInputPanel
          label={editingHandicapParticipant.name}
          value={editingHandicapParticipant.handicap}
          onClose={() => setEditingHandicapParticipant(null)}
          onConfirm={handleConfirmParticipantHandicap}
        />
      )}
    </div>
  );
};

export default CreateQuickMatchModal;
