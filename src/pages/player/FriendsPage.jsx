import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Users, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import customToast from '../../utils/toast';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import { useCargaCancelableEffect } from '../../hooks/useCargaCancelableEffect';
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
import {
  GrupoDePestanas,
  ListaDePestanas,
  PanelDePestana,
} from '../../components/ui/Pestanas';
import { PANTALLA_MENOS_BARRA_INFERIOR } from '../../utils/barraInferior';

const TABS = ['friends', 'received', 'sent'];

const FriendsPage = () => {
  const { t } = useTranslation('friends');
  const { user, loading: isLoadingUser } = useAuth();

  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
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

  // Del id y no del objeto: la misma persona con un `user` nuevo (la sesión
  // se vuelve a leer) no recarga la página ni suelta las tarjetas ocupadas
  const userId = user?.id;
  // Las tres listas, al entrar y tras cada acción. De dos acciones seguidas,
  // la recarga de la primera que llegue tarde ya no pisa la de la segunda.
  // Tras una acción se recarga en silencio: sin la espera de toda la página,
  // solo la de su tarjeta, que sigue ocupada hasta que llega SU recarga
  const { cargando, recargar } = useCargaCancelableEffect(
    () =>
      Promise.all([
        listFriendsUseCase.execute(userId),
        listPendingFriendRequestsUseCase.execute(userId, 'received'),
        listPendingFriendRequestsUseCase.execute(userId, 'sent'),
      ]),
    [userId],
    {
      activa: Boolean(userId),
      alCargar: ([friendsResult, receivedResult, sentResult]) => {
        setFriends(friendsResult.friendships);
        setReceived(receivedResult.friendships);
        setSent(sentResult.friendships);
      },
      alFallar: (error) => {
        console.error('Error loading friends:', error);
        customToast.error(error.message || t('errors.failedToLoad'));
      },
    },
  );
  // Sin usuario no se pide nada y se sigue esperando, como antes
  const isLoading = cargando || !user;

  // La recarga tras una acción, y que la tarjeta siga ocupada hasta que lleguen
  // unas listas que ya la incluyan: si otra acción la sustituye, su promesa
  // espera a la recarga más reciente (lo hace el hook)
  const recargarTrasLaAccion = () => recargar({ silenciosa: true });

  const handleAccept = async (friendshipId) => {
    const key = `friendship:${friendshipId}`;
    startProcessing(key);
    try {
      await respondFriendRequestUseCase.execute(friendshipId, 'ACCEPT');
      customToast.success(t('success.accepted'));
      await recargarTrasLaAccion();
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
      await recargarTrasLaAccion();
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
      await recargarTrasLaAccion();
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
      await recargarTrasLaAccion();
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
      <div className={`${PANTALLA_MENOS_BARRA_INFERIOR} bg-gray-50`}>
        <HeaderAuth user={user} />
        <BlockLoader texto={t('loading')} />
      </div>
    );
  }

  const listByTab = { friends, received, sent };
  const currentList = listByTab[activeTab];

  return (
    <div className={`${PANTALLA_MENOS_BARRA_INFERIOR} bg-gray-50`}>
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
            <h1 className="hidden md:block text-2xl font-bold text-gray-900">
              {t('title')}
            </h1>
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

        {/* Tabs: las tres comparten la lista de abajo, que es su panel */}
        <GrupoDePestanas actual={activeTab} onElegir={setActiveTab} panelUnico>
          <ListaDePestanas
            etiqueta={t('tabsLabel')}
            className="flex border-b border-gray-200 mb-4"
            data-testid="friend-tabs"
            pestanas={TABS.map((tab) => ({
              id: tab,
              testId: `tab-${tab}`,
              contenido: (
                <>
                  {t(`tabs.${tab}`)}
                  {listByTab[tab].length > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      {listByTab[tab].length}
                    </span>
                  )}
                </>
              ),
            }))}
            claseDePestana={(abierta) =>
              `px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${
                abierta
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`
            }
          />

          {/* List */}
          {/* Vacía no hay nada enfocable dentro: entonces el panel sí es parada */}
          <PanelDePestana enfocable={currentList.length === 0}>
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
                    mode={
                      activeTab === 'friends'
                        ? 'friend'
                        : activeTab === 'received'
                          ? 'received'
                          : 'sent'
                    }
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
          </PanelDePestana>
        </GrupoDePestanas>
      </div>
    </div>
  );
};

export default FriendsPage;
