import { useState, useMemo } from 'react';
import { barraDe } from '../../domain/services/muestrasDeLaBarra';
import { permiteLaRaya } from '../../domain/services/permiteLaRaya';
import { useParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import { useQuickMatchScoring } from '../../hooks/useQuickMatchScoring';
import { useMapaDelHoyo } from '../../hooks/useMapaDelHoyo';
import AvisosDePartidaRapida from '../../components/quick_match/AvisosDePartidaRapida';
import DialogosDePartidaRapida from '../../components/quick_match/DialogosDePartidaRapida';
import PestanaDeAnotarRapida from '../../components/quick_match/PestanaDeAnotarRapida';
import CampoDeLaPartida from '../../components/scoring/CampoDeLaPartida';
import PestanaDeClasificacionRapida from '../../components/quick_match/PestanaDeClasificacionRapida';
import QuickMatchScorecardTable from '../../components/quick_match/QuickMatchScorecardTable';
import PersonalRoundCalculator from '../../domain/services/PersonalRoundCalculator';
import BlockLoader from '../../components/ui/BlockLoader';
import AnotarSinConexion from '../../components/scoring/AnotarSinConexion';
import { GrupoDePestanas, ListaDePestanas, PanelDePestana } from '../../components/ui/Pestanas';
import { useSinConexion } from '../../hooks/useSinConexion';
import { useAnotacionEnCurso } from '../../hooks/useAnotacionEnCurso';
import { useFocoDeLosDialogos } from '../../hooks/useFocoDeLosDialogos';
import { casillasDelHoyo } from '../../utils/casillasDelHoyo';
import { claveDeFallo, loadErrorKeyFor } from '../../utils/textosDePartidaRapida';
import { PESTANAS_DE_LA_RAPIDA } from '../../utils/pestanasDeLaAnotacion';

const TABS = PESTANAS_DE_LA_RAPIDA;

const QuickMatchScoringPage = () => {
  const { quickMatchId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('quickMatch');
  const { user, loading: isLoadingUser } = useAuth();

  const [activeTab, setActiveTab] = useState('input');
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  // La clave del aviso, no un booleano: un 409 —ya la cerro otro— y quedarse
  // sin cobertura piden explicaciones distintas.
  const [cancelFailedKey, setCancelFailedKey] = useState(null);
  const [finishFailedKey, setFinishFailedKey] = useState(null);

  const {
    quickMatch,
    holes,
    tees,
    courseName,
    courseCountryCode,
    currentHole,
    isLoading,
    loadError,
    saveError,
    avisoDelVaciado,
    isSubmitting,
    myParticipant,
    isCreator,
    isScorer,
    coveredParticipantIds,
    totalHoles,
    setCurrentHole,
    submitScore,
    completeMatch,
    cancelMatch,
    refetch,
    holeScoresVisibles,
    pintadoDeMemoria,
    pendientes,
    perdidos,
    discrepancias,
    resuelveDiscrepancia,
  } = useQuickMatchScoring(quickMatchId, user?.id);

  // «Tu vuelta» (21 oct): el acumulado neto de quien anota con SU hándicap de
  // juego, sobre lo visible —lo pendiente de enviar incluido—. En foursomes
  // sale null: una bola por bando, no hay vuelta propia. En un useMemo y aquí
  // arriba, antes de las salidas tempranas: es un hook, y la pantalla se pinta
  // de nuevo con cada sondeo aunque no cambie ningún golpe
  const participants = quickMatch?.participants;
  const participantStrokes = quickMatch?.participantStrokes;
  const matchFormat = quickMatch?.matchFormat ?? null;
  const effectiveAllowance = quickMatch?.effectiveAllowance ?? null;
  const playMode = quickMatch?.playMode ?? 'HANDICAP';
  const myRound = useMemo(
    () =>
      PersonalRoundCalculator.runningResult({
        me: myParticipant,
        participants: participants ?? [],
        holes,
        holeScores: holeScoresVisibles,
        tees,
        participantStrokes: participantStrokes ?? [],
        matchFormat,
        allowancePercentage: effectiveAllowance,
        playMode,
      }),
    [
      myParticipant,
      participants,
      holes,
      holeScoresVisibles,
      tees,
      participantStrokes,
      matchFormat,
      effectiveAllowance,
      playMode,
    ]
  );
  // El mapa del hoyo (BE #532): «Mapa» en la tarjeta lo abre a pantalla completa
  // El mapa, cuando ya llegó el campo (sus hoyos) y con él su país: antes,
  // fuera de España se pedía para nada (CodeRabbit)
  const mapaDelHoyo = useMapaDelHoyo({
    golfCourseId: holes.length > 0 ? (quickMatch?.golfCourseId ?? null) : null,
    pais: courseCountryCode ?? null,
  });

  // De una en una: dos avisos superpuestos no se pueden usar, y la siguiente
  // no se pierde porque el hook la mantiene en la lista hasta resolverla
  const discrepancia = discrepancias?.[0] ?? null;
  // El conflicto lo destapa el sondeo, no un toque del jugador, así que puede
  // aparecer con otro aviso ya abierto. Espera su turno: dos ventanas a la
  // misma altura se tapan, y el foco guardado para volver se perdería
  // Si el grupo entero se anota desde este móvil —lo normal en un cuarteto con
  // invitados— no falta nada de nadie: la clasificación está completa, así que
  // ni se avisa ni se le quita el puesto a nadie
  // Mi barra (color y sexo): las muestras del mapa de hoyos van por barra (16 oct)
  const yoEnLaPartida = (quickMatch?.participants ?? []).find((p) => p.userId && p.userId === user?.id);
  const miBarra = barraDe(yoEnLaPartida);
  const hayQuienNoAnoto = (quickMatch?.participants ?? []).some(
    (p) => !coveredParticipantIds.includes(p.participantId)
  );
  const esJuegoLibre = quickMatch?.scoringFormat === 'MEDAL' || quickMatch?.scoringFormat === 'STABLEFORD';
  const faltanDatosDeOtros = pendientes > 0 && hayQuienNoAnoto;

  const hayDiscrepancia = discrepancia != null && !showCancelConfirm && !showFinishConfirm;
  const jugadorEnDisputa = discrepancia
    ? quickMatch?.participants?.find((p) => p.participantId === discrepancia.participantId)
    : null;
  // Una bola recogida llega sin número y significa lo contrario que no tener
  // anotación: sin esto los botones leían «Poner el mío ()»
  const comoSeLee = (valor) =>
    valor === null || valor === undefined ? t('scoring.offline.pickedUp') : valor;

  // Quedarse sin cobertura no es un error: el sondeo falla cada diez segundos
  // y la pantalla ya lo cuenta en ámbar. El rojo, además, quedaba justo debajo
  // del ámbar diciendo lo contrario. Un fallo CON estado sí es un error de
  // verdad —el servidor contestó algo— y ese se sigue enseñando
  // O bien no hubo respuesta, o bien lo que se está viendo sale de la memoria
  // del móvil: en los dos casos lo que hay en pantalla puede no estar al día, y
  // en ninguno es un error. Con un 5xx la pantalla se pintaba entera desde el
  // móvil bajo un recuadro rojo, sin decir que era una foto de antes
  const sinConexion = useSinConexion();
  const sondeoSinRespuesta =
    (!!loadError && (loadError.status ?? loadError.response?.status) === undefined)
    || !!pintadoDeMemoria;
  const errorDeVerdad = saveError || (loadError && !sondeoSinRespuesta);

  const hoyosPerdidos = [...new Set((perdidos ?? []).map((x) => x.holeNumber))].sort((a, b) => a - b);

  // Sin red (lo dice el navegador), las pendientes van en el aviso de arriba,
  // uno solo, como en la Ryder y las partidas (regresión del 12 oct 2026). Con
  // red pero sin salir (dos barras), el recuadro de siempre
  const avisoDePendientes = sinConexion && (isScorer || pendientes > 0) ? (
    <AnotarSinConexion pendingCount={pendientes} />
  ) : pendientes > 0 && (
    <div className="max-w-4xl mx-auto px-4 pt-4">
      <p
        data-testid="quick-match-pendientes"
        className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm"
      >
        {t('scoring.offline.pending', { count: pendientes })}
      </p>
    </div>
  );
  const nombreDelAnotador = discrepancia
    ? quickMatch?.participants?.find((p) => p.participantId === discrepancia.anotadoPor)?.name
    : null;

  // El foco de los avisos y su tecla Escape
  const { cancelDialogRef, finishDialogRef, discrepanciaDialogRef, tabsRef } = useFocoDeLosDialogos({
    showFinishConfirm,
    showCancelConfirm,
    hayDiscrepancia,
    isSubmitting,
    setFinishFailedKey,
    setCancelFailedKey,
    setShowFinishConfirm,
    setShowCancelConfirm,
  });

  // Si iOS cierra la app, al abrirla se vuelve aquí, a esta pestaña, este hoyo y el mapa
  // (11 nov 2026). Terminada o anulada ya no hay a qué volver
  useAnotacionEnCurso({
    cargada: Boolean(quickMatch) && !isLoading,
    terminada: Boolean(quickMatch?.isCompleted || quickMatch?.isCancelled),
    pestana: activeTab,
    pestanas: TABS,
    alCambiarDePestana: setActiveTab,
    hoyo: currentHole,
    totalHoyos: totalHoles,
    alCambiarDeHoyo: setCurrentHole,
    mapa: mapaDelHoyo,
  });

  if (isLoadingUser || isLoading) {
    // La cabecera se queda puesta durante la espera: aparecer de golpe al
    // terminar es un salto, y de eso va justamente FE #495
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth user={user} />
        <BlockLoader texto={t('scoring.loading')} />
      </div>
    );
  }

  if (loadError && !quickMatch) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth user={user} />
        {avisoDePendientes}
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          {/* La misma regla que en el resto de la pantalla: quedarse sin
              cobertura no es un error, y aquí llegaba como «ha ocurrido un
              error», que suena a que algo se ha roto */}
          <p
            className={sondeoSinRespuesta ? 'text-amber-800' : 'text-red-600'}
            data-testid="quick-match-scoring-error"
          >
            {sondeoSinRespuesta ? t('scoring.offline.noSeActualiza') : t(loadErrorKeyFor(loadError))}
          </p>
          <button onClick={refetch} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg">
            {t('scoring.retry')}
          </button>
        </div>
      </div>
    );
  }

  // Las casillas del hoyo: una por jugador cubierto, o por bando en foursomes,
  // cada una con la tarjeta de su barra
  const { currentHoleData, entries } = casillasDelHoyo({
    quickMatch,
    holes,
    tees,
    currentHole,
    myParticipant,
    coveredParticipantIds,
    holeScoresVisibles,
  });

  // En Medal se emboca en todos los hoyos: quien no lo hace no entrega tarjeta,
  // así que ahí la raya ni se ofrece —y el backend la rechaza—. Solo donde se
  // permite expresamente: Stableford y match play
  const allowsPickedUp = permiteLaRaya(quickMatch);

  // «Tu vuelta»: calculada arriba, antes de las salidas tempranas (es un hook)

  // `isCancelled` cuenta igual que `isCompleted`: la partida ya no admite
  // anotaciones. Sin el, la pantalla seguia viva y cada guardado se estrellaba
  // contra un 409 que se traduce como «vuelve a cargarla» —y recargar no la
  // resucita, asi que el usuario se queda reintentando para siempre—.
  // `isSubmitting` NO entra aquí: dejaba la casilla de solo lectura mientras
  // el golpe estaba de camino, y sin cobertura eso son los diez segundos que
  // el móvil tarda en rendirse. El jugador que anotaba un hoyo no podía anotar
  // el siguiente hasta que la petición del anterior muriera (FE #564).
  // Bloquear ya no protege de nada: el golpe se guarda antes de enviarse
  // (FE #561) y el hook serializa los envíos, así que una anotación que llega
  // con otra en vuelo se guarda y sale en el vaciado siguiente
  const isReadOnly = !isScorer || quickMatch?.isCompleted || quickMatch?.isCancelled;

  const handleScoreChange = (participantId, score) => {
    submitScore(currentHole, participantId, score);
  };

  const handlePrevHole = () => {
    if (currentHole > 1) setCurrentHole(currentHole - 1);
  };

  const handleNextHole = () => {
    if (currentHole < totalHoles) setCurrentHole(currentHole + 1);
  };

  // El sondeo puede cerrar la partida mientras el aviso esta abierto
  const yaCerrada = !!quickMatch?.isCompleted || !!quickMatch?.isCancelled;

  const handleFinishConfirm = async () => {
    setFinishFailedKey(null);
    const { ok, error } = (await completeMatch()) ?? {};
    if (ok) {
      setShowFinishConfirm(false);
      return;
    }
    setFinishFailedKey(claveDeFallo('scoring.finish', error));
    refetch();
  };

  const handleCancelConfirm = async () => {
    // Solo se cierra si de verdad se cancelo, y el fallo se cuenta AQUI dentro:
    // el aviso general vive detras del velo del dialogo y su texto habla de
    // anotar —«no se ha podido guardar el resultado»—, que no es lo que acaba
    // de pasar.
    setCancelFailedKey(null);
    const { ok, error } = (await cancelMatch()) ?? {};
    if (ok) {
      setShowCancelConfirm(false);
      return;
    }
    setCancelFailedKey(claveDeFallo('scoring.cancelMatch', error));
    // Recargar: si fallo porque otro dispositivo ya la cerro, el estado nuevo
    // se lleva por delante los botones que ya no valen.
    refetch();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderAuth user={user} />

      {/* El aviso de arriba cubre los dos: un guardado rechazado y un sondeo que
          falla con la partida ya cargada. Cada uno con su copia, y el de
          guardar primero porque es lo que el anotador acaba de intentar. */}
      {avisoDePendientes}

      {/* Que no haya golpes pendientes no quita que la pantalla lleve un rato
          sin actualizarse: sin decirlo, se lee como si estuviera al día */}
      {/* Sin red, ya lo dice el aviso de arriba: uno solo (revisor) */}
      {sondeoSinRespuesta && !sinConexion && quickMatch && pendientes === 0 && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <p
            data-testid="quick-match-sin-conexion"
            className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm"
          >
            {t('scoring.offline.noSeActualiza')}
          </p>
        </div>
      )}

      <AvisosDePartidaRapida
        t={t}
        quickMatch={quickMatch}
        perdidos={perdidos}
        hoyosPerdidos={hoyosPerdidos}
        avisoDelVaciado={avisoDelVaciado}
        errorDeVerdad={errorDeVerdad}
        saveError={saveError}
        loadError={loadError}
        refetch={refetch}
      />

      <div className="max-w-4xl mx-auto px-4 py-4">
        <button
          onClick={() => navigate('/quick-matches')}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-3"
        >
          &larr; {t('scoring.backToMyQuickMatches')}
        </button>

        <div className="flex items-center justify-between gap-3 mb-4">
          {/* min-w-0: sin él, un nombre de campo largo no se recorta y la cabecera se sale */}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-gray-900">
              {quickMatch?.name || t('scoring.matchHeader')}
            </h1>
            <p className="text-sm text-gray-500">
              {quickMatch?.name ? `${t('scoring.matchHeader')} · ` : ''}
              {(quickMatch?.matchFormat ?? quickMatch?.scoringFormat) &&
                t(`history.format.${quickMatch.matchFormat ?? quickMatch.scoringFormat}`, quickMatch.matchFormat ?? quickMatch.scoringFormat)}
            </p>
            <CampoDeLaPartida nombre={courseName} />
          </div>
          {quickMatch?.isCompleted && (
            <span className="shrink-0 text-sm font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
              {t('scoring.finish.completed')}
            </span>
          )}
          {/* El resto del grupo no vio el aviso: se entera por aqui, cuando el
              sondeo traiga el estado nuevo. Sin esto su pantalla quedaba
              exactamente igual que antes de cancelarse la partida. */}
          {quickMatch?.isCancelled && (
            <span
              data-testid="quick-match-cancelled-badge"
              className="text-sm font-medium text-red-700 bg-red-100 px-2.5 py-1 rounded-full"
            >
              {t('history.status.CANCELLED')}
            </span>
          )}
        </div>

        <GrupoDePestanas actual={activeTab} onElegir={setActiveTab}>
          {/* Su pestaña abierta recibe el foco al cerrarse un aviso cuyo botón ya no existe */}
          <ListaDePestanas
            ref={tabsRef}
            etiqueta={t('scoring.tabsLabel')}
            className="flex border-b border-gray-200 mb-4"
            data-testid="quick-match-scoring-tabs"
            pestanas={TABS.map((tab) => ({ id: tab, contenido: t(`scoring.tabs.${tab}`), testId: `quick-match-tab-${tab}` }))}
            claseDePestana={(abierta) =>
              `flex-1 py-2 text-sm font-medium text-center border-b-2 transition-colors ${
                abierta ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`
            }
          />

          <PanelDePestana id="input" className="space-y-4">
            <PestanaDeAnotarRapida
              t={t}
              quickMatch={quickMatch}
              isScorer={isScorer}
              isCreator={isCreator}
              currentHole={currentHole}
              setCurrentHole={setCurrentHole}
              totalHoles={totalHoles}
              holeScoresVisibles={holeScoresVisibles}
              entries={entries}
              currentHoleData={currentHoleData}
              isReadOnly={isReadOnly}
              allowsPickedUp={allowsPickedUp}
              myRound={myRound}
              onScoreChange={handleScoreChange}
              onPrevHole={handlePrevHole}
              onNextHole={handleNextHole}
              mapaDelHoyo={mapaDelHoyo}
              userId={user?.id}
              miBarra={miBarra}
              onPedirTerminar={() => setShowFinishConfirm(true)}
              onPedirCancelar={() => setShowCancelConfirm(true)}
            />
          </PanelDePestana>

          <PanelDePestana id="classification" enfocable>
            <PestanaDeClasificacionRapida
              t={t}
              quickMatch={quickMatch}
              holes={holes}
              tees={tees}
              holeScoresVisibles={holeScoresVisibles}
              myParticipant={myParticipant}
              coveredParticipantIds={coveredParticipantIds}
              esJuegoLibre={esJuegoLibre}
              faltanDatosDeOtros={faltanDatosDeOtros}
              pendientes={pendientes}
              yaCerrada={yaCerrada}
            />
          </PanelDePestana>

          <PanelDePestana id="scorecard" enfocable>
            <QuickMatchScorecardTable
              holes={holes}
              holeScores={holeScoresVisibles}
              participants={quickMatch?.participants ?? []}
              currentParticipantId={myParticipant?.participantId}
              scoringFormat={quickMatch?.scoringFormat}
              matchFormat={quickMatch?.matchFormat}
              playMode={quickMatch?.playMode}
              participantStrokes={quickMatch?.participantStrokes ?? []}
              tees={tees}
              allowancePercentage={quickMatch?.effectiveAllowance}
            />
          </PanelDePestana>
        </GrupoDePestanas>
      </div>

      <DialogosDePartidaRapida
        t={t}
        finishDialogRef={finishDialogRef}
        discrepanciaDialogRef={discrepanciaDialogRef}
        cancelDialogRef={cancelDialogRef}
        showFinishConfirm={showFinishConfirm}
        showCancelConfirm={showCancelConfirm}
        hayDiscrepancia={hayDiscrepancia}
        discrepancia={discrepancia}
        yaCerrada={yaCerrada}
        isSubmitting={isSubmitting}
        finishFailedKey={finishFailedKey}
        cancelFailedKey={cancelFailedKey}
        onCerrarTerminar={() => { setFinishFailedKey(null); setShowFinishConfirm(false); }}
        onTerminar={handleFinishConfirm}
        onCerrarCancelar={() => { setCancelFailedKey(null); setShowCancelConfirm(false); }}
        onCancelar={handleCancelConfirm}
        resuelveDiscrepancia={resuelveDiscrepancia}
        myParticipant={myParticipant}
        jugadorEnDisputa={jugadorEnDisputa}
        nombreDelAnotador={nombreDelAnotador}
        comoSeLee={comoSeLee}
      />
    </div>
  );
};

export default QuickMatchScoringPage;
