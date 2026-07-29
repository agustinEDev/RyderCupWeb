import { User, Clock } from 'lucide-react';
import FriendshipBadge from './FriendshipBadge';

/**
 * FriendCard
 *
 * Displays a friendship in one of three contexts:
 * - mode="friend": accepted friend (remove/block actions)
 * - mode="received": pending request received (accept/decline actions)
 * - mode="sent": pending request sent (cancel action)
 */
const FriendCard = ({
  friendship,
  mode,
  onAccept,
  onDecline,
  onRemove,
  onBlock,
  onCancel,
  isProcessing,
  t,
}) => {
  const name = friendship.otherUserName || t('card.unknownUser');

  return (
    <div data-testid="friend-card" className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center gap-1.5">
              <User className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900 truncate">{name}</h3>
            </div>
            {mode !== 'friend' && <FriendshipBadge status={friendship.status} />}
          </div>

          {friendship.createdAt && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {mode === 'friend'
                  ? t('card.friendsSince', {
                      date: new Date(friendship.respondedAt || friendship.createdAt).toLocaleDateString(),
                    })
                  : t('card.requestedAt', {
                      date: new Date(friendship.createdAt).toLocaleDateString(),
                    })}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          {mode === 'received' && (
            <>
              <button
                data-testid="accept-button"
                onClick={() => onAccept?.(friendship.id)}
                disabled={isProcessing}
                className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? t('actions.accepting') : t('actions.accept')}
              </button>
              <button
                data-testid="decline-button"
                onClick={() => onDecline?.(friendship.id)}
                disabled={isProcessing}
                className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? t('actions.declining') : t('actions.decline')}
              </button>
            </>
          )}

          {mode === 'sent' && (
            <button
              data-testid="cancel-button"
              onClick={() => onCancel?.(friendship.id)}
              disabled={isProcessing}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? t('actions.cancelling') : t('actions.cancel')}
            </button>
          )}

          {mode === 'friend' && (
            <>
              <button
                data-testid="remove-button"
                onClick={() => onRemove?.(friendship.id)}
                disabled={isProcessing}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? t('actions.removing') : t('actions.remove')}
              </button>
              <button
                data-testid="block-button"
                onClick={() => onBlock?.(friendship.otherUserId)}
                disabled={isProcessing}
                className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? t('actions.blocking') : t('actions.block')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendCard;
