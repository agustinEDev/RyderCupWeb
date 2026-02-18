import { useTranslation } from 'react-i18next';

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  DECLINED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-600',
};

const InvitationBadge = ({ status }) => {
  const { t } = useTranslation('invitations');

  const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-600';

  return (
    <span
      data-testid="invitation-badge"
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
    >
      {t(`status.${status}`)}
    </span>
  );
};

export default InvitationBadge;
