import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LocateFixed, X } from 'lucide-react';
import {
  deleteHoleSampleUseCase,
  discardHoleReportUseCase,
  getHoleReviewUseCase,
  reopenHoleUseCase,
  saveHoleLineUseCase,
} from '../../../composition';
import {
  conCodosDelPar,
  estaLejosDelCampo,
  lineaDeOsm,
  lineaDePuntos,
  longitudDeLaLinea,
  puntosDeLaLinea,
  salidaGreenFueraDeLimites,
} from '../../../domain/services/hoyoMarcado';
import { tarjetaDelHoyo } from '../../../domain/services/tarjetaDelHoyo';
import { usePosicionGps } from '../../../hooks/usePosicionGps';
import customToast from '../../../utils/toast';
import ModalShell from '../../ui/ModalShell';
import BlockLoader from '../../ui/BlockLoader';

// Aparte: MapLibre pesa, y el panel de admin no lo necesita hasta aquí
const MapaDeRevision = lazy(() => import('./MapaDeRevision'));

// La línea de OSM del hoyo (con los codos de su par), si trae green
const lineaDeOsmDe = (hoyo) => {
  const puntos = lineaDeOsm(hoyo?.osm?.puntos, hoyo?.osm?.green, tarjetaDelHoyo(hoyo?.barras)?.parDeLaMasLarga);
  return puntos ? lineaDePuntos(puntos) : null;
};

const lineaDe = (muestra) => (muestra?.tee ? { tee: muestra.tee, bends: muestra.bends, greenCenter: muestra.greenCenter } : null);

const BOTON = 'min-h-11 rounded-lg px-3 text-sm font-semibold disabled:opacity-50';
// Sin nada tocado, siempre la misma lista: el mapa no repinta por nada
const SIN_MARCAR = [];
// Lo que se dice junto a «Mi posición» según el GPS
const AVISO_DEL_GPS = {
  buscando: 'holeReviews.findingPosition',
  denegado: 'holeReviews.positionDenied',
  'no-disponible': 'holeReviews.positionUnavailable',
};

/**
 * Revisar un hoyo (BE #575, 17 oct 2026: una referencia por hoyo). Sobre la
 * ortofoto, todas sus muestras (cada una con el color de su barra) y la línea
 * guardada; el admin parte de una muestra (o de lo guardado), la ajusta
 * arrastrando la salida, los codos y el green, y la guarda. También puede
 * reabrir el hoyo y borrar una muestra mala. Al guardar se cierra sola (el hoyo
 * deja de estar pendiente); al cerrar, dice si cambió algo.
 */
const RevisarHoyo = ({ golfCourseId, nombre, numeroDeHoyo, onCerrar }) => {
  const { t, i18n } = useTranslation(['admin', 'golfCourses']);
  const [hoyo, setHoyo] = useState(null);
  const [ubicacion, setUbicacion] = useState(null);
  const [linea, setLinea] = useState(null);
  const [fallo, setFallo] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [cambiado, setCambiado] = useState(false);
  const [porBorrar, setPorBorrar] = useState(null);
  const [porDescartar, setPorDescartar] = useState(null);
  // Si la línea se movió o se cambió y no se ha guardado (para no perderla al cerrar)
  const [editada, setEditada] = useState(false);
  const [avisoAlCerrar, setAvisoAlCerrar] = useState(false);
  // «Mi posición» (E14): el GPS solo se pide al tocarlo, y cada toque recentra
  const [centrarEnMi, setCentrarEnMi] = useState(0);
  // Para centrar el mapa vale cualquier posición: un ordenador va por Wi-Fi
  const gps = usePosicionGps({ activo: centrarEnMi > 0, precisionMaxima: Infinity });
  // Marcar desde cero (17 oct): null, o el paso y la salida ya tocada
  const [marcando, setMarcando] = useState(null);
  // Al empezar a marcar, el foco va a Cancelar (el botón que lo empezó se
  // desactiva); al acabar, vuelve a ese botón
  const botonDeCancelar = useRef(null);
  const botonDeMarcar = useRef(null);
  const haMarcado = useRef(false);
  const estaMarcando = Boolean(marcando);
  useEffect(() => {
    if (estaMarcando) botonDeCancelar.current?.focus();
    else if (haMarcado.current) botonDeMarcar.current?.focus();
    haMarcado.current = estaMarcando;
  }, [estaMarcando]);

  // `conservarLinea`: tras borrar una muestra, la que se edita no se toca
  const cargar = useCallback(
    async ({ conservarLinea = false } = {}) => {
      try {
        const campo = await getHoleReviewUseCase.execute(golfCourseId);
        const este = campo.holes.find((h) => h.holeNumber === numeroDeHoyo) ?? { holeNumber: numeroDeHoyo, guardada: null, muestras: [], barras: [], reportes: [] };
        setHoyo(este);
        setUbicacion(campo.ubicacion ?? null);
        // Se parte de la guardada, de la de OSM (con los codos de su par) o de la
        // primera muestra completa
        const deLoQueHay = este.guardada ?? lineaDeOsmDe(este) ?? lineaDe(este.muestras.find((m) => m.tee)) ?? null;
        setLinea((actual) => (conservarLinea && actual ? actual : deLoQueHay));
        if (!conservarLinea) setEditada(false);
        setFallo(false);
      } catch {
        setFallo(true);
      }
    },
    [golfCourseId, numeroDeHoyo],
  );

  useEffect(() => {
    const alAbrir = async () => cargar();
    alAbrir();
  }, [cargar]);

  // `cerrar`: al acabar bien, la revisión se cierra en vez de recargarse (guardar)
  const hacer = async (accion, ok, { conservarLinea = false, cerrar: cerrarAlAcabar = null } = {}) => {
    setOcupado(true);
    try {
      await accion();
      if (cerrarAlAcabar) {
        customToast.success(ok);
        // El `finally` la desbloquea igual, por si quien la abrió no la desmonta:
        // de un modal se sale siempre
        cerrarAlAcabar();
        return;
      }
      setCambiado(true);
      // Quitada la línea (reabrir), ya no hay cambios que perder, aunque la
      // recarga de después falle (CodeRabbit, 17 oct). Borrar una muestra la
      // conserva
      if (!conservarLinea) setEditada(false);
      if (ok) customToast.success(t(ok));
      await cargar({ conservarLinea });
    } catch (error) {
      customToast.error(t(error?.errorCode === 'INVALID_HOLE_LINE' ? 'holeReviews.invalidLine' : 'holeReviews.actionError'));
    } finally {
      setOcupado(false);
      setPorBorrar(null);
      setPorDescartar(null);
    }
  };

  // Guardado el hoyo, deja de estar pendiente: la revisión se cierra sola y la
  // lista lo quita (Agustín, 17 oct)
  const guardar = () =>
    hacer(() => saveHoleLineUseCase.execute(golfCourseId, numeroDeHoyo, linea), t('holeReviews.savedOk', { numero: numeroDeHoyo }), {
      cerrar: () => onCerrar({ cambiado: true, guardado: true }),
    });

  const barraDeTexto = (barra) =>
    [t(`golfCourses:form.teeColors.${barra.color}`), barra.gender ? t(`holeReviews.genders.${barra.gender}`) : null].filter(Boolean).join(' · ');
  const cerrar = () => {
    // Con cambios sin guardar, primero se avisa (de un modal se sale siempre,
    // pero no perdiendo lo hecho por un descuido)
    if (editada && !avisoAlCerrar) {
      setAvisoAlCerrar(true);
      return;
    }
    onCerrar({ cambiado });
  };
  // Escape mientras se marca cancela el marcado; «Cerrar» cierra siempre
  const alEscape = () => (marcando ? setMarcando(null) : cerrar());
  const elegirLinea = (nueva) => {
    setLinea(nueva);
    setEditada(true);
    setAvisoAlCerrar(false);
    // Elegida otra línea, ninguna confirmación de borrar o descartar sigue abierta (CodeRabbit)
    setPorBorrar(null);
    setPorDescartar(null);
  };
  const dia = (iso) => {
    const fecha = new Date(`${iso}T12:00:00`);
    return Number.isNaN(fecha.getTime()) ? iso : fecha.toLocaleDateString(i18n?.language, { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const hayCompletas = Boolean(hoyo?.muestras.some((m) => m.tee));
  const tarjeta = tarjetaDelHoyo(hoyo?.barras);
  // Con solo un green suelto, se toca la salida y la línea acaba en él (E3)
  const greenSuelto = hoyo && !hayCompletas && !hoyo.guardada ? (hoyo.muestras.find((m) => !m.tee)?.greenCenter ?? null) : null;

  // La línea de la salida al green con los codos del par de la barra más larga,
  // sobre la recta; sin par, uno (E2, E7, E11)
  const lineaMarcada = (salida, green) => {
    return lineaDePuntos(conCodosDelPar([salida, green], tarjeta?.parDeLaMasLarga));
  };
  // Un green imposible (a menos de 40 m o a más de 750 m) no se coloca (E5)
  const fueraDeLimites = (salida, green) => {
    const problema = salidaGreenFueraDeLimites(salida, green);
    if (problema) customToast.error(t(problema === 'cerca' ? 'holeReviews.greenTooClose' : 'holeReviews.greenTooFar'));
    return Boolean(problema);
  };
  const alTocar = (punto) => {
    // A más de 3 km del campo no se juega: el servidor no lo guardaría (E15)
    if (ubicacion && estaLejosDelCampo(punto, ubicacion)) {
      customToast.error(t('holeReviews.tooFarFromCourse'));
      return;
    }
    if (marcando.paso === 'green') {
      if (fueraDeLimites(marcando.salida, punto)) return;
      setMarcando(null);
      elegirLinea(lineaMarcada(marcando.salida, punto));
      return;
    }
    if (!greenSuelto) {
      setMarcando({ paso: 'green', salida: punto });
      return;
    }
    if (fueraDeLimites(punto, greenSuelto)) return;
    setMarcando(null);
    elegirLinea(lineaMarcada(punto, greenSuelto));
  };
  const instruccion = !marcando ? null : marcando.paso === 'green' ? 'holeReviews.tapGreen' : greenSuelto ? 'holeReviews.tapTeeToGreen' : 'holeReviews.tapTee';
  const parDeLaTarjeta = tarjeta && (tarjeta.parMinimo === tarjeta.parMaximo ? String(tarjeta.parMinimo) : `${tarjeta.parMinimo}–${tarjeta.parMaximo}`);

  return (
    <ModalShell
      isOpen
      onClose={alEscape}
      closeOnBackdrop={false}
      closeOnEscape={!ocupado}
      busy={ocupado}
      labelledBy="titulo-revisar-hoyo"
      boxClassName="fixed inset-x-0 inset-y-0 flex flex-col bg-white md:flex-row"
    >
      {/* En el móvil, el mapa no encoge aunque haya muchas muestras: el panel se desplaza */}
      <div className="relative h-[55dvh] w-full shrink-0 md:h-full md:flex-1">
        {instruccion && (
          // Encima del mapa, que es donde se toca
          <div className="absolute inset-x-2 top-2 z-10 flex items-center justify-between gap-2 rounded-lg bg-white/95 p-2 text-sm font-semibold text-gray-900 shadow">
            <span role="status">{t(instruccion)}</span>
            <button ref={botonDeCancelar} type="button" onClick={() => setMarcando(null)} className={`${BOTON} shrink-0 bg-gray-100 text-gray-900`}>
              {t('holeReviews.cancelMarking')}
            </button>
          </div>
        )}
        <div className="absolute bottom-2 right-2 z-10 flex flex-col items-end gap-1">
          {AVISO_DEL_GPS[gps.estado] && (
            <p role="status" className="rounded bg-white/95 px-2 py-1 text-xs text-gray-900 shadow">
              {t(AVISO_DEL_GPS[gps.estado])}
            </p>
          )}
          {/* Sin desactivarse mientras busca, para no perder el foco: lo dice arriba */}
          <button
            type="button"
            aria-busy={gps.estado === 'buscando'}
            onClick={() => setCentrarEnMi((n) => n + 1)}
            className={`${BOTON} inline-flex items-center gap-1 bg-white text-gray-900 shadow`}
          >
            <LocateFixed className="h-4 w-4" aria-hidden="true" />
            {t('holeReviews.myPosition')}
          </button>
        </div>
        {hoyo && (
          <Suspense fallback={<BlockLoader />}>
            <MapaDeRevision
              muestras={hoyo.muestras}
              guardada={hoyo.guardada}
              linea={linea}
              onLinea={elegirLinea}
              onToque={marcando ? alTocar : undefined}
              marcados={marcando?.salida ? [marcando.salida] : SIN_MARCAR}
              bloqueada={Boolean(marcando)}
              centro={ubicacion}
              osm={hoyo.osm?.puntos ?? null}
              posicion={gps.posicion}
              centrarEnMi={centrarEnMi}
            />
          </Suspense>
        )}
      </div>
      <div className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto p-4 md:w-96 md:flex-none">
        <div className="flex items-start justify-between gap-2">
          <h2 id="titulo-revisar-hoyo" className="text-lg font-bold text-gray-900">
            {t('holeReviews.title', { nombre, numero: numeroDeHoyo })}
          </h2>
          <button type="button" disabled={ocupado} onClick={cerrar} className={`${BOTON} inline-flex items-center gap-1 bg-gray-100 text-gray-900`}>
            <X className="h-4 w-4" aria-hidden="true" />
            {t('holeReviews.close')}
          </button>
        </div>
        {avisoAlCerrar && (
          <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">
            <span>{t('holeReviews.unsaved')}</span>
            <button type="button" disabled={ocupado} onClick={() => onCerrar({ cambiado })} className={`${BOTON} bg-white text-amber-900 ring-1 ring-amber-300`}>
              {t('holeReviews.closeWithoutSaving')}
            </button>
          </div>
        )}

        {fallo && <p role="alert" className="text-sm text-red-700">{t('holeReviews.error')}</p>}
        {!hoyo && !fallo && <BlockLoader />}

        {hoyo && (
          <>
            <section aria-labelledby="la-linea">
              <h3 id="la-linea" className="text-sm font-semibold text-gray-700">{t('holeReviews.line')}</h3>
              <p data-testid="lo-que-mide" className="text-sm text-gray-900">
                {linea
                  ? t('holeReviews.lineMetres', { metros: longitudDeLaLinea(puntosDeLaLinea(linea)) })
                  : t(hoyo.muestras.length && !hayCompletas ? 'holeReviews.onlyGreens' : 'holeReviews.noLine')}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!linea || ocupado || Boolean(marcando)}
                  onClick={guardar}
                  className={`${BOTON} bg-primary text-white`}
                >
                  {t('holeReviews.save')}
                </button>
                {/* El admin marca su propia línea en cualquier hoyo (Agustín, 17 oct) */}
                <button
                  ref={botonDeMarcar}
                  type="button"
                  disabled={ocupado || Boolean(marcando)}
                  onClick={() => setMarcando({ paso: 'salida', salida: null })}
                  className={`${BOTON} bg-gray-100 text-gray-900`}
                >
                  {t('holeReviews.markFromScratch')}
                </button>
                {/* Como «Empezar desde esta» de una muestra, pero desde la de OSM */}
                {lineaDeOsmDe(hoyo) && (
                  <button
                    type="button"
                    disabled={ocupado || Boolean(marcando)}
                    onClick={() => elegirLinea(lineaDeOsmDe(hoyo))}
                    className={`${BOTON} bg-gray-100 text-gray-900`}
                  >
                    {t('holeReviews.useOsm')}
                  </button>
                )}
                {hoyo.guardada && (
                  <button
                    type="button"
                    disabled={ocupado || Boolean(marcando)}
                    onClick={() =>
                      // Reabierto, la revisión se cierra y la lista lo pone al día (T9)
                      hacer(() => reopenHoleUseCase.execute(golfCourseId, numeroDeHoyo), t('holeReviews.reopenedOk', { numero: numeroDeHoyo }), {
                        cerrar: () => onCerrar({ cambiado: true }),
                      })
                    }
                    className={`${BOTON} bg-gray-100 text-gray-900`}
                  >
                    {t('holeReviews.reopen')}
                  </button>
                )}
              </div>
            </section>

            {tarjeta && (
              <section aria-labelledby="las-barras">
                <h3 id="las-barras" className="text-sm font-semibold text-gray-700">{t('holeReviews.cards')}</h3>
                {/* De la barra más corta a la más larga, en una línea (Agustín, 17 oct) */}
                <p className="text-sm text-gray-900">
                  {tarjeta.metrosMinimo === null
                    ? t('holeReviews.cardNoMetres', { par: parDeLaTarjeta })
                    : tarjeta.metrosMinimo === tarjeta.metrosMaximo
                      ? t('holeReviews.cardSame', { par: parDeLaTarjeta, metros: tarjeta.metrosMinimo })
                      : t('holeReviews.cardRange', { par: parDeLaTarjeta, desde: tarjeta.metrosMinimo, hasta: tarjeta.metrosMaximo })}
                </p>
              </section>
            )}

            {/* Lo que reportan los jugadores (entrega 7): se parte de su línea o se descarta */}
            {Boolean(hoyo.reportes?.length) && (
              <section aria-labelledby="los-reportes">
                <h3 id="los-reportes" className="text-sm font-semibold text-gray-700">{t('holeReviews.reportsTitle')}</h3>
                <ul className="flex flex-col gap-2">
                  {hoyo.reportes.map((reporte) => (
                    <li key={reporte.id} className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm">
                      <p className="text-gray-900">
                        {t(`holeReviews.reasons.${reporte.motivo}`, { defaultValue: reporte.motivo })} · {dia(reporte.llego)}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <button type="button" disabled={ocupado || Boolean(marcando)} onClick={() => elegirLinea(lineaDe(reporte))} className={`${BOTON} bg-white text-gray-900 ring-1 ring-gray-200`}>
                          {t('holeReviews.useThis')}
                        </button>
                        {porDescartar === reporte.id ? (
                          <button
                            type="button"
                            disabled={ocupado || Boolean(marcando)}
                            onClick={() => hacer(() => discardHoleReportUseCase.execute(golfCourseId, reporte.id), 'holeReviews.discardedOk', { conservarLinea: true })}
                            className={`${BOTON} bg-red-600 text-white`}
                          >
                            {t('holeReviews.confirmDiscard')}
                          </button>
                        ) : (
                          <button type="button" disabled={ocupado || Boolean(marcando)} onClick={() => {
                              setPorBorrar(null);
                              setPorDescartar(reporte.id);
                            }} className={`${BOTON} bg-white text-red-700 ring-1 ring-red-200`}>
                            {t('holeReviews.discard')}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="las-muestras">
              <h3 id="las-muestras" className="text-sm font-semibold text-gray-700">{t('holeReviews.samplesTitle')}</h3>
              {!hoyo.muestras.length && <p className="text-sm text-gray-500">{t('holeReviews.noSamples')}</p>}
              <ul className="flex flex-col gap-2">
                {hoyo.muestras.map((muestra) => (
                  <li key={muestra.id} className="rounded-lg border border-gray-200 p-2 text-sm">
                    <p className="text-gray-900">
                      {barraDeTexto(muestra.barra)} · {dia(muestra.llego)} ·{' '}
                      {muestra.tee ? t('holeReviews.metres', { metros: longitudDeLaLinea(puntosDeLaLinea(lineaDe(muestra))) }) : t('holeReviews.greenOnly')}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {muestra.tee && (
                        <button type="button" disabled={ocupado || Boolean(marcando)} onClick={() => elegirLinea(lineaDe(muestra))} className={`${BOTON} bg-gray-100 text-gray-900`}>
                          {t('holeReviews.useThis')}
                        </button>
                      )}
                      {porBorrar === muestra.id ? (
                        <button
                          type="button"
                          disabled={ocupado || Boolean(marcando)}
                          onClick={() => hacer(() => deleteHoleSampleUseCase.execute(golfCourseId, muestra.id), 'holeReviews.deletedOk', { conservarLinea: true })}
                          className={`${BOTON} bg-red-600 text-white`}
                        >
                          {t('holeReviews.confirmDelete')}
                        </button>
                      ) : (
                        <button type="button" disabled={ocupado || Boolean(marcando)} onClick={() => {
                            setPorDescartar(null);
                            setPorBorrar(muestra.id);
                          }} className={`${BOTON} bg-white text-red-700 ring-1 ring-red-200`}>
                          {t('holeReviews.delete')}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </ModalShell>
  );
};

export default RevisarHoyo;
