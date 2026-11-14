import { useCallback, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { useGoBack } from '../../hooks/useGoBack';
import { useAuth } from '../../hooks/useAuth';
import { useCargaCancelableEffect } from '../../hooks/useCargaCancelableEffect';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Eye, Lock, RefreshCw, SearchX } from 'lucide-react';
import HeaderAuth from '../../components/layout/HeaderAuth';
import BlockLoader from '../../components/ui/BlockLoader';
import CampoDeLaPartida from '../../components/scoring/CampoDeLaPartida';
import QuickMatchClassificationTable from '../../components/quick_match/QuickMatchClassificationTable';
import QuickMatchScorecardTable from '../../components/quick_match/QuickMatchScorecardTable';
import {
  GrupoDePestanas,
  ListaDePestanas,
  PanelDePestana,
} from '../../components/ui/Pestanas';
import customToast from '../../utils/toast';
import {
  getGolfCourseUseCase,
  getSharedQuickMatchUseCase,
} from '../../composition';
import { PANTALLA_MENOS_BARRA_INFERIOR } from '../../utils/barraInferior';

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
  // A la pantalla anterior; sin ella (enlace directo), a Actividad
  const volver = useGoBack('/feed');
  const { t } = useTranslation(['quickMatch', 'common']);
  // Para la cabecera: sin él pinta «?» y esconde lo de Admin (#1129)
  const { user } = useAuth();

  // La partida y su fallo, con la partida de la que son: al pasar a otra sin
  // salir, la anterior nunca se pinta bajo la URL de la nueva. Mientras llega,
  // la espera de siempre. El campo y su fallo se limpian al pedir el de la
  // nueva, en el mismo pintado en que llega
  const [lectura, setLectura] = useState({
    quickMatchId: null,
    partida: null,
    fallo: null,
  });
  const cargada = lectura.quickMatchId === quickMatchId;
  const partida = cargada ? lectura.partida : null;
  const fallo = cargada ? lectura.fallo : null;
  const [campo, setCampo] = useState(null);
  // El campo va aparte: que falle (pendiente, rechazado, sin red) no es que
  // falle la partida. La partida se pinta igual y lo que necesita los hoyos
  // lo dice con un error genérico y su reintento
  const [falloDelCampo, setFalloDelCampo] = useState(false);
  const [pestana, setPestana] = useState('classification');

  // De quién era la tarjeta que trajo aquí: a su perfil si no se puede ver
  const perfilDe = state?.perfilDe ?? null;
  // Si se vino desde ese mismo perfil, el 403 vuelve a él (atrás) en vez de
  // apilarlo otra vez; sin pantalla detrás, a su perfil
  const desdeSuPerfil = !!state?.desdeSuPerfil;
  const volverAlPerfil = useGoBack(perfilDe ? `/players/${perfilDe}` : '/feed');
  // Qué petición del campo es la última: el de la partida anterior que llega
  // tarde no se pinta en esta
  const campoPedidoRef = useRef(0);
  // El campo se pide en cuanto llega la partida, en el mismo momento que
  // antes, y no en un efecto un pintado después
  const cargaElCampo = useCallback(async (golfCourseId) => {
    const mio = ++campoPedidoRef.current;
    // Fuera el de antes: el de otra partida pintaba sus hoyos y sus barras en
    // esta, y los puntos se contaban con el campo que no era
    setCampo(null);
    setFalloDelCampo(false);
    try {
      const datos = await getGolfCourseUseCase.execute(golfCourseId);
      if (mio === campoPedidoRef.current) setCampo(datos);
    } catch {
      if (mio === campoPedidoRef.current) setFalloDelCampo(true);
    }
  }, []);

  // La partida se pide al entrar y al pasar a otra. Si se sale (o se pasa a
  // otra) antes de que llegue, lo que llega tarde ya no se aplica: un 403
  // tardío avisaba y se llevaba al usuario al perfil del amigo desde la
  // pantalla a la que se había ido. Lo que se hace al llegar lee `t` y el
  // estado de la navegación de ese momento: cambiar de idioma no la vuelve a
  // pedir, y tampoco un cambio del estado de la navegación en la misma URL
  const { cargando, recargar } = useCargaCancelableEffect(
    () => getSharedQuickMatchUseCase.execute(quickMatchId),
    [quickMatchId],
    {
      alCargar: (datos) => {
        setLectura({ quickMatchId, partida: datos, fallo: null });
        // Quien la jugó va a su anotación: no hace falta el campo
        if (!datos.viewerIsParticipant) cargaElCampo(datos.golfCourseId);
      },
      alFallar: (error) => {
        if (error?.status === HTTP_FORBIDDEN && perfilDe && desdeSuPerfil) {
          customToast.info(t('shared.forbiddenBack'));
          volverAlPerfil();
          return;
        }
        if (error?.status === HTTP_FORBIDDEN && perfilDe) {
          customToast.info(t('shared.forbiddenToast'));
          navigate(`/players/${perfilDe}`, { replace: true });
          return;
        }
        // Lo que hubiera de esta misma partida se queda, como siempre; de otra, nada
        setLectura((antes) => ({
          quickMatchId,
          partida: antes.quickMatchId === quickMatchId ? antes.partida : null,
          fallo: error?.status ?? 'otro',
        }));
      },
    },
  );
  // Reintentar: se quita el fallo y vuelve la espera, como siempre
  const reintentar = () => {
    setLectura((antes) => ({ ...antes, fallo: null }));
    recargar();
  };

  const participantes = useMemo(
    () =>
      (partida?.participants ?? []).map((p) => ({
        ...p,
        name: p.name || t(p.isGuest ? 'shared.guest' : 'shared.player'),
      })),
    [partida, t],
  );

  if (partida?.viewerIsParticipant) {
    return <Navigate to={`/quick-matches/${quickMatchId}/scoring`} replace />;
  }

  if (!cargada || (cargando && !partida)) {
    return (
      <div className={`${PANTALLA_MENOS_BARRA_INFERIOR} bg-gray-50`}>
        <HeaderAuth user={user} />
        <BlockLoader texto={t('scoring.matchHeader')} />
      </div>
    );
  }

  if (fallo !== null || !partida) {
    return (
      <div className={`${PANTALLA_MENOS_BARRA_INFERIOR} bg-gray-50`}>
        <HeaderAuth user={user} />
        <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
          <SinPartida
            fallo={fallo}
            onReintentar={reintentar}
            onVolver={volver}
            t={t}
          />
        </main>
      </div>
    );
  }

  const esJuegoLibre =
    partida.scoringFormat === 'MEDAL' || partida.scoringFormat === 'STABLEFORD';
  const errorDelCampo = (
    <ErrorDelCampo
      onReintentar={() => cargaElCampo(partida.golfCourseId)}
      t={t}
    />
  );
  // Sin los hoyos no hay puntos ni golpes que contar; mientras llegan, nada
  const sinHoyos = !campo;
  const holes = campo?.holes ?? [];
  const tees = campo?.tees ?? [];
  const cerrada = !!partida.isCompleted || !!partida.isCancelled;

  return (
    <div className={`${PANTALLA_MENOS_BARRA_INFERIOR} bg-gray-50`}>
      <HeaderAuth user={user} />

      <main className="max-w-4xl mx-auto px-4 py-4 pb-24">
        {/* En móvil la vuelta la da la cabecera contextual (por historial) */}
        <BotonVolver
          onVolver={volver}
          t={t}
          className="hidden md:inline-flex mb-3"
        />

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
              {(partida.matchFormat ?? partida.scoringFormat) &&
                t(
                  `history.format.${partida.matchFormat ?? partida.scoringFormat}`,
                  partida.matchFormat ?? partida.scoringFormat,
                )}
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
                abierta
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`
            }
          />

          <PanelDePestana id="classification" enfocable>
            {esJuegoLibre && sinHoyos ? (
              falloDelCampo ? (
                errorDelCampo
              ) : null
            ) : (
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
            )}
          </PanelDePestana>

          <PanelDePestana id="scorecard" enfocable>
            {sinHoyos ? (
              falloDelCampo ? (
                errorDelCampo
              ) : null
            ) : (
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
            )}
          </PanelDePestana>
        </GrupoDePestanas>
      </main>
    </div>
  );
};

/** «Volver»: a la pantalla anterior, o a Actividad si no la hay. */
const BotonVolver = ({ onVolver, t, className = '' }) => (
  <button
    type="button"
    onClick={onVolver}
    data-testid="quick-match-shared-back"
    className={`items-center gap-1 text-sm text-gray-500 hover:text-primary ${className}`}
  >
    <ArrowLeft className="w-4 h-4" aria-hidden="true" />
    {t('shared.back')}
  </button>
);

/** El campo no ha llegado: un error genérico, nunca uno de partida, con reintento. */
const ErrorDelCampo = ({ onReintentar, t }) => (
  <div
    data-testid="quick-match-shared-course-error"
    className="text-center py-10 px-6 bg-white border border-gray-200 rounded-lg"
  >
    <p className="text-sm text-gray-700">{t('scoring.errors.generic')}</p>
    <button
      type="button"
      onClick={onReintentar}
      data-testid="quick-match-shared-course-retry"
      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90"
    >
      <RefreshCw className="w-4 h-4" aria-hidden="true" />
      {t('shared.retry')}
    </button>
  </div>
);

/** No hay partida que enseñar: no se puede ver, no existe, o falló la carga. */
const SinPartida = ({ fallo, onReintentar, onVolver, t }) => {
  if (fallo === HTTP_FORBIDDEN) {
    return (
      <Aviso
        testId="quick-match-shared-forbidden"
        Icono={Lock}
        texto={t('shared.forbidden')}
        onVolver={onVolver}
        t={t}
      />
    );
  }
  if (fallo === HTTP_NOT_FOUND) {
    return (
      <Aviso
        testId="quick-match-shared-not-found"
        Icono={SearchX}
        texto={t('scoring.errors.notFound')}
        onVolver={onVolver}
        t={t}
      />
    );
  }
  return (
    <Aviso
      testId="quick-match-shared-error"
      Icono={RefreshCw}
      texto={t('scoring.errors.generic')}
      onVolver={onVolver}
      t={t}
    >
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

// Siempre con una salida: en escritorio no hay flecha en la cabecera
const Aviso = ({ testId, Icono, texto, onVolver, t, children }) => (
  <div
    data-testid={testId}
    className="text-center py-16 px-6 bg-white border border-gray-200 rounded-lg"
  >
    <Icono className="w-10 h-10 mx-auto text-gray-300" aria-hidden="true" />
    <p className="mt-3 text-base font-semibold text-gray-900">{texto}</p>
    {children}
    <div className="mt-4">
      <BotonVolver onVolver={onVolver} t={t} className="inline-flex" />
    </div>
  </div>
);

export default QuickMatchSharedPage;
