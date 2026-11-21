import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ModalShell from '../../ui/ModalShell';
import { getCompetitionGolfCoursesUseCase } from '../../../composition';
import { cargarBarras } from '../../../composition/cargarBarras';
import { Gender } from '../../../domain/value_objects/Gender';
import { useCargaCancelableEffect } from '../../../hooks/useCargaCancelableEffect';
import { barrasDeCadaCampo } from '../../../utils/camposDeLaCompeticion';
import { barrasParaElegir } from '../../../utils/barraPorDefecto';
import { claveDelFalloDeLaBarra } from '../../../utils/falloDeLaBarra';
import customToast from '../../../utils/toast';
import { registraElFallo } from '../../../utils/registraElFallo';

// Primero las mujeres, como se juega: «para todas» y «para todos»
const GENEROS = [
  { genero: Gender.FEMALE, clave: 'competitions:tees.courses.forWomen' },
  { genero: Gender.MALE, clave: 'competitions:tees.courses.forMen' },
];

/**
 * La barra de cada campo para todos los de un género (barras por campo, R2,
 * F3): solo el organizador o un admin. Pisa la barra general de los de ese
 * género en ese campo, no el cambio propio de nadie. Las barras se leen al
 * abrir, de los campos de la competición. La API no dice cuál hay fijada:
 * se elige y se fija, o se quita.
 *
 * @param {Object} props
 * @param {string} props.competitionId
 * @param {Function} props.onClose
 * @param {Function} [props.onCambio]
 */
const BarrasDeLosCamposModal = ({ competitionId, onClose, onCambio }) => {
  const { t } = useTranslation(['competitions', 'golfCourses']);
  const [campos, setCampos] = useState(null);
  const [fallo, setFallo] = useState(false);
  const [elegidas, setElegidas] = useState({});
  const [guardando, setGuardando] = useState(null);
  const { cargando, recargar } = useCargaCancelableEffect(
    () => getCompetitionGolfCoursesUseCase.execute(competitionId),
    [competitionId],
    {
      alCargar: (resultado) => {
        setCampos(barrasDeCadaCampo(resultado));
        setFallo(false);
      },
      alFallar: () => setFallo(true),
    },
  );

  const fijar = async (campo, genero, color) => {
    const clave = `${campo.id}:${genero}`;
    setGuardando(clave);
    try {
      const { setCompetitionCourseTeeUseCase } = await cargarBarras();
      await setCompetitionCourseTeeUseCase.execute(
        competitionId,
        campo.id,
        genero,
        color,
      );
      customToast.success(
        t(
          color
            ? 'competitions:tees.courses.saved'
            : 'competitions:tees.courses.removed',
        ),
      );
      setElegidas((v) =>
        Object.fromEntries(Object.entries(v).filter(([k]) => k !== clave)),
      );
      onCambio?.();
    } catch (error) {
      registraElFallo(
        'BarrasDeLosCamposModal.error-setting-course-tee',
        'Error setting a course tee:',
        error,
      );
      customToast.error(
        t(
          claveDelFalloDeLaBarra(error, {
            delCampo: true,
            quitando: color === null,
          }),
        ),
      );
    } finally {
      setGuardando(null);
    }
  };

  return (
    <ModalShell
      isOpen
      closeOnBackdrop={false}
      onClose={onClose}
      labelledBy="barras-de-los-campos-titulo"
      describedBy="barras-de-los-campos-texto"
      busy={guardando !== null}
    >
      <div className="space-y-4">
        <h2
          id="barras-de-los-campos-titulo"
          className="text-lg font-bold text-gray-900"
        >
          {t('competitions:tees.courses.title')}
        </h2>
        <p id="barras-de-los-campos-texto" className="text-sm text-gray-600">
          {t('competitions:tees.courses.hint')}
        </p>
        {cargando && campos === null && (
          <p role="status" className="text-sm text-gray-500">
            {t('competitions:tees.loading')}
          </p>
        )}
        {fallo && !cargando && (
          <div
            data-testid="campos-sin-cargar"
            className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
          >
            <p>{t('competitions:tees.notLoaded')}</p>
            <button
              type="button"
              onClick={() => recargar()}
              className="mt-2 min-h-11 font-semibold underline"
            >
              {t('competitions:tees.retry')}
            </button>
          </div>
        )}
        {campos?.map((campo) => (
          <section
            key={campo.id}
            className="rounded-lg border border-gray-200 p-3"
          >
            <h3 className="text-sm font-semibold text-gray-900 break-words">
              {campo.name}
            </h3>
            {GENEROS.map(({ genero, clave: texto }) => {
              const clave = `${campo.id}:${genero}`;
              const opciones = barrasParaElegir(campo.tees, genero);
              const elegida = elegidas[clave] ?? '';
              const id = `barra-${clave}`;
              return (
                <div key={genero} className="mt-2">
                  <label htmlFor={id} className="block text-sm text-gray-700">
                    {t(texto)}
                  </label>
                  {opciones.length === 0 ? (
                    <p className="text-xs text-amber-800">
                      {t('competitions:tees.courses.noTees')}
                    </p>
                  ) : (
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <select
                        id={id}
                        value={elegida}
                        onChange={(e) =>
                          setElegidas((v) => ({
                            ...v,
                            [clave]: e.target.value,
                          }))
                        }
                        className="min-h-11 min-w-0 flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="" disabled>
                          {t('competitions:tees.courses.notSet')}
                        </option>
                        {opciones.map((color) => (
                          <option key={color} value={color}>
                            {t(`golfCourses:form.teeColors.${color}`)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        data-testid={`fijar-${clave}`}
                        disabled={!elegida || guardando !== null}
                        onClick={() => fijar(campo, genero, elegida)}
                        className="min-h-11 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        {t('competitions:tees.courses.set')}
                      </button>
                      <button
                        type="button"
                        data-testid={`quitar-${clave}`}
                        disabled={guardando !== null}
                        onClick={() => fijar(campo, genero, null)}
                        className="min-h-11 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 disabled:opacity-50"
                      >
                        {t('competitions:tees.courses.remove')}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        ))}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200"
          >
            {t('competitions:tees.close')}
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

export default BarrasDeLosCamposModal;
