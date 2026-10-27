import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Mail, WifiOff, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import customToast from '../../utils/toast';
import { esFalloDeRed, mensajeDeError } from '../../utils/sinCobertura';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import GeneroParaApuntarseModal from '../../components/profile/GeneroParaApuntarseModal';
import { useResponderInvitacion } from '../../hooks/useResponderInvitacion';
import InvitationCard from '../../components/invitation/InvitationCard';
import { listMyInvitationsUseCase } from '../../composition';
import BlockLoader from '../../components/ui/BlockLoader';

const MyInvitationsPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('invitations');
  const { user, loading: isLoadingUser } = useAuth();

  const [invitations, setInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  // Por qué no se han podido cargar: 'red', 'otro' o null si cargaron. Sin esto
  // la lista vacía decía «No hay invitaciones todavía» sin haberlo podido
  // comprobar (FE #685)
  const [cargaFallida, setCargaFallida] = useState(null);

  const pendingCount = invitations.filter((inv) => inv.isPending).length;

  const loadData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const result = await listMyInvitationsUseCase.execute(
        statusFilter ? { status: statusFilter } : {}
      );
      setInvitations(result.invitations);
      setCargaFallida(null);
    } catch (error) {
      console.error('Error loading invitations:', error);
      setCargaFallida(esFalloDeRed(error) ? 'red' : 'otro');
      customToast.error(
        mensajeDeError(error, {
          sinConexion: t('common:sinConexion.mensaje'),
          generico: t('errors.failedToLoad'),
        })
      );
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, statusFilter]);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing pattern surfaced by eslint-plugin-react-hooks 7.1.1 bump; needs dedicated review (tracked in follow-up)
      loadData();
    }
  }, [user, loadData]);

  // Aceptar o rechazar, con las mismas reglas que el cuadro de la ficha. Al
  // aceptar, a su ficha, con el origen para que «Volver» traiga de nuevo aquí
  const { procesandoId, aceptar, rechazar, preguntaDelGenero } = useResponderInvitacion({
    alAceptar: (result) => {
      if (result?.competitionId) {
        navigate(`/competitions/${result.competitionId}`, { state: { from: 'invitations' } });
      }
    },
    alCambiar: loadData,
  });

  const isPageLoading = isLoadingUser || isLoading;

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

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderAuth user={user} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <h1 className="hidden md:block text-2xl font-bold text-gray-900">{t('player.title')}</h1>
            {/* Si la carga falló, el recuento es de la lista de antes */}
            {pendingCount > 0 && !cargaFallida && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                {t('player.pendingCount', { count: pendingCount })}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">{t('player.subtitle')}</p>
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
            <option value="CANCELLED">{t('status.CANCELLED')}</option>
          </select>
        </div>

        {/* Invitation List */}
        {cargaFallida ? (
          // En vez de la lista, que sería la de antes del fallo o una vacía que
          // afirma algo que no se ha podido comprobar
          <div data-testid="invitaciones-sin-cargar" className="text-center py-12">
            {cargaFallida === 'red' ? (
              <WifiOff className="h-12 w-12 text-gray-400 mx-auto mb-3" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" aria-hidden="true" />
            )}
            <p className="text-gray-700 mb-4">
              {/* «mensaje» y no «aviso»: el aviso dice que lo que se ve puede no
                  estar al día, y aquí no queda nada a la vista */}
              {cargaFallida === 'red' ? t('common:sinConexion.mensaje') : t('errors.failedToLoad')}
            </p>
            <button
              type="button"
              onClick={loadData}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              {t('errors.retry')}
            </button>
          </div>
        ) : invitations.length === 0 ? (
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
                mode="player"
                onAccept={aceptar}
                onDecline={rechazar}
                isProcessing={procesandoId === invitation.id}
                t={t}
              />
            ))}
          </div>
        )}
      </div>

      <GeneroParaApuntarseModal {...preguntaDelGenero} />
    </div>
  );
};

export default MyInvitationsPage;
