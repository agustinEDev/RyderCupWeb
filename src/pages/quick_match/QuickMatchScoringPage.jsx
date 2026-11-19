import { useState } from 'react';
import { permiteLaRaya } from '../../domain/services/permiteLaRaya';
import { useParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import { useQuickMatchScoring } from '../../hooks/useQuickMatchScoring';
import { useMapaDelHoyo } from '../../hooks/useMapaDelHoyo';
import AvisosDePartidaRapida from '../../components/quick_match/AvisosDePartidaRapida';
import AvisoDePendientesRapida from '../../components/quick_match/AvisoDePendientesRapida';
import AvisoSinActualizarRapida from '../../components/quick_match/AvisoSinActualizarRapida';
import ErrorDeCargaRapida from '../../components/quick_match/ErrorDeCargaRapida';
import DialogosDePartidaRapida from '../../components/quick_match/DialogosDePartidaRapida';
import PestanaDeAnotarRapida from '../../components/quick_match/PestanaDeAnotarRapida';
import CabeceraDePartidaRapida from '../../components/quick_match/CabeceraDePartidaRapida';
import PestanaDeClasificacionRapida from '../../components/quick_match/PestanaDeClasificacionRapida';
import QuickMatchScorecardTable from '../../components/quick_match/QuickMatchScorecardTable';
import BlockLoader from '../../components/ui/BlockLoader';
import {
  GrupoDePestanas,
  ListaDePestanas,
  PanelDePestana,
} from '../../components/ui/Pestanas';
import { useSinConexionDeLaRapida } from '../../hooks/useSinConexionDeLaRapida';
import { useAnotacionEnCurso } from '../../hooks/useAnotacionEnCurso';
import { useMiVueltaRapida } from '../../hooks/useMiVueltaRapida';
import { useFocoDeLosDialogos } from '../../hooks/useFocoDeLosDialogos';
import {
  accionesDeAnotarRapida,
  useDialogosDeCierreRapida,
} from '../../hooks/useNavegacionYCierreRapida';
import { casillasDelHoyo } from '../../utils/casillasDelHoyo';
import { PESTANAS_DE_LA_RAPIDA } from '../../utils/pestanasDeLaAnotacion';
import {
  cierreDeLaRapida,
  discrepanciaEnPantalla,
  hoyosPerdidosDe,
  participacionEnLaRapida,
} from '../../utils/estadoDeLaAnotacionRapida';

const TABS = PESTANAS_DE_LA_RAPIDA;

const QuickMatchScoringPage = () => {
  const { quickMatchId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('quickMatch');
  const { user, loading: isLoadingUser } = useAuth();

  const [activeTab, setActiveTab] = useState('input');
  // Terminar y anular: abiertos o no, y la clave del fallo de cada uno
  const dialogos = useDialogosDeCierreRapida();
  const {
    showFinishConfirm,
    setShowFinishConfirm,
    showCancelConfirm,
    setShowCancelConfirm,
    cancelFailedKey,
    setCancelFailedKey,
    finishFailedKey,
    setFinishFailedKey,
  } = dialogos;

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

  // «Tu vuelta»: aquí arriba, antes de las salidas tempranas (es un hook)
  const myRound = useMiVueltaRapida({
    quickMatch,
    myParticipant,
    holes,
    holeScoresVisibles,
    tees,
  });
  // El mapa del hoyo (BE #532): «Mapa» en la tarjeta lo abre a pantalla completa
  // El mapa, cuando ya llegó el campo (sus hoyos) y con él su país: antes,
  // fuera de España se pedía para nada (CodeRabbit)
  const mapaDelHoyo = useMapaDelHoyo({
    golfCourseId: holes.length > 0 ? (quickMatch?.golfCourseId ?? null) : null,
    pais: courseCountryCode ?? null,
  });

  // Mi barra, juego libre y si faltan datos de otros para la clasificación
  const { miBarra, esJuegoLibre, faltanDatosDeOtros } = participacionEnLaRapida(
    { quickMatch, userId: user?.id, coveredParticipantIds, pendientes },
  );
  // El desacuerdo que se enseña ahora: de uno en uno y esperando su turno
  const {
    discrepancia,
    hayDiscrepancia,
    jugadorEnDisputa,
    comoSeLee,
    nombreDelAnotador,
  } = discrepanciaEnPantalla({
    discrepancias,
    quickMatch,
    showCancelConfirm,
    showFinishConfirm,
    t,
  });

  // Sin cobertura no es un error; un fallo con estado, sí
  const { sinConexion, sondeoSinRespuesta, errorDeVerdad } =
    useSinConexionDeLaRapida({ loadError, saveError, pintadoDeMemoria });

  const hoyosPerdidos = hoyosPerdidosDe(perdidos);

  const avisoDePendientes = (
    <AvisoDePendientesRapida
      t={t}
      sinConexion={sinConexion}
      isScorer={isScorer}
      pendientes={pendientes}
    />
  );

  // El foco de los avisos y su tecla Escape
  const { cancelDialogRef, finishDialogRef, discrepanciaDialogRef, tabsRef } =
    useFocoDeLosDialogos({
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
        <ErrorDeCargaRapida
          t={t}
          sondeoSinRespuesta={sondeoSinRespuesta}
          loadError={loadError}
          refetch={refetch}
        />
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

  // Solo lectura y ya cerrada: terminada o anulada no admite anotaciones
  const { isReadOnly, yaCerrada } = cierreDeLaRapida(quickMatch, isScorer);

  const {
    handleScoreChange,
    handlePrevHole,
    handleNextHole,
    handleFinishConfirm,
    handleCancelConfirm,
    pedirTerminar,
    pedirCancelar,
    cerrarTerminar,
    cerrarCancelar,
  } = accionesDeAnotarRapida({
    dialogos,
    currentHole,
    totalHoles,
    setCurrentHole,
    submitScore,
    completeMatch,
    cancelMatch,
    refetch,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderAuth user={user} />

      {/* El aviso de arriba cubre los dos: un guardado rechazado y un sondeo que
          falla con la partida ya cargada. Cada uno con su copia, y el de
          guardar primero porque es lo que el anotador acaba de intentar. */}
      {avisoDePendientes}

      <AvisoSinActualizarRapida
        t={t}
        visible={
          sondeoSinRespuesta && !sinConexion && quickMatch && pendientes === 0
        }
      />

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

        <CabeceraDePartidaRapida
          t={t}
          quickMatch={quickMatch}
          courseName={courseName}
        />

        <GrupoDePestanas actual={activeTab} onElegir={setActiveTab}>
          {/* Su pestaña abierta recibe el foco al cerrarse un aviso cuyo botón ya no existe */}
          <ListaDePestanas
            ref={tabsRef}
            etiqueta={t('scoring.tabsLabel')}
            className="flex border-b border-gray-200 mb-4"
            data-testid="quick-match-scoring-tabs"
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
              onPedirTerminar={pedirTerminar}
              onPedirCancelar={pedirCancelar}
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
        onCerrarTerminar={cerrarTerminar}
        onTerminar={handleFinishConfirm}
        onCerrarCancelar={cerrarCancelar}
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
