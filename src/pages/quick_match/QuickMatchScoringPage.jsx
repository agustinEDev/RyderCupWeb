import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  groupParticipantsBySide,
  sideCardHolder,
  sideEntryOf,
} from '../../domain/services/FoursomesSides';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import { useQuickMatchScoring } from '../../hooks/useQuickMatchScoring';
import QuickMatchHoleSelector from '../../components/quick_match/QuickMatchHoleSelector';
import QuickMatchHoleInput from '../../components/quick_match/QuickMatchHoleInput';
import QuickMatchClassificationTable from '../../components/quick_match/QuickMatchClassificationTable';
import QuickMatchScorecardTable from '../../components/quick_match/QuickMatchScorecardTable';
import MatchPlayStrokeAllocator from '../../domain/services/MatchPlayStrokeAllocator';
import BlockLoader from '../../components/ui/BlockLoader';

const TABS = ['input', 'classification', 'scorecard'];

/**
 * El `message` de un error de la API es el `detail` que escribe el backend, y
 * ese está en inglés: pintarlo tal cual metía "You are not a participant of
 * this quick match." en medio de una pantalla en español. El status sí es un
 * dato estable y traducible, así que la copia sale de él.
 *
 * Hacen falta DOS mapas porque el mismo status significa cosas distintas según
 * la operación: un 403 al cargar es "no juegas esta partida", pero un 403 al
 * anotar es "no eres el anotador de ese jugador" — decirle lo primero a alguien
 * que se está viendo en la lista de participantes es peor que no decirle nada.
 *
 * Cuál es cuál lo dice el hook, que los guarda por separado. Deducirlo de si
 * había partida en pantalla no valía: el sondeo cada 10 s falla mucho después
 * de que la partida haya cargado, y ese fallo es de carga.
 */
const LOAD_ERROR_KEY_BY_STATUS = {
  403: 'scoring.errors.forbidden',
  404: 'scoring.errors.notFound',
};

// Los endpoints de anotación devuelven 400, 403, 404, 409 y 422; el resto cae
// en el mensaje de "no se ha podido guardar", que es cierto sea cual sea la
// causa.
//
// El 400 y el 422 comparten mensaje porque son la misma queja vista desde dos
// capas: el 422 es Pydantic rechazando el cuerpo y el 400 una regla de la
// partida —hoy, la raya en Medal—. Importa para la aplicación ya instalada, que
// sigue ofreciendo ese botón hasta que actualice: sin esta línea, quien lo
// pulse en una partida Medal leería "no se ha podido guardar" en vez de que el
// resultado no vale.
const SAVE_ERROR_KEY_BY_STATUS = {
  400: 'scoring.errors.saveInvalid',
  403: 'scoring.errors.saveForbidden',
  404: 'scoring.errors.saveNotFound',
  409: 'scoring.errors.saveConflict',
  422: 'scoring.errors.saveInvalid',
};

const loadErrorKeyFor = (error) =>
  LOAD_ERROR_KEY_BY_STATUS[error?.status] ?? 'scoring.errors.generic';

const saveErrorKeyFor = (error) =>
  SAVE_ERROR_KEY_BY_STATUS[error?.status] ?? 'scoring.errors.saveFailed';

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
  const cancelDialogRef = useRef(null);
  const finishDialogRef = useRef(null);
  const discrepanciaDialogRef = useRef(null);
  const focoPrevioRef = useRef(null);
  const tabsRef = useRef(null);

  const {
    quickMatch,
    holes,
    tees,
    courseName,
    currentHole,
    isLoading,
    loadError,
    saveError,
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
    pendientes,
    perdidos,
    discrepancias,
    resuelveDiscrepancia,
  } = useQuickMatchScoring(quickMatchId, user?.id);

  // De una en una: dos avisos superpuestos no se pueden usar, y la siguiente
  // no se pierde porque el hook la mantiene en la lista hasta resolverla
  const discrepancia = discrepancias?.[0] ?? null;
  // El conflicto lo destapa el sondeo, no un toque del jugador, así que puede
  // aparecer con otro aviso ya abierto. Espera su turno: dos ventanas a la
  // misma altura se tapan, y el foco guardado para volver se perdería
  // Si el grupo entero se anota desde este móvil —lo normal en un cuarteto con
  // invitados— no falta nada de nadie: la clasificación está completa, así que
  // ni se avisa ni se le quita el puesto a nadie
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
  const sondeoSinRespuesta = !!loadError && (loadError.status ?? loadError.response?.status) === undefined;
  const errorDeVerdad = saveError || (loadError && !sondeoSinRespuesta);

  const hoyosPerdidos = [...new Set((perdidos ?? []).map((x) => x.holeNumber))].sort((a, b) => a - b);

  const avisoDePendientes = pendientes > 0 && (
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

  useEffect(() => {
    // El foco entra en el aviso al abrirse. Sin esto se queda en el boton de
    // debajo del velo: el tabulador pasea por la pagina de detras y un lector
    // de pantalla no llega a leer ni la advertencia ni el fallo. El
    // atrapamiento completo del foco es otra cosa, y va en #389.
    if (showCancelConfirm || showFinishConfirm || hayDiscrepancia) {
      // `body` no cuenta como foco previo: en Safari tocar un boton no lo
      // enfoca, y guardarlo hacia que al cerrar se «restaurara» a body —que no
      // hace nada— y el respaldo de las pestanas no se usara jamas.
      // Solo al abrirse el primero: si se reescribiera al abrirse otro, lo
      // guardado seria el contenedor del aviso anterior, que al cerrarse ya no
      // esta en la pagina, y el foco caeria en las pestanas
      if (!focoPrevioRef.current) {
        const activo = document.activeElement;
        focoPrevioRef.current = activo && activo !== document.body ? activo : null;
      }
      const cual = showCancelConfirm ? cancelDialogRef
        : showFinishConfirm ? finishDialogRef
        : discrepanciaDialogRef;
      cual.current?.focus();
      return;
    }
    // Y al cerrarse vuelve donde estaba: el contenedor enfocado se desmonta y
    // el foco caeria al principio de la pagina, dejando tirado a quien navega
    // con teclado o lector de pantalla. Si el boton que lo abrio ya no existe
    // —al cancelar de verdad, desaparece— el foco va a las pestanas, que
    // siguen ahi.
    // Sin foco guardado no ha habido ningun aviso abierto —esto corre tambien
    // al montar la pagina— y aqui no hay nada que devolver: tocarlo movia el
    // foco a las pestanas en cada carga.
    const previo = focoPrevioRef.current;
    if (!previo) return;
    focoPrevioRef.current = null;
    if (previo.isConnected) {
      previo.focus?.();
      return;
    }
    tabsRef.current?.focus?.();
  }, [showFinishConfirm, showCancelConfirm, hayDiscrepancia]);

  useEffect(() => {
    if (!showFinishConfirm && !showCancelConfirm) return;
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape' || isSubmitting) return;
      // Tambien el aviso de fallo: si no, el dialogo se volvia a abrir la
      // proxima vez con el error de la vez anterior ya puesto.
      setFinishFailedKey(null);
      setCancelFailedKey(null);
      setShowFinishConfirm(false);
      setShowCancelConfirm(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showFinishConfirm, showCancelConfirm, isSubmitting]);

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
          <p className="text-red-600" data-testid="quick-match-scoring-error">
            {t(loadErrorKeyFor(loadError))}
          </p>
          <button onClick={refetch} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg">
            {t('scoring.retry')}
          </button>
        </div>
      </div>
    );
  }

  // El par, el índice y los metros son de la barra de CADA jugador, no de una
  // común: en 56 de los 800 campos federados el índice cambia entre barras y en
  // 25 el par, y quien anota puede estar anotando a alguien de otra barra. Con
  // una sola tarjeta se le pintaba —y se le dibujaba la figura— contra un par
  // que no era el suyo, mientras sus golpes sí venían resueltos por su barra.
  const holeFor = (participant) =>
    MatchPlayStrokeAllocator.holeCardFor(participant, holes, tees).find(
      (h) => h.holeNumber === currentHole
    ) ?? null;

  // Reserva para quien no traiga el hoyo en su barra. No es neutra —`holes` es
  // la tarjeta de la PRIMERA barra—, pero es la misma para todos y la que ya
  // elige `holeCardFor` cuando una barra viene sin tarjeta. Lo que no vale es
  // caer a la barra de quien anota: eso le pinta a un jugador un par distinto
  // segun quien le este anotando.
  //
  // OJO: el reparto de golpes NO usa esta reserva. `holeCardFor` es todo o
  // nada —con que la barra traiga un hoyo, usa su tarjeta y descarta la del
  // campo—, asi que en una tarjeta parcial la pantalla enseña el indice del
  // campo y el reparto no cuenta ese hoyo. El backend hace lo mismo
  // (`TeeContextBuilder._card_for`), asi que hoy los dos calculos coinciden y
  // completar los huecos solo aqui los separaria. Ver RyderCupAm#215.
  const courseHoleData = holes.find((h) => h.holeNumber === currentHole) ?? null;

  const currentHoleData = holeFor(myParticipant) ?? courseHoleData;

  const participantOf = (participantId) =>
    quickMatch?.participants?.find((p) => p.participantId === participantId);

  // La ANOTACIÓN del hoyo, no el número: es lo único que separa el hoyo
  // recogido —entrada con `score` nulo— del que está sin anotar, donde no hay
  // entrada. Los dos dan `score` nulo y significan lo contrario.
  const entryOf = (participantId) =>
    holeScoresVisibles.find(
      (hs) => hs.holeNumber === currentHole && hs.participantId === participantId
    ) ?? null;

  const playerEntries = () =>
    coveredParticipantIds.map((participantId) => {
      const participant = participantOf(participantId);
      const entry = entryOf(participantId);
      return {
        participantId,
        scoreIds: [participantId],
        name: participant?.name ?? '',
        score: entry?.score ?? null,
        isPickedUp: entry != null && entry.score == null,
        hole: holeFor(participant) ?? courseHoleData,
      };
    });

  // Foursomes se juega a golpes alternos con UNA bola por bando: una casilla
  // por equipo, no una por jugador. Con cuatro casillas, anotar como se juega
  // —cada hoyo a nombre de quien golpeó— dejaba media tarjeta a nombre del
  // compañero, el total del bando perdía esos hoyos y el partido se quedaba sin
  // un solo hoyo válido. Ver RyderCupWeb#420 y RyderCupAm#216.
  //
  // La casilla se guarda a nombre del participante del bando que este anotador
  // cubre: así la rellena cualquiera de los dos —quien tenga el móvil— sin
  // depender de cómo se hayan repartido los anotadores.
  const sideEntries = () =>
    groupParticipantsBySide(quickMatch?.participants ?? [])
      .map((members) => {
        // Una bola, una fila: se guarda a nombre del primer jugador del bando
        // la anote quien la anote. A nombre de quien tuviera el móvil, los dos
        // anotadores escribían filas distintas del mismo golpe.
        //
        // Con la anotación cruzada del backend todos cubren a los cuatro, así
        // que esa fila siempre se puede escribir. Si no —un backend aún sin ese
        // reparto, o un detalle sin `scoringAssignments`— se escribe bajo el
        // primer miembro que sí se cubra: preferible a dejar al compañero con
        // la pantalla en blanco y sin poder anotar.
        const cardHolder = sideCardHolder(members);
        const writable = coveredParticipantIds.includes(cardHolder.participantId)
          ? cardHolder
          : members.find((m) => coveredParticipantIds.includes(m.participantId));
        if (!writable) return null;
        // Lo que se lee tiene que ser lo que se escribe. Cuando el respaldo
        // manda, la casilla seguía enseñando la fila del titular: corriges el
        // golpe, se guarda bajo otro, y la pantalla te devuelve el viejo como
        // si la corrección se hubiera perdido.
        const readOrder = writable === cardHolder ? members : [writable, ...members];
        const entry = sideEntryOf(readOrder, entryOf);
        return {
          participantId: writable.participantId,
          scoreIds: members.map((m) => m.participantId),
          name: members.map((m) => m.name).join(' & '),
          score: entry?.score ?? null,
          isPickedUp: entry != null && entry.score == null,
          // Comparten bola, así que comparten tarjeta: la del primero del bando,
          // la misma para los dos y no la de quien tenga el móvil.
          hole: holeFor(cardHolder) ?? courseHoleData,
          side: cardHolder.participantId,
        };
      })
      .filter(Boolean);

  // En Medal se emboca en todos los hoyos: quien no lo hace no entrega tarjeta,
  // así que ahí la raya ni se ofrece —y el backend la rechaza—. En Stableford y
  // en match play sí, que es donde recoger forma parte del juego.
  const allowsPickedUp = quickMatch?.scoringFormat !== 'MEDAL';

  const isFoursomes = quickMatch?.matchFormat === 'FOURSOMES';
  const entries = isFoursomes ? sideEntries() : playerEntries();

  // `isCancelled` cuenta igual que `isCompleted`: la partida ya no admite
  // anotaciones. Sin el, la pantalla seguia viva y cada guardado se estrellaba
  // contra un 409 que se traduce como «vuelve a cargarla» —y recargar no la
  // resucita, asi que el usuario se queda reintentando para siempre—.
  const isReadOnly = !isScorer || quickMatch?.isCompleted || quickMatch?.isCancelled || isSubmitting;

  const handleScoreChange = (participantId, score) => {
    submitScore(currentHole, participantId, score);
  };

  const handlePrevHole = () => {
    if (currentHole > 1) setCurrentHole(currentHole - 1);
  };

  const handleNextHole = () => {
    if (currentHole < totalHoles) setCurrentHole(currentHole + 1);
  };

  // Tres explicaciones, porque son tres cosas distintas: un 409 es que la
  // partida ya esta cerrada —otro dispositivo se adelanto—; sin `status` no ha
  // llegado a haber respuesta, que en un campo suele ser la cobertura; y un
  // 403, un 404 o un 5xx son un no del servidor que no sabemos explicar, asi
  // que no se inventa ninguno.
  // El sondeo puede cerrar la partida mientras el aviso esta abierto
  const yaCerrada = !!quickMatch?.isCompleted || !!quickMatch?.isCancelled;

  const claveDeFallo = (base, error) => {
    if (error?.status === 409) return `${base}.failed`;
    if (error?.status) return `${base}.failedServer`;
    // Sin error no hubo ni intento: es la guarda de creador, no la cobertura.
    if (!error) return `${base}.failedServer`;
    // OJO: un fallo de CSRF cae aqui, en «mira la conexion», porque `api.js`
    // lo lanza pelado —sin `status` ni `errorCode`, al contrario que el resto—
    // y no hay forma de distinguirlo sin tocar ese servicio, que usa toda la
    // aplicacion. Da igual de cara al usuario: ese mismo fallo arranca el
    // cierre de sesion, asi que no se queda leyendo este aviso.
    return `${base}.failedOffline`;
  };

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
      {sondeoSinRespuesta && quickMatch && pendientes === 0 && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <p
            data-testid="quick-match-sin-conexion"
            className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm"
          >
            {t('scoring.offline.noSeActualiza')}
          </p>
        </div>
      )}

      {perdidos?.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <p
            role="alert"
            data-testid="quick-match-perdidos"
            className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm"
          >
            {/* Un anotador cubre a varios jugadores, así que el mismo hoyo
                puede perderse varias veces: sin agrupar salía «Los hoyos 7, 7,
                7, 8, 8, 8». Lo que el jugador necesita es la lista de hoyos que
                tiene que volver a anotar, cada uno una vez */}
            {t('scoring.offline.lost', {
              count: hoyosPerdidos.length,
              holes: hoyosPerdidos.join(', '),
            })}
          </p>
        </div>
      )}

      {errorDeVerdad && quickMatch && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
            <p className="text-sm text-red-600" data-testid="quick-match-scoring-error">
              <span data-testid="quick-match-save-error">
                {saveError ? t(saveErrorKeyFor(saveError)) : t(loadErrorKeyFor(loadError))}
                {/* El hook apunta el hoyo en el error: sin decirlo, el jugador
                    lee la misma frase genérica y no sabe cuál repetir */}
                {saveError?.holeNumber != null
                  && ` ${t('scoring.offline.atHole', { hole: saveError.holeNumber })}`}
              </span>
            </p>
            <button onClick={refetch} className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">
              {t('scoring.retry')}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-4">
        <button
          onClick={() => navigate('/quick-matches')}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-3"
        >
          &larr; {t('scoring.backToMyQuickMatches')}
        </button>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {quickMatch?.name || t('scoring.matchHeader')}
            </h1>
            <p className="text-sm text-gray-500">
              {quickMatch?.name ? `${t('scoring.matchHeader')} · ` : ''}
              {quickMatch?.matchFormat ?? quickMatch?.scoringFormat}
            </p>
            {courseName && (
              <p className="flex items-center gap-1.5 text-sm text-gray-500 mt-1" data-testid="quick-match-course-name">
                <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                {courseName}
              </p>
            )}
          </div>
          {quickMatch?.isCompleted && (
            <span className="text-sm font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
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

        <div ref={tabsRef} tabIndex={-1} className="flex border-b border-gray-200 mb-4 focus:outline-none" data-testid="quick-match-scoring-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              data-testid={`quick-match-tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-medium text-center border-b-2 transition-colors ${
                activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t(`scoring.tabs.${tab}`)}
            </button>
          ))}
        </div>

        {activeTab === 'input' && (
          <div className="space-y-4">
            {!isScorer && (
              <p className="text-sm text-gray-600 bg-gray-100 rounded-lg p-3">{t('scoring.notAScorer')}</p>
            )}

            {isScorer && (
              <>
                <QuickMatchHoleSelector
                  currentHole={currentHole}
                  onSelect={setCurrentHole}
                  holeScores={holeScoresVisibles}
                  // Los golpes que espera cada casilla de la pantalla: una por
                  // bando en foursomes —donde el hoyo está completo con las dos
                  // bolas, no con cuatro— y una por jugador en el resto.
                  expectedScoreIdGroups={entries.map((entry) => entry.scoreIds)}
                  totalHoles={totalHoles}
                />

                {currentHoleData && (
                  <QuickMatchHoleInput
                    key={currentHole}
                    holeNumber={currentHole}
                    par={currentHoleData.par}
                    strokeIndex={currentHoleData.strokeIndex}
                    meters={currentHoleData.meters ?? null}
                    entries={entries}
                    isReadOnly={isReadOnly}
                    allowPickedUp={allowsPickedUp}
                    onScoreChange={handleScoreChange}
                  />
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handlePrevHole}
                    disabled={currentHole <= 1}
                    data-testid="quick-match-prev-hole"
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 disabled:hover:bg-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {t('scoring.navigation.previous')}
                  </button>
                  <button
                    onClick={handleNextHole}
                    disabled={currentHole >= totalHoles}
                    data-testid="quick-match-next-hole"
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:hover:bg-primary transition-colors"
                  >
                    {t('scoring.navigation.next')}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

            {isCreator && !quickMatch?.isCompleted && !quickMatch?.isCancelled && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setShowFinishConfirm(true)}
                  className="w-full px-4 py-2 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-50"
                >
                  {t('scoring.finish.button')}
                </button>
                {/* Cancelar es la salida de una vuelta que se abandona: hasta
                    ahora no habia ninguna, y quien la habia creado —el unico
                    que puede cerrarla— acababa dandola por TERMINADA, metiendo
                    una vuelta a medias en las estadisticas de todo el grupo. */}
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  data-testid="quick-match-cancel-button"
                  className="w-full px-4 py-2 text-gray-600 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  {t('scoring.cancelMatch.button')}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'classification' && (
          <>
          {/* Lo nuestro sí está al día —sale de este móvil—, pero de los demás
              solo tenemos la última foto del servidor: lo que hayan anotado
              desde el corte no ha llegado. Así que se pintan los dos, cada
              jugador atrasado va marcado, y no se afirma quién va primero */}
          {esJuegoLibre && faltanDatosDeOtros && (
            <p
              data-testid="quick-match-clasificacion-atrasada"
              className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm mb-3"
            >
              {t('scoring.offline.classificationStale')}
            </p>
          )}

          {/* En match play no hay tabla que recalcular: el «2 up» viene ya
              hecho del servidor, y le faltan los golpes que siguen en el móvil
              aunque los hayamos anotado nosotros todos */}
          {!esJuegoLibre && pendientes > 0 && (
            <p
              data-testid="quick-match-resultado-atrasado"
              className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm mb-3"
            >
              {t('scoring.offline.standingStale')}
            </p>
          )}
          <QuickMatchClassificationTable
            holes={holes}
            holeScores={holeScoresVisibles}
            participants={quickMatch?.participants ?? []}
            currentParticipantId={myParticipant?.participantId}
            participantesAlDia={faltanDatosDeOtros ? coveredParticipantIds : null}
            scoringFormat={quickMatch?.scoringFormat}
            standing={quickMatch?.standing}
            tees={tees}
            allowancePercentage={quickMatch?.effectiveAllowance}
            playMode={quickMatch?.playMode}
            participantStrokes={quickMatch?.participantStrokes ?? []}
            matchFormat={quickMatch?.matchFormat}
            showFinalBadge={yaCerrada}
            isCancelled={!!quickMatch?.isCancelled}
          />
          </>
        )}

        {activeTab === 'scorecard' && (
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
        )}
      </div>

      {showFinishConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            ref={finishDialogRef}
            tabIndex={-1}
            className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4 focus:outline-none"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-match-finish-title"
          >
            <h3 id="quick-match-finish-title" className="text-lg font-semibold text-gray-900 mb-1">{t('scoring.finish.confirmTitle')}</h3>
            <p className="text-sm text-gray-500 mb-4">{t('scoring.finish.confirmBody')}</p>
            {yaCerrada && !finishFailedKey && !isSubmitting && (
              <p role="alert" className="text-sm text-red-600 mb-4" data-testid="quick-match-finish-stale">
                {t('scoring.finish.failed')}
              </p>
            )}
            {finishFailedKey && (
              <p role="alert" className="text-sm text-red-600 mb-4" data-testid="quick-match-finish-error">
                {t(finishFailedKey)}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setFinishFailedKey(null); setShowFinishConfirm(false); }}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                {t('scoring.finish.cancel')}
              </button>
              <button
                onClick={handleFinishConfirm}
                disabled={isSubmitting || yaCerrada}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {t('scoring.finish.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {hayDiscrepancia && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            ref={discrepanciaDialogRef}
            tabIndex={-1}
            data-testid="quick-match-discrepancia"
            className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4 focus:outline-none"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-match-discrepancia-title"
          >
            <h3 id="quick-match-discrepancia-title" data-testid="quick-match-discrepancia-title" className="text-lg font-semibold text-gray-900 mb-1">
              {/* Un anotador cubre a invitados, y en foursomes a los cuatro:
                  sin el nombre no se sabe qué tarjeta está en disputa. Cuando
                  es la propia, el nombre sobra y queda raro */}
              {discrepancia.participantId === myParticipant?.participantId
                ? t('scoring.offline.conflictTitle', { hole: discrepancia.holeNumber })
                : t('scoring.offline.conflictTitlePlayer', {
                    hole: discrepancia.holeNumber,
                    player: jugadorEnDisputa?.name ?? '',
                  })}
            </h3>
            <p className="text-sm text-gray-500 mb-4" data-testid="quick-match-discrepancia-body">
              {t('scoring.offline.conflictBody', {
                scorer: nombreDelAnotador || t('scoring.offline.conflictScorerUnknown'),
                theirs: comoSeLee(discrepancia.enElServidor),
                mine: comoSeLee(discrepancia.mio),
              })}
            </p>
            <div className="flex justify-end gap-3">
              <button
                data-testid="quick-match-discrepancia-servidor"
                onClick={() => resuelveDiscrepancia(discrepancia.holeNumber, discrepancia.participantId, 'elQueHay')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                {t('scoring.offline.conflictTheirs', { theirs: comoSeLee(discrepancia.enElServidor) })}
              </button>
              <button
                data-testid="quick-match-discrepancia-mio"
                onClick={() => resuelveDiscrepancia(discrepancia.holeNumber, discrepancia.participantId, 'mio')}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
              >
                {t('scoring.offline.conflictMine', { mine: comoSeLee(discrepancia.mio) })}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            ref={cancelDialogRef}
            tabIndex={-1}
            className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4 focus:outline-none"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-match-cancel-title"
          >
            <h3 id="quick-match-cancel-title" className="text-lg font-semibold text-gray-900 mb-1">
              {t('scoring.cancelMatch.confirmTitle')}
            </h3>
            <p className="text-sm text-gray-500 mb-4" data-testid="quick-match-cancel-body">
              {t('scoring.cancelMatch.confirmBody')}
            </p>
            {yaCerrada && !cancelFailedKey && !isSubmitting && (
              <p role="alert" className="text-sm text-red-600 mb-4" data-testid="quick-match-cancel-stale">
                {t('scoring.cancelMatch.failed')}
              </p>
            )}
            {cancelFailedKey && (
              <p role="alert" className="text-sm text-red-600 mb-4" data-testid="quick-match-cancel-error">
                {t(cancelFailedKey)}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setCancelFailedKey(null); setShowCancelConfirm(false); }}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                {t('scoring.cancelMatch.cancel')}
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={isSubmitting || yaCerrada}
                data-testid="quick-match-cancel-confirm"
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {t('scoring.cancelMatch.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickMatchScoringPage;
