import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Users, UserPlus } from 'lucide-react';
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
  searchUsersUseCase,
} from '../../composition';
import BlockLoader from '../../components/ui/BlockLoader';

const TABS = ['friends', 'received', 'sent'];

const FriendsPage = () => {
  const { t } = useTranslation('friends');
  const { user, loading: isLoadingUser } = useAuth();

  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingKeys, setProcessingKeys] = useState(() => new Set());
  const [showAddModal, setShowAddModal] = useState(false);

  const startProcessing = (key) => {
    setProcessingKeys((prev) => new Set(prev).add(key));
  };

  const stopProcessing = (key) => {
    setProcessingKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!user) return;

    if (!silent) setIsLoading(true);
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
      if (!silent) setIsLoading(false);
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
    const key = `friendship:${friendshipId}`;
    startProcessing(key);
    try {
      await respondFriendRequestUseCase.execute(friendshipId, 'ACCEPT');
      customToast.success(t('success.accepted'));
      await loadData({ silent: true });
    } catch (error) {
      console.error('Error accepting friend request:', error);
      customToast.error(error.message || t('errors.failedToRespond'));
    } finally {
      stopProcessing(key);
    }
  };

  const handleDecline = async (friendshipId) => {
    const key = `friendship:${friendshipId}`;
    startProcessing(key);
    try {
      await respondFriendRequestUseCase.execute(friendshipId, 'DECLINE');
      customToast.success(t('success.declined'));
      await loadData({ silent: true });
    } catch (error) {
      console.error('Error declining friend request:', error);
      customToast.error(error.message || t('errors.failedToRespond'));
    } finally {
      stopProcessing(key);
    }
  };

  const handleRemoveOrCancel = async (friendshipId) => {
    const key = `friendship:${friendshipId}`;
    startProcessing(key);
    try {
      await removeFriendUseCase.execute(friendshipId);
      customToast.success(t('success.removed'));
      await loadData({ silent: true });
    } catch (error) {
      console.error('Error removing friendship:', error);
      customToast.error(error.message || t('errors.failedToRemove'));
    } finally {
      stopProcessing(key);
    }
  };

  const handleBlock = async (otherUserId) => {
    if (!otherUserId) return;
    const key = `user:${otherUserId}`;
    startProcessing(key);
    try {
      await blockUserUseCase.execute(otherUserId);
      customToast.success(t('success.blocked'));
      await loadData({ silent: true });
    } catch (error) {
      console.error('Error blocking user:', error);
      customToast.error(error.message || t('errors.failedToBlock'));
    } finally {
      stopProcessing(key);
    }
  };

  const handleSearchUsers = async (query) => {
    return searchUsersUseCase.execute(query);
  };

  const isPageLoading = isLoadingUser || isLoading;

  if (isPageLoading) {
    // La cabecera se queda puesta durante la espera: aparecer de golpe al
    // terminar es un salto, y de eso va justamente FE #495
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth user={user} />
        <BlockLoader texto={t('loading')} />
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
        onSearchUsers={handleSearchUsers}
        t={t}
      />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* La vuelta al feed va visible tambien en movil, al reves que el resto
            de la aplicacion: a Amigos se entra desde el feed, y en movil la
            navegacion inferior marca la pestana del feed como activa mientras
            estas aqui, asi que sin este enlace no hay ninguna senal de por
            donde se vuelve */}
        <Link
          to="/feed"
          data-testid="friends-back-to-feed"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('backToFeed')}
        </Link>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="hidden md:block text-2xl font-bold text-gray-900">{t('title')}</h1>
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
                  processingKeys.has(`friendship:${friendship.id}`) ||
                  processingKeys.has(`user:${friendship.otherUserId}`)
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
