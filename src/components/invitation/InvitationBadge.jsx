import { useTranslation } from 'react-i18next';
import InvitationStatus from '../../domain/value_objects/InvitationStatus';

const STATUS_COLORS = {
  [InvitationStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
  [InvitationStatus.ACCEPTED]: 'bg-green-100 text-green-800',
  [InvitationStatus.DECLINED]: 'bg-red-100 text-red-800',
  [InvitationStatus.EXPIRED]: 'bg-gray-100 text-gray-600',
  [InvitationStatus.NO_ROOM]: 'bg-orange-100 text-orange-800',
  // La retiró quien invita (FE #724): distinta de la caducada
  [InvitationStatus.CANCELLED]: 'bg-slate-100 text-slate-700',
  // En lista de espera hasta que se reabra la inscripción (15 nov 2026)
  [InvitationStatus.ON_HOLD]: 'bg-amber-100 text-amber-800',
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
