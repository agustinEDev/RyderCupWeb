import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  getScheduleUseCase,
  getCompetitionGolfCoursesUseCase,
  createRoundUseCase,
  updateRoundUseCase,
  deleteRoundUseCase,
  takeTeeWindowPlaceUseCase,
  releaseTeeWindowPlaceUseCase,
  joinWaitingListUseCase,
  leaveWaitingListUseCase,
} from '../../composition';
import { situacionEnLasFranjas } from '../../domain/services/PlazasEnFranjas';
import { AccionDelJugador, JugadoresDeLaFranja, SinFranja } from './PlazasDeLaFranja';
import customToast from '../../utils/toast';
import { FRANJAS, diasDelTorneo, franjasLibres } from '../../utils/agenda';
import { aCamposDeLaCompeticion } from '../../utils/camposDeLaCompeticion';
import {
  errorDeHoja,
  numeroDeSalidas,
  cupoDeLaHoja,
  hojaPropuesta,
  INTERVALO_MINIMO,
  INTERVALO_MAXIMO,
  TAMANOS_DE_PARTIDA,
} from '../../domain/value_objects/HojaDeSalidas';

/** La hoja del formulario como la pide la API. */
const aTeeSheet = (hoja) => ({
  first_tee_time: hoja.primera,
  last_tee_time: hoja.ultima,
  interval_minutes: hoja.intervalo,
  group_size: hoja.tamano,
});

/**
 * La franja nueva con las horas propuestas de `franja`, si el organizador no
 * las ha tocado; el intervalo y el tamaño que eligió se quedan.
 */
const conHorasDe = (franja, nueva) => {
  if (nueva.tocada) return nueva;
  const { primera, ultima } = hojaPropuesta(franja);
  return { ...nueva, hoja: { ...nueva.hoja, primera, ultima } };
};

/** La hoja guardada de una franja, como la usa el formulario. */
const deTeeSheet = (teeSheet) => ({
  primera: teeSheet.firstTeeTime,
  ultima: teeSheet.lastTeeTime,
  intervalo: teeSheet.intervalMinutes,
  tamano: teeSheet.groupSize,
});

/**
 * Los campos de una hoja de salidas, con su resumen en vivo y su error.
 * Controlado: recibe la hoja y devuelve la nueva.
 */
// Qué campo marcar con cada error de la hoja
const CAMPOS_DEL_ERROR = {
  teeTimeFormat: ['primera', 'ultima'],
  lastBeforeFirst: ['ultima'],
  intervalRange: ['intervalo'],
  groupSize: ['tamano'],
};

const CamposDeLaHoja = ({ hoja, onCambio, resumenId }) => {
  const { t } = useTranslation('schedule');
  const error = errorDeHoja(hoja);
  const errorId = `${resumenId}-error`;
  // El campo que falla se marca y apunta a su error (revisor)
  const marca = (campo) =>
    CAMPOS_DEL_ERROR[error]?.includes(campo) ? { 'aria-invalid': true, 'aria-describedby': errorId } : {};
  const cambia = (cambios) => onCambio({ ...hoja, ...cambios });
  const campo = 'rounded-lg border border-gray-200 px-2 py-1 text-sm';
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-gray-600">
          {t('franjas.firstTee')}
          <input
            type="time"
            aria-label={t('franjas.firstTee')}
            {...marca('primera')}
            value={hoja.primera}
            onChange={(e) => cambia({ primera: e.target.value })}
            className={`mt-0.5 block w-full ${campo}`}
          />
        </label>
        <label className="text-xs text-gray-600">
          {t('franjas.lastTee')}
          <input
            type="time"
            aria-label={t('franjas.lastTee')}
            {...marca('ultima')}
            value={hoja.ultima}
            onChange={(e) => cambia({ ultima: e.target.value })}
            className={`mt-0.5 block w-full ${campo}`}
          />
        </label>
        <label className="text-xs text-gray-600">
          {t('franjas.interval')}
          <input
            type="number"
            aria-label={t('franjas.interval')}
            {...marca('intervalo')}
            min={INTERVALO_MINIMO}
            max={INTERVALO_MAXIMO}
            value={Number.isNaN(hoja.intervalo) ? '' : hoja.intervalo}
            onChange={(e) => cambia({ intervalo: e.target.value === '' ? NaN : Number(e.target.value) })}
            className={`mt-0.5 block w-full ${campo}`}
          />
        </label>
        <label className="text-xs text-gray-600">
          {t('franjas.groupSize')}
          <select
            aria-label={t('franjas.groupSize')}
            {...marca('tamano')}
            value={String(hoja.tamano)}
            onChange={(e) => cambia({ tamano: Number(e.target.value) })}
            className={`mt-0.5 block w-full ${campo}`}
          >
            {TAMANOS_DE_PARTIDA.map((n) => (
              <option key={n} value={String(n)}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-xs text-gray-500">{t('franjas.lastTeeHint')}</p>
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {t(`franjas.errors.${error}`)}
        </p>
      ) : (
        <p data-testid={resumenId} className="text-sm text-gray-700">
          {t('franjas.capacity', {
            count: numeroDeSalidas(hoja),
            tamano: hoja.tamano,
            cupo: cupoDeLaHoja(hoja),
          })}
        </p>
      )}
    </>
  );
};

/**
 * Las franjas de un Stableford o un Medal, en la ficha (FE #824, PR 3).
 *
 * La hermana de `AgendaDeLaCompeticion` para el stroke play: por jornada,
 * cada franja con su hoja de salidas —primera y última salida, intervalo y
 * jugadores por partida—, su cupo y quién hay. El organizador las añade, las
 * cambia en línea y las borra aquí mismo. Hasta tres por jornada (mañana,
 * tarde y noche), con unas horas propuestas que se cambian antes de guardar
 * (Agustín, 10 oct 2026).
 *
 * Las reglas que rompen otras cosas (solaparse en el mismo campo, dejar a
 * alguien sin plaza, partidas que ya no caben) las decide el servidor: su
 * motivo se enseña tal cual y lo escrito se conserva.
 *
 * @param {Object} props
 * @param {string} props.competitionId
 * @param {string} props.startDate - YYYY-MM-DD
 * @param {string} props.endDate - YYYY-MM-DD
 * @param {boolean} props.canManage - Si quien mira la organiza y aún no ha empezado
 * @param {number} props.maxPlayers - El máximo de jugadores, para avisar si no caben
 * @param {string} [props.version] - Cambia cuando cambia la competición: se relee
 * @param {number} [props.versionCampos] - Cambia cuando cambian los campos
 * @param {(agenda: Object|null) => void} [props.onAgenda] - Lo leído, para la ficha
 * @param {string} [props.userId] - Quién mira
 * @param {boolean} [props.estoyInscrito] - Si quien mira es un inscrito aprobado
 * @param {boolean} [props.puedeElegir] - Si el jugador elige ya (inscripciones abiertas)
 * @param {number} [props.maxMatchdaysPerPlayer] - Jornadas por jugador
 * @param {Array<{userId: string, userName: string}>} [props.inscritos] - Aprobados, para los nombres
 * @param {boolean} [props.puedeColocar] - El organizador coloca y mueve (hasta iniciar)
 * @param {boolean} [props.puedeQuitar] - Y quita (solo con las inscripciones abiertas)
 */
const FranjasDeLaCompeticion = ({
  competitionId,
  startDate,
  endDate,
  canManage,
  maxPlayers,
  version,
  versionCampos,
  onAgenda,
  userId,
  estoyInscrito = false,
  puedeElegir = false,
  maxMatchdaysPerPlayer,
  inscritos = [],
  puedeColocar = false,
  puedeQuitar = false,
}) => {
  const { t, i18n } = useTranslation('schedule');
  const [agenda, setAgenda] = useState(null);
  const [campos, setCampos] = useState([]);
  // Si los campos no se pudieron leer: no es lo mismo que no tener ninguno
  const [camposSinCargar, setCamposSinCargar] = useState(false);
  const [sinCargar, setSinCargar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  // Lo que está abierto: una franja nueva, una que se cambia o una que se borra
  const [nueva, setNueva] = useState(null);
  const [editando, setEditando] = useState(null);
  const [borrando, setBorrando] = useState(null);

  // Solo se pinta la última lectura pedida (como en la agenda de la Ryder)
  const ultimaLectura = useRef(0);

  const cargarAgenda = useCallback(async () => {
    const esta = ++ultimaLectura.current;
    try {
      const leida = await (async () => getScheduleUseCase.execute(competitionId))();
      if (esta !== ultimaLectura.current) return;
      setAgenda(leida);
      setSinCargar(false);
    } catch {
      if (esta !== ultimaLectura.current) return;
      setSinCargar(true);
    }
  }, [competitionId]);

  useEffect(() => {
    let vigente = true;
    (async () => getCompetitionGolfCoursesUseCase.execute(competitionId))()
      .then((resultado) => {
        if (!vigente) return;
        setCampos(aCamposDeLaCompeticion(resultado));
        setCamposSinCargar(false);
      })
      .catch(() => vigente && setCamposSinCargar(true));
    return () => {
      vigente = false;
    };
  }, [competitionId, versionCampos]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pedir la agenda al servidor es el objetivo, y se repite cuando cambia la competición (`version`)
    cargarAgenda();
    const lecturas = ultimaLectura;
    return () => {
      lecturas.current += 1;
    };
  }, [cargarAgenda, version]);

  useEffect(() => {
    onAgenda?.(agenda && !sinCargar ? agenda : null);
  }, [agenda, sinCargar, onAgenda]);

  const franjas = useMemo(() => agenda?.rounds || [], [agenda]);
  const dias = useMemo(() => diasDelTorneo(startDate, endDate), [startDate, endDate]);
  const diasConHueco = useMemo(
    () => dias.filter((dia) => franjasLibres(franjas, dia).length > 0),
    [dias, franjas]
  );

  // Si al releer el día o la franja elegidos ya no están libres (otro
  // organizador, o un cambio de la competición), se propone lo siguiente libre
  // en vez de enviar algo que el selector ya no enseña (revisor)
  useEffect(() => {
    if (!nueva) return;
    const dia = diasConHueco.includes(nueva.dia) ? nueva.dia : diasConHueco[0];
    const libres = dia ? franjasLibres(franjas, dia) : [];
    const franja = libres.includes(nueva.franja) ? nueva.franja : libres[0];
    // Y el campo, si el elegido ya no es de la competición (/code-review)
    const campo = campos.some((c) => c.id === nueva.campo) ? nueva.campo : campos[0]?.id;
    if (dia === nueva.dia && franja === nueva.franja && campo === nueva.campo) return;
    if (!dia) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sin hueco ya no hay franja que añadir
      setNueva(null);
      return;
    }
    setNueva((n) => conHorasDe(franja, { ...n, dia, franja, campo }));
  }, [diasConHueco, franjas, nueva, campos]);

  useEffect(() => {
    if (!editando || campos.length === 0 || campos.some((c) => c.id === editando.campo)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- el campo elegido ya no es de la competición
    setEditando((e) => ({ ...e, campo: campos[0].id }));
  }, [campos, editando]);

  const porDia = useMemo(() => {
    const orden = (f) => FRANJAS.indexOf(f.sessionType);
    return [...new Set(franjas.map((f) => f.roundDate))]
      .sort()
      .map((dia) => ({
        dia,
        franjas: franjas.filter((f) => f.roundDate === dia).sort((a, b) => orden(a) - orden(b)),
      }));
  }, [franjas]);

  const nombreDelCampo = (id) => campos.find((c) => c.id === id)?.name || '';

  // --- Plazas y esperas (PR 4) ---

  // Qué puede hacer quien mira en cada franja (la agenda no dice «la mía»)
  const situacion = useMemo(
    () => (estoyInscrito && userId ? situacionEnLasFranjas(franjas, userId, maxMatchdaysPerPlayer) : null),
    [estoyInscrito, userId, franjas, maxMatchdaysPerPlayer]
  );
  const franjasPorId = useMemo(() => Object.fromEntries(franjas.map((f) => [f.id, f])), [franjas]);
  const conSitio = franjas.filter((f) => f.teeSheet && f.teeSheet.placesTaken < f.teeSheet.capacity);
  const nombreDe = (id) => inscritos.find((i) => i.userId === id)?.userName || t('franjas.unknownPlayer');
  const etiqueta = (f) => ({ franja: t(`sessions.${f.sessionType}`), dia: fecha(f.roundDate) });
  const conPlaza = new Set(franjas.flatMap((f) => f.teeSheet?.playerIds ?? []));
  const sinFranja = inscritos.filter((i) => !conPlaza.has(i.userId));
  const casos = {
    coger: takeTeeWindowPlaceUseCase,
    soltar: releaseTeeWindowPlaceUseCase,
    esperar: joinWaitingListUseCase,
    dejarDeEsperar: leaveWaitingListUseCase,
  };
  const variosCampos = campos.length > 1;

  const fecha = (dia) => {
    try {
      return new Date(`${dia}T00:00:00`).toLocaleDateString(i18n.language, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return dia;
    }
  };

  /**
   * Manda un cambio y vuelve a leer. Si sale bien, `alAcabar` cierra lo que
   * estaba abierto; si no, se enseña el motivo y lo escrito se queda.
   */
  const cambiar = async (accion, alAcabar, aviso) => {
    setOcupado(true);
    try {
      await accion();
      alAcabar();
      // Dicho al momento: si luego falla releer, que no quede la duda de si se
      // guardó (CodeRabbit en la #835)
      customToast.success(t(aviso));
    } catch (error) {
      customToast.error(error.message || t('agenda.error'));
    } finally {
      await cargarAgenda();
      setOcupado(false);
    }
  };

  // Una acción de plaza o espera: sin nada abierto que cerrar al acabar
  const hacer = (accion, aviso) => cambiar(accion, () => {}, aviso);

  // --- Añadir ---

  const nuevaPara = (dia, franja, campo) => ({
    dia,
    franja,
    campo,
    hoja: hojaPropuesta(franja),
    // Si el organizador ya tocó las horas, cambiar de franja no se las pisa
    tocada: false,
  });

  const empezarAAnadir = () => {
    const dia = diasConHueco[0];
    setEditando(null);
    setBorrando(null);
    setNueva(nuevaPara(dia, franjasLibres(franjas, dia)[0], campos[0]?.id));
  };

  const elegirDia = (dia) => {
    const franja = franjasLibres(franjas, dia)[0];
    setNueva((n) => conHorasDe(franja, { ...n, dia, franja }));
  };

  const elegirFranja = (franja) => setNueva((n) => conHorasDe(franja, { ...n, franja }));

  // Solo las horas cuentan como «tocadas»: el intervalo o el tamaño elegidos se
  // conservan, y las horas siguen a la franja (revisor)
  const cambiaLaHojaNueva = (hoja) =>
    setNueva((n) => ({
      ...n,
      hoja,
      tocada: n.tocada || hoja.primera !== n.hoja.primera || hoja.ultima !== n.hoja.ultima,
    }));

  const guardarNueva = () =>
    cambiar(
      () =>
        createRoundUseCase.execute(competitionId, {
          golf_course_id: nueva.campo,
          round_date: nueva.dia,
          session_type: nueva.franja,
          tee_sheet: aTeeSheet(nueva.hoja),
        }),
      () => setNueva(null),
      'franjas.saved'
    );

  // --- Cambiar ---

  const empezarACambiar = (f) => {
    setNueva(null);
    setBorrando(null);
    const hoja = deTeeSheet(f.teeSheet);
    setEditando({ id: f.id, campo: f.golfCourseId, campoOriginal: f.golfCourseId, hoja, hojaOriginal: hoja });
  };

  const guardarCambio = () =>
    cambiar(
      () =>
        updateRoundUseCase.execute(editando.id, {
          // Solo lo que cambia: cada cosa dispara sus comprobaciones en el
          // servidor, y cambiar el campo recalcula las partidas (RyderCupAm#534)
          ...(JSON.stringify(editando.hoja) !== JSON.stringify(editando.hojaOriginal)
            ? { tee_sheet: aTeeSheet(editando.hoja) }
            : {}),
          ...(editando.campo !== editando.campoOriginal ? { golf_course_id: editando.campo } : {}),
        }),
      () => setEditando(null),
      'franjas.changed'
    );

  const selectorDeCampo = (valor, onChange) =>
    campos.length > 0 && (
      <label className="block text-xs text-gray-600">
        {t('franjas.course')}
        <select
          aria-label={t('franjas.course')}
          value={valor ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="mt-0.5 block w-full min-w-0 truncate rounded-lg border border-gray-200 px-2 py-1 text-sm"
        >
          {campos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
    );

  const botonesDeGuardar = (hoja, guardar, cancelar, sinCambios = false) => (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={guardar}
        disabled={ocupado || sinCambios || errorDeHoja(hoja) !== null}
        className="rounded-lg bg-primary px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
      >
        {t('franjas.save')}
      </button>
      <button type="button" onClick={cancelar} className="text-sm text-gray-500">
        {t('agenda.cancel')}
      </button>
    </div>
  );

  const cupoTotal = agenda?.teeSheetCapacity ?? null;
  // Booleano: con `maxPlayers` a 0, un `&&` pintaba un «0» suelto (revisor)
  const cupoCorto = franjas.length > 0 && cupoTotal !== null && maxPlayers > 0 && cupoTotal < maxPlayers;
  // Por qué no se puede añadir, si no se puede
  const porQueNoSeAnade = camposSinCargar
    ? 'franjas.coursesNotLoaded'
    : campos.length === 0
      ? 'franjas.noCourses'
      : diasConHueco.length === 0
        ? 'franjas.allFull'
        : null;

  return (
    <section data-testid="franjas" className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-gray-900 font-bold text-lg mb-1 flex items-center gap-2">
        <CalendarDays className="w-5 h-5 text-green-600" />
        {t('franjas.title')}
      </h3>

      {sinCargar && (
        <p className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
          {t('agenda.notLoaded')}
          {/* Sin otra forma de verlas en stroke play, se puede reintentar (/code-review) */}
          <button type="button" onClick={cargarAgenda} className="font-medium text-primary">
            {t('franjas.retry')}
          </button>
        </p>
      )}

      {!sinCargar && agenda && franjas.length === 0 && (
        <p className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {t(canManage ? 'franjas.emptyManage' : 'franjas.empty')}
        </p>
      )}

      {situacion && (
        <p data-testid="franjas-mis-jornadas" className="mb-3 text-sm text-gray-700">
          {t('franjas.myDays', { count: situacion.jornadas.juega, maximo: situacion.jornadas.maximo })}
        </p>
      )}

      {cupoCorto && (
        <p data-testid="franjas-cupo-corto" className="mb-3 text-sm text-amber-800">
          {t('franjas.capacityShort', { count: cupoTotal, maximo: maxPlayers })}
        </p>
      )}

      <div className="space-y-4">
        {porDia.map(({ dia, franjas: delDia }) => (
          <div key={dia} data-testid={`franjas-dia-${dia}`}>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-500">{fecha(dia)}</p>
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
              {delDia.map((f) => {
                const hoja = f.teeSheet;
                return (
                  <li key={f.id} data-testid={`franja-${f.id}`} className="space-y-1 p-3 text-sm">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold text-gray-900">{t(`sessions.${f.sessionType}`)}</span>
                      {variosCampos && nombreDelCampo(f.golfCourseId) && (
                        <span className="min-w-0 truncate text-gray-500">{nombreDelCampo(f.golfCourseId)}</span>
                      )}
                      {canManage && editando?.id !== f.id && (
                        <span className="ml-auto flex gap-1">
                          {/* Sin hoja (una de antes) no hay nada que cambiar */}
                          {hoja && (
                            <button
                              type="button"
                              aria-label={t('franjas.change', { franja: t(`sessions.${f.sessionType}`), dia: fecha(dia) })}
                              disabled={ocupado}
                              onClick={() => empezarACambiar(f)}
                              className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            aria-label={t('franjas.remove', { franja: t(`sessions.${f.sessionType}`), dia: fecha(dia) })}
                            disabled={ocupado}
                            onClick={() => {
                              // Una cosa abierta a la vez (/code-review)
                              setNueva(null);
                              setEditando(null);
                              setBorrando(f.id);
                            }}
                            className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </span>
                      )}
                    </div>
                    {hoja && (
                      <>
                        <p className="text-gray-700">
                          {t('franjas.hours', {
                            primera: hoja.firstTeeTime,
                            ultima: hoja.lastTeeTime,
                            intervalo: hoja.intervalMinutes,
                          })}
                        </p>
                        <p className="text-gray-700">
                          {t('franjas.capacity', {
                            // Las del servidor; las cuentas propias, si no las manda
                            count: hoja.teeTimes.length || numeroDeSalidas(deTeeSheet(hoja)),
                            tamano: hoja.groupSize,
                            cupo: hoja.capacity ?? cupoDeLaHoja(deTeeSheet(hoja)),
                          })}
                        </p>
                        <p className="text-gray-500">
                          {t('franjas.taken', { count: hoja.placesTaken, espera: hoja.waitingIds.length })}
                        </p>
                        {situacion && (
                          <AccionDelJugador
                            franja={f}
                            accion={situacion.porFranja[f.id]}
                            puedeElegir={puedeElegir}
                            userId={userId}
                            etiqueta={etiqueta}
                            franjasPorId={franjasPorId}
                            ocupado={ocupado}
                            hacer={hacer}
                            casos={casos}
                          />
                        )}
                        {/* Los nombres, para los inscritos y el organizador */}
                        {(estoyInscrito || canManage) && (
                          <JugadoresDeLaFranja
                            franja={f}
                            nombreDe={nombreDe}
                            conSitio={conSitio}
                            etiqueta={etiqueta}
                            puedeColocar={puedeColocar}
                            puedeQuitar={puedeQuitar}
                            ocupado={ocupado}
                            hacer={hacer}
                            casos={casos}
                          />
                        )}
                      </>
                    )}

                    {editando?.id === f.id && (
                      <div className="mt-2 space-y-2 rounded-lg bg-gray-50 p-3">
                        {variosCampos && selectorDeCampo(editando.campo, (campo) => setEditando((e) => ({ ...e, campo })))}
                        <CamposDeLaHoja
                          hoja={editando.hoja}
                          onCambio={(h) => setEditando((e) => ({ ...e, hoja: h }))}
                          resumenId={`franjas-resumen-${f.id}`}
                        />
                        {botonesDeGuardar(
                          editando.hoja,
                          guardarCambio,
                          () => setEditando(null),
                          // Sin cambios no hay nada que mandar (/code-review)
                          JSON.stringify(editando.hoja) === JSON.stringify(editando.hojaOriginal) &&
                            editando.campo === editando.campoOriginal
                        )}
                      </div>
                    )}

                    {borrando === f.id && (
                      <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
                        <span className="min-w-0 flex-1">{t('franjas.confirmRemove')}</span>
                        <button
                          type="button"
                          // Un doble toque mandaba dos DELETE (revisor)
                          disabled={ocupado}
                          onClick={() => cambiar(() => deleteRoundUseCase.execute(f.id), () => setBorrando(null), 'franjas.removed')}
                          className="rounded-md bg-amber-600 px-2 py-1 font-semibold text-white"
                        >
                          {t('franjas.yes')}
                        </button>
                        <button type="button" onClick={() => setBorrando(null)} className="rounded-md px-2 py-1">
                          {t('agenda.no')}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {puedeColocar && !sinCargar && agenda && (
        <SinFranja jugadores={sinFranja} conSitio={conSitio} etiqueta={etiqueta} ocupado={ocupado} hacer={hacer} casos={casos} />
      )}

      {canManage && !sinCargar && agenda && (
        <div className="mt-4">
          {!nueva ? (
            <button
              type="button"
              onClick={empezarAAnadir}
              disabled={ocupado || campos.length === 0 || diasConHueco.length === 0}
              className="flex items-center gap-1 text-sm font-medium text-primary disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {t('franjas.add')}
            </button>
          ) : null}
          {!nueva && porQueNoSeAnade && <p className="mt-1 text-xs text-gray-500">{t(porQueNoSeAnade)}</p>}
          {nueva && (
            <div className="space-y-2 rounded-lg border border-gray-200 p-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-gray-600">
                  {t('franjas.day')}
                  <select
                    aria-label={t('franjas.day')}
                    value={nueva.dia}
                    onChange={(e) => elegirDia(e.target.value)}
                    className="mt-0.5 block w-full rounded-lg border border-gray-200 px-2 py-1 text-sm"
                  >
                    {diasConHueco.map((dia) => (
                      <option key={dia} value={dia}>
                        {fecha(dia)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-gray-600">
                  {t('franjas.slot')}
                  <select
                    aria-label={t('franjas.slot')}
                    value={nueva.franja}
                    onChange={(e) => elegirFranja(e.target.value)}
                    className="mt-0.5 block w-full rounded-lg border border-gray-200 px-2 py-1 text-sm"
                  >
                    {franjasLibres(franjas, nueva.dia).map((franja) => (
                      <option key={franja} value={franja}>
                        {t(`sessions.${franja}`)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {selectorDeCampo(nueva.campo, (campo) => setNueva((n) => ({ ...n, campo })))}
              <CamposDeLaHoja
                hoja={nueva.hoja}
                onCambio={cambiaLaHojaNueva}
                resumenId="franjas-resumen-nueva"
              />
              {botonesDeGuardar(nueva.hoja, guardarNueva, () => setNueva(null))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default FranjasDeLaCompeticion;
