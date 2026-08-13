import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import TeeSelectButtons from './TeeSelectButtons';
import TeeSelectPanel from './TeeSelectPanel';
import TeeColorBadge from '../golf_course/TeeColorBadge';

/**
 * Wizard step 2: current roster + add participants (friends or guests).
 *
 * The friend's tee is picked in a bottom sheet opened by the + button. It used
 * to be an inline picker on the same row as the name and the button, which on a
 * phone left names as "Eri…" and hid 5 of 8 tees behind a horizontal scrollbar,
 * one per friend.
 */
const ParticipantsStep = ({
  t,
  currentUser,
  participants,
  capacity,
  rosterFull,
  isTeamFormat,
  isFreePlay,
  selectedTeam,
  onSelectedTeamChange,
  participantTab,
  onParticipantTabChange,
  availableFriends,
  courseTees,
  onAddFriend,
  guestForm,
  onGuestFirstNameChange,
  onGuestLastNameChange,
  onAddGuest,
  onOpenGuestHandicapPanel,
  guestTeeKey,
  onGuestTeeKeyChange,
  onRemoveParticipant,
  isProcessing,
  onBack,
  onClose,
  onNext,
}) => {
  // El amigo cuyo panel de salidas está abierto. Vive aquí y no en el modal
  // porque no sale de este paso: se abre, se elige y se añade.
  const [friendPickingTee, setFriendPickingTee] = useState(null);

  // Sin salidas que elegir no hay nada que preguntar: se añade directo
  const handleAddClick = (friend) => {
    if (courseTees.length === 0) {
      onAddFriend(friend, null);
      return;
    }
    setFriendPickingTee(friend);
  };

  const handleTeeChosen = (key) => {
    const friend = friendPickingTee;
    setFriendPickingTee(null);
    onAddFriend(friend, key);
  };

  return (
  <div className="p-4 space-y-4">
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">
        {t('create.participants.rosterTitle', { count: participants.length, max: capacity })}
      </p>
      <ul className="space-y-2">
        {participants.map((p) => (
          <li
            key={p.participantId}
            className="flex items-start justify-between gap-2 px-3 py-2 bg-gray-50 rounded-lg"
          >
            <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-gray-900 truncate">{p.name}</span>
              {p.userId === currentUser.id && (
                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded flex-shrink-0">
                  {t('create.participants.creatorBadge')}
                </span>
              )}
              {p.isGuest && (
                <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded flex-shrink-0">
                  {t('create.participants.guestBadge')}
                </span>
              )}
              {isTeamFormat && p.team && (
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {p.team === 'A' ? t('create.participants.teamA') : t('create.participants.teamB')}
                </span>
              )}
            </div>
              {/* La salida elegida se queda invisible en cuanto se añade al
                  jugador: aquí es el único sitio donde puede comprobarse */}
              {p.color && (
                <div className="mt-1">
                  <TeeColorBadge color={p.color} gender={p.teeGender} />
                </div>
              )}
            </div>
            {p.userId !== currentUser.id && (
              <button
                type="button"
                onClick={() => onRemoveParticipant(p.participantId)}
                disabled={isProcessing}
                className="text-gray-400 hover:text-red-600 flex-shrink-0"
                aria-label={t('create.participants.remove')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>

    {rosterFull ? (
      <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
        {t('create.participants.rosterFull')}
      </p>
    ) : (
      <>
        {isTeamFormat && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onSelectedTeamChange('A')}
              className={`flex-1 px-3 py-1.5 rounded-md text-sm border transition-colors ${
                selectedTeam === 'A' ? 'border-primary text-primary bg-primary/5' : 'border-gray-200 text-gray-600'
              }`}
            >
              {t('create.participants.teamA')}
            </button>
            <button
              type="button"
              onClick={() => onSelectedTeamChange('B')}
              className={`flex-1 px-3 py-1.5 rounded-md text-sm border transition-colors ${
                selectedTeam === 'B' ? 'border-primary text-primary bg-primary/5' : 'border-gray-200 text-gray-600'
              }`}
            >
              {t('create.participants.teamB')}
            </button>
          </div>
        )}

        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => onParticipantTabChange('friends')}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              participantTab === 'friends' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('create.participants.tabFriends')}
          </button>
          <button
            type="button"
            onClick={() => onParticipantTabChange('guest')}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              participantTab === 'guest' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('create.participants.tabGuest')}
          </button>
        </div>

        {participantTab === 'friends' && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {availableFriends.length === 0 ? (
              <p className="text-sm text-gray-500">{t('create.participants.noFriends')}</p>
            ) : (
              availableFriends.map((f) => (
                <div
                  key={f.id}
                  data-testid={`quick-match-friend-row-${f.id}`}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg"
                >
                  {/* El nombre manda: es lo único que hay que leer para decidir.
                      La salida se pregunta después, en el panel del + */}
                  <span className="text-sm text-gray-900 truncate min-w-0">{f.otherUserName}</span>
                  <button
                    type="button"
                    onClick={() => handleAddClick(f)}
                    disabled={isProcessing}
                    aria-label={t('create.participants.addFriendNamed', { name: f.otherUserName })}
                    title={t('create.participants.addFriendNamed', { name: f.otherUserName })}
                    data-testid={`quick-match-add-friend-${f.id}`}
                    className="flex-shrink-0 ml-auto w-7 h-7 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {participantTab === 'guest' && (
          <form onSubmit={onAddGuest} className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={guestForm.firstName}
                onChange={(e) => onGuestFirstNameChange(e.target.value)}
                placeholder={t('create.participants.guestFirstName')}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="text"
                required
                value={guestForm.lastName}
                onChange={(e) => onGuestLastNameChange(e.target.value)}
                placeholder={t('create.participants.guestLastName')}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              type="button"
              onClick={onOpenGuestHandicapPanel}
              data-testid="quick-match-guest-handicap-button"
              className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-left focus:outline-none focus:ring-2 focus:ring-primary ${
                guestForm.handicap ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              {guestForm.handicap || t('create.participants.guestHandicap')}
            </button>
            {courseTees.length > 0 && (
              <TeeSelectButtons
                value={guestTeeKey}
                onChange={onGuestTeeKeyChange}
                courseTees={courseTees}
                ariaLabel={t('create.participants.teeLabel')}
                testIdPrefix="quick-match-guest-tee-option"
              />
            )}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {t('create.participants.addGuest')}
            </button>
          </form>
        )}
      </>
    )}

    <div className="flex items-center justify-between gap-3 pt-2">
      <button
        type="button"
        onClick={onBack}
        disabled={isProcessing}
        data-testid="quick-match-participants-back"
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
      >
        {t('create.participants.back')}
      </button>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
        >
          {t('create.cancel')}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={isProcessing || (isFreePlay ? participants.length < 1 : participants.length < capacity)}
          data-testid="quick-match-participants-next"
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {t('create.participants.next')}
        </button>
      </div>
    </div>

    {friendPickingTee && (
      <TeeSelectPanel
        courseTees={courseTees}
        playerName={friendPickingTee.otherUserName}
        onSelect={handleTeeChosen}
        onClose={() => setFriendPickingTee(null)}
      />
    )}
  </div>
  );
};

export default ParticipantsStep;
