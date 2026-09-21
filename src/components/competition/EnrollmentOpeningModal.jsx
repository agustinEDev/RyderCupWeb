import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ModalShell from '../ui/ModalShell';
import {
  MAX_DIAS_DE_APERTURA,
  MIN_DIAS_DE_APERTURA,
  diasHastaElTorneo,
  fechaDeApertura,
} from '../../domain/services/aperturaDeInscripciones';

/**
 * Cuándo se abren las inscripciones de una competición pública (FE #666).
 *
 * Sale al pulsar «Crear competición», y no antes, porque lo que tiene que decir
 * —«esto se va a publicar con las inscripciones abiertas»— es justo lo que el
 * organizador necesita saber en ese momento. Metido en «Más opciones» lo vería
 * quien abre el bloque, o sea casi nadie.
 *
 * Solo en las públicas. En una privada no hay nada que avisar: no la ve nadie y
 * se entra por invitación, que ya abre las inscripciones (RyderCupAM#322). Y un
 * modal que sale siempre es uno que se aprende a despachar sin leer.
 *
 * Las dos salidas crean la competición. Lo que no crea nada es cerrarlo, que
 * devuelve al formulario: no hay un tercer botón que parezca cancelar.
 *
 * Sobre `ModalShell`: trae la trampa de foco, el contador compartido del
 * desplazamiento y el cierre por el fondo que no se dispara al soltar ahí una
 * selección de texto. Hacerlo a mano dejaba fuera las tres cosas.
 */
const EnrollmentOpeningModal = ({ isOpen, startDate, onConfirm, onClose, isLoading }) => {
  const { t, i18n } = useTranslation('competitions');
  const [programada, setProgramada] = useState(false);
  const [dias, setDias] = useState(MIN_DIAS_DE_APERTURA);

  const faltan = useMemo(() => diasHastaElTorneo(startDate), [startDate]);
  const abre = useMemo(
    () => (programada ? fechaDeApertura(startDate, dias) : null),
    [programada, startDate, dias]
  );

  // Estrictamente antes: pidiendo los días JUSTOS que faltan, la apertura cae
  // hoy y el torneo todavía no ha empezado, así que no hay nada que avisar
  const abriraYa = programada && faltan !== null && dias > faltan;

  const fechaLegible = abre
    ? new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'long' }).format(abre)
    : null;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      testId="modal-apertura"
      labelledBy="apertura-titulo"
      describedBy="apertura-explicacion"
      // Con algo elegido dentro, un toque al lado no puede descartarlo
      closeOnBackdrop={false}
      // Ni un Escape a media creación: `busy` solo lo anuncia, no lo impide, y
      // cerrar aquí esconde el modal mientras la petición sigue en vuelo
      closeOnEscape={!isLoading}
      busy={isLoading}
    >
      <div className="px-6 pt-6 pb-2">
        <h2 id="apertura-titulo" className="text-xl font-semibold text-gray-900">
          {t('apertura.titulo')}
        </h2>
        <p id="apertura-explicacion" className="text-sm text-gray-600 mt-1">
          {t('apertura.explicacion')}
        </p>
      </div>

      <div className="px-6 py-4 flex flex-col gap-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="radio"
            name="apertura"
            data-testid="apertura-AHORA"
            checked={!programada}
            onChange={() => setProgramada(false)}
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-medium text-gray-900">{t('apertura.ahora')}</span>
            <span className="block text-xs text-gray-500">{t('apertura.ahoraDetalle')}</span>
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="radio"
            name="apertura"
            data-testid="apertura-PROGRAMADA"
            checked={programada}
            onChange={() => setProgramada(true)}
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-medium text-gray-900">
              {t('apertura.programada')}
            </span>
            <span className="block text-xs text-gray-500">{t('apertura.programadaDetalle')}</span>
          </span>
        </label>

        {programada && (
          <div className="pl-7 flex flex-col gap-2">
            {/* Un desplegable y no un campo numérico: son catorce valores, se
                eligen de una lista. Un `<input type="number">` traería los
                spinners y el teclado del móvil para nada */}
            <label htmlFor="apertura-dias" className="text-sm text-gray-700">
              {t('apertura.cuantosDias')}
            </label>
            <select
              id="apertura-dias"
              data-testid="apertura-dias"
              value={dias}
              onChange={(e) => setDias(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {Array.from(
                { length: MAX_DIAS_DE_APERTURA - MIN_DIAS_DE_APERTURA + 1 },
                (_, i) => MIN_DIAS_DE_APERTURA + i
              ).map((n) => (
                <option key={n} value={n}>
                  {t('apertura.dias', { count: n })}
                </option>
              ))}
            </select>

            {/* La fecha y no solo los días: «7 días antes» obliga a hacer la
                cuenta, y es la cuenta la que dice si eso cae donde se quería */}
            {fechaLegible && !abriraYa && (
              <p data-testid="fecha-de-apertura" className="text-xs text-gray-600">
                {t('apertura.abreEl', { fecha: fechaLegible })}
              </p>
            )}

            {abriraYa && (
              <p data-testid="aviso-abre-ya" className="text-xs text-amber-700">
                {t('apertura.avisoAbreYa')}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="px-6 pb-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
        <button
          type="button"
          data-testid="volver-al-formulario"
          onClick={onClose}
          disabled={isLoading}
          className="w-full sm:w-auto px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {t('apertura.volver')}
        </button>
        <button
          type="button"
          data-testid="confirmar-apertura"
          onClick={() => onConfirm(programada ? dias : null)}
          disabled={isLoading}
          className="w-full sm:w-auto px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isLoading ? t('apertura.creando') : t('apertura.crear')}
        </button>
      </div>
    </ModalShell>
  );
};

export default EnrollmentOpeningModal;
