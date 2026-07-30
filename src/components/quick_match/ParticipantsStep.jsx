import { Plus, Trash2 } from 'lucide-react';
import TeeSelectButtons from './TeeSelectButtons';
import { NO_TEE_KEY } from './createQuickMatchModalConstants';

/**
 * Wizard step 2: current roster + add participants (friends or guests),
 * with per-participant tee selection when the course has tees.
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
  friendTeeByFriendId,
  onFriendTeeChange,
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
}) => (
  <div className="p-4 space-y-4">
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">
        {t('create.participants.rosterTitle', { count: participants.length, max: capacity })}
      </p>
      <ul className="space-y-2">
        {participants.map((p) => (
          <li
            key={p.participantId}
            className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg"
          >
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
                  className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg"
                >
                  <span className="text-sm text-gray-900 truncate min-w-0">{f.otherUserName}</span>
                  {courseTees.length > 0 && (
                    <TeeSelectButtons
                      value={friendTeeByFriendId[f.id] ?? NO_TEE_KEY}
                      onChange={(key) => onFriendTeeChange(f.id, key)}
                      courseTees={courseTees}
                      ariaLabel={t('create.participants.teeLabel')}
                      testIdPrefix={`quick-match-friend-tee-select-${f.id}`}
                      compact
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => onAddFriend(f)}
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
  </div>
);

export default ParticipantsStep;
