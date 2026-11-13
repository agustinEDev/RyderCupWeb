import AgendaDeLaCompeticion from '../AgendaDeLaCompeticion';
import FranjasDeLaCompeticion from '../FranjasDeLaCompeticion';

/**
 * La agenda: el torneo ES su agenda, a la vista de todos, y el organizador la
 * cambia aquí mismo (FE #654). Un Stableford o un Medal tiene franjas; una
 * Ryder, sesiones.
 */
const AgendaDeLaFicha = ({
  competition,
  user,
  // El género llega leído por la página, que es la que figura en la auditoría de la
  // copia sin conexión (copiaDelUsuarioSinConexion.test.js): no leer aquí user.gender
  genero,
  t,
  canManage,
  esStrokePlay,
  listaAMedias,
  salieron,
  approvedEnrollments,
  approvedCount,
  estoyInscrito,
  versionFranjas,
  versionCampos,
  recibirAgenda,
  irASinFranja,
  setVersionDePartidas,
}) => (
  <div className="p-4" data-testid="seccion-agenda">
    {/* Un Stableford o un Medal tiene franjas con su hoja de salidas, no
        sesiones con formato (FE #824). Se tocan hasta iniciar: después
        el servidor lo rechaza */}
    {esStrokePlay ? (
      <FranjasDeLaCompeticion
        soloAmigos={listaAMedias}
        competitionId={competition.id}
        startDate={competition.startDate}
        endDate={competition.endDate}
        canManage={canManage && ['DRAFT', 'ACTIVE', 'CLOSED'].includes(competition.status)}
        maxPlayers={competition.maxPlayers}
        // «Caben N de los M», solo mientras se apunta gente (FE #856)
        inscripcionesAbiertas={['DRAFT', 'ACTIVE'].includes(competition.status)}
        // Las plazas (PR 4): el jugador elige con las inscripciones
        // abiertas; el organizador coloca y mueve hasta iniciar, y
        // quita solo con ellas abiertas
        userId={user.id}
        genero={genero}
        // Con una sola categoría no se nombra (QA del 11 oct 2026)
        miCategoria={salieron > 1 ? (approvedEnrollments.find((e) => e.userId === user.id)?.category ?? null) : null}
        estoyInscrito={estoyInscrito}
        puedeElegir={competition.status === 'ACTIVE'}
        maxMatchdaysPerPlayer={competition.strokePlay?.maxMatchdaysPerPlayer}
        inscritos={approvedEnrollments.map((e) => ({
          userId: e.userId,
          userName: e.userName || t('detail.unknownUser'),
        }))}
        puedeColocar={canManage && ['DRAFT', 'ACTIVE', 'CLOSED'].includes(competition.status)}
        puedeQuitar={canManage && competition.status === 'ACTIVE'}
        version={`${competition.updatedAt}|${competition.status}|${versionFranjas}`}
        versionCampos={versionCampos}
        onAgenda={recibirAgenda}
        irASinFranja={irASinFranja}
        // Las partidas (PR 6): existen desde el cierre y se siguen
        // viendo acabada, sin nada que cambiar (Agustín, 11 oct);
        // hasta cuándo se cambian lo dice el servidor (la 1.ª salida)
        verPartidas={['CLOSED', 'IN_PROGRESS', 'COMPLETED'].includes(competition.status)}
        // Verlas y cambiarlas son dos cosas: acabada, quien organiza
        // y no juega las sigue viendo (CodeRabbit)
        puedeVerPartidas={canManage}
        organizaPartidas={canManage && competition.status !== 'COMPLETED'}
        onCambioEnPartidas={() => setVersionDePartidas((n) => n + 1)}
      />
    ) : (
    <AgendaDeLaCompeticion
      competitionId={competition.id}
      startDate={competition.startDate}
      endDate={competition.endDate}
      // Terminada o cancelada ya no se toca: el servidor lo rechaza
      canManage={canManage && !['COMPLETED', 'CANCELLED'].includes(competition.status)}
      jugadores={canManage ? approvedEnrollments.length : approvedCount}
      // Cuando cambia la competición —estado, equipos— se vuelve a leer
      version={`${competition.updatedAt}|${competition.status}|${competition.teamsAssigned}`}
      // Y sus campos, cuando cambian en la sección de abajo (FE #715)
      versionCampos={versionCampos}
      onAgenda={recibirAgenda}
    />
    )}
  </div>
);

export default AgendaDeLaFicha;
