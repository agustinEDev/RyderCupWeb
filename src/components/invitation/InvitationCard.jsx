import { Link } from 'react-router';
import { Mail, Clock, User, MessageSquare, ChevronRight } from 'lucide-react';
import InvitationBadge from './InvitationBadge';

const getExpirationText = (expiresAt, t) => {
  if (!expiresAt) return null;

  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry - now;

  if (diffMs <= 0) return t('card.expired');

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return t('card.expiresIn', { days: diffDays });
  return t('card.expiresInHours', { hours: diffHours });
};

const InvitationCard = ({ invitation, mode, onAccept, onDecline, isProcessing, t }) => {
  const showActions = mode === 'player' && invitation.isPending;
  const expirationText = invitation.isPending ? getExpirationText(invitation.expiresAt, t) : null;
  // Aceptada, la tarjeta lleva a su competicion (FE #682). Pendiente no: si un
  // invitado puede abrir una privada antes de aceptar lo decide RyderCupAM#329.
  // Y el organizador ya mira esta lista desde dentro de la competicion
  const enlazaACompeticion = mode === 'player' && invitation.isAccepted && invitation.competitionId;
  const nombre = invitation.competitionName || t('card.for');

  // Aceptada, la tarjeta entera es el enlace: el titulo solo era un blanco
  // demasiado pequeño, y sin raton no se notaba que se podia pulsar
  const Contenedor = enlazaACompeticion ? Link : 'div';
  const propsDelContenedor = enlazaACompeticion
    ? {
        to: `/competitions/${invitation.competitionId}`,
        className:
          'block bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:border-primary hover:shadow-md transition-all',
      }
    : { className: 'bg-white rounded-lg border border-gray-200 p-4 shadow-sm' };

  return (
    <Contenedor data-testid="invitation-card" {...propsDelContenedor}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {nombre}
            </h3>
            <InvitationBadge status={invitation.status} />
          </div>

          {mode === 'player' && invitation.inviterName && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
              <User className="h-3.5 w-3.5" />
              <span>{t('card.from')}: {invitation.inviterName}</span>
            </div>
          )}

          {mode === 'creator' && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
              <Mail className="h-3.5 w-3.5" />
              <span>{invitation.inviteeName || invitation.inviteeEmail}</span>
            </div>
          )}

          {invitation.personalMessage && (
            <div className="flex items-start gap-1.5 text-xs text-gray-500 mt-1.5">
              <MessageSquare className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{invitation.personalMessage}</span>
            </div>
          )}

          {expirationText && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>{expirationText}</span>
            </div>
          )}

          {invitation.respondedAt && !invitation.isPending && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>{t('card.respondedAt')}: {new Date(invitation.respondedAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {showActions && (
          <div className="flex flex-col gap-2 flex-shrink-0">
            <button
              data-testid="accept-button"
              onClick={() => onAccept?.(invitation.id)}
              disabled={isProcessing}
              className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? t('actions.accepting') : t('actions.accept')}
            </button>
            <button
              data-testid="decline-button"
              onClick={() => onDecline?.(invitation.id)}
              disabled={isProcessing}
              className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? t('actions.declining') : t('actions.decline')}
            </button>
          </div>
        )}

        {enlazaACompeticion && (
          <ChevronRight
            data-testid="abre-competicion"
            aria-hidden="true"
            className="h-5 w-5 flex-shrink-0 self-center text-gray-400"
          />
        )}
      </div>
    </Contenedor>
  );
};

export default InvitationCard;
