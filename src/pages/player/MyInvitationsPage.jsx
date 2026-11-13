import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Mail, WifiOff, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import customToast from '../../utils/toast';
import { esFalloDeRed, mensajeDeError } from '../../utils/sinCobertura';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import { useCargaCancelableEffect } from '../../hooks/useCargaCancelableEffect';
import GeneroParaApuntarseModal from '../../components/profile/GeneroParaApuntarseModal';
import { useResponderInvitacion } from '../../hooks/useResponderInvitacion';
import InvitationCard from '../../components/invitation/InvitationCard';
import AvisoVerificaParaVerInvitaciones from '../../components/invitation/AvisoVerificaParaVerInvitaciones';
import { listMyInvitationsUseCase } from '../../composition';
import BlockLoader from '../../components/ui/BlockLoader';
import { PANTALLA_MENOS_BARRA_INFERIOR } from '../../utils/barraInferior';

const MyInvitationsPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('invitations');
  const { user, loading: isLoadingUser } = useAuth();

  const [invitations, setInvitations] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  // Por qué no se han podido cargar: 'red', 'otro' o null si cargaron. Sin esto
  // la lista vacía decía «No hay invitaciones todavía» sin haberlo podido
  // comprobar (FE #685)
  const [cargaFallida, setCargaFallida] = useState(null);

  const pendingCount = invitations.filter((inv) => inv.isPending).length;

  // La lista, con el filtro elegido. Si se cambia de filtro con una en vuelo,
  // la del filtro anterior ni se pinta ni avisa de su fallo
  const { cargando, recargar } = useCargaCancelableEffect(
    () => listMyInvitationsUseCase.execute(statusFilter ? { status: statusFilter } : {}),
    [user, statusFilter],
    {
      activa: Boolean(user),
      alCargar: (result) => {
        setInvitations(result.invitations);
        setCargaFallida(null);
      },
      alFallar: (error) => {
        console.error('Error loading invitations:', error);
        setCargaFallida(esFalloDeRed(error) ? 'red' : 'otro');
        customToast.error(
          mensajeDeError(error, {
            sinConexion: t('common:sinConexion.mensaje'),
            generico: t('errors.failedToLoad'),
          })
        );
      },
    }
  );
  // Sin usuario no se pide nada y se sigue esperando, como antes
  const isLoading = cargando || !user;

  // Aceptar o rechazar, con las mismas reglas que el cuadro de la ficha. Al
  // aceptar, a su ficha, con el origen para que «Volver» traiga de nuevo aquí
  const { seEstaRespondiendo, aceptar, rechazar, preguntaDelGenero } = useResponderInvitacion({
    alAceptar: (result) => {
      if (result?.competitionId) {
        navigate(`/competitions/${result.competitionId}`, { state: { from: 'invitations' } });
      }
    },
    // Releer con la espera, como antes; se espera a que llegue
    alCambiar: () => recargar(),
  });

  const isPageLoading = isLoadingUser || isLoading;

  if (isPageLoading) {
    // La cabecera se queda puesta durante la espera: aparecer de golpe al
    // terminar es un salto, y de eso va justamente FE #495. El dibujo si es el
    // compartido.
    return (
      <div className={`${PANTALLA_MENOS_BARRA_INFERIOR} bg-gray-50`}>
        <HeaderAuth user={user} />
        <BlockLoader texto={t('loading')} />
      </div>
    );
  }

  return (
    <div className={`${PANTALLA_MENOS_BARRA_INFERIOR} bg-gray-50`}>
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

        {/* Sin el correo verificado no llegan las enviadas a su dirección (fase 3) */}
        {user?.email_verified === false && <AvisoVerificaParaVerInvitaciones correo={user.email} />}

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
              onClick={() => recargar()}
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
                isProcessing={seEstaRespondiendo(invitation.id)}
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
