import { useState } from 'react';
import { barraDe } from '../../domain/services/muestrasDeLaBarra';
import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import { useScoring } from '../../hooks/useScoring';
import { useMapaDelHoyo } from '../../hooks/useMapaDelHoyo';
import { abreMasTarde, horaDelCampo } from '../../services/partidosSinCobertura';
import AvisosDelPartido from '../../components/scoring/AvisosDelPartido';
import CabeceraDelPartido from '../../components/scoring/CabeceraDelPartido';
import MatchSummaryCard from '../../components/scoring/MatchSummaryCard';
import AnotarSinConexion from '../../components/scoring/AnotarSinConexion';
import EntregaDelPartido from '../../components/scoring/EntregaDelPartido';
import ModalesDelPartido from '../../components/scoring/ModalesDelPartido';
import PestanaDeAnotar from '../../components/scoring/PestanaDeAnotar';
import PestanasDelPartido from '../../components/scoring/PestanasDelPartido';
import { opcionesDeRetirada } from '../../domain/services/retiradaDelFourball';
import PendientesASalvo from '../../components/scoring/PendientesASalvo';
import SinNadaQuePintar from '../../components/scoring/SinNadaQuePintar';
import BlockLoader from '../../components/ui/BlockLoader';
import { useAnotacionEnCurso } from '../../hooks/useAnotacionEnCurso';
import { useClasificacionAlAbrir } from '../../hooks/useClasificacionAlAbrir';
import { useDespertarALaHora } from '../../hooks/useDespertarALaHora';
import { useGoBack } from '../../hooks/useGoBack';
import { PESTANAS_DEL_PARTIDO } from '../../utils/pestanasDeLaAnotacion';
import { hoyosSinGuardar, lecturaDelHoyo } from '../../utils/lecturaDelHoyo';
import {
  cierreDelPartido,
  esFalloDeUnaAccion,
  estadoDeEntrega,
  ganadorDelResumen,
  textoDelMarcador,
} from '../../utils/lecturaDelPartido';

const TABS = PESTANAS_DEL_PARTIDO;

// Los primeros hijos de cada `<div>` raíz siguen aquí, en el mismo orden: al
// pasar de una salida temprana a otra, React reutiliza lo que coincide
const ScoringPage = () => {
  const { matchId } = useParams();
  const { t, i18n } = useTranslation('scoring');
  const { t: tSchedule } = useTranslation('schedule');
  const { user, loading: isLoadingUser } = useAuth();

  const [activeTab, setActiveTab] = useState('input');
  const [showConcedeModal, setShowConcedeModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [earlyEndDismissed, setEarlyEndDismissed] = useState(false);
  const {
    scoringView,
    scoresVisibles,
    currentHole,
    isLoading,
    error,
    origenDelError,
    isSubmitting,
    matchSummary,
    isOffline,
    isSessionBlocked,
    pendingQueueSize,
    noGuardados,
    avisoDelVaciado,
    pintadoDeMemoria,
    isMatchPlayer,
    canScore,
    hasSubmitted,
    isOwnScoreLocked,
    validatedHoles,
    totalHoles,
    holesToSubmit,
    canSubmitScorecard,
    partidoAcabado,
    setCurrentHole,
    submitScore,
    submitScorecard,
    concedeMatch,
    retirarJugador,
    isWithdrawn,
    marcaBloqueadaPara,
    retirando,
    takeOverSession,
    refetch,
  } = useScoring(matchId, user?.id, user?.is_admin ?? false);

  // Los hoyos que no se pudieron guardar, en orden (FE #622), y a quién marco
  const { hoyosNoGuardados, primerMarcado, segundoMarcado, porAnotar, sinAnotar } = hoyosSinGuardar({
    noGuardados,
    markerAssignments: scoringView?.markerAssignments,
    userId: user?.id,
    canScore,
    isOwnScoreLocked,
    marcaBloqueadaPara,
  });

  // Si el fallo es de una acción —anotar, entregar, conceder, retirar— y no de
  // cargar (FE #626)
  const falloDeUnaAccion = esFalloDeUnaAccion(origenDelError);

  // La clasificación, pedida al abrir su pestaña
  const leaderboard = useClasificacionAlAbrir(activeTab, scoringView?.competitionId);

  // Confirmar la entrega deja de ser posible si el marcador anota mientras el
  // diálogo está abierto. Ocultarlo no basta: `showSubmitModal` seguiría a true
  // y el diálogo reaparecería solo en cuanto la entrega volviera a ser posible,
  // sin que el jugador lo hubiera pedido otra vez. Se ajusta durante el render
  // —el patrón que documenta React para reaccionar a un cambio de valor— porque
  // hacerlo desde un efecto encadena renders y el lint del repo lo prohíbe
  // (react-hooks/set-state-in-effect).
  const [wasSubmittable, setWasSubmittable] = useState(canSubmitScorecard);
  if (wasSubmittable !== canSubmitScorecard) {
    setWasSubmittable(canSubmitScorecard);
    if (!canSubmitScorecard) {
      setShowSubmitModal(false);
    }
  }

  // Cómo acabó, si acabó: decidido o cerrado sin jugar (concedido, walkover)
  const cierreDeEste = cierreDelPartido(scoringView);
  const { resultadoDecidido, cerradoSinJugar, claveDelCierre, cierre } = cierreDeEste;
  // Derived: show early end modal when match is decided and user hasn't dismissed.
  // Not shown once the player has already submitted — the "continue to submit" CTA
  // no longer applies, and re-showing it on every revisit is just noise.
  // Solo quien juega tiene una tarjeta que entregar: al que mira un partido
  // ajeno el aviso le pedía «Continuar para Enviar» (FE #740)
  const showEarlyEnd =
    !!scoringView?.isDecided &&
    isMatchPlayer &&
    !cerradoSinJugar &&
    !earlyEndDismissed &&
    !matchSummary &&
    !hasSubmitted;

  const currentUserId = user?.id;

  // El marcador de la cabecera, que repite la barra de entregar (FE #745)
  const marcador = textoDelMarcador(t, scoringView, cierreDeEste);

  // La barra de entregar la tarjeta, en las tres pestañas (FE #745)
  const entrega = estadoDeEntrega({
    isMatchPlayer,
    isWithdrawn,
    hasSubmitted,
    cerradoSinJugar,
    canSubmitScorecard,
    partidoAcabado,
  });

  // El hoyo en pantalla: a quién marco, sus bloqueos y las filas del hoyo
  const hoyo = lecturaDelHoyo({
    scoringView,
    currentUserId,
    currentHole,
    scoresVisibles,
    primerMarcado,
    segundoMarcado,
    marcaBloqueadaPara,
  });
  const { currentHoleData } = hoyo;

  // Players who still need to submit their scorecard for the match to complete
  const esFoursomes = scoringView?.matchFormat === 'FOURSOMES';
  // El retirado no entrega: no se le espera (F4)
  const retirados = scoringView?.withdrawnPlayerIds ?? [];
  const pendingPlayers = scoringView?.players?.filter(
    (p) => !scoringView?.scorecardSubmittedBy?.includes(p.userId) && !retirados.includes(p.userId)
  ) ?? [];
  const opcionesDeLaRetirada = opcionesDeRetirada(scoringView, currentUserId);

  // Mi barra (color y sexo), como en stroke play: con ella la Ryder marca y
  // envía muestras del mapa (#880). Quien no juega el partido no tiene barra:
  // solo mide. En foursomes, la mía, no la del compañero
  const yo = scoringView?.players?.find((p) => p.userId === currentUserId);
  const miBarra = barraDe(yo);

  // La anotación de un partido programado abre sola a una hora (BE #305). Antes
  // de esa hora no se ofrecen casillas: el servidor las rechazaría y el golpe
  // se quedaría esperando en la cola sin que el jugador entienda por qué
  const aunNoAbre = abreMasTarde({
    status: scoringView?.matchStatus,
    scoringOpensAt: scoringView?.scoringOpensAt,
  });
  // El mapa del hoyo (BE #532): «Mapa» en la tarjeta lo abre a pantalla completa
  const mapaDelHoyo = useMapaDelHoyo({
    golfCourseId: scoringView?.roundInfo?.golfCourseId ?? null,
    cerrarSi: isSessionBlocked,
    // Su país: solo hay imagen en España (19 oct)
    pais: scoringView?.roundInfo?.golfCourseCountryCode ?? null,
  });
  // La hora del CAMPO, que es la que el servidor va a aplicar, no la del móvil:
  // `Intl` sin `timeZone` formatea en el huso del aparato, y un torneo canario
  // mirado desde la península anunciaba una hora que no era la suya. La cadena
  // del servidor ya trae su desfase, así que se toma la hora TAL CUAL viene
  const horaDeApertura = aunNoAbre
    ? horaDelCampo(scoringView?.scoringOpensAt, i18n.language)
    : null;

  // Y que el aviso caduque solo: se despierta a la hora en punto
  useDespertarALaHora(aunNoAbre);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handlePrevHole = () => {
    if (currentHole > 1) {
      setCurrentHole(currentHole - 1);
    }
  };

  const handleNextHole = () => {
    if (currentHole < totalHoles) {
      setCurrentHole(currentHole + 1);
    }
  };

  const handleHoleSelect = (hole) => {
    setCurrentHole(hole);
  };

  const handleConcede = async (reason) => {
    try {
      const playerTeam = scoringView?.players?.find((p) => p.userId === currentUserId)?.team;
      if (playerTeam) {
        await concedeMatch(playerTeam, reason);
      }
    } finally {
      setShowConcedeModal(false);
    }
  };

  const handleSubmitScorecard = async () => {
    try {
      await submitScorecard();
    } finally {
      setShowSubmitModal(false);
    }
  };

  const handleSessionTakeOver = () => {
    takeOverSession();
  };

  // Si iOS cierra la app, al abrirla se vuelve aquí, a esta pestaña, este hoyo y el mapa
  // (11 nov 2026). Con el partido cerrado o la tarjeta entregada ya no hay a qué volver
  useAnotacionEnCurso({
    cargada: Boolean(scoringView) && !isLoading,
    // Cerrado, concedido o walkover, con mi tarjeta entregada o retirado yo
    terminada:
      scoringView?.matchStatus === 'COMPLETED' ||
      cerradoSinJugar ||
      hasSubmitted ||
      Boolean(currentUserId && retirados.includes(currentUserId)),
    pestana: activeTab,
    pestanas: TABS,
    alCambiarDePestana: setActiveTab,
    hoyo: currentHole,
    totalHoyos: totalHoles,
    alCambiarDeHoyo: setCurrentHole,
    // El mapa se repone solo donde la pantalla ofrece su botón
    mapa: { ...mapaDelHoyo, disponible: mapaDelHoyo.disponible && Boolean(currentHoleData) && !aunNoAbre && !cerradoSinJugar },
  });
  // «Volver» sin una pantalla detrás (se llegó al arrancar la app): al panel
  const volver = useGoBack('/dashboard');

  if (isLoadingUser || isLoading) {
    // La cabecera se queda puesta durante la espera: aparecer de golpe al
    // terminar es un salto, y de eso va justamente FE #495
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth user={user} />
        <BlockLoader texto={t('loading')} />
      </div>
    );
  }

  // No hay nada que pintar: ni hoyos, ni pares, ni quién juega. Una sola pantalla
  // para los dos motivos por los que se llega aquí (FE #617), porque al jugador
  // le pasa lo mismo en ambos y lo que necesita saber es igual:
  //
  // - sin cobertura la petición muere sin respuesta y el hook NO pone error a
  //   propósito;
  // - con cobertura y el servidor caído —un club con señal y la API abajo, o un
  //   5xx— el hook SÍ lo pone, y antes esta rama era inalcanzable: ganaba la de
  //   error y salía el mensaje crudo de `fetch` («Failed to fetch (host:puerto)»),
  //   sin una palabra de los golpes que seguían en la cola.
  //
  // Con la foto del partido (FE #614) esto solo se ve si nunca se abrió aquí
  if (!scoringView) {
    // El motivo sale de `motivoDe`, la misma regla que usa el recuadro de abajo
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth user={user} />

        {/* Sin conexión, su aviso: se perdía cuando la cola estaba vacía, que es
            el caso más común al llegar al campo con un partido nunca abierto aquí */}
        {/* Sin vista aún no se sabe quién juega: el aviso de anotar, por si acaso */}
        {isOffline && <AnotarSinConexion pendingCount={pendingQueueSize} />}

        {/* Y con cobertura, los golpes pendientes se cuentan aparte: el banner de
            arriba afirma «estás sin conexión», y aquí sí la hay —lo caído es el
            servidor—, así que usarlo para esto sería decirle algo falso */}
        {!isOffline && <PendientesASalvo count={pendingQueueSize} />}

        <div className="max-w-4xl mx-auto px-4 py-6 text-center" data-testid="sin-nada-guardado">
          <SinNadaQuePintar t={t} error={error} refetch={refetch} />
        </div>
      </div>
    );
  }

  // Match summary screen
  if (matchSummary) {
    const winnerName = ganadorDelResumen(matchSummary, scoringView);

    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth user={user} />
        <div className="max-w-lg mx-auto px-4 py-6">
          <MatchSummaryCard summary={matchSummary} winnerName={winnerName} />
          <button
            onClick={volver}
            className="mt-4 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
          >
            {t('summary.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderAuth user={user} />

      {/* Solo quien anota (también un administrador): al organizador que no juega no le vale «lo que anotes se guarda» */}
      {isOffline && canScore && <AnotarSinConexion pendingCount={pendingQueueSize} />}

      {/* El gemelo de la pantalla sin nada pintado (FE #625): con cobertura y el
          servidor caído, la casilla enseña el golpe y nada decía que el otro
          jugador no lo ve. Sale solo mientras el servidor no contesta: con
          respuesta, el sondeo vacía la cola */}
      {/* Salvo con el aviso del almacenamiento: esos golpes no se van a enviar
          al responder el servidor, y prometerlo sería falso */}
      {!isOffline && !avisoDelVaciado && <PendientesASalvo count={pendingQueueSize} />}

      {/* Los hoyos que no se pudieron guardar (FE #622). Aparte del recuadro de
          errores, que lo limpia cada sondeo: este solo se va al guardar su
          hoyo, y dice cuáles, porque hay que volver a anotarlos */}
      {hoyosNoGuardados.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div
            role="alert"
            data-testid="no-guardados"
            className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm space-y-1"
          >
            {porAnotar.length > 0 && (
              <p>{t('offline.noGuardados', { count: porAnotar.length, holes: porAnotar.join(', ') })}</p>
            )}
            {sinAnotar.length > 0 && (
              <p>{t('offline.noGuardadosSinAnotar', { count: sinAnotar.length, holes: sinAnotar.join(', ') })}</p>
            )}
          </div>
        </div>
      )}

      <AvisosDelPartido
        t={t}
        scoringView={scoringView}
        isOffline={isOffline}
        avisoDelVaciado={avisoDelVaciado}
        pintadoDeMemoria={pintadoDeMemoria}
        error={error}
        origenDelError={origenDelError}
        falloDeUnaAccion={falloDeUnaAccion}
        refetch={refetch}
      />

      <div className="max-w-4xl mx-auto px-4 py-4">
        <CabeceraDelPartido
          t={t}
          tSchedule={tSchedule}
          scoringView={scoringView}
          marcador={marcador}
          resultadoDecidido={resultadoDecidido}
          cerradoSinJugar={cerradoSinJugar}
        />

        {/* Tabs */}
        <PestanasDelPartido
          t={t}
          tabs={TABS}
          activeTab={activeTab}
          onElegir={handleTabChange}
          scoringView={scoringView}
          scoresVisibles={scoresVisibles}
          currentUserId={currentUserId}
          retirados={retirados}
          leaderboard={leaderboard}
        >
          <PestanaDeAnotar
            t={t}
            scoringView={scoringView}
            hoyo={hoyo}
            currentHole={currentHole}
            totalHoles={totalHoles}
            scoresVisibles={scoresVisibles}
            noGuardados={noGuardados}
            hoyosNoGuardados={hoyosNoGuardados}
            retirados={retirados}
            aunNoAbre={aunNoAbre}
            horaDeApertura={horaDeApertura}
            cerradoSinJugar={cerradoSinJugar}
            cierre={cierre}
            claveDelCierre={claveDelCierre}
            segundoMarcado={segundoMarcado}
            canScore={canScore}
            hasSubmitted={hasSubmitted}
            isOwnScoreLocked={isOwnScoreLocked}
            isSessionBlocked={isSessionBlocked}
            partidoAcabado={partidoAcabado}
            mapaDelHoyo={mapaDelHoyo}
            currentUserId={currentUserId}
            miBarra={miBarra}
            opcionesDeLaRetirada={opcionesDeLaRetirada}
            retirarJugador={retirarJugador}
            retirando={retirando}
            onHoleSelect={handleHoleSelect}
            onPrevHole={handlePrevHole}
            onNextHole={handleNextHole}
            isMatchPlayer={isMatchPlayer}
            submitScore={submitScore}
            onAbrirConcesion={() => setShowConcedeModal(true)}
          />
        </PestanasDelPartido>

        {entrega && (
          <EntregaDelPartido
            estado={entrega}
            marcador={marcador}
            onEntregar={() => setShowSubmitModal(true)}
            enviando={isSubmitting}
            esFoursomes={esFoursomes}
            pendientes={pendingPlayers.map((p) => p.userName)}
            scoringView={scoringView}
            cerradoSinJugar={cerradoSinJugar}
            holesToSubmit={holesToSubmit}
            totalHoles={totalHoles}
          />
        )}
      </div>

      {/* Modals */}
      <ModalesDelPartido
        scoringView={scoringView}
        isSessionBlocked={isSessionBlocked}
        onSessionTakeOver={handleSessionTakeOver}
        volver={volver}
        showEarlyEnd={showEarlyEnd}
        canSubmitScorecard={canSubmitScorecard}
        onEarlyEndConfirm={() => {
          setEarlyEndDismissed(true);
          // A la tarjeta, para repasarla antes de entregar: el botón está en la
          // barra de abajo en todas las pestañas (FE #745), pero lo que se firma
          // se lee en esta
          setActiveTab('scorecard');
        }}
        onEarlyEndClose={() => setEarlyEndDismissed(true)}
        showConcedeModal={showConcedeModal}
        cerradoSinJugar={cerradoSinJugar}
        onConcede={handleConcede}
        onConcedeClose={() => setShowConcedeModal(false)}
        showSubmitModal={showSubmitModal}
        validatedHoles={validatedHoles}
        holesToSubmit={holesToSubmit}
        isSubmitting={isSubmitting}
        onSubmitScorecard={handleSubmitScorecard}
        onSubmitClose={() => setShowSubmitModal(false)}
      />
    </div>
  );
};

export default ScoringPage;
