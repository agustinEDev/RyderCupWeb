import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';
import {
  correctTeeGroupHoleUseCase,
  reopenTeeGroupCardUseCase,
  markTeeGroupNoShowUseCase,
  retireTeeGroupPlayerUseCase,
  deleteTeeGroupHoleUseCase,
  validateTeeGroupScoredHolesUseCase,
} from '../../composition';
import customToast from '../../utils/toast';
import StablefordCalculator from '../../domain/services/StablefordCalculator';
import { mensajeDeErrorDePartida } from '../../utils/erroresDePartida';
import { sinMarcadorEnJuego } from '../../domain/services/PartidasDeLaFranja';
import { conGenero } from '../../utils/genero';
import NombreConHandicap from './NombreConHandicap';

const RECOGIDA = 'RECOGIDA';
const SIN_GOLPE = '';
const GOLPES = Array.from({ length: 15 }, (_, i) => i + 1);
// Quien solo mira, en dos filas de nueve; el organizador toca cada hoyo, y a
// 360 px nueve botones no llegan a 44 px: en filas de seis (QA del 11 oct 2026)
const TRAMOS_DE_NUEVE = { desde: [0, 9], largo: 9, columnas: 'grid-cols-9' };
const TRAMOS_DE_SEIS = { desde: [0, 6, 12], largo: 6, columnas: 'grid-cols-6' };
// Las tarjetas cerradas se reabren; la que se juega, no
const CERRADAS = ['ENTREGADA', 'RETIRADO', 'NO_PRESENTADO'];
// Fallos que dicen que lo que se ve está viejo: se relee (RyderCupAm#553).
// La tarjeta que ya estaba abierta no es un error: alguien se adelantó
const RELEER_TRAS_FALLO = ['SCORECARD_ALREADY_OPEN', 'PLAYER_HAS_STROKES'];
const SOLO_AVISO = ['SCORECARD_ALREADY_OPEN'];

/**
 * Las tarjetas de una partida de stroke play, hoyo a hoyo (FE #824, PR 7;
 * casos 12 y 15, decididos con Agustín el 11 oct 2026). En dos filas de nueve
 * para que quepan a 360 px.
 *
 * El organizador, además: corregir un hoyo de una tarjeta que se juega (el lado
 * del jugador, el del marcador o los dos) o borrar lo anotado en él, reabrir una
 * cerrada, y marcar como no presentado a quien no salió o retirar a quien ya
 * jugó (RyderCupAm#553); todo menos corregir, con confirmación. Lo que el
 * servidor contesta lo pide el padre de nuevo (`onCambio`).
 *
 * @param {Object} props
 * @param {Object} props.scoringView - La vista de la partida, en la forma de la de la Ryder
 * @param {string} [props.userId] - Quién mira
 * @param {boolean} props.organiza - Si quien mira organiza la competición
 * @param {() => void} props.onCambio - Tras un cambio que sale bien
 */
const TarjetasDeLaPartida = ({ scoringView, userId, organiza, onCambio }) => {
  const { t } = useTranslation('scoring');
  const [corrigiendo, setCorrigiendo] = useState(null);
  const [confirmando, setConfirmando] = useState(null);
  // Adónde va el foco al acabar una acción: cuando el botón deja de estar
  // desactivado (CodeRabbit en la #844)
  const focoPendiente = useRef(null);
  // Cada tarjeta, para llevarle el foco si el botón que lo tenía desaparece
  const secciones = useRef(new Map());
  const [ocupado, setOcupado] = useState(false);

  const { strokePlay } = scoringView;
  const esMedal = strokePlay.tournamentType === 'MEDAL';
  const golpeDe = (userId, hoyo) =>
    scoringView.scores.find((s) => s.holeNumber === hoyo)?.playerScores.find((p) => p.userId === userId) ?? null;
  // Cada jugador por su id, una vez por vista: el hándicap de juego y los pares
  // vienen en `players`, no en la tarjeta (QA del 21 oct 2026)
  const jugadores = useMemo(() => new Map(scoringView.players.map((p) => [p.userId, p])), [scoringView]);
  const parDe = (userId, hoyo) => jugadores.get(userId)?.holeCard.find((h) => h.holeNumber === hoyo)?.par ?? null;

  // Lo que se ve en cada hoyo: el golpe validado, los dos si no coinciden
  const textoDe = (golpe) => {
    if (!golpe) return '·';
    const uno = (valor, enviado) => (!enviado ? '·' : valor == null ? '—' : `${valor}`);
    if (golpe.validationStatus === 'mismatch') {
      return `${uno(golpe.ownScore, golpe.ownSubmitted)}/${uno(golpe.markerScore, golpe.markerSubmitted)}`;
    }
    return golpe.ownSubmitted ? uno(golpe.ownScore, true) : uno(golpe.markerScore, golpe.markerSubmitted);
  };

  useEffect(() => {
    if (ocupado || !focoPendiente.current) return;
    focoPendiente.current.focus();
    focoPendiente.current = null;
  }, [ocupado]);

  const hacer = async (accion, aviso, alAcabar, despues, alFallar) => {
    setOcupado(true);
    let respuesta;
    try {
      respuesta = await accion();
    } catch (error) {
      const codigo = error?.errorCode;
      if (SOLO_AVISO.includes(codigo)) customToast.info(mensajeDeErrorDePartida(t, error));
      else customToast.error(mensajeDeErrorDePartida(t, error));
      // Una confirmación no se queda abierta tras el error (QA 3)
      alFallar?.(codigo);
      if (RELEER_TRAS_FALLO.includes(codigo)) onCambio?.();
      return;
    } finally {
      setOcupado(false);
    }
    // Lo de después ya no es un fallo de la petición (/code-review)
    alAcabar?.();
    customToast.success(typeof aviso === 'string' ? t(aviso) : t(aviso.clave, aviso.params));
    try {
      despues?.(respuesta);
      onCambio?.();
    } catch {
      // El refresco se reintenta solo con el sondeo
    }
  };

  const aValor = (golpe, enviado) => (!enviado ? SIN_GOLPE : golpe == null ? RECOGIDA : String(golpe));
  const abrirCorreccion = (jugador, hoyo) => {
    const golpe = golpeDe(jugador, hoyo);
    const propio = aValor(golpe?.ownScore, golpe?.ownSubmitted);
    const marcador = aValor(golpe?.markerScore, golpe?.markerSubmitted);
    setConfirmando(null);
    setCorrigiendo({ jugador, hoyo, propio, marcador, propioAntes: propio, marcadorAntes: marcador, borrar: null });
  };
  // Qué lados se pueden borrar: los que tienen algo anotado ahora, aunque haya
  // llegado con la hoja abierta (RyderCupAm#553; revisor)
  const ladosParaBorrar = ({ jugador, hoyo }) => {
    const golpe = golpeDe(jugador, hoyo);
    const lados = [];
    if (golpe?.ownSubmitted) lados.push('own');
    if (golpe?.markerSubmitted) lados.push('marker');
    if (lados.length === 2) lados.push('both');
    return lados;
  };
  const borrarHoyo = () => {
    const { jugador, hoyo, borrar } = corrigiendo;
    hacer(
      () => deleteTeeGroupHoleUseCase.execute(scoringView.matchId, jugador, hoyo, borrar),
      'partida.deleted',
      () => {
        setCorrigiendo(null);
        // La hoja se cierra: el foco, a la celda del hoyo (revisor)
        focoPendiente.current = document.querySelector(`[data-testid="hoyo-${jugador}-${hoyo}"]`);
      },
      undefined,
      // Si falla, la hoja sigue con lo que había
      () => setCorrigiendo((c) => (c ? { ...c, borrar: null } : c))
    );
  };
  const golpeAEnviar = (valor) => (valor === RECOGIDA ? null : Number(valor));
  // Lo que se manda: los lados que cambian y tienen golpe. Una sola regla para
  // el botón y para el envío (/code-review)
  const ladosCambiados = ({ propio, marcador, propioAntes, marcadorAntes }) => {
    const lados = {};
    if (propio !== propioAntes && propio !== SIN_GOLPE) lados.ownScore = golpeAEnviar(propio);
    if (marcador !== marcadorAntes && marcador !== SIN_GOLPE) lados.markerScore = golpeAEnviar(marcador);
    return lados;
  };
  const guardarCorreccion = () => {
    const { jugador, hoyo } = corrigiendo;
    hacer(
      () => correctTeeGroupHoleUseCase.execute(scoringView.matchId, jugador, hoyo, ladosCambiados(corrigiendo)),
      'partida.corrected',
      () => setCorrigiendo(null)
    );
  };
  const hayCambios = Boolean(corrigiendo) && Object.keys(ladosCambiados(corrigiendo)).length > 0;
  // «Sin golpe» en un lado que tenía uno no lo borra (el servidor no borra):
  // sin decirlo, «Guardar» se quedaba apagado sin más (QA del 11 oct 2026)
  const quiereBorrar =
    Boolean(corrigiendo) &&
    ((corrigiendo.propio === SIN_GOLPE && corrigiendo.propioAntes !== SIN_GOLPE) ||
      (corrigiendo.marcador === SIN_GOLPE && corrigiendo.marcadorAntes !== SIN_GOLPE));

  // Sin nadie en juego que le marque (se fue, o ya entregó): valida el
  // organizador, de una vez, lo que anotó (BE #539)
  const porValidar = (jugador) =>
    scoringView.scores.filter((s) => {
      const golpe = s.playerScores.find((p) => p.userId === jugador);
      return golpe?.ownSubmitted && !golpe.markerSubmitted;
    }).length;

  // Si al marcar un no presentado viene alguien de otra partida, se dice
  const avisarSiVieneAlguien = (respuesta) => {
    const antes = new Set(strokePlay.cards.map((c) => c.userId));
    const tarjetas = respuesta?.strokePlay?.cards ?? [];
    const viene = tarjetas.find((c) => c.broughtIn && !antes.has(c.userId));
    // A quien viene a acompañar: al que marca (/code-review)
    const acompana = tarjetas.find((c) => c.userId === viene?.marksUserId);
    if (viene && acompana) customToast.info(t('partida.broughtInToast', { viene: viene.name, jugador: acompana.name }));
  };

  const selectorDeGolpe = (etiqueta, valor, onCambiar) => (
    <label className="flex min-w-0 flex-1 flex-col text-xs text-gray-600">
      {t(etiqueta)}
      <select
        aria-label={t(etiqueta)}
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        className="mt-0.5 min-h-11 rounded-lg border border-gray-200 px-2 text-sm"
      >
        <option value={SIN_GOLPE}>{t('partida.noScore')}</option>
        {GOLPES.map((g) => (
          <option key={g} value={String(g)}>
            {g}
          </option>
        ))}
        {strokePlay.pickedUpAllowed && <option value={RECOGIDA}>{t('partida.pickedUp')}</option>}
      </select>
    </label>
  );

  const total = (tarjeta) =>
    esMedal ? StablefordCalculator.formatToPar(tarjeta.totals.toParNet) : t('partida.points', { count: tarjeta.totals.points });

  return (
    <div className="space-y-4">
      {strokePlay.cards.map((tarjeta) => {
        const { userId: jugador, name, cardStatus, teeGender } = tarjeta;
        const seJuega = cardStatus === 'JUGANDO';
        const confirmaEsta = confirmando?.jugador === jugador ? confirmando : null;
        const tramos = organiza && seJuega ? TRAMOS_DE_SEIS : TRAMOS_DE_NUEVE;
        const sinMarcador = organiza && sinMarcadorEnJuego(strokePlay.cards, jugador);
        // Sin ningún hoyo solo suyo no hay nada que validar de una vez (revisor)
        const cuantosPorValidar = sinMarcador ? porValidar(jugador) : 0;
        // Si el lado elegido para borrar ya no está (llegó un cambio), se vuelve a elegir (/code-review)
        const enEsta = corrigiendo?.jugador === jugador ? corrigiendo : null;
        const pasoDeBorrar =
          enEsta && ['own', 'marker', 'both'].includes(enEsta.borrar) && !ladosParaBorrar(enEsta).includes(enEsta.borrar)
            ? 'eligiendo'
            : enEsta?.borrar ?? null;
        return (
          <section
            key={jugador}
            data-testid={`tarjeta-${jugador}`}
            tabIndex={-1}
            ref={(el) => {
              if (el) secciones.current.set(jugador, el);
              else secciones.current.delete(jugador);
            }}
            className={`rounded-lg border bg-white p-3 ${jugador === userId ? 'border-green-300' : 'border-gray-200'}`}
          >
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              {/* Con su hándicap de juego en la misma línea, como en match play:
                  si no cabe, se corta el nombre y el valor se queda (QA del 21 oct 2026) */}
              <NombreConHandicap
                userId={jugador}
                nombre={name}
                playingHandicap={jugadores.get(jugador)?.playingHandicap}
                className="flex min-w-0 max-w-full items-baseline"
                nombreClassName="min-w-0 truncate font-semibold text-gray-900"
              />
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                {t(`partida.cardStatus.${cardStatus}`, conGenero(teeGender))}
              </span>
              {cardStatus === 'NO_PRESENTADO' ? (
                // Sin «PAR · tras 0 hoyos»: no jugó (#854)
                <span className="ml-auto text-sm font-bold text-gray-500">{t('partida.noShowTotal')}</span>
              ) : (
                <>
                  <span className="ml-auto text-sm font-bold text-gray-900">{total(tarjeta)}</span>
                  <span className="text-xs text-gray-500">{t('partida.thru', { count: tarjeta.totals.thru })}</span>
                </>
              )}
            </div>

            {/* La de un no presentado no enseña golpes: los que metiera su
                marcador no son suyos (QA del 11 oct 2026) */}
            {cardStatus !== 'NO_PRESENTADO' && tramos.desde.map((desde) => (
              <div key={desde} className={`mt-2 grid ${tramos.columnas} gap-0.5 text-center text-xs`}>
                {Array.from({ length: tramos.largo }, (_, i) => desde + i + 1).map((hoyo) => {
                  const golpe = golpeDe(jugador, hoyo);
                  const estado = golpe?.validationStatus ?? 'pending';
                  const color =
                    estado === 'match' ? 'text-green-800' : estado === 'mismatch' ? 'bg-red-50 text-red-700' : 'text-gray-500';
                  const celda = (
                    <>
                      <span className="block text-[10px] text-gray-400">{hoyo}</span>
                      <span className="block text-[10px] text-gray-400">{parDe(jugador, hoyo) ?? ''}</span>
                      {/* Dos golpes («12/11») no caben a 360 px con la letra de uno */}
                      <span className={`block font-semibold ${estado === 'mismatch' ? 'text-[9px] tracking-tighter' : ''}`}>
                        {textoDe(golpe)}
                      </span>
                    </>
                  );
                  return organiza && seJuega ? (
                    <button
                      type="button"
                      key={hoyo}
                      data-testid={`hoyo-${jugador}-${hoyo}`}
                      data-estado={estado}
                      disabled={ocupado}
                      // Con lo anotado: la etiqueta sustituye al contenido de la celda
                      aria-label={t('partida.correct', { jugador: name, hoyo, golpe: textoDe(golpe) })}
                      onClick={() => abrirCorreccion(jugador, hoyo)}
                      className={`min-h-11 rounded ${color} hover:bg-gray-100`}
                    >
                      {celda}
                    </button>
                  ) : (
                    <div key={hoyo} data-testid={`hoyo-${jugador}-${hoyo}`} data-estado={estado} className={`rounded py-1 ${color}`}>
                      {celda}
                    </div>
                  );
                })}
              </div>
            ))}

            {corrigiendo?.jugador === jugador && (
              <div data-testid={`corregir-${jugador}-${corrigiendo.hoyo}`} className="mt-2 space-y-2 rounded-lg bg-gray-50 p-2">
                <p className="flex items-center gap-1 text-xs font-semibold text-gray-700">
                  <Pencil className="h-3 w-3" />
                  {t('partida.correctingHole', { hoyo: corrigiendo.hoyo })}
                </p>
                {/* Mientras se elige qué borrar, no se corrige a la vez (revisor) */}
                {pasoDeBorrar == null && (
                <div className="flex flex-wrap gap-2">
                  {selectorDeGolpe('partida.ownSide', corrigiendo.propio, (v) => setCorrigiendo((c) => ({ ...c, propio: v })))}
                  {selectorDeGolpe('partida.markerSide', corrigiendo.marcador, (v) => setCorrigiendo((c) => ({ ...c, marcador: v })))}
                </div>
                )}
                {quiereBorrar && pasoDeBorrar == null && <p className="text-xs text-amber-800">{t('partida.cannotClear')}</p>}
                {/* Borrar lo anotado, por lados y con confirmación (RyderCupAm#553) */}
                {ladosParaBorrar(corrigiendo).length > 0 && pasoDeBorrar == null && (
                  <button
                    type="button"
                    disabled={ocupado}
                    // Al volver de «Cancelar», el foco aquí (/code-review)
                    autoFocus={corrigiendo.focoEnBorrar}
                    onClick={() => setCorrigiendo((c) => ({ ...c, borrar: 'eligiendo' }))}
                    className="min-h-11 rounded-lg border border-red-200 px-3 text-sm text-red-600"
                  >
                    {t('partida.deleteScored')}
                  </button>
                )}
                {pasoDeBorrar === 'eligiendo' && (
                  <div className="flex flex-wrap gap-2">
                    {ladosParaBorrar(corrigiendo).map((lado, i) => (
                      <button
                        key={lado}
                        type="button"
                        disabled={ocupado}
                        // Cada paso deja el foco en el siguiente (/code-review)
                        autoFocus={i === 0}
                        onClick={() => setCorrigiendo((c) => ({ ...c, borrar: lado }))}
                        className="min-h-11 rounded-lg border border-red-200 px-3 text-sm text-red-600"
                      >
                        {t(`partida.deleteSide.${lado}`)}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => setCorrigiendo((c) => ({ ...c, borrar: null, focoEnBorrar: true }))}
                      className="min-h-11 rounded-lg px-3 text-sm text-gray-600"
                    >
                      {t('partida.cancel')}
                    </button>
                  </div>
                )}
                {['own', 'marker', 'both'].includes(pasoDeBorrar) && (
                  <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
                    <span className="w-full">
                      {t(`partida.deleteConfirm.${corrigiendo.borrar}`, { hoyo: corrigiendo.hoyo, jugador: name })}
                    </span>
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={borrarHoyo}
                      className="min-h-11 rounded-md bg-amber-600 px-3 font-semibold text-white"
                    >
                      {t('partida.yes')}
                    </button>
                    <button
                      type="button"
                      disabled={ocupado}
                      autoFocus
                      onClick={() => setCorrigiendo((c) => ({ ...c, borrar: 'eligiendo' }))}
                      className="min-h-11 rounded-md px-3"
                    >
                      {t('partida.no')}
                    </button>
                  </div>
                )}
                {pasoDeBorrar == null && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={ocupado || !hayCambios}
                    onClick={guardarCorreccion}
                    className="min-h-11 rounded-lg bg-primary px-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {t('partida.save')}
                  </button>
                  <button type="button" onClick={() => setCorrigiendo(null)} className="min-h-11 rounded-lg px-3 text-sm text-gray-600">
                    {t('partida.cancel')}
                  </button>
                </div>
                )}
              </div>
            )}

            {sinMarcador && <p className="mt-2 text-xs text-amber-800">{t('partida.noMarkerInPlay')}</p>}
            {organiza && (
              <div className="mt-2 flex flex-wrap gap-2">
                {cuantosPorValidar > 0 && (
                  <button
                    type="button"
                    disabled={ocupado}
                    aria-label={t('partida.validateScored', { jugador: name })}
                    onClick={(e) => setConfirmando({ jugador, accion: 'validar', cuantos: cuantosPorValidar, origen: e.currentTarget })}
                    className="min-h-11 rounded-lg border border-primary px-3 text-sm font-semibold text-primary"
                  >
                    {t('partida.validateScoredShort')}
                  </button>
                )}
                {CERRADAS.includes(cardStatus) && (
                  <button
                    type="button"
                    disabled={ocupado}
                    aria-label={t('partida.reopen', { jugador: name })}
                    onClick={(e) => setConfirmando({ jugador, accion: 'reabrir', origen: e.currentTarget })}
                    className="min-h-11 rounded-lg border border-gray-300 px-3 text-sm text-gray-700"
                  >
                    {t('partida.reopenShort')}
                  </button>
                )}
                {/* Si ya jugó, no es un no presentado: se le retira (RyderCupAm#553) */}
                {seJuega && tarjeta.played && (
                  <button
                    type="button"
                    disabled={ocupado}
                    aria-label={t('partida.retirePlayer', conGenero(teeGender, { jugador: name }))}
                    onClick={(e) => setConfirmando({ jugador, accion: 'retirar', origen: e.currentTarget })}
                    className="min-h-11 rounded-lg border border-gray-300 px-3 text-sm text-gray-700"
                  >
                    {t('partida.retirePlayerShort')}
                  </button>
                )}
                {seJuega && !tarjeta.played && (
                  <button
                    type="button"
                    disabled={ocupado}
                    aria-label={t('partida.noShow', conGenero(teeGender, { jugador: name }))}
                    onClick={(e) => setConfirmando({ jugador, accion: 'noPresentado', origen: e.currentTarget })}
                    className="min-h-11 rounded-lg border border-gray-300 px-3 text-sm text-gray-700"
                  >
                    {t('partida.noShowShort', conGenero(teeGender))}
                  </button>
                )}
              </div>
            )}

            {confirmaEsta && (
              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
                {/* El texto en su línea, los botones debajo (gemelo de «Cerrar la franja») */}
                <span className="w-full">
                  {confirmaEsta.accion === 'validar'
                    ? t('partida.validateScoredConfirm', { jugador: name, count: confirmaEsta.cuantos })
                    : confirmaEsta.accion === 'reabrir'
                      ? t('partida.reopenConfirm', { jugador: name })
                      : confirmaEsta.accion === 'retirar'
                        ? t('partida.retirePlayerConfirm', conGenero(teeGender, { jugador: name }))
                        : t('partida.noShowConfirm', conGenero(teeGender, { jugador: name }))}
                </span>
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => {
                    // Con éxito, el botón que la abrió suele desaparecer: a la tarjeta (/code-review)
                    const cerrar = () => {
                      setConfirmando(null);
                      focoPendiente.current = secciones.current.get(jugador);
                    };
                    // Tras un fallo, el foco vuelve al botón que la abrió (revisor)
                    // Si se relee, su botón puede desaparecer: a la tarjeta (revisor)
                    const alFallar = (codigo) => {
                      setConfirmando(null);
                      focoPendiente.current = RELEER_TRAS_FALLO.includes(codigo) ? secciones.current.get(jugador) : confirmaEsta.origen;
                    };
                    if (confirmaEsta.accion === 'reabrir') {
                      hacer(() => reopenTeeGroupCardUseCase.execute(scoringView.matchId, jugador), 'partida.reopened', cerrar, undefined, alFallar);
                    } else if (confirmaEsta.accion === 'validar') {
                      hacer(
                        () => validateTeeGroupScoredHolesUseCase.execute(scoringView.matchId, jugador),
                        { clave: 'partida.scoredValidated', params: { count: confirmaEsta.cuantos } },
                        cerrar,
                        undefined,
                        alFallar
                      );
                    } else if (confirmaEsta.accion === 'retirar') {
                      hacer(
                        () => retireTeeGroupPlayerUseCase.execute(scoringView.matchId, jugador),
                        { clave: 'partida.retiredByOrganiser', params: conGenero(teeGender) },
                        cerrar,
                        undefined,
                        alFallar
                      );
                    } else {
                      hacer(() => markTeeGroupNoShowUseCase.execute(scoringView.matchId, jugador), { clave: 'partida.markedNoShow', params: conGenero(teeGender) }, cerrar, avisarSiVieneAlguien, alFallar);
                    }
                  }}
                  className="min-h-11 rounded-md bg-amber-600 px-3 font-semibold text-white"
                >
                  {t('partida.yes')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // El foco vuelve al botón que la abrió (/code-review)
                    const { origen } = confirmaEsta;
                    setConfirmando(null);
                    origen?.focus();
                  }}
                  className="min-h-11 rounded-md px-3"
                >
                  {t('partida.no')}
                </button>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};

export default TarjetasDeLaPartida;
