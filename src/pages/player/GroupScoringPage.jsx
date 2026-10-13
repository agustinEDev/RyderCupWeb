import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import { useUserRoles } from '../../hooks/useUserRoles';
import { useScoring } from '../../hooks/useScoring';
import { ORIGEN_PARTIDA_DE_FRANJA } from '../../hooks/origenesDeAnotacion';
import { retireFromTeeGroupUseCase } from '../../composition';
import customToast from '../../utils/toast';
import { mensajeDeErrorDePartida } from '../../utils/erroresDePartida';
import { conGenero } from '../../utils/genero';
import { claveDelAvisoDelVaciado } from '../../utils/erroresDeAnotacion';
import { abreMasTarde, horaDelCampo } from '../../services/partidosSinCobertura';
import HoleInput from '../../components/scoring/HoleInput';
import HoleSelector from '../../components/scoring/HoleSelector';
import AnotarSinConexion from '../../components/scoring/AnotarSinConexion';
import PendientesASalvo from '../../components/scoring/PendientesASalvo';
import SessionBlockedModal from '../../components/scoring/SessionBlockedModal';
import BarraDeEntrega from '../../components/scoring/BarraDeEntrega';
import { sinMarcadorEnJuego } from '../../domain/services/PartidasDeLaFranja';
import SubmitScorecardModal from '../../components/scoring/SubmitScorecardModal';
import ClasificacionDeLaFranja from '../../components/scoring/ClasificacionDeLaFranja';
import TarjetasDeLaPartida from '../../components/scoring/TarjetasDeLaPartida';
import BlockLoader from '../../components/ui/BlockLoader';

// Quien juega anota; quien no, mira las tarjetas y la clasificación (caso 13)
const PESTANAS_DEL_JUGADOR = ['input', 'standings', 'cards'];
const PESTANAS_DE_QUIEN_MIRA = ['cards', 'standings'];
// El temporizador más largo que admite el navegador
const MAXIMO_TEMPORIZADOR_MS = 2 ** 31 - 1;
const CLAVE_POR_ESTADO = { 403: 'errors.forbidden', 404: 'errors.notFound' };
const CLAVE_POR_ACCION = { golpe: 'errors.failedToSubmitScore', tarjeta: 'errors.failedToSubmitScorecard' };

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
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('scoring');
  const { user, loading: isLoadingUser } = useAuth();
  const { isAdmin, isCreator } = useUserRoles(competitionId);
  const [pestana, setPestana] = useState(null);
  const [verEntrega, setVerEntrega] = useState(false);
  const [retirandose, setRetirandose] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [, marcaLaHora] = useState(0);

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
  } = useScoring(groupId, user?.id, user?.is_admin ?? false, ORIGEN_PARTIDA_DE_FRANJA);

  const aunNoAbre = abreMasTarde({ status: scoringView?.matchStatus, scoringOpensAt: scoringView?.scoringOpensAt });
  // Que el aviso caduque solo: sin cobertura el sondeo no corre
  useEffect(() => {
    if (!aunNoAbre) return undefined;
    const falta = aunNoAbre.getTime() - Date.now();
    if (falta <= 0 || falta > MAXIMO_TEMPORIZADOR_MS) return undefined;
    const aviso = setTimeout(() => marcaLaHora((n) => n + 1), falta + 1000);
    return () => clearTimeout(aviso);
  }, [aunNoAbre]);

  if (isLoadingUser || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth user={user} />
        <BlockLoader texto={t('loading')} />
      </div>
    );
  }

  const motivoDe = (err) => {
    const clave = CLAVE_POR_ESTADO[err?.status ?? err?.response?.status];
    return clave ? t(clave) : t('offline.noSePudoCargar');
  };

  if (!scoringView) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth user={user} />
        {/* Sin vista aún no se sabe quién juega: el aviso de anotar, por si acaso */}
        {isOffline && <AnotarSinConexion pendingCount={pendingQueueSize} />}
        {!isOffline && <PendientesASalvo count={pendingQueueSize} />}
        <div className="mx-auto max-w-4xl px-4 py-6 text-center">
          <p className="text-gray-700">{error ? motivoDe(error) : t('offline.nothingCached')}</p>
          <button type="button" onClick={refetch} className="mt-4 rounded-lg bg-primary px-4 py-2 text-white">
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  const userId = user?.id;
  const { strokePlay } = scoringView;
  // Sin competición, `useUserRoles` no sabe de quién es: no organiza
  const organiza = isCreator || isAdmin;
  const pestanas = isMatchPlayer ? PESTANAS_DEL_JUGADOR : PESTANAS_DE_QUIEN_MIRA;
  const activa = pestanas.includes(pestana) ? pestana : pestanas[0];
  const miTarjeta = strokePlay.cards.find((c) => c.userId === userId);
  // Solo en su partida (bajas): no marca a nadie, su golpe lo valida el organizador
  const marcoA = strokePlay.iMarkUserId;
  // Una tarjeta retirada o de no presentado ya no se anota: el servidor tira
  // ese lado con un 200 y el golpe desaparecería sin aviso (revisor). La
  // entregada ya la bloquea `useScoring`
  const seJuega = (jugador) => strokePlay.cards.find((c) => c.userId === jugador)?.cardStatus === 'JUGANDO';
  const cerradaSinEntregar = Boolean(miTarjeta) && !seJuega(userId) && miTarjeta.cardStatus !== 'ENTREGADA';
  const noPresentado = miTarjeta?.cardStatus === 'NO_PRESENTADO';

  const parDe = (jugador) =>
    scoringView.players.find((p) => p.userId === jugador)?.holeCard.find((h) => h.holeNumber === currentHole)?.par ?? null;
  const golpesDelHoyo = scoresVisibles.find((s) => s.holeNumber === currentHole);
  const miGolpe = golpesDelHoyo?.playerScores.find((p) => p.userId === userId);
  const suGolpe = golpesDelHoyo?.playerScores.find((p) => p.userId === marcoA);
  // Con nombre: «Anotas a Bruno» y, en un desacuerdo, qué puso (QA del 11 oct 2026)
  const nombreDe = (jugador) => scoringView.players.find((p) => p.userId === jugador)?.userName ?? null;
  // El número del marcado que puso otro (el marcador de antes, o el
  // organizador): con su nombre y sin tocarlo (2.ª pasada del QA)
  const loPusoOtro =
    suGolpe?.markerSubmitted && suGolpe.markerBy && suGolpe.markerBy !== userId
      ? suGolpe.markerByName ?? nombreDe(suGolpe.markerBy) ?? t('partida.anotherMarker')
      : null;
  const meMarca = miTarjeta?.markedByUserId;
  // Si quien me marcaba se retiró o no se presentó, ya no me marca (CodeRabbit)
  const sigueMarcandome =
    Boolean(meMarca) && !['RETIRADO', 'NO_PRESENTADO'].includes(strokePlay.cards.find((c) => c.userId === meMarca)?.cardStatus);
  // Quién me anotó ESTE hoyo: tras cambiar el círculo puede no ser mi marcador
  // de ahora (revisor)
  const meAnoto = miGolpe?.markerSubmitted && miGolpe.markerBy
    ? miGolpe.markerByName ?? nombreDe(miGolpe.markerBy)
    : cerradaSinEntregar
      ? null
      : nombreDe(meMarca);
  const sinMarcador = isMatchPlayer && sinMarcadorEnJuego(strokePlay.cards, userId);

  const anotar = (golpes, tocado) =>
    submitScore(
      currentHole,
      // Sin marcado, su propio id: el servidor lo exige y solo lo mira con el golpe del marcado
      { ownScore: golpes.ownScore, markedPlayerId: marcoA ?? userId, markedScore: golpes.markedScore },
      { tocado }
    );

  const estadoDeEntrega = !isMatchPlayer || cerradaSinEntregar
    ? null
    : hasSubmitted
      ? 'entregada'
      : canSubmitScorecard
        ? 'entregar'
        : partidoAcabado
          ? 'faltaValidar'
          : null;

  const retirarse = async () => {
    setOcupado(true);
    try {
      await retireFromTeeGroupUseCase.execute(groupId);
      setRetirandose(false);
      customToast.success(t('partida.retired'));
      await refetch();
    } catch (err) {
      customToast.error(mensajeDeErrorDePartida(t, err));
      // La confirmación no se queda abierta tras el error (revisor)
      setRetirandose(false);
    } finally {
      setOcupado(false);
    }
  };

  const textoDelFallo = (err) => {
    if (!CLAVE_POR_ACCION[origenDelError]) return motivoDe(err);
    if (err?.errorCode) return mensajeDeErrorDePartida(t, err);
    return err?.i18nKey ? t(err.i18nKey) : t(CLAVE_POR_ACCION[origenDelError]);
  };
  const hoyosNoGuardados = Object.keys(noGuardados).map(Number).sort((a, b) => a - b);
  // El selector pinta un hoyo como hecho si todos lo tienen validado: quien se
  // retiró o no se presentó ya no anota, y con él dentro ningún hoyo volvía a
  // ponerse en verde (/code-review)
  const siguen = new Set(
    strokePlay.cards.filter((c) => !['RETIRADO', 'NO_PRESENTADO'].includes(c.cardStatus)).map((c) => c.userId)
  );
  // Y quien ya no sigue (retirado, no presentado) ve la suya: los hoyos que no
  // jugó no son verdes para él (3.ª pasada del QA)
  const delSelector = isMatchPlayer && !siguen.has(userId) ? new Set([userId]) : siguen;
  const golpesDelSelector = scoresVisibles
    // Lo que nadie anotó sale vacío en el selector (#847)
    .map((s) => ({ ...s, playerScores: s.playerScores.filter((p) => delSelector.has(p.userId)) }));

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderAuth user={user} />
      {/* Solo quien anota (también un administrador): al organizador que no juega no le vale «lo que anotes se guarda» */}
      {/* Ni al no presentado: ya no anota (revisor) */}
      {isOffline && canScore && !noPresentado && <AnotarSinConexion pendingCount={pendingQueueSize} />}
      {!isOffline && !avisoDelVaciado && !noPresentado && <PendientesASalvo count={pendingQueueSize} />}

      <div className="mx-auto max-w-4xl space-y-3 px-4 py-4">
        {hoyosNoGuardados.length > 0 && !noPresentado && (
          <p data-testid="no-guardados" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {t('offline.noGuardados', { count: hoyosNoGuardados.length, holes: hoyosNoGuardados.join(', ') })}
          </p>
        )}
        {avisoDelVaciado && (
          <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {t(claveDelAvisoDelVaciado(avisoDelVaciado))}
          </p>
        )}
        {/* Lo que se ve es la foto del móvil, no el servidor (FE #614): con
            un 5xx o sin cobertura se leería como lo de ahora mismo */}
        {/* Sin conexión ya lo dice el aviso de arriba: dos casi iguales a la
            vez sobraban (QA del 11 oct 2026) */}
        {pintadoDeMemoria && !isOffline && (
          <p data-testid="pintado-de-memoria" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {t('offline.noSeActualiza')}
          </p>
        )}
        {error && (
          <div role="alert" className="flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-600">{textoDelFallo(error)}</p>
            <button type="button" onClick={refetch} className="rounded bg-red-600 px-3 py-1 text-xs text-white">
              {t('retry')}
            </button>
          </div>
        )}

        {competitionId && (
          <Link to={`/competitions/${competitionId}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary">
            &larr; {t('partida.backToCompetition')}
          </Link>
        )}

        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {t('partida.header', { numero: scoringView.matchNumber, hora: strokePlay.teeTime })}
          </h1>
          <p className="text-sm text-gray-500">{t(`partida.type.${strokePlay.tournamentType}`)}</p>
        </div>

        <div className="flex border-b border-gray-200" role="tablist">
          {pestanas.map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={activa === p}
              id={`tab-${p}`}
              aria-controls={`panel-${p}`}
              data-testid={`tab-${p}`}
              onClick={() => setPestana(p)}
              className={`min-h-11 flex-1 border-b-2 text-sm font-medium ${
                activa === p ? 'border-primary text-primary' : 'border-transparent text-gray-500'
              }`}
            >
              {t(`partida.tabs.${p}`)}
            </button>
          ))}
        </div>

        {activa === 'input' && (
          <div id="panel-input" role="tabpanel" aria-labelledby="tab-input" className="space-y-4">
            {/* El no presentado no anota: se le dice por qué (#854) */}
            {noPresentado ? (
              <p data-testid="no-presentado" className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                {t('partida.youAreNoShowHere', conGenero(miTarjeta?.teeGender))}
              </p>
            ) : (
              <>
              {/* Sin nadie en juego que le marque (se fue o ya entregó): sus hoyos
                  los valida el organizador (QA del 11 oct 2026, BE #539) */}
              {sinMarcador && (
                <p data-testid="sin-marcador" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  {t('partida.organiserValidates')}
                </p>
              )}
              {marcoA && (
                <p className="text-sm text-gray-700">
                  {t('partida.youMark', { jugador: scoringView.players.find((p) => p.userId === marcoA)?.userName ?? '' })}
                </p>
              )}
              <HoleSelector
                currentHole={currentHole}
                onSelect={setCurrentHole}
                scores={golpesDelSelector}
                totalHoles={totalHoles}
                noGuardados={hoyosNoGuardados}
              />
              {aunNoAbre && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
                  <p className="font-medium text-amber-900">{t('partida.notOpenYet')}</p>
                  <p className="mt-1 text-amber-800">
                    {t('notOpenYet.opensAt', { hora: horaDelCampo(scoringView.scoringOpensAt, i18n.language) })}
                  </p>
                </div>
              )}
              {!aunNoAbre && (
                <HoleInput
                  key={`${currentHole}-${noGuardados[currentHole]?.turno ?? ''}`}
                  holeNumber={currentHole}
                  par={parDe(userId)}
                  markedPar={parDe(marcoA)}
                  markedName={nombreDe(marcoA)}
                  markerName={meAnoto}
                  marksSomeone={Boolean(marcoA)}
                  hasMarker={sigueMarcandome || Boolean(miGolpe?.markerSubmitted)}
                  markedScoredBy={loPusoOtro}
                  strokeIndex={null}
                  playerScore={miGolpe}
                  markedPlayerScore={suGolpe}
                  validationStatus={miGolpe?.validationStatus}
                  markedValidationStatus={suGolpe?.validationStatus}
                  strokesReceived={miGolpe?.strokesReceivedThisHole}
                  // Su tarjeta cerrada sin entregar se lee: así ve quién le anotó (QA 3)
                  isReadOnly={!canScore || isFullyLocked || isSessionBlocked || cerradaSinEntregar}
                  isOwnScoreLocked={isOwnScoreLocked || cerradaSinEntregar || !canScore || isSessionBlocked}
                  // Sin a quién marcar, o con su tarjeta ya cerrada, su casilla no se toca
                  isMarkerScoreLocked={!marcoA || !seJuega(marcoA) || isMarkerScoreLocked || !canScore || isSessionBlocked}
                  onScoreChange={anotar}
                  allowPickedUp={strokePlay.pickedUpAllowed}
                />
              )}
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentHole(currentHole - 1)}
                  disabled={currentHole <= 1}
                  className="min-h-11 rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-700 disabled:opacity-50"
                >
                  {t('input.prevHole')}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentHole(currentHole + 1)}
                  disabled={currentHole >= totalHoles}
                  className="min-h-11 rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-700 disabled:opacity-50"
                >
                  {t('input.nextHole')}
                </button>
              </div>

              {/* Antes de abrir no hay de qué retirarse: el servidor lo rechaza */}
              {miTarjeta?.cardStatus === 'JUGANDO' && !aunNoAbre &&
                (retirandose ? (
                  <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                    <span className="min-w-0 flex-1">{t('partida.retireConfirm')}</span>
                    <button type="button" disabled={ocupado} onClick={retirarse} className="min-h-11 rounded-md bg-amber-600 px-3 font-semibold text-white">
                      {t('partida.retireYes')}
                    </button>
                    <button type="button" onClick={() => setRetirandose(false)} className="min-h-11 rounded-md px-3">
                      {t('partida.no')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setRetirandose(true)}
                    className="min-h-11 w-full rounded-lg border border-red-200 text-sm font-medium text-red-600"
                  >
                    {t('partida.retire')}
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {/* Montada siempre: se pide al abrir su pestaña y deja de releerse al cerrarla */}
        <div id="panel-standings" role="tabpanel" aria-labelledby="tab-standings" hidden={activa !== 'standings'}>
          <ClasificacionDeLaFranja roundId={strokePlay.roundId} userId={userId} activa={activa === 'standings'} />
        </div>

        {activa === 'cards' && (
          <div id="panel-cards" role="tabpanel" aria-labelledby="tab-cards">
            <TarjetasDeLaPartida scoringView={scoringView} userId={userId} organiza={organiza} onCambio={refetch} />
          </div>
        )}

        {estadoDeEntrega && (
          <div data-testid="estado-de-entrega" data-estado={estadoDeEntrega}>
            <div className="h-36" aria-hidden="true" />
            <BarraDeEntrega
              estado={estadoDeEntrega}
              marcador={null}
              onEntregar={() => setVerEntrega(true)}
              enviando={isSubmitting}
              esFoursomes={false}
              pendientes={[]}
              completado={scoringView.matchStatus === 'COMPLETED'}
              sePuedeSeguir={false}
              dePartida
            />
          </div>
        )}
      </div>

      <SessionBlockedModal isOpen={isSessionBlocked} onTakeOver={takeOverSession} onGoBack={() => navigate(-1)} />
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
