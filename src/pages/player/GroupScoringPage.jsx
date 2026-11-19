import { useState } from 'react';
import { barraDe } from '../../domain/services/muestrasDeLaBarra';
import { useParams, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import { useUserRoles } from '../../hooks/useUserRoles';
import { useScoring } from '../../hooks/useScoring';
import { useMapaDelHoyo } from '../../hooks/useMapaDelHoyo';
import { ORIGEN_PARTIDA_DE_FRANJA } from '../../hooks/origenesDeAnotacion';
import AnotarSinConexion from '../../components/scoring/AnotarSinConexion';
import PendientesASalvo from '../../components/scoring/PendientesASalvo';
import SessionBlockedModal from '../../components/scoring/SessionBlockedModal';
import SubmitScorecardModal from '../../components/scoring/SubmitScorecardModal';
import AvisosDeLaPartida from '../../components/scoring/AvisosDeLaPartida';
import CabeceraDeLaPartida from '../../components/scoring/CabeceraDeLaPartida';
import PestanaDeAnotarLaPartida from '../../components/scoring/PestanaDeAnotarLaPartida';
import ConsultaDeLaPartida from '../../components/scoring/ConsultaDeLaPartida';
import EntregaDeLaPartida from '../../components/scoring/EntregaDeLaPartida';
import BlockLoader from '../../components/ui/BlockLoader';
import {
  GrupoDePestanas,
  ListaDePestanas,
  PanelDePestana,
} from '../../components/ui/Pestanas';
import { useAnotacionEnCurso } from '../../hooks/useAnotacionEnCurso';
import { useGoBack } from '../../hooks/useGoBack';
import { useAvisoDeQueAunNoAbre } from '../../hooks/useAvisoDeQueAunNoAbre';
import { useRetiradaDeLaPartida } from '../../hooks/useRetiradaDeLaPartida';
import {
  PESTANAS_DE_LA_PARTIDA_DE_QUIEN_MIRA,
  PESTANAS_DE_LA_PARTIDA_DEL_JUGADOR,
} from '../../utils/pestanasDeLaAnotacion';
import {
  anotacionTerminada,
  golpesDelSelectorDeLaPartida,
} from '../../domain/services/PartidasDeLaFranja';
import {
  candadosDeLaCasilla,
  estadoDeEntregaDeLaPartida,
  motivoDelFalloDeCarga,
  nombreDe,
  rolesEnLaPartida,
} from '../../utils/lecturaDeLaPartida';
import { hoyosNoGuardadosDe } from '../../utils/lecturaDelHoyo';

// Quien juega anota; quien no, mira las tarjetas y la clasificación (caso 13)
const PESTANAS_DEL_JUGADOR = PESTANAS_DE_LA_PARTIDA_DEL_JUGADOR;
const PESTANAS_DE_QUIEN_MIRA = PESTANAS_DE_LA_PARTIDA_DE_QUIEN_MIRA;

/**
 * Anotar una partida de stroke play (FE #824, PR 7; tabla aprobada por
 * Agustín el 11 oct 2026). Con la MISMA maquinaria que el partido de la Ryder
 * —`useScoring` con el origen de las partidas: cola antes de enviar, sondeo,
 * vaciado, golpes no guardados— y sus piezas (casilla, selector de hoyo, barra
 * de entrega). Lo propio: tres pestañas (Anotar, Clasificación de la franja,
 * Tarjetas), retirarse y las herramientas del organizador en Tarjetas.
 *
 * La competición llega en la ruta (`?competition=`) desde la ficha: sin ella
 * —desde el aviso de golpes sin enviar— se anota igual, pero sin volver a la
 * ficha ni herramientas de organizador, que dependen de saber cuál es.
 */
const GroupScoringPage = () => {
  const { groupId } = useParams();
  const [busqueda] = useSearchParams();
  const competitionId = busqueda.get('competition');
  const { t, i18n } = useTranslation('scoring');
  const { user, loading: isLoadingUser } = useAuth();
  const userId = user?.id;
  const { isAdmin, isCreator } = useUserRoles(competitionId, userId);
  const [pestana, setPestana] = useState(null);
  const [verEntrega, setVerEntrega] = useState(false);

  const {
    scoringView,
    scoresVisibles,
    currentHole,
    isLoading,
    error,
    origenDelError,
    isSubmitting,
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
    isMarkerScoreLocked,
    isFullyLocked,
    validatedHoles,
    totalHoles,
    holesToSubmit,
    canSubmitScorecard,
    partidoAcabado,
    setCurrentHole,
    submitScore,
    submitScorecard,
    takeOverSession,
    refetch,
  } = useScoring(
    groupId,
    userId,
    user?.is_admin ?? false,
    ORIGEN_PARTIDA_DE_FRANJA,
  );
  const retirada = useRetiradaDeLaPartida({ groupId, t, refetch });

  // El mapa del hoyo (BE #532): «Mapa» en la tarjeta lo abre a pantalla completa
  const mapaDelHoyo = useMapaDelHoyo({
    golfCourseId: scoringView?.roundInfo?.golfCourseId ?? null,
    cerrarSi: isSessionBlocked,
    // Su país: solo hay imagen en España (19 oct)
    pais: scoringView?.roundInfo?.golfCourseCountryCode ?? null,
  });
  // El aviso de que aún no abre, que caduca solo: sin cobertura el sondeo no corre
  const aunNoAbre = useAvisoDeQueAunNoAbre(scoringView);

  const pestanas = isMatchPlayer
    ? PESTANAS_DEL_JUGADOR
    : PESTANAS_DE_QUIEN_MIRA;
  const activa = pestanas.includes(pestana) ? pestana : pestanas[0];
  // Si iOS cierra la app, al abrirla se vuelve aquí, a esta pestaña, este hoyo y el mapa
  // (11 nov 2026). Con la partida cerrada o mi tarjeta entregada ya no hay a qué volver
  useAnotacionEnCurso({
    cargada: Boolean(scoringView) && !isLoading,
    // Cerrada, o mi tarjeta ya no se juega: entregada, retirada o no presentado
    terminada: anotacionTerminada(scoringView, userId),
    pestana: activa,
    pestanas,
    alCambiarDePestana: setPestana,
    hoyo: currentHole,
    totalHoyos: totalHoles,
    alCambiarDeHoyo: setCurrentHole,
    // El mapa se repone solo donde la pantalla ofrece su botón
    mapa: { ...mapaDelHoyo, disponible: mapaDelHoyo.disponible && !aunNoAbre },
  });
  // «Volver» sin una pantalla detrás (se llegó al arrancar la app): al panel
  const volver = useGoBack('/dashboard');

  if (isLoadingUser || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth user={user} />
        <BlockLoader texto={t('loading')} />
      </div>
    );
  }

  if (!scoringView) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth user={user} />
        {/* Sin vista aún no se sabe quién juega: el aviso de anotar, por si acaso */}
        {isOffline && <AnotarSinConexion pendingCount={pendingQueueSize} />}
        {!isOffline && <PendientesASalvo count={pendingQueueSize} />}
        <div className="mx-auto max-w-4xl px-4 py-6 text-center">
          <p className="text-gray-700">
            {error
              ? motivoDelFalloDeCarga(t, error)
              : t('offline.nothingCached')}
          </p>
          <button
            type="button"
            onClick={refetch}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-white"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  // Sin competición, `useUserRoles` no sabe de quién es: no organiza
  const organiza = isCreator || isAdmin;
  const roles = rolesEnLaPartida({
    t,
    scoringView,
    scoresVisibles,
    currentHole,
    userId,
    isMatchPlayer,
  });
  const { marcoA, noPresentado } = roles;
  // Mi barra (color y sexo): las muestras del mapa de hoyos van por barra
  const miBarra = barraDe(scoringView.players.find((p) => p.userId === userId));
  // Con nombre: «Anotas a Bruno» y, en un desacuerdo, qué puso (QA del 11 oct 2026)
  const nombreDelMarcado = nombreDe(scoringView.players, marcoA);

  const anotar = (golpes, tocado) =>
    submitScore(
      currentHole,
      // Sin marcado, su propio id: el servidor lo exige y solo lo mira con el golpe del marcado
      {
        ownScore: golpes.ownScore,
        markedPlayerId: marcoA ?? userId,
        markedScore: golpes.markedScore,
      },
      { tocado },
    );

  const estadoDeEntrega = estadoDeEntregaDeLaPartida({
    isMatchPlayer,
    cerradaSinEntregar: roles.cerradaSinEntregar,
    hasSubmitted,
    canSubmitScorecard,
    partidoAcabado,
  });

  const hoyosNoGuardados = hoyosNoGuardadosDe(noGuardados);

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderAuth user={user} />
      {/* Solo quien anota (también un administrador): al organizador que no juega no le vale «lo que anotes se guarda» */}
      {/* Ni al no presentado: ya no anota (revisor) */}
      {isOffline && canScore && !noPresentado && (
        <AnotarSinConexion pendingCount={pendingQueueSize} />
      )}
      {!isOffline && !avisoDelVaciado && !noPresentado && (
        <PendientesASalvo count={pendingQueueSize} />
      )}

      <div className="mx-auto max-w-4xl space-y-3 px-4 py-4">
        <AvisosDeLaPartida
          t={t}
          hoyosNoGuardados={hoyosNoGuardados}
          noPresentado={noPresentado}
          avisoDelVaciado={avisoDelVaciado}
          pintadoDeMemoria={pintadoDeMemoria}
          isOffline={isOffline}
          error={error}
          origenDelError={origenDelError}
          onReintentar={refetch}
        />

        <CabeceraDeLaPartida
          t={t}
          competitionId={competitionId}
          scoringView={scoringView}
        />

        <GrupoDePestanas actual={activa} onElegir={setPestana}>
          <ListaDePestanas
            etiqueta={t('partida.tabsLabel')}
            className="flex border-b border-gray-200"
            pestanas={pestanas.map((p) => ({
              id: p,
              contenido: t(`partida.tabs.${p}`),
              testId: `tab-${p}`,
            }))}
            claseDePestana={(abierta) =>
              `min-h-11 flex-1 border-b-2 text-sm font-medium ${
                abierta
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500'
              }`
            }
          />

          <PanelDePestana id="input" className="space-y-4">
            <PestanaDeAnotarLaPartida
              t={t}
              idioma={i18n.language}
              scoringView={scoringView}
              userId={userId}
              roles={roles}
              nombreDelMarcado={nombreDelMarcado}
              candados={candadosDeLaCasilla({
                canScore,
                isFullyLocked,
                isSessionBlocked,
                isOwnScoreLocked,
                isMarkerScoreLocked,
                cerradaSinEntregar: roles.cerradaSinEntregar,
                marcoA,
                seJuegaElMarcado: roles.seJuegaElMarcado,
              })}
              currentHole={currentHole}
              totalHoles={totalHoles}
              onElegirHoyo={setCurrentHole}
              golpesDelSelector={golpesDelSelectorDeLaPartida({
                tarjetas: scoringView.strokePlay.cards,
                scoresVisibles,
                userId,
                isMatchPlayer,
              })}
              hoyosNoGuardados={hoyosNoGuardados}
              noGuardados={noGuardados}
              aunNoAbre={aunNoAbre}
              onScoreChange={anotar}
              mapaDelHoyo={mapaDelHoyo}
              miBarra={miBarra}
              retirada={retirada}
            />
          </PanelDePestana>

          <ConsultaDeLaPartida
            scoringView={scoringView}
            userId={userId}
            organiza={organiza}
            activa={activa}
            onCambio={refetch}
          />
        </GrupoDePestanas>

        {estadoDeEntrega && (
          <EntregaDeLaPartida
            estado={estadoDeEntrega}
            onEntregar={() => setVerEntrega(true)}
            enviando={isSubmitting}
            scoringView={scoringView}
          />
        )}
      </div>

      <SessionBlockedModal
        isOpen={isSessionBlocked}
        onTakeOver={takeOverSession}
        onGoBack={volver}
      />
      <SubmitScorecardModal
        isOpen={verEntrega && canSubmitScorecard}
        reopenable
        validatedHoles={validatedHoles}
        totalHoles={holesToSubmit}
        isSubmitting={isSubmitting}
        onConfirm={async () => {
          try {
            await submitScorecard();
          } finally {
            setVerEntrega(false);
          }
        }}
        onClose={() => setVerEntrega(false)}
      />
    </div>
  );
};

export default GroupScoringPage;
