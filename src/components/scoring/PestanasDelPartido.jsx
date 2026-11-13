import LeaderboardView from './LeaderboardView';
import ScorecardTable from './ScorecardTable';
import {
  GrupoDePestanas,
  ListaDePestanas,
  PanelDePestana,
} from '../ui/Pestanas';

/**
 * Las tres pestañas de la anotación de competición (`ScoringPage`): «Anotar»
 * —lo que llega en `children`—, la tarjeta y la clasificación. Sin estado ni
 * efectos: la pestaña abierta y la clasificación las lleva la página.
 */
const PestanasDelPartido = ({
  t,
  tabs,
  activeTab,
  onElegir,
  scoringView,
  scoresVisibles,
  currentUserId,
  retirados,
  leaderboard,
  children,
}) => (
  <GrupoDePestanas actual={activeTab} onElegir={onElegir}>
    <ListaDePestanas
      etiqueta={t('tabsLabel')}
      className="flex border-b border-gray-200 mb-4"
      data-testid="scoring-tabs"
      pestanas={tabs.map((tab) => ({
        id: tab,
        contenido: t(`tabs.${tab}`),
        testId: `tab-${tab}`,
      }))}
      claseDePestana={(abierta) =>
        `flex-1 py-2 text-sm font-medium text-center border-b-2 transition-colors ${
          abierta
            ? 'border-primary text-primary'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        }`
      }
    />

    {/* Tab: Input */}
    <PanelDePestana id="input" className="space-y-4">
      {children}
    </PanelDePestana>

    {/* Tab: Scorecard */}
    <PanelDePestana id="scorecard" enfocable className="space-y-4">
      <ScorecardTable
        holes={scoringView?.holes}
        scores={scoresVisibles}
        players={scoringView?.players}
        currentUserId={currentUserId}
        teamAName={scoringView?.teamAName}
        teamBName={scoringView?.teamBName}
        matchFormat={scoringView?.matchFormat}
        retirados={retirados}
      />
    </PanelDePestana>

    {/* Tab: Leaderboard (abrirla la pide: el efecto de la página) */}
    <PanelDePestana id="leaderboard" enfocable>
      <LeaderboardView leaderboard={leaderboard} />
    </PanelDePestana>
  </GrupoDePestanas>
);

export default PestanasDelPartido;
