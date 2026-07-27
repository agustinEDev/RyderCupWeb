import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Loader, Zap, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import { listMyQuickMatchesUseCase } from '../../composition';

const STATUS_STYLES = {
  PENDING: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const MyQuickMatchesPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('quickMatch');
  const { user, loading: isLoadingUser } = useAuth();

  const [quickMatches, setQuickMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;

    listMyQuickMatchesUseCase
      .execute({ page: 1, limit: 50 })
      .then((result) => setQuickMatches(result.quickMatches))
      .catch((err) => setError(err))
      .finally(() => setIsLoading(false));
  }, [user]);

  if (isLoadingUser || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth user={user} />
        <div className="flex items-center justify-center h-64">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderAuth user={user} />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-3"
        >
          &larr; {t('scoring.backToDashboard')}
        </button>

        <h1 className="text-xl font-bold text-gray-900 mb-4">{t('history.title')}</h1>

        {error && (
          <p className="text-sm text-red-600 mb-4">{error.message || t('scoring.errors.generic')}</p>
        )}

        {quickMatches.length === 0 ? (
          <p className="text-sm text-gray-500">{t('history.empty')}</p>
        ) : (
          <ul className="space-y-2" data-testid="quick-match-history-list">
            {quickMatches.map((qm) => (
              <li key={qm.id}>
                <button
                  onClick={() => navigate(`/quick-matches/${qm.id}/scoring`)}
                  data-testid={`quick-match-history-item-${qm.id}`}
                  className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-sm transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <Zap className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {qm.name || t(`history.format.${qm.matchFormat}`, qm.matchFormat)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {qm.name && `${t(`history.format.${qm.matchFormat}`, qm.matchFormat)} · `}
                        {new Date(qm.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_STYLES[qm.status]}`}>
                      {t(`history.status.${qm.status}`, qm.status)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MyQuickMatchesPage;
