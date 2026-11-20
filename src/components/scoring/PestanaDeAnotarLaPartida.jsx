import HoleInput from './HoleInput';
import HoleSelector from './HoleSelector';
import BotonMapa from './mapa/BotonMapa';
import VentanaDelMapa from './mapa/VentanaDelMapa';
import { conGenero } from '../../utils/genero';
import { horaDelCampo } from '../../services/partidosSinCobertura';
import { hoyoDeLaTarjetaDe } from '../../utils/lecturaDeLaPartida';

const CLASE_DE_NAVEGAR =
  'min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40';

// Antes de que abra la anotación: a qué hora abre y a quién vas a marcar
const AvisoDeQueAunNoAbre = ({ t, hora, idioma, nombreDelMarcado }) => (
  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
    <p className="font-medium text-amber-900">{t('partida.notOpenYet')}</p>
    <p className="mt-1 text-amber-800">
      {t('notOpenYet.opensAt', { hora: horaDelCampo(hora, idioma) })}
    </p>
    {/* A quién vas a marcar, como en la Ryder (16 oct) */}
    {nombreDelMarcado && (
      <p data-testid="anotaras-a" className="mt-1 font-medium text-amber-900">
        {t('notOpenYet.youWillMark', { nombre: nombreDelMarcado })}
      </p>
    )}
  </div>
);

// La casilla del hoyo y la ventana del mapa, que va con ella
const CasillaDeLaPartida = ({
  scoringView,
  userId,
  currentHole,
  noGuardados,
  roles,
  nombreDelMarcado,
  candados,
  onScoreChange,
  mapaDelHoyo,
  miBarra,
}) => {
  const { marcoA, miGolpe, suGolpe } = roles;
  const parDe = (jugador) =>
    hoyoDeLaTarjetaDe(scoringView.players, jugador, currentHole)?.par ?? null;
  return (
    <>
      <HoleInput
        // Lo no guardado de este hoyo cambia de turno: la casilla vuelve a empezar
        key={`${currentHole}-${noGuardados[currentHole]?.turno ?? ''}`}
        holeNumber={currentHole}
        par={parDe(userId)}
        markedPar={parDe(marcoA)}
        markedName={nombreDelMarcado}
        markerName={roles.meAnoto}
        marksSomeone={Boolean(marcoA)}
        hasMarker={roles.sigueMarcandome || Boolean(miGolpe?.markerSubmitted)}
        markedScoredBy={roles.loPusoOtro}
        strokeIndex={null}
        playerScore={miGolpe}
        markedPlayerScore={suGolpe}
        validationStatus={miGolpe?.validationStatus}
        markedValidationStatus={suGolpe?.validationStatus}
        strokesReceived={miGolpe?.strokesReceivedThisHole}
        // Su tarjeta cerrada sin entregar se lee: así ve quién le anotó (QA 3)
        isReadOnly={candados.isReadOnly}
        isOwnScoreLocked={candados.isOwnScoreLocked}
        isMarkerScoreLocked={candados.isMarkerScoreLocked}
        onScoreChange={onScoreChange}
        allowPickedUp={scoringView.strokePlay.pickedUpAllowed === true}
      />
      <VentanaDelMapa
        mapaDelHoyo={mapaDelHoyo}
        golfCourseId={scoringView?.roundInfo?.golfCourseId ?? null}
        numeroDeHoyo={currentHole}
        par={parDe(userId)}
        // Los metros desde mi barra, para el recuadro del mapa (16 oct)
        metros={
          hoyoDeLaTarjetaDe(scoringView.players, userId, currentHole)?.meters ??
          null
        }
        userId={userId ?? null}
        barra={miBarra}
      />
    </>
  );
};

// Anterior y Siguiente, con «Mapa» entre los dos
const NavegacionDeHoyos = ({
  t,
  currentHole,
  totalHoles,
  onElegirHoyo,
  conMapa,
  onAbrirMapa,
}) => (
  <div className="flex items-center justify-between gap-2">
    <button
      type="button"
      onClick={() => onElegirHoyo(currentHole - 1)}
      disabled={currentHole <= 1}
      className={CLASE_DE_NAVEGAR}
    >
      {t('input.prevHole')}
    </button>
    {/* «Mapa», entre Anterior y Siguiente (Agustín, 16 oct): ni dentro de la tarjeta del hoyo ni en una fila más, que empujaba la navegación fuera de la pantalla */}
    {/* Solo con el hoyo a la vista: la ventana del mapa va con él. Y en España, la única con imagen (19 oct) */}
    {conMapa && <BotonMapa onAbrir={onAbrirMapa} />}
    <button
      type="button"
      onClick={() => onElegirHoyo(currentHole + 1)}
      disabled={currentHole >= totalHoles}
      className={CLASE_DE_NAVEGAR}
    >
      {t('input.nextHole')}
    </button>
  </div>
);

// «Retirarme», con su confirmación
const RetiradaDeLaPartida = ({ t, retirada }) =>
  retirada.retirandose ? (
    <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
      <span className="min-w-0 flex-1">{t('partida.retireConfirm')}</span>
      <button
        type="button"
        disabled={retirada.ocupado}
        onClick={retirada.retirarse}
        className="min-h-11 rounded-md bg-amber-600 px-3 font-semibold text-white"
      >
        {t('partida.retireYes')}
      </button>
      <button
        type="button"
        onClick={retirada.cancelarRetirada}
        className="min-h-11 rounded-md px-3"
      >
        {t('partida.no')}
      </button>
    </div>
  ) : (
    <button
      type="button"
      onClick={retirada.pedirRetirada}
      className="min-h-11 w-full rounded-lg border border-red-200 text-sm font-medium text-red-600"
    >
      {t('partida.retire')}
    </button>
  );

/**
 * La pestaña «Anotar» de una partida de stroke play (`GroupScoringPage`): el
 * selector de hoyos, el aviso de que aún no abre o la casilla con su mapa, la
 * navegación entre hoyos y retirarse. El no presentado solo lee por qué no
 * anota. Sin estado ni efectos: `roles` sale de `rolesEnLaPartida`, `candados`
 * de `candadosDeLaCasilla` y `retirada` de `useRetiradaDeLaPartida`.
 */
const PestanaDeAnotarLaPartida = ({
  t,
  idioma,
  scoringView,
  userId,
  roles,
  nombreDelMarcado,
  candados,
  currentHole,
  totalHoles,
  onElegirHoyo,
  golpesDelSelector,
  hoyosNoGuardados,
  noGuardados,
  aunNoAbre,
  onScoreChange,
  mapaDelHoyo,
  miBarra,
  retirada,
}) => {
  const { noPresentado, miTarjeta, sinMarcador, marcoA } = roles;
  // El no presentado no anota: se le dice por qué (#854)
  if (noPresentado) {
    return (
      <p
        data-testid="no-presentado"
        className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700"
      >
        {t('partida.youAreNoShowHere', conGenero(miTarjeta?.teeGender))}
      </p>
    );
  }
  return (
    <>
      {/* Sin nadie en juego que le marque (se fue o ya entregó): sus hoyos
        los valida el organizador (QA del 11 oct 2026, BE #539) */}
      {sinMarcador && (
        <p
          data-testid="sin-marcador"
          className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {t('partida.organiserValidates')}
        </p>
      )}
      {marcoA && (
        <p className="text-sm text-gray-700">
          {t('partida.youMark', { jugador: nombreDelMarcado ?? '' })}
        </p>
      )}
      <HoleSelector
        currentHole={currentHole}
        onSelect={onElegirHoyo}
        scores={golpesDelSelector}
        totalHoles={totalHoles}
        noGuardados={hoyosNoGuardados}
      />
      {aunNoAbre && (
        <AvisoDeQueAunNoAbre
          t={t}
          hora={scoringView.scoringOpensAt}
          idioma={idioma}
          nombreDelMarcado={nombreDelMarcado}
        />
      )}
      {!aunNoAbre && (
        <CasillaDeLaPartida
          scoringView={scoringView}
          userId={userId}
          currentHole={currentHole}
          noGuardados={noGuardados}
          roles={roles}
          nombreDelMarcado={nombreDelMarcado}
          candados={candados}
          onScoreChange={onScoreChange}
          mapaDelHoyo={mapaDelHoyo}
          miBarra={miBarra}
        />
      )}
      <NavegacionDeHoyos
        t={t}
        currentHole={currentHole}
        totalHoles={totalHoles}
        onElegirHoyo={onElegirHoyo}
        conMapa={!aunNoAbre && mapaDelHoyo.disponible}
        onAbrirMapa={mapaDelHoyo.abrir}
      />

      {/* Antes de abrir no hay de qué retirarse: el servidor lo rechaza */}
      {miTarjeta?.cardStatus === 'JUGANDO' && !aunNoAbre && (
        <RetiradaDeLaPartida t={t} retirada={retirada} />
      )}
    </>
  );
};

export default PestanaDeAnotarLaPartida;
