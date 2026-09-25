import { useState, useEffect, useCallback } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
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

// Ni `/friends/me` ni el listado de invitaciones dan más de 100 filas por
// página. Pedir una sola dejaba fuera al amigo 101 y a la invitación pendiente
// 101, y una pendiente que no se ve es una invitación que se manda otra vez
const POR_PAGINA = 100;
// Una red por si el total promete más de lo que el servidor acaba dando: sin
// ella, un `total_count` equivocado deja el bucle dando vueltas
const TOPE_DE_PAGINAS = 20;

/**
 * Recorre las páginas de un listado hasta tenerlo entero.
 *
 * @param {(page: number) => Promise<Object>} pideLaPagina
 * @param {(res: Object) => Array} sacaLasFilas
 * @returns {Promise<Array>}
 */
const todasLasPaginas = async (pideLaPagina, sacaLasFilas) => {
  const filas = [];
  for (let pagina = 1; pagina <= TOPE_DE_PAGINAS; pagina++) {
    const respuesta = await pideLaPagina(pagina);
    const lote = sacaLasFilas(respuesta);
    filas.push(...lote);
    // Una página incompleta ya es la última, y el total manda sobre el resto
    if (lote.length < POR_PAGINA || filas.length >= (respuesta?.totalCount ?? filas.length)) break;
  }
  return filas;
};

// Solo se invita con la inscripción por abrir o abierta: es lo que acepta el
// servidor (#710). Cerrada, en juego o terminada, no
const SE_PUEDE_INVITAR = new Set(['DRAFT', 'ACTIVE']);

const InvitationsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useTranslation('invitations');
  const { user, loading: isLoadingUser } = useAuth();
  const {
    isAdmin,
    isCreator: hasCreatorRole,
    isLoading: isLoadingRoles,
    error: falloAlPedirLosPermisos,
    refetch: volverAPedirLosPermisos,
  } = useUserRoles(id);

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
  const [falloAlComprobarSituacion, setFalloAlComprobarSituacion] = useState(false);
  const [falloAlCargar, setFalloAlCargar] = useState(false);

  const canManage = isAdmin || hasCreatorRole;

  // `silencioso`: tras invitar, el listado se pone al día sin la pantalla de
  // carga, que desmontaba el modal abierto (#710)
  const loadData = useCallback(async ({ silencioso = false } = {}) => {
    if (!user) return;

    if (!silencioso) setIsLoading(true);
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
      // Marcar y que decida el render, en vez de irse desde aquí: esta carga y
      // la de los permisos van por su cuenta, y salir corriendo la primera se
      // llevaba por delante el aviso de la otra (FE #656)
      setFalloAlCargar(true);
    } finally {
      if (!silencioso) setIsLoading(false);
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
      setFalloAlComprobarSituacion(false);
    });

    const amigos = todasLasPaginas(
      (page) => listFriendsUseCase.execute(user.id, { limit: POR_PAGINA, page }),
      (res) => res.friendships ?? []
    );

    // Solo APPROVED: sin filtro vienen también REQUESTED, REJECTED, CANCELLED e
    // INVITED, y quien se retiró o fue rechazado SÍ se puede volver a invitar.
    // Marcarlos habría bloqueado a quien el backend acepta sin problema
    const inscritos = listEnrollmentsUseCase
      .execute(id, { status: 'APPROVED' })
      .then((res) => {
        const inscripciones = Array.isArray(res) ? res : (res?.enrollments ?? []);
        return inscripciones.map((e) => e.userId ?? e.user_id).filter(Boolean);
      });

    // Las pendientes se piden aparte y sin el filtro de la pantalla:
    // `invitations` está filtrada por lo que el creador haya elegido arriba y
    // paginada, así que con el desplegable en «Aceptadas» no habría ninguna
    // pendiente y se ofrecería invitar a quien ya está invitado
    const invitados = todasLasPaginas(
      (page) => listCompetitionInvitationsUseCase.execute(id, { status: 'PENDING', limit: POR_PAGINA, page }),
      (res) => res.invitations ?? []
    ).then((lista) => lista.map((inv) => inv.inviteeUserId).filter(Boolean));

    // Las tres a la vez, pero la pestaña no se da por cargada hasta que están
    // las tres: con solo los amigos, las filas salían pulsables durante un
    // instante y se podía invitar a quien ya estaba dentro
    Promise.allSettled([amigos, inscritos, invitados]).then(([losAmigos, losInscritos, losInvitados]) => {
      if (!vigente) return;

      // Vaciar la lista diría «no tienes amigos», que es afirmar lo que no se
      // ha podido preguntar. Se distingue de no tenerlos
      setFriends(losAmigos.status === 'fulfilled' ? losAmigos.value : []);
      setFalloAlCargarAmigos(losAmigos.status === 'rejected');

      setIdsInscritos(losInscritos.status === 'fulfilled' ? losInscritos.value : []);
      setIdsInvitados(losInvitados.status === 'fulfilled' ? losInvitados.value : []);
      // Si no se sabe quién está ya dentro, no se ofrece a nadie: darlo por
      // vacío habilitaba justo a quien el servidor va a rechazar
      setFalloAlComprobarSituacion(
        losInscritos.status === 'rejected' || losInvitados.status === 'rejected'
      );

      setCargandoAmigos(false);
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
      // Abierto, para invitar al siguiente sin volver a abrirlo (#710)
      loadData({ silencioso: true });
      return true;
    } catch (error) {
      console.error('Error sending invitation:', error);
      if (error.message?.includes('409')) {
        customToast.error(t('errors.duplicateInvitation'));
      } else {
        customToast.error(error.message || t('errors.failedToSend'));
      }
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendByUserId = async (userId, personalMessage) => {
    setIsProcessing(true);
    try {
      await sendInvitationUseCase.execute(id, userId, personalMessage);
      customToast.success(t('success.sent'));
      // Abierto, y el invitado ya como tal: el siguiente sin volver a abrirlo (#710)
      setIdsInvitados((antes) => [...antes, userId]);
      loadData({ silencioso: true });
      return true;
    } catch (error) {
      console.error('Error sending invitation:', error);
      if (error.message?.includes('409')) {
        customToast.error(t('errors.duplicateInvitation'));
      } else {
        customToast.error(error.message || t('errors.failedToSend'));
      }
      return false;
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

  // Si la competición deja de admitir invitaciones con el modal abierto, se
  // cierra: si no, se mandaba una que el servidor rechaza (CodeRabbit, #720)
  const sePuedeInvitar = !competition || SE_PUEDE_INVITAR.has(competition.status);

  // `useUserRoles` deja los tres roles a false ante CUALQUIER error, así que un
  // 500 o un corte de red se parecen a «no tienes permiso». Echar por eso sería
  // afirmar lo que no se ha podido preguntar, y con `replace` ni siquiera
  // quedaría el atrás para reintentar
  if (falloAlPedirLosPermisos) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth user={user} />
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="py-12 text-center" data-testid="roles-error">
            <p className="text-sm text-gray-600 mb-4">{t('errors.rolesCheckFailed')}</p>
            <button
              type="button"
              onClick={volverAPedirLosPermisos}
              data-testid="roles-retry"
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              {t('errors.retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

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

  // Sin datos no hay pantalla que enseñar, así que se sale — pero después del
  // aviso de permisos, que es el que sabe si se puede reintentar
  if (falloAlCargar) {
    return <Navigate to={`/competitions/${id}`} replace />;
  }

  // Un elemento y no `navigate()`: llamarlo aquí cambia el router en pleno
  // render («Cannot update a component while rendering a different component»),
  // y sin `replace` la pantalla prohibida se queda en el historial, así que
  // atrás vuelve a ella y de ahí no se sale (FE #656)
  if (!canManage) {
    return <Navigate to={`/competitions/${id}`} replace />;
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

            {/* Cerrada la inscripción no quedan plazas: el servidor ya no deja
                invitar (#710). La lista sigue, que es donde se ve quién se
                quedó sin plaza */}
            {!sePuedeInvitar ? (
              <p data-testid="invitar-cerrada" className="text-sm text-gray-500 max-w-xs">
                {t('creator.enrollmentClosed')}
              </p>
            ) : (
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
            )}
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
            <option value="NO_ROOM">{t('status.NO_ROOM')}</option>
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
        isOpen={showSendModal && sePuedeInvitar}
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
        falloAlComprobarSituacion={falloAlComprobarSituacion}
      />
    </div>
  );
};

export default InvitationsPage;
