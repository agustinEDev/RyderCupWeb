import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import TeeColorBadge from '../golf_course/TeeColorBadge';

// Los motivos que esta versión sabe contar. Uno que el servidor añada mañana
// sale como «inesperado»: enseñar su clave no le dice nada a nadie
// Y lo mismo con lo que le falta a cada jugador
const FALTAS_CONOCIDAS = new Set(['GENDER', 'TEE_COLOR', 'ENROLLMENT']);

const MOTIVOS_CONOCIDOS = new Set([
  'PLAYERS_WITHOUT_TEE',
  'NOT_ENOUGH_PLAYERS',
  'NO_TEAMS',
  'NO_GOLF_COURSE',
  'UNEXPECTED',
  'ENROLLMENT_OPEN',
]);

/**
 * Por qué una sesión con los sobres abiertos se quedó sin partidos (BE #361).
 *
 * Los partidos se crean al abrirse los sobres, sin nadie mirando. Cuando no
 * pueden crearse, lo útil es decir A QUIÉN le falta QUÉ: con doce jugadores,
 * «no se ha podido» deja al organizador sin saber a quién arreglar.
 *
 * @param {Object} props
 * @param {{reason: string, players: Array}|null} props.bloqueo
 * @param {boolean} [props.puedeReintentar=false] - Si quien mira tiene el botón
 *   de «Generar Partidos». A un jugador, mandarle a pulsarlo era un texto cierto
 *   solo para el organizador
 */
const BloqueoDePartidos = ({ bloqueo, puedeReintentar = false }) => {
  const { t } = useTranslation('schedule');
  if (!bloqueo) return null;

  const motivo = MOTIVOS_CONOCIDOS.has(bloqueo.reason) ? bloqueo.reason : 'UNEXPECTED';
  const jugadores = bloqueo.players || [];

  return (
    <div
      data-testid="bloqueo-de-partidos"
      role="alert"
      className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
    >
      <p className="flex items-start gap-2 font-semibold">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{t('generationBlock.title')}</span>
      </p>
      {jugadores.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {jugadores.map((jugador) => (
            <li
              key={jugador.userId}
              data-testid={`falta-${jugador.userId}`}
              className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1"
            >
              <span className="font-medium">{jugador.name}</span>
              <span>
                {t(
                  `generationBlock.missing.${
                    FALTAS_CONOCIDAS.has(jugador.missing) ? jugador.missing : 'OTHER'
                  }`
                )}
              </span>
              {jugador.teeColor && <TeeColorBadge color={jugador.teeColor} />}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1">{t(`generationBlock.reason.${motivo}`)}</p>
      )}
      {puedeReintentar && (
        <p className="mt-2 text-xs text-amber-800">{t('generationBlock.retry')}</p>
      )}
    </div>
  );
};

export default BloqueoDePartidos;
