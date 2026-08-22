import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Loader, Zap, ChevronRight, Trash2, Eye, EyeOff } from 'lucide-react';
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
    const quickMatchId = matchPendingDeletion;
    if (!quickMatchId) return;
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
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth user={user} />
        <div className="flex items-center justify-center h-64">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
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
                // En un movil estrecho la fila NO cabe en una linea: padding,
                // icono, resultado, estado, chevron, ojo y papelera suman mas
                // que los 358px utiles de un iPhone, y el unico bloque que
                // encoge —el del nombre— se quedaba en 8px, con la etiqueta
                // partida en dos lineas y pintada encima del resultado. Se
                // apila: nombre arriba a todo lo ancho, y debajo el resultado
                // con sus acciones. A partir de `sm` vuelve a una sola linea.
                className={`relative flex flex-col sm:flex-row sm:items-stretch border rounded-lg overflow-hidden hover:shadow-sm transition-all ${
                  excludedIds.has(qm.id)
                    ? 'bg-gray-50 border-gray-200 border-l-4 border-l-gray-400'
                    : 'bg-white border-gray-200 hover:border-primary-300'
                }`}
              >
                {/* Capa clicable que cubre la fila entera en vez de envolver
                    el contenido. Envolviendolo, el resultado quedaba DENTRO
                    del boton y no podia compartir linea con el ojo y la
                    papelera, que son hermanos suyos: en movil salia una
                    tercera franja casi vacia. Lleva su propio nombre
                    accesible porque ya no contiene el texto. */}
                <button
                  onClick={() => navigate(`/quick-matches/${qm.id}/scoring`)}
                  data-testid={`quick-match-history-item-${qm.id}`}
                  aria-label={qm.name || t(`history.format.${qm.matchFormat ?? qm.scoringFormat}`, qm.matchFormat ?? qm.scoringFormat)}
                  className="absolute inset-0 z-0"
                />
                <div className="relative z-10 pointer-events-none w-full sm:flex-1 min-w-0 flex items-center gap-3 p-4 pb-2 sm:pb-4">
                  <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                    <div className="p-2 bg-primary-100 rounded-lg flex-shrink-0">
                      <Zap className="w-4 h-4 text-primary-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {qm.name || t(`history.format.${qm.matchFormat ?? qm.scoringFormat}`, qm.matchFormat ?? qm.scoringFormat)}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {qm.name && `${t(`history.format.${qm.matchFormat ?? qm.scoringFormat}`, qm.matchFormat ?? qm.scoringFormat)} · `}
                        {new Date(qm.createdAt).toLocaleDateString()}
                      </p>
                      {excludedIds.has(qm.id) && (
                        <span
                          data-testid={`quick-match-excluded-badge-${qm.id}`}
                          className="inline-block mt-1 px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 text-[10px] font-semibold whitespace-nowrap"
                        >
                          {t('history.excludedBadge')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Resultado, estado y acciones comparten franja: en movil es
                    la segunda linea de la tarjeta, y a partir de `sm` vuelve a
                    ser la parte derecha de la fila de siempre. */}
                {/* En movil se reparte —resultado a la izquierda, alineado
                    bajo el nombre por el `pl-11`, y acciones a la derecha—
                    para no dejar la linea entera vacia a un lado. En `sm`
                    todo vuelve a la derecha, como la fila de siempre. */}
                <div className="relative z-10 flex items-center gap-2 justify-between sm:justify-end pl-11 pr-4 pb-3 sm:pl-0 sm:pr-0 sm:pb-0 sm:self-stretch">
                  <div className="pointer-events-none flex items-center gap-2 flex-shrink-0">
                    {/* La columna del resultado mide siempre lo mismo en movil
                        y se reserva aunque la partida no traiga cifras: sin
                        ancho fijo, cada tarjeta empujaba el estado y los
                        botones a una vertical distinta —«+21 / 93 golpes» no
                        ocupa lo que «+7 / 98 golpes / (+8 en el partido)»— y
                        la lista se leia desordenada. */}
                    <div className="w-24 sm:w-auto shrink-0">
                    {resultsByMatchId[qm.id] && (
                      <div className="text-right" data-testid={`quick-match-result-${qm.id}`}>
                        {/* En foursomes no hay vuelta propia —una sola bola a
                            golpes alternos—, así que el calculador deja las dos
                            lecturas en null. Los golpes del equipo pasan
                            entonces a ser el titular, con su etiqueta: dejarlos
                            en la línea de apoyo de 10px y sin nada encima hacía
                            que la tarjeta pareciera a medio pintar. */}
                        {resultsByMatchId[qm.id].personalToPar ? (
                          <>
                            <p className="text-sm font-bold text-gray-900">
                              {resultsByMatchId[qm.id].personalToPar}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {t('history.grossStrokes', { count: resultsByMatchId[qm.id].totalStrokes })}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-bold text-gray-900">
                              {t('history.grossStrokes', { count: resultsByMatchId[qm.id].totalStrokes })}
                            </p>
                            <p className="text-[10px] text-gray-500">{t('history.teamTotal')}</p>
                          </>
                        )}
                        {/* En su propia línea, no al lado del resultado: esta
                            columna no encoge (`flex-shrink-0`), así que el
                            paréntesis se llevaba unos 100px del ancho, y el
                            único bloque que sí encoge es el del nombre y la
                            fecha —el del `truncate`—, que en un móvil de 375px
                            se quedaba en cuatro letras. */}
                        {resultsByMatchId[qm.id].matchToPar && (
                          <p
                            className="text-[10px] text-gray-500"
                            data-testid={`quick-match-result-in-match-${qm.id}`}
                          >
                            {t('personalRound.inMatch', { value: resultsByMatchId[qm.id].matchToPar })}
                          </p>
                        )}
                      </div>
                    )}
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_STYLES[qm.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {t(`history.status.${qm.status}`, qm.status)}
                    </span>
                    {/* El chevron sobra en movil: la tarjeta entera es
                        pulsable y ahi solo roba ancho. */}
                    <ChevronRight className="hidden sm:block w-4 h-4 text-gray-400" />
                  </div>
                {/* El ojo solo en las terminadas: una partida a medias no
                    cuenta todavía en ninguna estadística, así que el control
                    no diría nada —y el servidor lo rechaza con un 409. */}
                {qm.status === 'COMPLETED' && (
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
                    className="px-2 sm:px-3 sm:self-stretch flex items-center justify-center text-gray-400 hover:text-primary-600 hover:bg-primary-50 sm:border-l border-gray-100 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                  >
                    {excludedIds.has(qm.id) ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => setMatchPendingDeletion(qm.id)}
                  disabled={hidingIds.has(qm.id)}
                  aria-label={t('history.hide')}
                  title={t('history.hide')}
                  data-testid={`quick-match-hide-${qm.id}`}
                  className="px-2 sm:px-3 sm:self-stretch flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 sm:border-l border-gray-100 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
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
        message={`${t('history.deleteBody')} ${t('history.deleteHint')}`}
        confirmText={t('history.deleteConfirm')}
        cancelText={t('history.deleteCancel')}
        isDestructive
        isLoading={matchPendingDeletion !== null && hidingIds.has(matchPendingDeletion)}
        onConfirm={handleConfirmHide}
        onCancel={() => setMatchPendingDeletion(null)}
      />
    </div>
  );
};

export default MyQuickMatchesPage;
