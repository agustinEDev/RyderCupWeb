import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Eye, Lock, RefreshCw, SearchX } from 'lucide-react';
import HeaderAuth from '../../components/layout/HeaderAuth';
import BlockLoader from '../../components/ui/BlockLoader';
import CampoDeLaPartida from '../../components/scoring/CampoDeLaPartida';
import QuickMatchClassificationTable from '../../components/quick_match/QuickMatchClassificationTable';
import QuickMatchScorecardTable from '../../components/quick_match/QuickMatchScorecardTable';
import { GrupoDePestanas, ListaDePestanas, PanelDePestana } from '../../components/ui/Pestanas';
import customToast from '../../utils/toast';
import { getGolfCourseUseCase, getSharedQuickMatchUseCase } from '../../composition';

const TABS = ['classification', 'scorecard'];
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;

/**
 * QuickMatchSharedPage - La partida rápida terminada de un amigo, en solo
 * lectura (K).
 *
 * Reutiliza la clasificación y la tarjeta de la pantalla de anotación, pero NO
 * su hook: aquí no se anota, no se sondea, no hay cola sin conexión ni
 * acciones (terminar, cancelar). Se pide una vez `GET /quick-matches/{id}/shared`
 * y el campo, y se pinta.
 *
 * - Quien la jugó va a su pantalla de anotación de siempre.
 * - Un 403 (sin acceso, o aún en juego) desde una tarjeta de Actividad lleva
 *   al perfil del amigo que la publicó, con un aviso suave; sin saber de quién
 *   era, se dice que no se puede ver.
 * - Un nombre que llega en null es «un invitado» si es invitado y «un
 *   jugador» si no.
 */
const QuickMatchSharedPage = () => {
  const { quickMatchId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation(['quickMatch', 'common']);

  const [partida, setPartida] = useState(null);
  const [campo, setCampo] = useState(null);
  const [fallo, setFallo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [pestana, setPestana] = useState('classification');

  // De quién era la tarjeta que trajo aquí: a su perfil si no se puede ver
  const perfilDe = state?.perfilDe ?? null;
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const carga = useCallback(async () => {
    setCargando(true);
    setFallo(null);
    try {
      const datos = await getSharedQuickMatchUseCase.execute(quickMatchId);
      if (datos.viewerIsParticipant) {
        setPartida(datos);
        return;
      }
      const delCampo = await getGolfCourseUseCase.execute(datos.golfCourseId);
      setCampo(delCampo);
      setPartida(datos);
    } catch (error) {
      if (error?.status === HTTP_FORBIDDEN && perfilDe) {
        customToast.info(tRef.current('shared.forbiddenToast'));
        navigate(`/players/${perfilDe}`, { replace: true });
        return;
      }
      setFallo(error?.status ?? 'otro');
    } finally {
      setCargando(false);
    }
  }, [quickMatchId, perfilDe, navigate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the load sets state only after awaiting the API
    carga();
  }, [carga]);

  const participantes = useMemo(
    () =>
      (partida?.participants ?? []).map((p) => ({
        ...p,
        name: p.name || t(p.isGuest ? 'shared.guest' : 'shared.player'),
      })),
    [partida, t]
  );

  if (partida?.viewerIsParticipant) {
    return <Navigate to={`/quick-matches/${quickMatchId}/scoring`} replace />;
  }

  if (cargando && !partida) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth />
        <BlockLoader texto={t('scoring.matchHeader')} />
      </div>
    );
  }

  if (fallo !== null || !partida) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth />
        <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
          <SinPartida fallo={fallo} onReintentar={carga} t={t} />
        </main>
      </div>
    );
  }

  const holes = campo?.holes ?? [];
  const tees = campo?.tees ?? [];
  const cerrada = !!partida.isCompleted || !!partida.isCancelled;

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderAuth />

      <main className="max-w-4xl mx-auto px-4 py-4 pb-24">
        {/* En móvil la vuelta la da la cabecera contextual (por historial) */}
        <Link
          to="/feed"
          className="hidden md:inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-3"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          {t('shared.back')}
        </Link>

        {/* La cabecera contextual ya pinta el título en móvil: un segundo
            encabezado de nivel 1 rompería la jerarquía para los lectores de
            pantalla */}
        <h1 className="hidden md:block text-sm font-medium text-gray-500 mb-1">
          {t('common:screens.sharedQuickMatch')}
        </h1>

        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-gray-900 break-words">
              {partida.name || t('scoring.matchHeader')}
            </h2>
            <p className="text-sm text-gray-500">
              {partida.name ? `${t('scoring.matchHeader')} · ` : ''}
              {partida.matchFormat ?? partida.scoringFormat}
            </p>
            <CampoDeLaPartida nombre={campo?.name ?? null} />
          </div>
          <span
            data-testid="quick-match-shared-read-only"
            className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full"
          >
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            {t('shared.readOnly')}
          </span>
        </div>

        <GrupoDePestanas actual={pestana} onElegir={setPestana}>
          <ListaDePestanas
            etiqueta={t('shared.tabsLabel')}
            className="flex border-b border-gray-200 mb-4"
            pestanas={TABS.map((tab) => ({
              id: tab,
              contenido: t(`scoring.tabs.${tab}`),
              testId: `quick-match-tab-${tab}`,
            }))}
            claseDePestana={(abierta) =>
              `flex-1 py-2 text-sm font-medium text-center border-b-2 transition-colors ${
                abierta ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`
            }
          />

          <PanelDePestana id="classification" enfocable>
            <QuickMatchClassificationTable
              holes={holes}
              holeScores={partida.holeScores ?? []}
              participants={participantes}
              scoringFormat={partida.scoringFormat}
              standing={partida.standing}
              tees={tees}
              allowancePercentage={partida.effectiveAllowance}
              playMode={partida.playMode}
              participantStrokes={partida.participantStrokes ?? []}
              matchFormat={partida.matchFormat}
              showFinalBadge={cerrada}
              isCancelled={!!partida.isCancelled}
            />
          </PanelDePestana>

          <PanelDePestana id="scorecard" enfocable>
            <div data-testid="quick-match-shared-scorecard">
              <QuickMatchScorecardTable
                holes={holes}
                holeScores={partida.holeScores ?? []}
                participants={participantes}
                scoringFormat={partida.scoringFormat}
                matchFormat={partida.matchFormat}
                playMode={partida.playMode}
                participantStrokes={partida.participantStrokes ?? []}
                tees={tees}
                allowancePercentage={partida.effectiveAllowance}
              />
            </div>
          </PanelDePestana>
        </GrupoDePestanas>
      </main>
    </div>
  );
};

/** No hay partida que enseñar: no se puede ver, no existe, o falló la carga. */
const SinPartida = ({ fallo, onReintentar, t }) => {
  if (fallo === HTTP_FORBIDDEN) {
    return (
      <Aviso testId="quick-match-shared-forbidden" Icono={Lock} texto={t('shared.forbidden')} t={t} />
    );
  }
  if (fallo === HTTP_NOT_FOUND) {
    return (
      <Aviso testId="quick-match-shared-not-found" Icono={SearchX} texto={t('scoring.errors.notFound')} t={t} />
    );
  }
  return (
    <Aviso testId="quick-match-shared-error" Icono={RefreshCw} texto={t('scoring.errors.generic')} t={t}>
      <button
        type="button"
        onClick={onReintentar}
        data-testid="quick-match-shared-retry"
        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90"
      >
        <RefreshCw className="w-4 h-4" aria-hidden="true" />
        {t('shared.retry')}
      </button>
    </Aviso>
  );
};

const Aviso = ({ testId, Icono, texto, t, children }) => (
  <div
    data-testid={testId}
    className="text-center py-16 px-6 bg-white border border-gray-200 rounded-lg"
  >
    <Icono className="w-10 h-10 mx-auto text-gray-300" aria-hidden="true" />
    <p className="mt-3 text-base font-semibold text-gray-900">{texto}</p>
    {children}
    {!children && (
      <Link
        to="/feed"
        className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90"
      >
        {t('shared.back')}
      </Link>
    )}
  </div>
);

export default QuickMatchSharedPage;
