import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import {
  deleteHoleSampleUseCase,
  getHoleReviewUseCase,
  reopenHoleUseCase,
  saveHoleLineUseCase,
} from '../../../composition';
import { longitudDeLaLinea, puntosDeLaLinea } from '../../../domain/services/hoyoMarcado';
import customToast from '../../../utils/toast';
import ModalShell from '../../ui/ModalShell';
import BlockLoader from '../../ui/BlockLoader';

// Aparte: MapLibre pesa, y el panel de admin no lo necesita hasta aquí
const MapaDeRevision = lazy(() => import('./MapaDeRevision'));

const lineaDe = (muestra) => (muestra?.tee ? { tee: muestra.tee, bends: muestra.bends, greenCenter: muestra.greenCenter } : null);

const BOTON = 'min-h-11 rounded-lg px-3 text-sm font-semibold disabled:opacity-50';

/**
 * Revisar un hoyo (BE #575, 17 oct 2026: una referencia por hoyo). Sobre la
 * ortofoto, todas sus muestras (cada una con el color de su barra) y la línea
 * guardada; el admin parte de una muestra (o de lo guardado), la ajusta
 * arrastrando la salida, los codos y el green, y la guarda. También puede
 * reabrir el hoyo y borrar una muestra mala. Al cerrar, dice si cambió algo.
 */
const RevisarHoyo = ({ golfCourseId, nombre, numeroDeHoyo, onCerrar }) => {
  const { t, i18n } = useTranslation(['admin', 'golfCourses']);
  const [hoyo, setHoyo] = useState(null);
  const [linea, setLinea] = useState(null);
  const [fallo, setFallo] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [cambiado, setCambiado] = useState(false);
  const [porBorrar, setPorBorrar] = useState(null);
  // Si la línea se movió o se cambió y no se ha guardado (para no perderla al cerrar)
  const [editada, setEditada] = useState(false);
  const [avisoAlCerrar, setAvisoAlCerrar] = useState(false);

  // `conservarLinea`: tras borrar una muestra, la que se edita no se toca
  const cargar = useCallback(
    async ({ conservarLinea = false } = {}) => {
      try {
        const campo = await getHoleReviewUseCase.execute(golfCourseId);
        const este = campo.holes.find((h) => h.holeNumber === numeroDeHoyo) ?? { holeNumber: numeroDeHoyo, guardada: null, muestras: [], barras: [] };
        setHoyo(este);
        const deLoQueHay = este.guardada ?? lineaDe(este.muestras.find((m) => m.tee)) ?? null;
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

  const hacer = async (accion, ok, { conservarLinea = false } = {}) => {
    setOcupado(true);
    try {
      await accion();
      setCambiado(true);
      // Guardada (o quitada) la línea, ya no hay cambios que perder, aunque la
      // recarga de después falle (CodeRabbit, 17 oct)
      if (!conservarLinea) setEditada(false);
      if (ok) customToast.success(t(ok));
      await cargar({ conservarLinea });
    } catch (error) {
      customToast.error(t(error?.errorCode === 'INVALID_HOLE_LINE' ? 'holeReviews.invalidLine' : 'holeReviews.actionError'));
    } finally {
      setOcupado(false);
      setPorBorrar(null);
    }
  };

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
  const elegirLinea = (nueva) => {
    setLinea(nueva);
    setEditada(true);
    setAvisoAlCerrar(false);
  };
  const dia = (iso) => {
    const fecha = new Date(`${iso}T12:00:00`);
    return Number.isNaN(fecha.getTime()) ? iso : fecha.toLocaleDateString(i18n?.language, { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const hayCompletas = Boolean(hoyo?.muestras.some((m) => m.tee));

  return (
    <ModalShell
      isOpen
      onClose={cerrar}
      closeOnBackdrop={false}
      closeOnEscape={!ocupado}
      busy={ocupado}
      labelledBy="titulo-revisar-hoyo"
      boxClassName="fixed inset-x-0 inset-y-0 flex flex-col bg-white md:flex-row"
    >
      {/* En el móvil, el mapa no encoge aunque haya muchas muestras: el panel se desplaza */}
      <div className="relative h-[55dvh] w-full shrink-0 md:h-full md:flex-1">
        {hoyo && (
          <Suspense fallback={<BlockLoader />}>
            <MapaDeRevision muestras={hoyo.muestras} guardada={hoyo.guardada} linea={linea} onLinea={elegirLinea} />
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
            <button type="button" onClick={() => onCerrar({ cambiado })} className={`${BOTON} bg-white text-amber-900 ring-1 ring-amber-300`}>
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
                  disabled={!linea || ocupado}
                  onClick={() => hacer(() => saveHoleLineUseCase.execute(golfCourseId, numeroDeHoyo, linea), 'holeReviews.savedOk')}
                  className={`${BOTON} bg-primary text-white`}
                >
                  {t('holeReviews.save')}
                </button>
                {hoyo.guardada && (
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => hacer(() => reopenHoleUseCase.execute(golfCourseId, numeroDeHoyo), 'holeReviews.reopenedOk')}
                    className={`${BOTON} bg-gray-100 text-gray-900`}
                  >
                    {t('holeReviews.reopen')}
                  </button>
                )}
              </div>
            </section>

            <section aria-labelledby="las-barras">
              <h3 id="las-barras" className="text-sm font-semibold text-gray-700">{t('holeReviews.cards')}</h3>
              <ul className="text-sm text-gray-900">
                {hoyo.barras.map((barra) => (
                  <li key={`${barra.color}-${barra.gender}-${barra.identifier}`}>
                    {barraDeTexto(barra)}:{' '}
                    {barra.metros === null ? t('holeReviews.cardNoMetres', { par: barra.par }) : t('holeReviews.card', { par: barra.par, metros: barra.metros })}
                  </li>
                ))}
              </ul>
            </section>

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
                        <button type="button" disabled={ocupado} onClick={() => elegirLinea(lineaDe(muestra))} className={`${BOTON} bg-gray-100 text-gray-900`}>
                          {t('holeReviews.useThis')}
                        </button>
                      )}
                      {porBorrar === muestra.id ? (
                        <button
                          type="button"
                          disabled={ocupado}
                          onClick={() => hacer(() => deleteHoleSampleUseCase.execute(golfCourseId, muestra.id), 'holeReviews.deletedOk', { conservarLinea: true })}
                          className={`${BOTON} bg-red-600 text-white`}
                        >
                          {t('holeReviews.confirmDelete')}
                        </button>
                      ) : (
                        <button type="button" disabled={ocupado} onClick={() => setPorBorrar(muestra.id)} className={`${BOTON} bg-white text-red-700 ring-1 ring-red-200`}>
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
