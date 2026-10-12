import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ArrowDown, ArrowRightLeft, ArrowUp, ChevronDown, ChevronUp, Users } from 'lucide-react';
import {
  getTeeGroupsUseCase,
  generateTeeGroupsUseCase,
  moveTeeGroupPlayerUseCase,
  reorderTeeGroupsUseCase,
  setTeeGroupMarkersUseCase,
  deleteTeeGroupsUseCase,
  closeTeeWindowUseCase,
} from '../../composition';
import customToast from '../../utils/toast';
import { formatoUnDecimal } from '../../utils/ajustesDeStrokePlay';
import { destinosDelJugador, esNoPresentado, juegan, errorDeMarcadores, partidasQueSeAdelantan } from '../../domain/services/PartidasDeLaFranja';
import { useLaMasNueva } from '../../hooks/useLaMasNueva';

/**
 * Las partidas de una franja de stroke play, en la ficha (FE #824, PR 6;
 * RyderCupAm#534). Decidido con Agustín el 11 oct 2026:
 *
 *   - Un desplegable «Partidas» en cada franja: se piden al abrirlo.
 *   - Todos los inscritos las ven; la de quien mira, destacada.
 *   - El organizador, hasta la primera salida: generar (eligiendo el orden,
 *     «altos primero» propuesto), volver a generar o borrar con confirmación,
 *     «Mover a…» con lista, ↑ ↓ para el orden y «Marcadores» por partida.
 *   - Si al mover se vacía una y suben las de detrás, un aviso de cuánto se
 *     adelantan.
 *
 * Toda escritura contesta con la vista de la franja, que se pinta tal cual.
 *
 * @param {Object} props
 * @param {Object} props.franja - La franja (Round) con su `teeSheet`
 * @param {string} [props.nombre] - «Mañana · sáb 12 oct»: cada desplegable dice de qué franja es
 * @param {() => void} [props.onCambio] - Tras un cambio que sale bien (para releer «Tu partida»)
 * @param {string} props.competitionId - Para volver a la ficha desde la tarjeta (PR 7)
 * @param {number} props.salidas - Cuántas salidas tiene la hoja
 * @param {string} [props.userId] - Quién mira
 * @param {boolean} props.organiza - Si quien mira la organiza
 * @param {number} props.version - Sube cuando cambian las plazas: se relee
 */

const NUEVA = 'NUEVA';
// Los que nombran a los jugadores que faltan
const CON_NOMBRES = ['PLAYERS_WITHOUT_TEE', 'PLAYERS_WITHOUT_HANDICAP'];
const CON_TEXTO = [
  'GROUPS_WINDOW_CLOSED',
  'GROUP_ALREADY_STARTED',
  'COURSE_WITHOUT_TIMEZONE',
  'NOT_ENOUGH_PLAYERS',
  'NOT_A_TEE_WINDOW',
  'INVALID_MARKERS',
  'GROUP_FULL',
  'ORIGIN_WOULD_BE_ALONE',
  'NO_FREE_TEE_TIME',
  'SWAP_NEEDS_GROUP',
  'SWAP_PLAYER_NOT_IN_GROUP',
  'ALREADY_IN_GROUP',
  'GROUP_NOT_IN_WINDOW',
  'PLAYER_NOT_IN_WINDOW',
  'INVALID_GROUP_ORDER',
  // Al cerrar la franja (PR 7)
  'SCORING_NOT_OPEN_YET',
  'GROUP_NOT_SCORING',
];

// 44 px de alto: se tocan con el dedo
const boton = 'min-h-11 rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-50';
const principal = `${boton} border-primary bg-primary text-white`;
const secundario = `${boton} border-gray-300 bg-white text-gray-700 hover:bg-gray-50`;
const icono = 'flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-50';
const selector = 'min-h-11 max-w-full rounded-lg border border-gray-200 px-2 py-1 text-xs';

// El orden con el que se generaron por última vez las de una franja: al volver
// se proponía siempre «altos primero» (QA del 11 oct 2026). Es una comodidad de
// quien organiza, en su navegador; sin almacenamiento, el de siempre
const ORDENES = ['HIGH_FIRST', 'LOW_FIRST'];
const claveDelOrden = (roundId) => `rydercup-orden-de-salida-${roundId}`;
const ordenRecordado = (roundId) => {
  try {
    const guardado = globalThis.localStorage.getItem(claveDelOrden(roundId));
    return ORDENES.includes(guardado) ? guardado : 'HIGH_FIRST';
  } catch {
    return 'HIGH_FIRST';
  }
};
const recordarOrden = (roundId, orden) => {
  try {
    globalThis.localStorage.setItem(claveDelOrden(roundId), orden);
  } catch {
    // Sin almacenamiento no se recuerda: nada más
  }
};

const PartidasEnLaFranja = ({ competitionId, franja, nombre, salidas, userId, organiza, version, onCambio }) => {
  const { t, i18n } = useTranslation('schedule');
  const [abierta, setAbierta] = useState(false);
  const [vista, setVista] = useState(null);
  const [sinCargar, setSinCargar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [orden, setOrden] = useState(() => ordenRecordado(franja.id));
  // Lo abierto: la confirmación de volver a generar o borrar, y los marcadores
  const [confirmando, setConfirmando] = useState(null);
  const [marcando, setMarcando] = useState(null);
  // A quién se está moviendo: su lista solo se abre al pulsar su icono (pasada:
  // a todo lo ancho, una línea por jugador)
  const [moviendo, setMoviendo] = useState(null);
  // Al cerrar su lista (cancelando o tras mover), el foco vuelve al icono de
  // ese jugador, en cuanto se pueda pulsar; si ya no está, se olvida (revisor,
  // /code-review)
  const [volverAlIcono, setVolver] = useState(null);
  const setVolverAlIcono = (userId) => setVolver((antes) => ({ userId, vez: (antes?.vez ?? 0) + 1 }));
  const atendida = useRef(0);
  const iconos = useRef(new Map());
  // Tras cada pintado: con su icono ya pulsable, el foco va a él
  useEffect(() => {
    if (!volverAlIcono || ocupado || atendida.current === volverAlIcono.vez) return;
    atendida.current = volverAlIcono.vez;
    iconos.current.get(volverAlIcono.userId)?.focus();
  }, [volverAlIcono, ocupado]);
  // Lecturas y escrituras se cruzan: una vieja no pisa a otra más nueva
  const lecturas = useLaMasNueva();

  const leer = useCallback(async () => {
    const turno = lecturas.turno();
    try {
      const leida = await getTeeGroupsUseCase.execute(franja.id);
      if (!lecturas.aplicar(turno)) return;
      setVista(leida);
      setSinCargar(false);
    } catch {
      if (lecturas.aplicar(turno)) setSinCargar(true);
    }
  }, [franja.id, lecturas]);

  // Se piden al desplegar, y otra vez si cambian las plazas de la franja
  useEffect(() => {
    if (!abierta) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pedir las partidas al servidor es el objetivo
    leer();
  }, [abierta, version, leer]);

  const tamano = franja.teeSheet?.groupSize ?? 4;
  const grupos = useMemo(() => vista?.groups ?? [], [vista]);
  const nombres = useMemo(
    () => new Map(grupos.flatMap((g) => g.players.map((p) => [p.userId, p.name]))),
    [grupos]
  );
  const editable = organiza && !sinCargar && vista?.editable === true;

  const mensaje = (error) => {
    const codigo = error?.errorCode;
    if (CON_NOMBRES.includes(codigo)) {
      const nombres = (error.data?.players || []).map((p) => p.name).filter(Boolean);
      // Sin nombres, uno propio sin el hueco: el del servidor no está traducido
      return nombres.length > 0
        ? t(`partidas.errors.${codigo}`, { count: error.data.players.length, jugadores: nombres.join(', ') })
        : t(`partidas.errors.${codigo}_unnamed`);
    }
    if (CON_TEXTO.includes(codigo)) return t(`partidas.errors.${codigo}`);
    return error?.message || t('partidas.error');
  };

  /**
   * Manda un cambio y pinta la vista que contesta. Si falla, el motivo y se
   * relee: lo pintado estaba viejo (otro organizador, o ya salió la primera).
   * Lo de «salen antes» es solo al mover: cambiar el orden adelanta una a
   * propósito (revisor).
   */
  const cambiar = async (accion, aviso, alAcabar, { avisarSiSeAdelantan = false, cierra = false } = {}) => {
    // Un doble toque no manda dos: React pinta los botones desactivados antes
    // del segundo
    setOcupado(true);
    const antes = grupos;
    const turno = lecturas.turno();
    try {
      const nueva = await accion();
      const aplicada = nueva && lecturas.aplicar(turno);
      if (aplicada) {
        setVista(nueva);
        setSinCargar(false);
      }
      alAcabar?.();
      customToast.success(t(aviso));
      // La clasificación solo cambia al cerrar la franja: lo demás no la relee
      onCambio?.({ cerrada: cierra });
      const adelantadas = aplicada && avisarSiSeAdelantan ? partidasQueSeAdelantan(antes, nueva.groups) : null;
      if (adelantadas) {
        customToast.info(t('partidas.earlier', { ...adelantadas, count: adelantadas.hasta - adelantadas.desde + 1 }));
      }
      // Borrar no contesta con la vista; y si mientras tanto se aplicó una
      // lectura que salió antes de acabar, lo pintado puede ser de antes del
      // cambio (revisor)
      if (!aplicada) await leer();
    } catch (error) {
      customToast.error(mensaje(error));
      // Lo abierto se cierra: se relee, y lo que confirmaba, editaba o movía ya no vale
      setConfirmando(null);
      setMarcando(null);
      if (moviendo) setVolverAlIcono(moviendo);
      setMoviendo(null);
      await leer();
    } finally {
      setOcupado(false);
    }
  };

  const generar = () =>
    cambiar(() => generateTeeGroupsUseCase.execute(franja.id, orden), 'partidas.generated', () => {
      setConfirmando(null);
      recordarOrden(franja.id, orden);
    });
  // Cerrar la franja (PR 7): lo sin acabar se da por terminado
  const cerrarLaFranja = () =>
    cambiar(() => closeTeeWindowUseCase.execute(franja.id), 'partidas.windowClosed', () => setConfirmando(null), {
      cierra: true,
    });
  const borrar = () =>
    cambiar(() => deleteTeeGroupsUseCase.execute(franja.id), 'partidas.removed', () => setConfirmando(null));
  const mover = (jugador, destino) => {
    if (!destino) return;
    const [groupId, swapWithUserId] = destino === NUEVA ? [] : destino.split('|');
    cambiar(
      // Lo que no viene lo quita el caso de uso
      () => moveTeeGroupPlayerUseCase.execute(franja.id, { userId: jugador, groupId, swapWithUserId }),
      'partidas.moved',
      () => {
        setVolverAlIcono(jugador);
        setMoviendo(null);
      },
      { avisarSiSeAdelantan: true }
    );
  };
  const reordenar = (de, a) => {
    const ids = grupos.map((g) => g.id);
    [ids[de], ids[a]] = [ids[a], ids[de]];
    cambiar(() => reorderTeeGroupsUseCase.execute(franja.id, ids), 'partidas.reordered');
  };
  const guardarMarcadores = (partida) =>
    cambiar(
      () =>
        setTeeGroupMarkersUseCase.execute(
          partida.id,
          juegan(partida).map((p) => ({ userId: p.userId, marksUserId: marcando.valores[p.userId] }))
        ),
      'partidas.markersSaved',
      () => setMarcando(null)
    );

  const abrirMarcadores = (partida) => {
    const enJuego = new Set(juegan(partida).map((p) => p.userId));
    setMarcando({
      groupId: partida.id,
      // A un no presentado no se le marca: como si faltara (revisor)
      valores: Object.fromEntries(
        juegan(partida).map((p) => [p.userId, enJuego.has(p.marksUserId) ? p.marksUserId : ''])
      ),
    });
  };

  const opcionesDeDestino = (jugador, { conIntercambios }) => {
    const d = destinosDelJugador(vista, jugador, { tamano, salidas });
    return [
      ...d.conSitio.map((g) => ({ valor: g.id, texto: t('partidas.toGroup', { numero: g.number, hora: g.teeTime }) })),
      ...(conIntercambios
        ? d.intercambios.map(({ partida: g, con }) => ({
            valor: `${g.id}|${con.userId}`,
            texto: t('partidas.swapWith', { jugador: con.name, numero: g.number }),
          }))
        : []),
      ...(d.nueva ? [{ valor: NUEVA, texto: t('partidas.newGroup') }] : []),
    ];
  };

  const selectorDeDestino = (jugador, nombre, { etiqueta, placeholder, conIntercambios, enfocar = false }) => {
    const opciones = opcionesDeDestino(jugador, { conIntercambios });
    if (opciones.length === 0) return null;
    return (
      <select
        aria-label={t(etiqueta, { jugador: nombre })}
        value=""
        disabled={ocupado}
        // Se abre desde su icono: el foco va a ella, no se queda en <body> (revisor)
        autoFocus={enfocar}
        onChange={(e) => mover(jugador, e.target.value)}
        // Encoge junto a su «Cancelar»: con todo su ancho, el botón se salía de
        // la tarjeta a 360 px (QA del 11 oct 2026)
        className={`${selector} min-w-0 flex-1`}
      >
        <option value="">{t(placeholder)}</option>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    );
  };

  const editorDeMarcadores = (partida) => {
    // Solo los que juegan: el no presentado ni marca ni es marcado (QA 2)
    const enJuego = juegan(partida);
    const ids = enJuego.map((p) => p.userId);
    const error = errorDeMarcadores(ids, marcando.valores);
    return (
      <div className="mt-2 space-y-2 rounded-lg bg-gray-50 p-2">
        {enJuego.map((p) => (
          <label key={p.userId} className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-gray-700">
            {/* El nombre entero en su línea: cortado a «Pa…» no se sabía quién
                marca a quién (QA del 11 oct 2026) */}
            <span className="w-full break-words">{p.name}</span>
            <select
              aria-label={t('partidas.whoMarks', { jugador: p.name })}
              value={marcando.valores[p.userId] ?? ''}
              onChange={(e) =>
                setMarcando((m) => ({ ...m, valores: { ...m.valores, [p.userId]: e.target.value } }))
              }
              className={selector}
            >
              <option value="">{t('partidas.whoMarksPlaceholder')}</option>
              {enJuego
                .filter((otro) => otro.userId !== p.userId)
                .map((otro) => (
                  <option key={otro.userId} value={otro.userId}>
                    {otro.name}
                  </option>
                ))}
            </select>
          </label>
        ))}
        {error && (
          <p role="alert" className="text-xs text-red-600">
            {t(`partidas.markersErrors.${error}`)}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={ocupado || !!error} onClick={() => guardarMarcadores(partida)} className={principal}>
            {t('partidas.markersSave')}
          </button>
          <button type="button" onClick={() => setMarcando(null)} className={secundario}>
            {t('partidas.cancel')}
          </button>
        </div>
      </div>
    );
  };

  const confirmacion = (texto, si, accion) => (
    <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
      {/* El texto en su línea y los botones debajo: a su lado, a 360 px quedaba
          en una columna de una palabra (QA del 11 oct 2026) */}
      <span className="w-full">{texto}</span>
      <button type="button" disabled={ocupado} onClick={accion} className="min-h-11 rounded-md bg-amber-600 px-3 font-semibold text-white">
        {t(si)}
      </button>
      <button type="button" onClick={() => setConfirmando(null)} className="min-h-11 rounded-md px-3">
        {t('partidas.no')}
      </button>
    </div>
  );

  const generacion = () => (
    <div className="space-y-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <select
          aria-label={t('partidas.order')}
          value={orden}
          disabled={ocupado}
          onChange={(e) => setOrden(e.target.value)}
          className={selector}
        >
          <option value="HIGH_FIRST">{t('partidas.orderHighFirst')}</option>
          <option value="LOW_FIRST">{t('partidas.orderLowFirst')}</option>
        </select>
        {grupos.length === 0 ? (
          <button type="button" disabled={ocupado} onClick={generar} className={principal}>
            {t('partidas.generate')}
          </button>
        ) : (
          <>
            <button type="button" disabled={ocupado} onClick={() => setConfirmando('regenerar')} className={secundario}>
              {t('partidas.regenerate')}
            </button>
            <button type="button" disabled={ocupado} onClick={() => setConfirmando('borrar')} className={secundario}>
              {t('partidas.remove')}
            </button>
          </>
        )}
      </div>
      {confirmando === 'regenerar' &&
        confirmacion(t('partidas.regenerateConfirm', { count: grupos.length }), 'partidas.regenerateYes', generar)}
      {confirmando === 'borrar' &&
        confirmacion(t('partidas.removeConfirm', { count: grupos.length }), 'partidas.removeYes', borrar)}
    </div>
  );

  return (
    <div className="pt-1">
      <button
        type="button"
        aria-expanded={abierta}
        aria-label={t('partidas.showFor', { franja: nombre })}
        onClick={() => setAbierta((a) => !a)}
        className="flex min-h-11 items-center gap-1 text-sm font-medium text-primary"
      >
        {abierta ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {t('partidas.show')}
      </button>

      {abierta && sinCargar && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-amber-800">
          <span>{t('partidas.notLoaded')}</span>
          <button type="button" onClick={leer} className={secundario}>
            {t('partidas.retry')}
          </button>
        </div>
      )}

      {abierta && vista && !sinCargar && (
        <div className="mt-1 space-y-2">
          {grupos.length === 0 && <p className="text-xs text-gray-500">{t('partidas.empty')}</p>}

          <ol className="space-y-2">
            {grupos.map((g, i) => {
              const mia = g.players.some((p) => p.userId === userId);
              return (
                <li
                  key={g.id}
                  data-testid={`partida-${g.id}`}
                  data-mia={String(mia)}
                  className={`rounded-lg border p-2 ${mia ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2">
                    <span className="font-semibold text-gray-900">
                      {t('partidas.number', { numero: g.number, hora: g.teeTime })}
                    </span>
                    {g.incomplete && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                        {t('partidas.incomplete')}
                      </span>
                    )}
                    {editable && (
                      <span className="ml-auto flex">
                        {i > 0 && (
                          <button type="button" disabled={ocupado} aria-label={t('partidas.up', { numero: g.number })} onClick={() => reordenar(i, i - 1)} className={icono}>
                            <ArrowUp className="h-4 w-4" />
                          </button>
                        )}
                        {i < grupos.length - 1 && (
                          <button type="button" disabled={ocupado} aria-label={t('partidas.down', { numero: g.number })} onClick={() => reordenar(i, i + 1)} className={icono}>
                            <ArrowDown className="h-4 w-4" />
                          </button>
                        )}
                        {!g.incomplete && (
                          <button type="button" disabled={ocupado} aria-label={t('partidas.markers', { numero: g.number })} onClick={() => abrirMarcadores(g)} className={icono}>
                            <Users className="h-4 w-4" />
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                  <ul className="mt-1 space-y-1">
                    {g.players.map((p) => (
                      <li
                        key={p.userId}
                        data-testid={`partida-jugador-${p.userId}`}
                        className="flex min-w-0 flex-wrap items-center gap-x-2 text-xs text-gray-700"
                      >
                        {/* Sus datos a la izquierda y el icono de mover en su
                            columna: en la línea de «marca a X» parecía cambiar
                            el marcador (QA del 11 oct 2026) */}
                        <div data-testid={`datos-${p.userId}`} className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2">
                          <span className="font-medium break-words text-gray-900">{p.name}</span>
                          <span>{formatoUnDecimal(p.handicap, i18n.language)}</span>
                          <span>{t('partidas.playing', { juego: p.playingHandicap })}</span>
                          {/* Sigue en su partida, pero no juega (2.ª pasada del QA) */}
                          {esNoPresentado(p) && (
                            <span className="font-semibold text-red-700">{t('partidas.noShow')}</span>
                          )}
                          {p.marksUserId && !esNoPresentado(p) && (
                            <span className="text-gray-500">
                              {t('partidas.marks', { jugador: nombres.get(p.marksUserId) || t('partidas.unknownPlayer') })}
                            </span>
                          )}
                        </div>
                        {editable && moviendo !== p.userId && opcionesDeDestino(p.userId, { conIntercambios: true }).length > 0 && (
                          <button
                            type="button"
                            disabled={ocupado}
                            aria-label={t('partidas.movePlayer', { jugador: p.name })}
                            ref={(boton) => {
                              if (boton) iconos.current.set(p.userId, boton);
                              else iconos.current.delete(p.userId);
                            }}
                            onClick={() => setMoviendo(p.userId)}
                            className={`${icono} shrink-0`}
                          >
                            <ArrowRightLeft className="h-4 w-4" />
                          </button>
                        )}
                        {editable && moviendo === p.userId && (
                          <span className="flex w-full items-center gap-1">
                            {selectorDeDestino(p.userId, p.name, {
                              etiqueta: 'partidas.moveTo',
                              placeholder: 'partidas.moveToPlaceholder',
                              conIntercambios: true,
                              enfocar: true,
                            })}
                            <button
                              type="button"
                              disabled={ocupado}
                              onClick={() => {
                                setVolverAlIcono(p.userId);
                                setMoviendo(null);
                              }}
                              className="min-h-11 shrink-0 px-2 text-xs text-gray-600"
                            >
                              {t('partidas.cancel')}
                            </button>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {editable && marcando?.groupId === g.id && editorDeMarcadores(g)}
                  {/* A su tarjeta (PR 7): anotar la mía, ver las demás */}
                  <Link
                    to={`/player/groups/${g.id}/scoring?competition=${competitionId}`}
                    className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline"
                  >
                    {t(mia ? 'partidas.score' : 'partidas.viewCard')}
                  </Link>
                </li>
              );
            })}
          </ol>

          {organiza && vista.unassignedPlayers.length > 0 && (
            <div data-testid="partidas-sin-partida" className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs">
              <p className="font-semibold text-amber-900">
                {t('partidas.unassigned', { count: vista.unassignedPlayers.length })}
              </p>
              <ul className="mt-1 space-y-1">
                {vista.unassignedPlayers.map((p) => (
                  <li key={p.userId} className="flex min-w-0 flex-wrap items-center gap-2 text-gray-800">
                    <span className="w-full break-words">{p.name}</span>
                    {editable &&
                      selectorDeDestino(p.userId, p.name, {
                        etiqueta: 'partidas.placeIn',
                        placeholder: 'partidas.placeInPlaceholder',
                        conIntercambios: false,
                      })}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {editable && generacion()}
          {/* Ya salió la primera y queda alguna sin acabar: el organizador la
              cierra como red, con lo que haya (PR 7, P3). Antes de abrirse la
              anotación lo rechaza el servidor, y se dice por qué */}
          {organiza && !vista.editable && grupos.some((g) => g.status !== 'COMPLETED') &&
            (confirmando === 'cerrar' ? (
              confirmacion(t('partidas.closeWindowConfirm'), 'partidas.closeWindowYes', cerrarLaFranja)
            ) : (
              <button type="button" disabled={ocupado} onClick={() => setConfirmando('cerrar')} className={secundario}>
                {t('partidas.closeWindow')}
              </button>
            ))}
          {organiza && !vista.editable && <p className="text-xs text-gray-500">{t('partidas.notEditable')}</p>}
        </div>
      )}
    </div>
  );
};

export default PartidasEnLaFranja;
