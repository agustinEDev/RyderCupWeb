import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import ModalShell, { CAJA_PROPIA } from '../ui/ModalShell';
import { motion } from 'framer-motion';
import { X, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SelectorDeGenero from '../profile/SelectorDeGenero';

const TEE_CATEGORIES = ['WHITE', 'YELLOW', 'BLUE', 'RED', 'GREEN'];

/**
 * @param {Object} props
 * @param {boolean} [props.pideGenero=false] - Si quien se apunta no tiene el
 *   género en su perfil (#710): se le pregunta aquí y `onConfirm` lo recibe
 *   como segundo argumento, para guardarlo antes de pedir plaza
 * @param {string|null} [props.error=null] - Por qué no se pudo pedir (#710):
 *   el modal sigue abierto y lo dice, en vez de cerrarse como si hubiera ido bien
 * @param {Array} [props.franjas=[]] - Las franjas de un stroke play (sesiones con
 *   `teeSheet`). Con ellas se elige en el mismo paso la franja con hueco o la
 *   espera de una llena (release social 3, 28 oct 2026); `onConfirm` recibe
 *   `{ roundId, waiting }` como tercer argumento, o null sin franjas
 * @param {boolean} [props.franjasSinCargar=false] - Es un stroke play y su agenda
 *   no se ha leído: no hay franjas que elegir y no se deja enviar (revisor)
 * @param {Function} [props.onElegir] - Al cambiar de franja: quien lo abre borra
 *   el error de la elección anterior (revisor)
 */
const EnrollmentRequestModal = ({
  isOpen,
  onClose,
  onConfirm,
  isProcessing,
  pideGenero = false,
  faltaHandicap = false,
  error = null,
  franjas = [],
  franjasSinCargar = false,
  onElegir,
}) => {
  if (!isOpen) return null;
  return (
    <EnrollmentRequestModalContent
      onClose={onClose}
      onConfirm={onConfirm}
      isProcessing={isProcessing}
      pideGenero={pideGenero}
      faltaHandicap={faltaHandicap}
      error={error}
      franjas={franjas}
      franjasSinCargar={franjasSinCargar}
      onElegir={onElegir}
    />
  );
};

const llena = (franja) => franja.teeSheet.placesTaken >= franja.teeSheet.capacity;

const EnrollmentRequestModalContent = ({
  onClose,
  onConfirm,
  isProcessing,
  pideGenero,
  faltaHandicap,
  error,
  franjas,
  franjasSinCargar,
  onElegir,
}) => {
  const { t, i18n } = useTranslation(['competitions', 'golfCourses']);
  const [selectedTee, setSelectedTee] = useState('');
  const [genero, setGenero] = useState('');
  const [elegida, setElegida] = useState(null);
  // Por día y hora: en el orden en que se juegan
  const ordenadas = useMemo(
    () =>
      [...franjas].sort(
        (a, b) =>
          String(a.roundDate).localeCompare(String(b.roundDate)) ||
          String(a.teeSheet.firstTeeTime).localeCompare(String(b.teeSheet.firstTeeTime))
      ),
    [franjas]
  );
  const conFranjas = ordenadas.length > 0;
  const laElegida = ordenadas.find((f) => f.id === elegida) ?? null;
  const aLaEspera = laElegida !== null && llena(laElegida);
  const falta =
    faltaHandicap || (pideGenero && !genero) || (conFranjas && !laElegida) || franjasSinCargar;

  const elegir = (id) => {
    setElegida(id);
    onElegir?.();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (falta) return;
    onConfirm(
      selectedTee || null,
      pideGenero ? genero : null,
      laElegida ? { roundId: laElegida.id, waiting: aLaEspera } : null
    );
  };

  const dia = (fecha) => {
    const d = new Date(`${fecha}T12:00:00`);
    return Number.isNaN(d.getTime())
      ? fecha
      : d.toLocaleDateString(i18n?.language, { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      labelledBy="pedir-inscripcion-titulo"
      closeOnBackdrop={false}
      closeOnEscape={!isProcessing}
      busy={isProcessing}
      boxClassName={CAJA_PROPIA}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-md w-full"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            <h2 id="pedir-inscripcion-titulo" className="text-xl font-bold text-gray-900">
              {t('competitions:enrollment.modalTitle')}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label={t('common:close')}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <p data-testid="apuntarse-error" role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          {/* Sin hándicap no se entra en un Stableford o un Medal: se dice y se
              lleva al perfil, en vez de esperar al rechazo del servidor
              (FE #824, PR 5) */}
          {faltaHandicap && (
            <p data-testid="falta-handicap" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              {t('competitions:enrollment.needsHandicap')}{' '}
              <Link to="/profile/edit" className="font-semibold underline">
                {t('competitions:enrollment.addHandicap')}
              </Link>
            </p>
          )}
          {pideGenero && <SelectorDeGenero value={genero} onChange={setGenero} />}

          {/* La franja, o la espera de una llena, en el mismo paso (release
              social 3): con plaza se entra con ella; llena, a su espera */}
          {franjasSinCargar && (
            <p data-testid="franjas-sin-cargar" role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              {t('competitions:enrollment.windowsNotLoaded')}
            </p>
          )}
          {conFranjas && (
            <fieldset data-testid="elegir-franja" className="min-w-0 space-y-2">
              <legend className="block text-sm font-medium text-gray-700 mb-1">
                {t('competitions:enrollment.windowLabel')}
              </legend>
              {ordenadas.map((franja) => {
                const hoja = franja.teeSheet;
                const sinSitio = llena(franja);
                const marcada = franja.id === elegida;
                return (
                  <label
                    key={franja.id}
                    data-testid={`franja-${franja.id}`}
                    className={`flex items-start gap-3 w-full min-h-11 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
                      marcada ? 'border-primary bg-primary/5' : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="franja"
                      value={franja.id}
                      checked={marcada}
                      onChange={() => elegir(franja.id)}
                      className="mt-1 accent-primary"
                    />
                    <span>
                      <span className="font-medium text-gray-900">
                        {dia(franja.roundDate)} · {hoja.firstTeeTime}
                        {hoja.lastTeeTime && hoja.lastTeeTime !== hoja.firstTeeTime
                          ? `–${hoja.lastTeeTime}`
                          : ''}
                      </span>
                      <span className={`block text-xs ${sinSitio ? 'text-amber-700' : 'text-gray-500'}`}>
                        {sinSitio
                          ? `${t('competitions:enrollment.full')} · ${t('competitions:enrollment.waitingCount', { count: hoja.waitingCount ?? 0 })}`
                          : t('competitions:enrollment.freePlaces', {
                              count: hoja.capacity - hoja.placesTaken,
                            })}
                      </span>
                    </span>
                  </label>
                );
              })}
            </fieldset>
          )}

          {/* Tee Category Select */}
          <div>
            <label
              htmlFor="tee-category"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t('competitions:enrollment.colorLabel')}
            </label>
            <select
              id="tee-category"
              value={selectedTee}
              onChange={(e) => setSelectedTee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            >
              <option value="">{t('competitions:enrollment.noPreference')}</option>
              {TEE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t(`golfCourses:form.teeColors.${cat}`)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {t('competitions:enrollment.colorHint')}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              {t('competitions:enrollment.cancel')}
            </button>
            <button
              type="submit"
              disabled={isProcessing || falta}
              className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isProcessing
                ? '...'
                : t(aLaEspera ? 'competitions:enrollment.joinWaitingList' : 'competitions:enrollment.confirm')}
            </button>
          </div>
        </form>
      </motion.div>
    </ModalShell>
  );
};

export default EnrollmentRequestModal;
