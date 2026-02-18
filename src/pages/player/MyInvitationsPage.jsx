import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import customToast from '../../utils/toast';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import InvitationCard from '../../components/invitation/InvitationCard';
import {
  listMyInvitationsUseCase,
  respondToInvitationUseCase,
} from '../../composition';

const MyInvitationsPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('invitations');
  const { user, loading: isLoadingUser } = useAuth();

  const [invitations, setInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  const pendingCount = invitations.filter((inv) => inv.isPending).length;

  const loadData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const result = await listMyInvitationsUseCase.execute(
        statusFilter ? { status: statusFilter } : {}
      );
      setInvitations(result.invitations);
    } catch (error) {
      console.error('Error loading invitations:', error);
      customToast.error(error.message || t('errors.failedToLoad'));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, statusFilter]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const handleAccept = async (invitationId) => {
    setProcessingId(invitationId);
    try {
      await respondToInvitationUseCase.execute(invitationId, 'ACCEPT');
      customToast.success(t('success.accepted'));
      await loadData();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      customToast.error(error.message || t('errors.failedToRespond'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitationId) => {
    setProcessingId(invitationId);
    try {
      await respondToInvitationUseCase.execute(invitationId, 'DECLINE');
      customToast.success(t('success.declined'));
      await loadData();
    } catch (error) {
      console.error('Error declining invitation:', error);
      customToast.error(error.message || t('errors.failedToRespond'));
    } finally {
      setProcessingId(null);
    }
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

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderAuth user={user} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{t('player.title')}</h1>
            {pendingCount > 0 && (
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
                mode="player"
                onAccept={handleAccept}
                onDecline={handleDecline}
                isProcessing={processingId === invitation.id}
                t={t}
              />
            ))}
          </div>
        )}

        {/* View competition links */}
        {invitations.some((inv) => inv.isAccepted) && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-800">
              {invitations
                .filter((inv) => inv.isAccepted)
                .map((inv) => (
                  <button
                    key={inv.id}
                    onClick={() => navigate(`/competitions/${inv.competitionId}`)}
                    className="underline hover:no-underline mr-4"
                  >
                    {inv.competitionName}
                  </button>
                ))}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyInvitationsPage;
