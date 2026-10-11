import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';
import {
  correctTeeGroupHoleUseCase,
  reopenTeeGroupCardUseCase,
  markTeeGroupNoShowUseCase,
  validateTeeGroupScoredHolesUseCase,
} from '../../composition';
import customToast from '../../utils/toast';
import StablefordCalculator from '../../domain/services/StablefordCalculator';
import { mensajeDeErrorDePartida } from '../../utils/erroresDePartida';

const RECOGIDA = 'RECOGIDA';
const SIN_GOLPE = '';
const GOLPES = Array.from({ length: 15 }, (_, i) => i + 1);
// Quien solo mira, en dos filas de nueve; el organizador toca cada hoyo, y a
// 360 px nueve botones no llegan a 44 px: en filas de seis (QA del 11 oct 2026)
const TRAMOS_DE_NUEVE = { desde: [0, 9], largo: 9, columnas: 'grid-cols-9' };
const TRAMOS_DE_SEIS = { desde: [0, 6, 12], largo: 6, columnas: 'grid-cols-6' };
// Las tarjetas cerradas se reabren; la que se juega, no
const CERRADAS = ['ENTREGADA', 'RETIRADO', 'NO_PRESENTADO'];

/**
 * Las tarjetas de una partida de stroke play, hoyo a hoyo (FE #824, PR 7;
 * casos 12 y 15, decididos con Agustín el 11 oct 2026). En dos filas de nueve
 * para que quepan a 360 px.
 *
 * El organizador, además: corregir un hoyo de una tarjeta que se juega (el lado
 * del jugador, el del marcador o los dos), reabrir una cerrada y marcar como no
 * presentado a quien no salió; las dos últimas, con confirmación. Lo que el
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
  const [ocupado, setOcupado] = useState(false);

  const { strokePlay } = scoringView;
  const esMedal = strokePlay.tournamentType === 'MEDAL';
  const golpeDe = (userId, hoyo) =>
    scoringView.scores.find((s) => s.holeNumber === hoyo)?.playerScores.find((p) => p.userId === userId) ?? null;
  const parDe = (userId, hoyo) =>
    scoringView.players.find((p) => p.userId === userId)?.holeCard.find((h) => h.holeNumber === hoyo)?.par ?? null;

  // Lo que se ve en cada hoyo: el golpe validado, los dos si no coinciden
  const textoDe = (golpe) => {
    if (!golpe) return '·';
    const uno = (valor, enviado) => (!enviado ? '·' : valor == null ? '—' : `${valor}`);
    if (golpe.validationStatus === 'mismatch') {
      return `${uno(golpe.ownScore, golpe.ownSubmitted)}/${uno(golpe.markerScore, golpe.markerSubmitted)}`;
    }
    return golpe.ownSubmitted ? uno(golpe.ownScore, true) : uno(golpe.markerScore, golpe.markerSubmitted);
  };

  const hacer = async (accion, aviso, alAcabar, despues) => {
    setOcupado(true);
    try {
      const respuesta = await accion();
      alAcabar?.();
      customToast.success(typeof aviso === 'string' ? t(aviso) : t(aviso.clave, aviso.params));
      despues?.(respuesta);
      onCambio?.();
    } catch (error) {
      customToast.error(mensajeDeErrorDePartida(t, error));
    } finally {
      setOcupado(false);
    }
  };

  const aValor = (golpe, enviado) => (!enviado ? SIN_GOLPE : golpe == null ? RECOGIDA : String(golpe));
  const abrirCorreccion = (jugador, hoyo) => {
    const golpe = golpeDe(jugador, hoyo);
    const propio = aValor(golpe?.ownScore, golpe?.ownSubmitted);
    const marcador = aValor(golpe?.markerScore, golpe?.markerSubmitted);
    setConfirmando(null);
    setCorrigiendo({ jugador, hoyo, propio, marcador, propioAntes: propio, marcadorAntes: marcador });
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
  const estadoDe = (jugador) => strokePlay.cards.find((c) => c.userId === jugador)?.cardStatus;
  const sinMarcadorEnJuego = (tarjeta) =>
    tarjeta.cardStatus === 'JUGANDO' && (!tarjeta.markedByUserId || estadoDe(tarjeta.markedByUserId) !== 'JUGANDO');
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
    const acompana = tarjetas.find((c) => c.cardStatus === 'JUGANDO' && c.userId !== viene?.userId);
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
        const { userId: jugador, name, cardStatus } = tarjeta;
        const seJuega = cardStatus === 'JUGANDO';
        const confirmaEsta = confirmando?.jugador === jugador ? confirmando : null;
        const tramos = organiza && seJuega ? TRAMOS_DE_SEIS : TRAMOS_DE_NUEVE;
        const sinMarcador = organiza && sinMarcadorEnJuego(tarjeta);
        return (
          <section
            key={jugador}
            data-testid={`tarjeta-${jugador}`}
            className={`rounded-lg border bg-white p-3 ${jugador === userId ? 'border-green-300' : 'border-gray-200'}`}
          >
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold text-gray-900">{name}</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                {t(`partida.cardStatus.${cardStatus}`)}
              </span>
              <span className="ml-auto text-sm font-bold text-gray-900">{total(tarjeta)}</span>
              <span className="text-xs text-gray-500">{t('partida.thru', { count: tarjeta.totals.thru })}</span>
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
                <div className="flex flex-wrap gap-2">
                  {selectorDeGolpe('partida.ownSide', corrigiendo.propio, (v) => setCorrigiendo((c) => ({ ...c, propio: v })))}
                  {selectorDeGolpe('partida.markerSide', corrigiendo.marcador, (v) => setCorrigiendo((c) => ({ ...c, marcador: v })))}
                </div>
                {quiereBorrar && <p className="text-xs text-amber-800">{t('partida.cannotClear')}</p>}
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
              </div>
            )}

            {sinMarcador && <p className="mt-2 text-xs text-amber-800">{t('partida.noMarkerInPlay')}</p>}
            {organiza && (
              <div className="mt-2 flex flex-wrap gap-2">
                {sinMarcador && (
                  <button
                    type="button"
                    disabled={ocupado}
                    aria-label={t('partida.validateScored', { jugador: name })}
                    onClick={() => setConfirmando({ jugador, accion: 'validar', cuantos: porValidar(jugador) })}
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
                    onClick={() => setConfirmando({ jugador, accion: 'reabrir' })}
                    className="min-h-11 rounded-lg border border-gray-300 px-3 text-sm text-gray-700"
                  >
                    {t('partida.reopenShort')}
                  </button>
                )}
                {seJuega && (
                  <button
                    type="button"
                    disabled={ocupado}
                    aria-label={t('partida.noShow', { jugador: name })}
                    onClick={() => setConfirmando({ jugador, accion: 'noPresentado' })}
                    className="min-h-11 rounded-lg border border-gray-300 px-3 text-sm text-gray-700"
                  >
                    {t('partida.noShowShort')}
                  </button>
                )}
              </div>
            )}

            {confirmaEsta && (
              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
                <span className="min-w-0 flex-1">
                  {confirmaEsta.accion === 'validar'
                    ? t('partida.validateScoredConfirm', { jugador: name, count: confirmaEsta.cuantos })
                    : t(confirmaEsta.accion === 'reabrir' ? 'partida.reopenConfirm' : 'partida.noShowConfirm', { jugador: name })}
                </span>
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => {
                    const cerrar = () => setConfirmando(null);
                    if (confirmaEsta.accion === 'reabrir') {
                      hacer(() => reopenTeeGroupCardUseCase.execute(scoringView.matchId, jugador), 'partida.reopened', cerrar);
                    } else if (confirmaEsta.accion === 'validar') {
                      hacer(
                        () => validateTeeGroupScoredHolesUseCase.execute(scoringView.matchId, jugador),
                        { clave: 'partida.scoredValidated', params: { count: confirmaEsta.cuantos } },
                        cerrar
                      );
                    } else {
                      hacer(() => markTeeGroupNoShowUseCase.execute(scoringView.matchId, jugador), 'partida.markedNoShow', cerrar, avisarSiVieneAlguien);
                    }
                  }}
                  className="min-h-11 rounded-md bg-amber-600 px-3 font-semibold text-white"
                >
                  {t('partida.yes')}
                </button>
                <button type="button" onClick={() => setConfirmando(null)} className="min-h-11 rounded-md px-3">
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
