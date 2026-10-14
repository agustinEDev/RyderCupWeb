import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy } from 'lucide-react';
import { getCompetitionStandingsUseCase, getScratchStandingsUseCase } from '../../composition';
import Clasificacion from './Clasificacion';

// Con la competición en juego, cada cuánto se relee la pestaña abierta
const CADA = 60000;
const PESTANAS = ['overall', 'scratch'];

/**
 * La sección «Clasificación» de la ficha de un Stableford o un Medal (FE #824,
 * PR 8; decidido con Agustín el 11 oct 2026): pestañas General (con filtro de
 * categoría, categoría y tarjetas de cada uno y la regla del torneo) y
 * Scratch (corte en el 25.º; quien queda fuera ve su fila debajo). La ve
 * cualquiera con sesión. Se relee cada 60 s solo con la competición en juego
 * y la pestaña a la vista; acabada, una lectura.
 *
 * @param {Object} props
 * @param {string} props.competitionId
 * @param {string} [props.userId] - Quién mira, destacado
 * @param {boolean} props.enJuego - Si la competición está en juego
 * @param {number} [props.version] - Sube cuando cambian las partidas: se relee
 */
const ClasificacionesDeLaCompeticion = ({ competitionId, userId, enJuego, version }) => {
  const { t } = useTranslation('scoring');
  const [pestana, setPestana] = useState('overall');
  const pedirGeneral = useCallback(
    (categoria) => getCompetitionStandingsUseCase.execute(competitionId, categoria),
    [competitionId]
  );
  const pedirScratch = useCallback(() => getScratchStandingsUseCase.execute(competitionId), [competitionId]);
  const cada = enJuego ? CADA : null;

  return (
    <section data-testid="clasificaciones" className="space-y-3 rounded-xl border border-gray-200 bg-white px-3 py-4 shadow-sm">
      <h3 className="flex items-center gap-2 px-1 text-base font-semibold text-gray-900">
        <Trophy className="h-5 w-5 text-green-600" />
        {t('partida.standingsTitle')}
      </h3>
      <div role="tablist" aria-label={t('partida.standingsTitle')} className="flex border-b border-gray-200">
        {PESTANAS.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            id={`clasificacion-${p}`}
            aria-controls={`panel-clasificacion-${p}`}
            aria-selected={pestana === p}
            onClick={() => setPestana(p)}
            className={`min-h-11 flex-1 border-b-2 text-sm font-medium ${
              pestana === p ? 'border-primary text-primary' : 'border-transparent text-gray-500'
            }`}
          >
            {t(`partida.${p}`)}
          </button>
        ))}
      </div>
      {/* Montadas las dos: cada una se pide al abrirse y deja de releerse al cerrarse */}
      <div id="panel-clasificacion-overall" role="tabpanel" aria-labelledby="clasificacion-overall" hidden={pestana !== 'overall'}>
        <Clasificacion
          pedir={pedirGeneral}
          userId={userId}
          activa={pestana === 'overall'}
          cada={cada}
          version={version}
          conRegla
          centraEnMi="una"
          vacia="partida.noResultsYet"
        />
      </div>
      <div id="panel-clasificacion-scratch" role="tabpanel" aria-labelledby="clasificacion-scratch" hidden={pestana !== 'scratch'}>
        <Clasificacion
          pedir={pedirScratch}
          userId={userId}
          activa={pestana === 'scratch'}
          cada={cada}
          version={version}
          filtrable={false}
          conRegla
          centraEnMi="una"
          vacia="partida.noResultsYet"
        />
      </div>
    </section>
  );
};

export default ClasificacionesDeLaCompeticion;
