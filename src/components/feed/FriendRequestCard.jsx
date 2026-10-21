import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import Avatar from '../ui/Avatar';
import FraseDeActividad, { NombreDePersona } from './FraseDeActividad';
import { fraseCon, horaDeLaTarjeta, personaDe } from './textosDeActividad';

/**
 * FriendRequestCard - Una solicitud de amistad en Actividad (FE-1).
 *
 * Se acepta o se rechaza ahí mismo. Aceptada, la tarjeta se queda diciendo
 * «Ahora sois amigos»; rechazada, la quita la página. Mientras se envía, los
 * dos botones se desactivan para no mandar dos respuestas.
 *
 * @param {'pendiente'|'enviando'|'aceptada'} estado
 */
const FriendRequestCard = ({ solicitud, autores, estado, onAceptar, onRechazar, ahora = new Date() }) => {
  const { t, i18n } = useTranslation(['feed', 'common']);
  const persona = personaDe(solicitud.requesterId, autores, t);
  const hora = horaDeLaTarjeta(solicitud.createdAt, ahora, t, i18n.language);
  const enviando = estado === 'enviando';
  const aceptada = estado === 'aceptada';

  return (
    <article
      data-testid={`solicitud-${solicitud.friendshipId}`}
      className={`flex gap-3 p-4 bg-white border rounded-lg ${
        solicitud.nueva ? 'border-primary-300' : 'border-gray-200'
      }`}
    >
      {persona.enlace ? (
        <Link to={persona.enlace} className="shrink-0" aria-hidden="true" tabIndex={-1}>
          <Avatar userId={solicitud.requesterId} size="md" />
        </Link>
      ) : (
        <span className="shrink-0">
          <Avatar userId={solicitud.requesterId} size="md" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        {aceptada ? (
          <p className="text-sm text-gray-800 break-words">
            <NombreDePersona persona={persona} />
            <span className="mt-0.5 flex items-center gap-1 text-emerald-700">
              <Check className="h-4 w-4" aria-hidden="true" />
              {t('feed:requests.nowFriends')}
            </span>
          </p>
        ) : (
          <p className="text-sm text-gray-800 break-words">
            <FraseDeActividad frase={fraseCon(t, 'feed:requests.wants', {}, { persona })} />
          </p>
        )}

        <p className="mt-1 flex items-center gap-2 text-xs text-gray-400">
          {hora && <span>{hora}</span>}
          {solicitud.nueva && (
            <span
              data-testid="marca-nueva"
              className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none text-white"
            >
              {t('feed:new')}
            </span>
          )}
        </p>

        {!aceptada && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onAceptar}
              disabled={enviando}
              className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
            >
              {t('feed:requests.accept')}
            </button>
            <button
              type="button"
              onClick={onRechazar}
              disabled={enviando}
              className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {t('feed:requests.reject')}
            </button>
          </div>
        )}
      </div>
    </article>
  );
};

export default FriendRequestCard;
