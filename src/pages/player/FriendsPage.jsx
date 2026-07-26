import { useState, useEffect, useCallback } from 'react';
import { Loader, Users, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import customToast from '../../utils/toast';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import FriendCard from '../../components/friend/FriendCard';
import AddFriendModal from '../../components/friend/AddFriendModal';
import {
  listFriendsUseCase,
  listPendingFriendRequestsUseCase,
  respondFriendRequestUseCase,
  removeFriendUseCase,
  blockUserUseCase,
  sendFriendRequestUseCase,
  searchUsersUseCase,
} from '../../composition';

const TABS = ['friends', 'received', 'sent'];

const FriendsPage = () => {
  const { t } = useTranslation('friends');
  const { user, loading: isLoadingUser } = useAuth();

  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const [friendsResult, receivedResult, sentResult] = await Promise.all([
        listFriendsUseCase.execute(user.id),
        listPendingFriendRequestsUseCase.execute(user.id, 'received'),
        listPendingFriendRequestsUseCase.execute(user.id, 'sent'),
      ]);
      setFriends(friendsResult.friendships);
      setReceived(receivedResult.friendships);
      setSent(sentResult.friendships);
    } catch (error) {
      console.error('Error loading friends:', error);
      customToast.error(error.message || t('errors.failedToLoad'));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing pattern surfaced by eslint-plugin-react-hooks 7.1.1 bump; needs dedicated review (tracked in follow-up)
      loadData();
    }
  }, [user, loadData]);

  const handleAccept = async (friendshipId) => {
    setProcessingId(friendshipId);
    try {
      await respondFriendRequestUseCase.execute(friendshipId, 'ACCEPT');
      customToast.success(t('success.accepted'));
      await loadData();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      customToast.error(error.message || t('errors.failedToRespond'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (friendshipId) => {
    setProcessingId(friendshipId);
    try {
      await respondFriendRequestUseCase.execute(friendshipId, 'DECLINE');
      customToast.success(t('success.declined'));
      await loadData();
    } catch (error) {
      console.error('Error declining friend request:', error);
      customToast.error(error.message || t('errors.failedToRespond'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemoveOrCancel = async (friendshipId) => {
    setProcessingId(friendshipId);
    try {
      await removeFriendUseCase.execute(friendshipId);
      customToast.success(t('success.removed'));
      await loadData();
    } catch (error) {
      console.error('Error removing friendship:', error);
      customToast.error(error.message || t('errors.failedToRemove'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleBlock = async (otherUserId) => {
    if (!otherUserId) return;
    setProcessingId(otherUserId);
    try {
      await blockUserUseCase.execute(otherUserId);
      customToast.success(t('success.blocked'));
      await loadData();
    } catch (error) {
      console.error('Error blocking user:', error);
      customToast.error(error.message || t('errors.failedToBlock'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleSendRequest = async (addresseeId) => {
    setIsSending(true);
    try {
      await sendFriendRequestUseCase.execute(addresseeId);
      customToast.success(t('success.sent'));
      setShowAddModal(false);
      await loadData();
    } catch (error) {
      console.error('Error sending friend request:', error);
      customToast.error(error.message || t('errors.failedToSend'));
    } finally {
      setIsSending(false);
    }
  };

  const handleSearchUsers = async (query) => {
    return searchUsersUseCase.execute(query);
  };

  const isPageLoading = isLoadingUser || isLoading;

  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth user={user} />
        <div className="flex items-center justify-center h-64">
          <Loader className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-gray-500">{t('loading')}</span>
        </div>
      </div>
    );
  }

  const listByTab = { friends, received, sent };
  const currentList = listByTab[activeTab];

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderAuth user={user} />

      <AddFriendModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSend={handleSendRequest}
        onSearchUsers={handleSearchUsers}
        isProcessing={isSending}
        t={t}
      />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
          </div>
          <button
            data-testid="add-friend-button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            {t('add.button')}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-4" data-testid="friend-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              data-testid={`tab-${tab}`}
            >
              {t(`tabs.${tab}`)}
              {listByTab[tab].length > 0 && (
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {listByTab[tab].length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {currentList.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t(`empty.${activeTab}`)}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentList.map((friendship) => (
              <FriendCard
                key={friendship.id}
                friendship={friendship}
                mode={activeTab === 'friends' ? 'friend' : activeTab === 'received' ? 'received' : 'sent'}
                onAccept={handleAccept}
                onDecline={handleDecline}
                onRemove={handleRemoveOrCancel}
                onCancel={handleRemoveOrCancel}
                onBlock={handleBlock}
                isProcessing={
                  processingId === friendship.id || processingId === friendship.otherUserId
                }
                t={t}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsPage;
