import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Plus, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import customToast from '../../utils/toast';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import { useUserRoles } from '../../hooks/useUserRoles';
import InvitationCard from '../../components/invitation/InvitationCard';
import SendInvitationModal from '../../components/invitation/SendInvitationModal';
import {
  getCompetitionDetailUseCase,
  listCompetitionInvitationsUseCase,
  listEnrollmentsUseCase,
  listFriendsUseCase,
  searchUsersUseCase,
  sendInvitationByEmailUseCase,
  sendInvitationUseCase,
} from '../../composition';
import BlockLoader from '../../components/ui/BlockLoader';

const InvitationsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useTranslation('invitations');
  const { user, loading: isLoadingUser } = useAuth();
  const { isAdmin, isCreator: hasCreatorRole, isLoading: isLoadingRoles } = useUserRoles(id);

  const [competition, setCompetition] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [showSendModal, setShowSendModal] = useState(false);
  // Para la pestaña de amigos del modal (FE #409)
  const [friends, setFriends] = useState([]);
  const [idsInscritos, setIdsInscritos] = useState([]);
  const [idsInvitados, setIdsInvitados] = useState([]);
  const [cargandoAmigos, setCargandoAmigos] = useState(false);
  const [falloAlCargarAmigos, setFalloAlCargarAmigos] = useState(false);

  const canManage = isAdmin || hasCreatorRole;

  const loadData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const [compData, invResult] = await Promise.all([
        getCompetitionDetailUseCase.execute(id),
        listCompetitionInvitationsUseCase.execute(id, statusFilter ? { status: statusFilter } : {}),
      ]);

      setCompetition(compData);
      setInvitations(invResult.invitations);
      setTotalCount(invResult.totalCount);
    } catch (error) {
      console.error('Error loading invitations:', error);
      customToast.error(error.message || t('errors.failedToLoad'));
      navigate(`/competitions/${id}`);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user, statusFilter, navigate]);

  // Los amigos y la situación de cada uno se piden APARTE, no dentro del
  // `Promise.all` de arriba: colgarlos ahí haría que un fallo suyo tumbara la
  // pantalla entera, cuando lo único que se pierde es saber a quién no ofrecer
  // (FE #409)
  useEffect(() => {
    if (!user?.id || !showSendModal) return;

    let vigente = true;
    // En una microtarea y no aquí mismo: llamar a setState de forma síncrona
    // dentro del efecto encadena renders, y el linter lo dice con razón
    globalThis.queueMicrotask(() => {
      if (!vigente) return;
      setCargandoAmigos(true);
      setFalloAlCargarAmigos(false);
    });

    // `limit` explícito: `/friends/me` pagina de 20 en 20, y la pestaña de
    // amigos es ahora la primera que se ve. Con 25 amigos se veían 20 y los
    // otros 5 simplemente no existían
    listFriendsUseCase
      .execute(user.id, { limit: 100 })
      .then((res) => {
        if (!vigente) return;
        setFriends(res.friendships ?? []);
      })
      .catch(() => {
        if (!vigente) return;
        // Vaciar la lista diría «no tienes amigos», que es afirmar lo que no se
        // ha podido preguntar. Se distingue de no tenerlos
        setFriends([]);
        setFalloAlCargarAmigos(true);
      })
      .finally(() => {
        if (vigente) setCargandoAmigos(false);
      });

    // Solo APPROVED: sin filtro vienen también REQUESTED, REJECTED, CANCELLED e
    // INVITED, y quien se retiró o fue rechazado SÍ se puede volver a invitar.
    // Marcarlos habría bloqueado a quien el backend acepta sin problema
    listEnrollmentsUseCase
      .execute(id, { status: 'APPROVED' })
      .then((res) => {
        if (!vigente) return;
        const inscripciones = Array.isArray(res) ? res : (res?.enrollments ?? []);
        setIdsInscritos(inscripciones.map((e) => e.userId ?? e.user_id).filter(Boolean));
      })
      .catch(() => {
        if (vigente) setIdsInscritos([]);
      });

    // Las invitaciones pendientes se piden aparte y sin el filtro de la pantalla:
    // `invitations` está filtrada por lo que el creador haya elegido arriba y
    // paginada de 20 en 20, así que con el desplegable en «Aceptadas» no habría
    // ninguna pendiente y se ofrecería invitar a quien ya está invitado
    listCompetitionInvitationsUseCase
      .execute(id, { status: 'PENDING', limit: 100 })
      .then((res) => {
        if (!vigente) return;
        setIdsInvitados((res.invitations ?? []).map((inv) => inv.inviteeUserId).filter(Boolean));
      })
      .catch(() => {
        if (vigente) setIdsInvitados([]);
      });

    return () => {
      vigente = false;
    };
  }, [user?.id, id, showSendModal]);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing pattern surfaced by eslint-plugin-react-hooks 7.1.1 bump; needs dedicated review (tracked in follow-up)
      loadData();
    }
  }, [user, loadData]);

  const handleSendInvitation = async (email, personalMessage) => {
    setIsProcessing(true);
    try {
      await sendInvitationByEmailUseCase.execute(id, email, personalMessage);
      customToast.success(t('success.sent'));
      setShowSendModal(false);
      await loadData();
    } catch (error) {
      console.error('Error sending invitation:', error);
      if (error.message?.includes('409')) {
        customToast.error(t('errors.duplicateInvitation'));
      } else {
        customToast.error(error.message || t('errors.failedToSend'));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendByUserId = async (userId, personalMessage) => {
    setIsProcessing(true);
    try {
      await sendInvitationUseCase.execute(id, userId, personalMessage);
      customToast.success(t('success.sent'));
      setShowSendModal(false);
      await loadData();
    } catch (error) {
      console.error('Error sending invitation:', error);
      if (error.message?.includes('409')) {
        customToast.error(t('errors.duplicateInvitation'));
      } else {
        customToast.error(error.message || t('errors.failedToSend'));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSearchUsers = async (query) => {
    if (!query || query.trim().length < 2) return [];
    // El fallo se propaga al modal, como en FriendsPage: devolviendo [] se
    // presentaba una API caida como una busqueda sin resultados, y el modal
    // enseñaba «no se ha encontrado a nadie» por un error de red.
    return searchUsersUseCase.execute(query);
  };

  const isPageLoading = isLoadingUser || isLoadingRoles || isLoading;

  if (isPageLoading) {
    // La cabecera se queda puesta durante la espera: aparecer de golpe al
    // terminar es un salto, y de eso va justamente FE #495. El dibujo si es el
    // compartido.
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth user={user} />
        <BlockLoader texto={t('loading')} />
      </div>
    );
  }

  if (!canManage) {
    navigate(`/competitions/${id}`);
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderAuth user={user} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/competitions/${id}`)}
            className="hidden md:flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {competition?.name || 'Back'}
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="hidden md:block text-2xl font-bold text-gray-900">{t('creator.title')}</h1>
              <p className="text-sm text-gray-500 mt-1">{t('creator.subtitle')}</p>
              {totalCount > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  {t('creator.sentCount', { count: totalCount })}
                </p>
              )}
            </div>

            <button
              onClick={() => {
                const acceptedCount = invitations.filter(inv => inv.status === 'ACCEPTED').length;
                if (competition?.maxPlayers && acceptedCount >= competition.maxPlayers - 1) {
                  customToast.warning(t('creator.nearCapacity', { accepted: acceptedCount, max: competition.maxPlayers }));
                }
                setShowSendModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {t('creator.sendNew')}
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            data-testid="status-filter"
          >
            <option value="">{t('filter.allStatuses')}</option>
            <option value="PENDING">{t('status.PENDING')}</option>
            <option value="ACCEPTED">{t('status.ACCEPTED')}</option>
            <option value="DECLINED">{t('status.DECLINED')}</option>
            <option value="EXPIRED">{t('status.EXPIRED')}</option>
          </select>
        </div>

        {/* Invitation List */}
        {invitations.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t('noInvitations')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <InvitationCard
                key={invitation.id}
                invitation={invitation}
                mode="creator"
                t={t}
              />
            ))}
          </div>
        )}
      </div>

      {/* Send Modal */}
      <SendInvitationModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        onSend={handleSendInvitation}
        onSendByUserId={handleSendByUserId}
        onSearchUsers={handleSearchUsers}
        isProcessing={isProcessing}
        t={t}
        friends={friends}
        idsInvitados={idsInvitados}
        idsInscritos={idsInscritos}
        cargandoAmigos={cargandoAmigos}
        falloAlCargarAmigos={falloAlCargarAmigos}
      />
    </div>
  );
};

export default InvitationsPage;
