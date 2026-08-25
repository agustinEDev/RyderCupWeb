import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Zap, Trash2, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import {
  listMyQuickMatchesUseCase,
  getQuickMatchUseCase,
  getGolfCourseUseCase,
  hideQuickMatchUseCase,
  excludeQuickMatchFromStatsUseCase,
  includeQuickMatchInStatsUseCase,
} from '../../composition';
import ConfirmModal from '../../components/modals/ConfirmModal';
import PersonalRoundCalculator from '../../domain/services/PersonalRoundCalculator';
import customToast from '../../utils/toast';
import BlockLoader from '../../components/ui/BlockLoader';

const STATUS_STYLES = {
  PENDING: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const MyQuickMatchesPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('quickMatch');
  const { user, loading: isLoadingUser } = useAuth();

  const [quickMatches, setQuickMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resultsByMatchId, setResultsByMatchId] = useState({});
  // Un Set y no un único id: si se ocultan dos partidas seguidas, la primera en
  // responder no debe reactivar el botón de la que sigue en vuelo.
  const [hidingIds, setHidingIds] = useState(() => new Set());
  const [togglingIds, setTogglingIds] = useState(() => new Set());
  // La marca de "no cuenta" se guarda APARTE de `quickMatches` a propósito. Si
  // se actualizara dentro de la lista, cada pulsación del ojo crearía un array
  // nuevo, y de ese array depende el efecto que carga el resultado de cada
  // partida: un toque disparaba dos peticiones por cada partida terminada
  // —justo el aluvión de la FE #418, pero provocado a mano—.
  const [excludedIds, setExcludedIds] = useState(() => new Set());
  // La papelera es irreversible desde la aplicación, así que pregunta antes.
  // El ojo no: se deshace pulsándolo otra vez, y un modal ahí solo estorbaría.
  const [matchPendingDeletion, setMatchPendingDeletion] = useState(null);

  // Donde aplica el OJO: solo una partida terminada se puede marcar, el
  // servidor rechaza el resto con un 409. Ojo con el nombre —no dice si la
  // partida cuenta: una terminada y excluida es elegible y no cuenta—.
  const esElegibleParaElOjo = (qm) => qm.status === 'COMPLETED';

  // Y la marca de «no cuenta»: la etiqueta y el gris de la fila van SIEMPRE
  // juntos —una tarjeta apagada sin nada que lo explique es lo peor de los dos
  // mundos— asi que la regla vive en un solo sitio. Es mas amplia que la del
  // ojo a proposito: una marca heredada sobre una partida a medias si dice
  // algo, porque cuando termine no contara. En una cancelada no, que no contara
  // nunca.
  const llevaMarcaDeNoCuenta = (qm) => qm.status !== 'CANCELLED' && excludedIds.has(qm.id);


  // El ojo: la partida deja de contar en MIS estadísticas, pero sigue en la
  // lista. Es la otra mitad de la separación que dejó a la papelera como
  // «quitar de mi lista» y nada más.
  const handleToggleStats = async (quickMatchId) => {
    const id = quickMatchId;
    const estabaExcluida = excludedIds.has(id);
    setTogglingIds((prev) => new Set(prev).add(id));
    try {
      const updated = estabaExcluida
        ? await includeQuickMatchInStatsUseCase.execute(id)
        : await excludeQuickMatchFromStatsUseCase.execute(id);
      setExcludedIds((prev) => {
        const next = new Set(prev);
        if (updated.excludedFromStats) next.add(id);
        else next.delete(id);
        return next;
      });
      customToast.success(updated.excludedFromStats ? t('history.excluded') : t('history.included'));
    } catch {
      customToast.error(t('history.statsToggleError'));
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Quitar la partida del historial propio. No borra nada ni afecta a lo que
  // ven los demás participantes: cada uno la oculta solo para sí mismo.
  const handleConfirmHide = async () => {
    if (!matchPendingDeletion) return;
    const quickMatchId = matchPendingDeletion.id;
    // El aviso se cierra DESPUÉS, no antes: cerrarlo al confirmar dejaba la
    // petición en vuelo sin nada en pantalla que lo dijera, y con la lista
    // intacta. Con una red lenta parecía que el botón no había hecho nada.
    await handleHide(quickMatchId);
    setMatchPendingDeletion(null);
  };

  const handleHide = async (quickMatchId) => {
    setHidingIds((prev) => new Set(prev).add(quickMatchId));
    try {
      await hideQuickMatchUseCase.execute(quickMatchId);
      setQuickMatches((prev) => prev.filter((qm) => qm.id !== quickMatchId));
      customToast.success(t('history.hidden'));
    } catch {
      customToast.error(t('history.hideError'));
    } finally {
      setHidingIds((prev) => {
        const next = new Set(prev);
        next.delete(quickMatchId);
        return next;
      });
    }
  };

  useEffect(() => {
    if (!user) return;

    listMyQuickMatchesUseCase
      .execute({ page: 1, limit: 50 })
      .then((result) => {
        setQuickMatches(result.quickMatches);
        setExcludedIds(
          new Set(result.quickMatches.filter((qm) => qm.excludedFromStats).map((qm) => qm.id))
        );
      })
      .catch((err) => setError(err))
      .finally(() => setIsLoading(false));
  }, [user]);

  // For each finished quick match, compute the current user's own result
  // (net-to-par + gross strokes) shown on its card. The list endpoint doesn't
  // carry hole scores, so this fetches match detail + course per finished
  // match (course lookups deduplicated), same approach the scoring page uses.
  useEffect(() => {
    const completedMatches = quickMatches.filter((qm) => qm.status === 'COMPLETED');
    if (!user || completedMatches.length === 0) return;

    let cancelled = false;
    const courseCache = new Map();
    const loadCourse = (golfCourseId) => {
      if (!courseCache.has(golfCourseId)) {
        courseCache.set(golfCourseId, getGolfCourseUseCase.execute(golfCourseId));
      }
      return courseCache.get(golfCourseId);
    };

    const loadResult = async (qm) => {
      try {
        const [detail, course] = await Promise.all([
          getQuickMatchUseCase.execute(qm.id),
          loadCourse(qm.golfCourseId),
        ]);
        const myParticipant = detail.participants.find((p) => p.userId === user.id);
        if (!myParticipant) return null;

        // Las dos lecturas de la vuelta, calculadas en un solo sitio para que
        // esta tarjeta y la pestaña de clasificación no puedan dar números
        // distintos para la misma vuelta, que es lo que pasaba.
        return PersonalRoundCalculator.compute({
          me: myParticipant,
          participants: detail.participants ?? [],
          holes: course.holes || [],
          holeScores: detail.holeScores || [],
          tees: course.tees || [],
          participantStrokes: detail.participantStrokes ?? [],
          matchFormat: qm.matchFormat,
          allowancePercentage: detail.effectiveAllowance,
          playMode: detail.playMode,
        });
      } catch {
        return null;
      }
    };

    Promise.all(completedMatches.map((qm) => loadResult(qm).then((result) => [qm.id, result]))).then(
      (entries) => {
        if (cancelled) return;
        const next = {};
        for (const [id, result] of entries) {
          if (result) next[id] = result;
        }
        setResultsByMatchId(next);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [quickMatches, user]);

  if (isLoadingUser || isLoading) {
    // La cabecera se queda puesta durante la espera: aparecer de golpe al
    // terminar es un salto, y de eso va justamente FE #495
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth user={user} />
        <BlockLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderAuth user={user} />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="hidden md:inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-3"
        >
          &larr; {t('scoring.backToDashboard')}
        </button>

        <h1 className="hidden md:block text-xl font-bold text-gray-900 mb-4">{t('history.title')}</h1>

        {error && (
          <p className="text-sm text-red-600 mb-4">{error.message || t('scoring.errors.generic')}</p>
        )}

        {quickMatches.length === 0 ? (
          <p className="text-sm text-gray-500">{t('history.empty')}</p>
        ) : (
          <ul className="space-y-2" data-testid="quick-match-history-list">
            {quickMatches.map((qm) => (
              // El botón de quitar es hermano del de navegar, no hijo: anidar
              // botones es HTML inválido y rompe la navegación por teclado.
              // Una partida que no cuenta NO se atenúa: esto se usa al sol, y
              // el texto apagado baja del contraste legible justo donde peor se
              // lee. Se distingue por el fondo, la franja de la izquierda y,
              // sobre todo, por la etiqueta, que es lo único que también
              // entiende un lector de pantalla.
              <li
                key={qm.id}
                data-testid={`quick-match-row-${qm.id}`}
                className={`relative border rounded-lg hover:shadow-sm transition-all ${
                  llevaMarcaDeNoCuenta(qm)
                    ? 'bg-gray-50 border-gray-200 border-l-4 border-l-gray-400'
                    : 'bg-white border-gray-200 hover:border-primary-300'
                }`}
              >
                {/* Capa clicable que cubre la tarjeta entera en vez de envolver
                    el contenido: envolviendolo, los botones quedaban dentro de
                    un boton —HTML invalido— o fuera de la zona pulsable. Lleva
                    su propio nombre accesible porque no contiene el texto. */}
                <button
                  onClick={() => navigate(`/quick-matches/${qm.id}/scoring`)}
                  data-testid={`quick-match-history-item-${qm.id}`}
                  aria-label={qm.name || t(`history.format.${qm.matchFormat ?? qm.scoringFormat}`, qm.matchFormat ?? qm.scoringFormat)}
                  className="absolute inset-0 z-0 rounded-lg"
                />

                <div className="relative z-10 pointer-events-none flex items-start gap-3 p-4">
                  <div className="p-2 bg-primary-100 rounded-lg flex-shrink-0">
                    <Zap className="w-4 h-4 text-primary-600" />
                  </div>

                  {/* Todo el texto en una columna: asi la linea de datos de
                      abajo arranca en la misma vertical que el nombre y la
                      fecha, y no debajo del icono. */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {qm.name || t(`history.format.${qm.matchFormat ?? qm.scoringFormat}`, qm.matchFormat ?? qm.scoringFormat)}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {qm.name && `${t(`history.format.${qm.matchFormat ?? qm.scoringFormat}`, qm.matchFormat ?? qm.scoringFormat)} · `}
                      {new Date(qm.createdAt).toLocaleDateString()}
                    </p>

                    {/* En todo menos en las canceladas: ver `llevaMarcaDeNoCuenta` */}
                    {llevaMarcaDeNoCuenta(qm) && (
                      <span
                        data-testid={`quick-match-excluded-badge-${qm.id}`}
                        className="inline-block mt-1 px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 text-[10px] font-semibold whitespace-nowrap"
                      >
                        {t('history.excludedBadge')}
                      </span>
                    )}

                    {/* La linea de las cifras, arrancando en la misma vertical
                        que el nombre. Solo existe si hay resultado: una partida
                        sin el no reserva la linea, y la tarjeta no queda hueca. */}
                    {resultsByMatchId[qm.id] && (
                      <span
                        className="mt-2 flex items-baseline flex-wrap gap-x-2 gap-y-1"
                        data-testid={`quick-match-result-${qm.id}`}
                      >
                          {/* En foursomes no hay vuelta propia —una sola bola a
                              golpes alternos—, asi que el calculador deja las
                              dos lecturas en null y los golpes del equipo pasan
                              a ser el titular, con su etiqueta detras. */}
                          {resultsByMatchId[qm.id].personalToPar ? (
                            <>
                              <span className="text-sm font-bold text-gray-900">
                                {resultsByMatchId[qm.id].personalToPar}
                              </span>
                              <span className="text-xs text-gray-500">
                                {t('history.grossStrokes', { count: resultsByMatchId[qm.id].totalStrokes })}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-sm font-bold text-gray-900">
                                {t('history.grossStrokes', { count: resultsByMatchId[qm.id].totalStrokes })}
                              </span>
                              <span className="text-xs text-gray-500">{t('history.teamTotal')}</span>
                            </>
                          )}
                          {resultsByMatchId[qm.id].matchToPar && (
                            <span
                              className="text-xs text-gray-500"
                              data-testid={`quick-match-result-in-match-${qm.id}`}
                            >
                              {t('personalRound.inMatch', { value: resultsByMatchId[qm.id].matchToPar })}
                            </span>
                          )}
                      </span>
                    )}
                  </div>

                  {/* La columna derecha: los botones arriba y el estado justo
                      debajo, los dos pegados al borde. Asi cada cosa cae en su
                      vertical en todas las tarjetas. */}
                  {/* `flex-col-reverse`: el estado va PRIMERO en el DOM y se
                      pinta debajo. Con el orden natural, un lector de pantalla
                      ofrecia «quitar de tus estadisticas» y «quitar del
                      historial» antes de decir si la partida esta en curso,
                      terminada o cancelada, que es justo lo que hace falta
                      saber para decidir si pulsarlos. */}
                  <div className="flex flex-col-reverse items-end gap-1 flex-shrink-0">
                    <span className={`whitespace-nowrap text-xs font-semibold px-2 py-1 rounded-full ${STATUS_STYLES[qm.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {t(`history.status.${qm.status}`, qm.status)}
                    </span>
                    <div className="pointer-events-auto flex items-center gap-2">
                      {/* El ojo solo en las terminadas: una partida a medias no
                          cuenta todavia en ninguna estadistica, asi que el
                          control no diria nada —y el servidor lo rechaza con un
                          409—. */}
                      {esElegibleParaElOjo(qm) && (
                        <button
                          onClick={() => handleToggleStats(qm.id)}
                          disabled={togglingIds.has(qm.id)}
                          aria-label={
                            excludedIds.has(qm.id)
                              ? t('history.excludedFromStats')
                              : t('history.countsInStats')
                          }
                          title={
                            excludedIds.has(qm.id)
                              ? t('history.excludedFromStats')
                              : t('history.countsInStats')
                          }
                          aria-pressed={excludedIds.has(qm.id)}
                          data-testid={`quick-match-stats-toggle-${qm.id}`}
                          className="p-3 rounded-lg flex items-center justify-center text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                        >
                          {excludedIds.has(qm.id) ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      {/* La papelera sigue en todas las tarjetas. Al creador le
                          vendria bien no tenerla mientras se juega, pero sin
                          accion de cancelar su unica salida seria dar la partida
                          por TERMINADA, metiendo una vuelta a medias en las
                          estadisticas del grupo. Esa guarda va con #455. */}
                      <button
                        onClick={() => setMatchPendingDeletion(qm)}
                        disabled={hidingIds.has(qm.id)}
                        aria-label={t('history.hide')}
                        title={t('history.hide')}
                        data-testid={`quick-match-hide-${qm.id}`}
                        className="p-3 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* La papelera no se puede deshacer desde la aplicación, así que se
          pregunta antes y se dice de qué va: el motivo más probable para
          pulsarla —que la partida no cuente— tiene su propio botón, que sí se
          deshace. Por eso el aviso lo menciona en vez de dejar al usuario
          descubrirlo cuando ya no hay vuelta. */}
      <ConfirmModal
        isOpen={matchPendingDeletion !== null}
        title={t('history.deleteTitle')}
        // El texto de siempre habla de estadisticas y remite al ojo. Las dos
        // cosas son falsas en una partida que no ha terminado: no cuenta en
        // ninguna estadistica, y ahi no hay ojo al que mandar a nadie.
        message={(() => {
          const pendiente = matchPendingDeletion;
          // El aviso de siempre habla de estadisticas y remite al ojo, y eso
          // solo es cierto en una partida terminada que todavia cuenta. Fuera
          // de ahi: una cancelada SI esta terminada, una que se esta jugando
          // sigue para los demas, y a quien ya uso el ojo no hay que mandarle
          // a usarlo otra vez.
          if (pendiente && esElegibleParaElOjo(pendiente) && !excludedIds.has(pendiente.id)) {
            return `${t('history.deleteBody')} ${t('history.deleteHint')}`;
          }
          // PENDING va con IN_PROGRESS, no con CANCELLED: es una partida viva
          // que el grupo va a jugar, y quitarla deja al usuario sin forma de
          // volver a entrar. Lo que separa los dos avisos es si la partida
          // sigue su curso, no si ha empezado.
          return ['PENDING', 'IN_PROGRESS'].includes(pendiente?.status)
            ? t('history.deleteBodyInPlay')
            : t('history.deleteBodyPlain');
        })()}
        confirmText={t('history.deleteConfirm')}
        cancelText={t('history.deleteCancel')}
        isDestructive
        isLoading={matchPendingDeletion !== null && hidingIds.has(matchPendingDeletion.id)}
        onConfirm={handleConfirmHide}
        onCancel={() => setMatchPendingDeletion(null)}
      />
    </div>
  );
};

export default MyQuickMatchesPage;
