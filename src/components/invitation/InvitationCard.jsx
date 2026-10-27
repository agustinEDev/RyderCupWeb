import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Mail, Clock, User, MessageSquare, ChevronRight } from 'lucide-react';
import InvitationBadge from './InvitationBadge';

// Una sola regla para «Caducada» y para dejar de ofrecer la ficha (/code-review)
const haCaducado = (expiresAt) => Boolean(expiresAt) && new Date(expiresAt) - new Date() <= 0;

// Lo más que espera setTimeout: con más, salta enseguida
const ESPERA_MAXIMA_MS = 2 ** 31 - 1;

// Con la página abierta, la tarjeta se vuelve a pintar cuando caduca: el enlace
// a la ficha no puede quedarse (CodeRabbit)
const useHaCaducado = (expiresAt) => {
  const [, setRepintar] = useState(0);
  useEffect(() => {
    if (!expiresAt) return undefined;
    const falta = new Date(expiresAt) - new Date();
    if (falta <= 0 || falta > ESPERA_MAXIMA_MS) return undefined;
    const reloj = setTimeout(() => setRepintar((n) => n + 1), falta);
    return () => clearTimeout(reloj);
  }, [expiresAt]);
  return haCaducado(expiresAt);
};

const getExpirationText = (expiresAt, t) => {
  if (!expiresAt) return null;

  const diffMs = new Date(expiresAt) - new Date();

  if (haCaducado(expiresAt)) return t('card.expired');

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return t('card.expiresIn', { days: diffDays });
  return t('card.expiresInHours', { hours: diffHours });
};

// La fecha dice qué pasó (FE #724): retirarla y quedarse sin plaza también la
// apuntan en el servidor, y «Respondida» decía que el invitado contestó
const CLAVE_DE_LA_FECHA = {
  CANCELLED: 'card.withdrawnAt',
  NO_ROOM: 'card.noRoomSince',
};

const InvitationCard = ({ invitation, mode, onAccept, onDecline, onWithdraw, onReinvite, isProcessing, t }) => {
  const showActions = mode === 'player' && invitation.isPending;
  const caducada = useHaCaducado(invitation.expiresAt);
  // Quien invita puede retirar una pendiente (FE #724). El jugador no: él la
  // rechaza, y las ya respondidas no estorban en su lista
  const sePuedeRetirar = mode === 'creator' && invitation.isPending && Boolean(onWithdraw);
  const expirationText = invitation.isPending ? getExpirationText(invitation.expiresAt, t) : null;
  // Aceptada, la tarjeta lleva a su competicion (FE #682). Y el organizador ya
  // mira esta lista desde dentro de la competicion
  const enlazaACompeticion = mode === 'player' && invitation.isAccepted && invitation.competitionId;
  // Pendiente, el invitado ya puede mirarla antes de contestar (release social
  // 2): con un enlace propio, porque la tarjeta lleva dentro aceptar y rechazar
  // Caducada ya no deja verla: el servidor tampoco la cuenta (revisor)
  const puedeMirarla = showActions && invitation.competitionId && !caducada;
  const nombre = invitation.competitionName || t('card.for');

  // Aceptada, la tarjeta entera es el enlace: el titulo solo era un blanco
  // demasiado pequeño, y sin raton no se notaba que se podia pulsar
  const Contenedor = enlazaACompeticion ? Link : 'div';
  const propsDelContenedor = enlazaACompeticion
    ? {
        to: `/competitions/${invitation.competitionId}`,
        // Para que «Volver» de la ficha lleve de nuevo aqui
        state: { from: 'invitations' },
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
              {/* El correo no tiene dónde partirse: sin min-w-0 ni wrap-anywhere
                  desbordaba la tarjeta a 360 (FE #826) */}
              <Mail className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="min-w-0 wrap-anywhere">
                {invitation.inviteeName || invitation.inviteeEmail}
              </span>
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

          {puedeMirarla && (
            <Link
              to={`/competitions/${invitation.competitionId}`}
              state={{ from: 'invitations' }}
              // Con varias pendientes, el lector de pantalla las distingue (revisor)
              aria-label={`${t('card.viewCompetition')}: ${nombre}`}
              className="mt-1 inline-flex min-h-11 items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {t('card.viewCompetition')}
              <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          )}

          {invitation.respondedAt && !invitation.isPending && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span data-testid="fecha-de-la-invitacion">
                {CLAVE_DE_LA_FECHA[invitation.status]
                  ? t(CLAVE_DE_LA_FECHA[invitation.status], {
                    date: new Date(invitation.respondedAt).toLocaleDateString(),
                  })
                  : `${t('card.respondedAt')}: ${new Date(invitation.respondedAt).toLocaleDateString()}`}
              </span>
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

        {sePuedeRetirar && (
          <button
            type="button"
            data-testid="withdraw-button"
            onClick={() => onWithdraw(invitation)}
            disabled={isProcessing}
            className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('actions.withdraw')}
          </button>
        )}

        {/* Volver a invitar (release social 2): la página decide a cuáles */}
        {mode === 'creator' && onReinvite && (
          <button
            type="button"
            data-testid="reinvite-button"
            onClick={() => onReinvite(invitation)}
            disabled={isProcessing}
            className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('actions.reinvite')}
          </button>
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
