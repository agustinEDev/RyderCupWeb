import { useTranslation } from 'react-i18next';

/**
 * La barra de entregar la tarjeta, fija abajo en las tres pestañas (FE #745).
 *
 * El botón vivía solo en la pestaña Tarjeta y la pantalla abre en Anotar:
 * quien acababa el 18 no veía nada que le pidiera entregar, y los partidos se
 * quedaban abiertos. En la pantalla del partido no hay navegación inferior,
 * así que la barra ocupa ese sitio.
 *
 * @param {'entregar'|'faltaValidar'|'entregada'} estado
 * @param {string} [marcador] - El resultado, como en la cabecera
 * @param {Function} [onEntregar]
 * @param {boolean} [enviando]
 * @param {boolean} [esFoursomes] - La tarjeta es de la pareja
 * @param {string[]} [pendientes] - Quién falta por entregar
 * @param {boolean} [completado] - Ya no se espera a nadie
 * @param {boolean} [sePuedeSeguir] - Decidido con hoyos por jugar: se avisa de que
 *   se puede seguir, porque quien entrega a mitad deja fuera de su tarjeta los
 *   hoyos que anote después
 */
const BarraDeEntrega = ({
  estado,
  marcador,
  onEntregar,
  enviando = false,
  esFoursomes = false,
  pendientes = [],
  completado = false,
  sePuedeSeguir = false,
}) => {
  const { t } = useTranslation('scoring');

  return (
    <div
      data-testid="barra-de-entrega"
      role="region"
      aria-label={t('submit.matchOver')}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
    >
      <div className="mx-auto max-w-2xl space-y-2">
        {estado === 'entregada' ? (
          <div className="space-y-0.5 text-center text-sm">
            <p className="font-semibold text-green-700">
              {t(esFoursomes ? 'submit.pairSubmitted' : 'submit.alreadySubmitted')}
            </p>
            {completado ? (
              <p className="text-gray-500">{t('submit.matchCompleted')}</p>
            ) : (
              pendientes.length > 0 && (
                <p className="text-gray-500">
                  {esFoursomes
                    ? t('submit.waitingForPair', { names: pendientes.join(' / ') })
                    : t('submit.waitingForPlayers', {
                        count: pendientes.length,
                        names: pendientes.join(', '),
                      })}
                </p>
              )
            )}
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-bold text-gray-900">{t('submit.matchOver')}</p>
              {marcador && <p className="min-w-0 truncate font-bold text-primary">{marcador}</p>}
            </div>
            {estado === 'entregar' ? (
              <button
                type="button"
                onClick={onEntregar}
                disabled={enviando}
                className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
              >
                {t('submit.button')}
              </button>
            ) : (
              <p className="text-center text-sm text-gray-500">{t('submit.notReady')}</p>
            )}
            {sePuedeSeguir && (
              <p className="text-center text-xs text-gray-500">{t('submit.keepPlaying')}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BarraDeEntrega;
