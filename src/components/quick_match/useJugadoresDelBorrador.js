import { useEffect, useRef, useState } from 'react';
import { nombreVisible } from '../../utils/nombreVisible';
import {
  jugadorInvitado,
  jugadorRegistrado,
} from '../../utils/jugadoresDelAsistente';
import {
  NO_TEE_KEY,
  initialGuestForm,
  parseTeeKey,
  teeKey,
} from './createQuickMatchModalConstants';
import { leeTodosLosAmigos } from './leeTodosLosAmigos';
import { Team } from '../../domain/value_objects/Team';
import { QuickMatchMode } from '../../domain/value_objects/QuickMatchMode';

// Con qué campo y formato se hizo la plantilla: volver al paso 1 sin
// cambiarlos la conserva (Agustín, 3 nov 2026); cambiarlos la vacía
const plantillaCopiada = (copia) =>
  copia?.participants?.length
    ? {
        campo: copia.selectedCourse?.id,
        mode: copia.mode,
        matchFormat: copia.matchFormat,
      }
    : null;

const esLaMismaPlantilla = (misma, plantilla) =>
  misma.campo === plantilla.campo &&
  misma.mode === plantilla.mode &&
  (plantilla.mode === QuickMatchMode.FREE_PLAY ||
    misma.matchFormat === plantilla.matchFormat);

// Por qué no se puede pasar del paso 1, o `null`
const faltaEnElPasoUno = ({
  selectedCourse,
  teesLoading,
  courseTees,
  creatorTeeKey,
}) => {
  if (!selectedCourse) return 'create.course.errorCourseRequired';
  if (teesLoading) return 'create.course.errorTeeRequired';
  const creatorTeeIsValid = courseTees.some(
    (tee) => teeKey(tee.color, tee.gender) === creatorTeeKey,
  );
  if (courseTees.length > 0 && !creatorTeeIsValid)
    return 'create.course.errorTeeRequired';
  return null;
};

// Vacío, un registrado juega con el de su perfil —el servidor no tiene «sin
// hándicap» para él—, así que es eso lo que se enseña; un invitado, sin él
const conHandicap = (p, newHandicap) => ({
  ...p,
  handicap:
    newHandicap === null && !p.isGuest ? p.profileHandicap : newHandicap,
});

/**
 * Los jugadores del borrador de partida rápida (paso 2): la plantilla que se
 * empieza al salir del paso 1, los amigos que se pueden añadir, el formulario
 * del invitado y los teclados de hándicap.
 *
 * El paso, el campo, el formato, las barras y el aviso son del asistente y
 * llegan de fuera: aquí solo se leen (y se avanza o vuelve de paso).
 */
export const useJugadoresDelBorrador = ({
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
}) => {
  const [participants, setParticipants] = useState(copia?.participants ?? []);
  const plantillaDe = useRef(plantillaCopiada(copia));
  const [participantTab, setParticipantTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(Team.A);
  const [guestTeeKey, setGuestTeeKey] = useState(NO_TEE_KEY);
  const [guestForm, setGuestForm] = useState(initialGuestForm);
  // Which participant's handicap keypad is open (step 4 summary), or null when closed.
  const [editingHandicapParticipant, setEditingHandicapParticipant] =
    useState(null);
  // Whether the guest-form handicap keypad (step 2) is open.
  const [showGuestHandicapPanel, setShowGuestHandicapPanel] = useState(false);

  useEffect(() => {
    if (step !== 2 || !currentUser?.id) return undefined;
    // Todos, de 100 en 100 (el máximo del servidor): con los 20 de por
    // defecto, a quien tiene más amigos le faltaban en la lista. Al salir
    // del paso, lo que llegue tarde ya no se pinta: ir y volver rápido no
    // deja que una lectura vieja pise la nueva
    let vigente = true;
    leeTodosLosAmigos(currentUser.id)
      .then((amigos) => vigente && setFriends(amigos))
      .catch(() => vigente && setFriends([]));
    return () => {
      vigente = false;
    };
  }, [step, currentUser?.id]);

  const rosterFull = participants.length >= capacity;
  const registeredParticipants = participants.filter((p) => !p.isGuest);
  const availableFriends = friends.filter(
    (f) => !participants.some((p) => p.userId === f.otherUserId),
  );

  const handleCourseNext = () => {
    const falta = faltaEnElPasoUno({
      selectedCourse,
      teesLoading,
      courseTees,
      creatorTeeKey,
    });
    if (falta) {
      setError(falta);
      return;
    }
    setError(null);
    const { color, teeGender } = parseTeeKey(creatorTeeKey);
    const plantilla = { campo: selectedCourse.id, mode, matchFormat };
    const misma = plantillaDe.current;
    if (
      misma &&
      participants.length > 0 &&
      esLaMismaPlantilla(misma, plantilla)
    ) {
      // La misma plantilla: se conserva, con la barra que quien crea haya
      // podido cambiar en este paso
      setParticipants((prev) =>
        prev.map((p) =>
          p.userId === currentUser.id ? { ...p, color, teeGender } : p,
        ),
      );
      setStep(2);
      return;
    }
    plantillaDe.current = plantilla;
    // Quien crea, el primero, con su hándicap del perfil y su salida
    setParticipants([
      jugadorRegistrado({
        userId: currentUser.id,
        name: nombreVisible(currentUser),
        handicap: currentUser?.handicap ?? null,
        team: isTeamFormat ? Team.A : null,
        color,
        teeGender,
      }),
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
    if (
      courseTees.length > 0 &&
      (!friendTeeKeyValue || friendTeeKeyValue === NO_TEE_KEY)
    ) {
      setError('create.participants.errorTeeRequired');
      return;
    }
    if (teamIsFull()) {
      setError('create.participants.errorTeamFull');
      return;
    }
    setError(null);
    const { color, teeGender } = parseTeeKey(friendTeeKeyValue ?? NO_TEE_KEY);
    setParticipants((prev) => [
      ...prev,
      jugadorRegistrado({
        userId: friend.otherUserId,
        name: friend.otherUserName,
        handicap: friend.otherUserHandicap ?? null,
        team: isTeamFormat ? selectedTeam : null,
        color,
        teeGender,
      }),
    ]);
  };

  // Al corregirlo, el aviso de nombre en blanco ya no tiene razón de ser
  const handleGuestFirstNameChange = (value) => {
    setError(null);
    setGuestForm((g) => ({ ...g, firstName: value }));
  };
  const handleGuestLastNameChange = (value) => {
    setError(null);
    setGuestForm((g) => ({ ...g, lastName: value }));
  };

  // Por qué no se puede añadir al invitado, o `null`
  const faltaEnElInvitado = (firstName, lastName) => {
    // Solo espacios pasan el `required` del navegador: se dice, no se calla
    if (!firstName || !lastName) return 'create.participants.errorGuestName';
    if (courseTees.length > 0 && guestTeeKey === NO_TEE_KEY)
      return 'create.participants.errorTeeRequired';
    if (teamIsFull()) return 'create.participants.errorTeamFull';
    return null;
  };

  const handleAddGuest = (e) => {
    e.preventDefault();
    const firstName = guestForm.firstName.trim();
    const lastName = guestForm.lastName.trim();
    const falta = faltaEnElInvitado(firstName, lastName);
    if (falta) {
      setError(falta);
      return;
    }
    setError(null);
    const { color, teeGender } = parseTeeKey(guestTeeKey);
    setParticipants((prev) => [
      ...prev,
      jugadorInvitado({
        firstName,
        lastName,
        handicap: guestForm.handicap.trim() ? Number(guestForm.handicap) : null,
        team: isTeamFormat ? selectedTeam : null,
        color,
        teeGender,
      }),
    ]);
    setGuestForm(initialGuestForm);
    setGuestTeeKey(NO_TEE_KEY);
  };

  const handleRemoveParticipant = (participantId) => {
    setError(null);
    // Los anotadores se ajustan al entrar en el paso 3 (`goToScorers`)
    setParticipants((prev) =>
      prev.filter((p) => p.participantId !== participantId),
    );
  };

  // Volver a elegir campo o formato deja la plantilla sin sentido (equipos,
  // salidas): si se cambia alguno, se empieza de nuevo al avanzar otra vez;
  // si no, se conserva (`handleCourseNext`, 3 nov 2026)
  const handleBackToCourse = () => {
    setError(null);
    setGuestTeeKey(NO_TEE_KEY);
    setGuestForm(initialGuestForm);
    setStep(1);
  };

  const handleConfirmParticipantHandicap = (newHandicap) => {
    const { participantId } = editingHandicapParticipant;
    setEditingHandicapParticipant(null);
    setParticipants((prev) =>
      prev.map((p) =>
        p.participantId === participantId ? conHandicap(p, newHandicap) : p,
      ),
    );
  };

  const handleConfirmGuestHandicap = (newHandicap) => {
    setGuestForm((g) => ({
      ...g,
      handicap: newHandicap === null ? '' : String(newHandicap),
    }));
    setShowGuestHandicapPanel(false);
  };

  return {
    participants,
    rosterFull,
    registeredParticipants,
    availableFriends,
    participantTab,
    setParticipantTab,
    selectedTeam,
    setSelectedTeam,
    guestForm,
    guestTeeKey,
    setGuestTeeKey,
    editingHandicapParticipant,
    setEditingHandicapParticipant,
    showGuestHandicapPanel,
    setShowGuestHandicapPanel,
    handleCourseNext,
    handleAddFriend,
    handleGuestFirstNameChange,
    handleGuestLastNameChange,
    handleAddGuest,
    handleRemoveParticipant,
    handleBackToCourse,
    handleConfirmParticipantHandicap,
    handleConfirmGuestHandicap,
  };
};
