import AnotarSinConexion from '../scoring/AnotarSinConexion';

/**
 * Lo que queda sin enviar en la anotación de partida rápida
 * (`QuickMatchScoringPage`). Sin estado ni efectos propios.
 *
 * Sin red (lo dice el navegador), las pendientes van en el aviso de arriba,
 * uno solo, como en la Ryder y las partidas (regresión del 12 oct 2026). Con
 * red pero sin salir (dos barras), el recuadro de siempre.
 */
const AvisoDePendientesRapida = ({ t, sinConexion, isScorer, pendientes }) =>
  sinConexion && (isScorer || pendientes > 0) ? (
    <AnotarSinConexion pendingCount={pendientes} />
  ) : (
    pendientes > 0 && (
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <p
          data-testid="quick-match-pendientes"
          className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm"
        >
          {t('scoring.offline.pending', { count: pendientes })}
        </p>
      </div>
    )
  );

export default AvisoDePendientesRapida;
