import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCompetitionStandingsUseCase, getScratchStandingsUseCase } from '../../composition';
import Clasificacion from './Clasificacion';
import { GrupoDePestanas, ListaDePestanas, PanelDePestana } from '../ui/Pestanas';

// Con la competición en juego, cada cuánto se relee la pestaña abierta
const CADA = 60000;
const PESTANAS = ['overall', 'scratch'];

/**
 * La clasificación de un Stableford o un Medal, en su propia página
 * (`/competitions/:id/leaderboard`; 14 oct 2026: en la ficha, con 200
 * participantes, no cabía): pestañas General (con filtro de categoría y la
 * regla del torneo) y Scratch (corte en el 25.º; quien queda fuera ve su fila
 * debajo). La ve cualquiera con sesión. Se relee cada 60 s mientras `enJuego`
 * y la pestaña está a la vista; si no, una lectura.
 *
 * @param {Object} props
 * @param {string} props.competitionId
 * @param {string} [props.userId] - Quién mira, destacado
 * @param {boolean} props.enJuego - Si la competición está en juego
 */
const ClasificacionesDeLaCompeticion = ({ competitionId, userId, enJuego }) => {
  const { t } = useTranslation('scoring');
  const [pestana, setPestana] = useState('overall');
  const pedirGeneral = useCallback(
    (categoria) => getCompetitionStandingsUseCase.execute(competitionId, categoria),
    [competitionId]
  );
  const pedirScratch = useCallback(() => getScratchStandingsUseCase.execute(competitionId), [competitionId]);
  const cada = enJuego ? CADA : null;

  return (
    // Sin tarjeta ni título propios: es lo único de su página, que ya dice
    // «Clasificación» en su h1, y con el relleno de la tarjeta los nombres se
    // quedaban en unos 125 px a 360 (pasada del 14 oct, FE #865)
    <section data-testid="clasificaciones" className="space-y-3">
      <GrupoDePestanas actual={pestana} onElegir={setPestana}>
        <ListaDePestanas
          etiqueta={t('partida.standingsTitle')}
          className="flex border-b border-gray-200"
          pestanas={PESTANAS.map((p) => ({ id: p, contenido: t(`partida.${p}`) }))}
          claseDePestana={(abierta) =>
            `min-h-11 flex-1 border-b-2 text-sm font-medium ${
              abierta ? 'border-primary text-primary' : 'border-transparent text-gray-500'
            }`
          }
        />
        {/* Montadas las dos: cada una se pide al abrirse y deja de releerse al cerrarse */}
        <PanelDePestana id="overall" montadoSiempre enfocable>
          <Clasificacion
            pedir={pedirGeneral}
            userId={userId}
            activa={pestana === 'overall'}
            cada={cada}
            conRegla
            centraEnMi="una"
            vacia="partida.noResultsYet"
          />
        </PanelDePestana>
        <PanelDePestana id="scratch" montadoSiempre enfocable>
          <Clasificacion
            pedir={pedirScratch}
            userId={userId}
            activa={pestana === 'scratch'}
            cada={cada}
            filtrable={false}
            conRegla
            centraEnMi="una"
            vacia="partida.noResultsYet"
          />
        </PanelDePestana>
      </GrupoDePestanas>
    </section>
  );
};

export default ClasificacionesDeLaCompeticion;
