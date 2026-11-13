import { Settings } from 'lucide-react';
import Plegable from '../../ui/Plegable';

/**
 * La configuración de la competición, plegada cuando ya está en juego o
 * acabada: lo que se mira entonces es la clasificación y las partidas.
 */
const AjustesDeLaCompeticion = ({
  competition,
  t,
  conClasificacion,
  conEquipos,
  esStrokePlay,
  repartoAMostrar,
  textoDeCategorias,
}) => (
  <div
    className="p-4"
  >
    {/* En juego o acabado, plegada: lo que se mira es la clasificación y las partidas */}
    {/* Algo menor en el móvil: a 360 px partía en dos líneas (QA, FE #865-5) */}
    <Plegable
      abiertoAlPrincipio={!conClasificacion}
      claseDelTitulo="text-base sm:text-lg"
      titulo={
        <>
          <Settings className="w-5 h-5 text-primary" />
          {t('detail.settings.title')}
        </>
      }
    >

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {conEquipos && (
          <>
            <div>
              <span className="text-gray-500 text-sm">{t('detail.settings.teamOne')}</span>
              <p className="text-gray-900 font-medium">{competition.team1Name}</p>
            </div>
            <div>
              <span className="text-gray-500 text-sm">{t('detail.settings.teamTwo')}</span>
              <p className="text-gray-900 font-medium">{competition.team2Name}</p>
            </div>
          </>
        )}
        <div>
          <span className="text-gray-500 text-sm">{t('detail.settings.playMode')}</span>
          {/* Salía «HANDICAP»: el valor del backend tal cual, en
              mayúsculas y en inglés, en una pantalla en español */}
          <p className="text-gray-900 font-medium">
            {competition.playMode
              ? t(`create.${String(competition.playMode).toLowerCase()}`, {
                  defaultValue: competition.playMode,
                })
              : ''}
          </p>
        </div>
        {/* Qué torneo es y su modalidad (FE #791). Con respaldo: un
            tipo que el backend añada mañana sale con su nombre */}
        {competition.tournamentType && (
          <div>
            <span className="text-gray-500 text-sm">{t('detail.settings.tournamentType')}</span>
            <p className="text-gray-900 font-medium">
              {t(`create.type.${competition.tournamentType}.title`, {
                defaultValue: competition.tournamentType,
              })}
              {competition.modality &&
                ` · ${t(`create.modality.${competition.modality}`, {
                  defaultValue: competition.modality,
                })}`}
            </p>
          </div>
        )}
        {/* Los ajustes de un Stableford o un Medal: solo se veían al
            editarla (FE #824, PR 5) */}
        {esStrokePlay && competition.strokePlay && (
          <div data-testid="ajustes-del-torneo" className="contents">
            <div data-testid="ajuste-categorias">
              <span className="text-gray-500 text-sm">{t('detail.settings.categories')}</span>
              <p className="text-gray-900 font-medium">{textoDeCategorias(competition.strokePlay)}</p>
            </div>
            <div data-testid="ajuste-jornadas">
              <span className="text-gray-500 text-sm">{t('detail.settings.matchdaysLabel')}</span>
              <p className="text-gray-900 font-medium">
                {t('detail.settings.matchdays', { count: competition.strokePlay.maxMatchdaysPerPlayer })}
              </p>
            </div>
            <div data-testid="ajuste-general">
              <span className="text-gray-500 text-sm">{t('detail.settings.overallLabel')}</span>
              <p className="text-gray-900 font-medium">
                {t(`detail.settings.overall.${competition.strokePlay.overallStanding}`)}
              </p>
            </div>
          </div>
        )}
        {/* El modo elegido al crearla no salía en ningún sitio (#710) */}
        {competition.setupMode && (
          <div>
            <span className="text-gray-500 text-sm">{t('detail.settings.setupMode')}</span>
            <p className="text-gray-900 font-medium">
              {t(`create.setupMode.${competition.setupMode}.title`, {
                defaultValue: competition.setupMode,
              })}
            </p>
          </div>
        )}
        {conEquipos && (
          <div>
            <span className="text-gray-500 text-sm">{t('detail.settings.teamAssignment')}</span>
            {/* Idem, y con respaldo: un modo que el backend añada
                mañana sale con su nombre, no con la clave */}
            <p className="text-gray-900 font-medium">
              {repartoAMostrar
                ? t(`detail.settings.assignment.${repartoAMostrar}`, {
                    defaultValue: repartoAMostrar,
                  })
                : ''}
            </p>
          </div>
        )}
        <div>
          <span className="text-gray-500 text-sm">{t('detail.settings.maxPlayingHandicap')}</span>
          {competition.maxPlayingHandicap != null ? (
            <p className="text-gray-900 font-medium">{competition.maxPlayingHandicap}</p>
          ) : (
            <p className="text-gray-500 font-medium italic">{t('detail.settings.maxPlayingHandicapNone')}</p>
          )}
        </div>
        <div>
          <span className="text-gray-500 text-sm">{t('detail.settings.created')}</span>
          <p className="text-gray-900 font-medium">
            {new Date(competition.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </Plegable>
  </div>
);

export default AjustesDeLaCompeticion;
