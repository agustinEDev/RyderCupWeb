import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ModalShell, { CAJA_CENTRADA_SI_CABE } from '../../ui/ModalShell';
import { getCompetitionGolfCoursesUseCase } from '../../../composition';
import { cargarBarras } from '../../../composition/cargarBarras';
import { Gender } from '../../../domain/value_objects/Gender';
import { useCargaCancelableEffect } from '../../../hooks/useCargaCancelableEffect';
import { barrasDeCadaCampo } from '../../../utils/camposDeLaCompeticion';
import { barrasParaElegir } from '../../../utils/barraPorDefecto';
import { claveDelFalloDeLaBarra } from '../../../utils/falloDeLaBarra';
import customToast from '../../../utils/toast';
import { AVISO_ARRIBA } from '../../../utils/avisoArriba';
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
 * abrir, de los campos de la competición, y lo fijado, de su `course-tees`
 * (tabla del 21 nov 2026, A): cada selector parte de lo fijado y «Quitar»
 * solo se activa si hay algo que quitar. Si esa lectura falla, el modal sigue:
 * se avisa, se puede fijar y «Quitar» queda a mano, que no se sabe.
 *
 * @param {Object} props
 * @param {string} props.competitionId
 * @param {Function} props.onClose
 * @param {Function} [props.onCambio]
 * @param {boolean} [props.conEquipos=true] - Una Ryder: lo pendiente de un
 *   fallo es un «partido»; en stroke play, una «partida»
 */
const BarrasDeLosCamposModal = ({
  competitionId,
  onClose,
  onCambio,
  conEquipos = true,
}) => {
  const { t } = useTranslation(['competitions', 'golfCourses']);
  const [campos, setCampos] = useState(null);
  const [fallo, setFallo] = useState(false);
  const [elegidas, setElegidas] = useState({});
  const [guardando, setGuardando] = useState(null);
  // Lo fijado, por clave (`{campo}:{género}`): el color, o null si se sabe que
  // no hay nada (se acaba de quitar). Lo que no está, sin fijar, salvo si la
  // lectura falló: entonces no se sabe. Lo fijado o quitado aquí gana a la
  // lectura, que puede llegar después con lo de antes (revisor de la #1222)
  const [delServidor, setDelServidor] = useState({});
  const [cambiosLocales, setCambiosLocales] = useState({});
  const [sinFijadas, setSinFijadas] = useState(false);
  const fijadas = { ...delServidor, ...cambiosLocales };
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
  const { cargando: leyendoFijadas, recargar: releerFijadas } =
    useCargaCancelableEffect(
      () =>
        cargarBarras().then(({ getCompetitionCourseTeesUseCase }) =>
          getCompetitionCourseTeesUseCase.execute(competitionId),
        ),
      [competitionId],
      {
        alCargar: (filas) => {
          setDelServidor(
            Object.fromEntries(
              filas.map((f) => [`${f.golfCourseId}:${f.gender}`, f.teeColor]),
            ),
          );
          setSinFijadas(false);
        },
        alFallar: (error) => {
          registraElFallo(
            'BarrasDeLosCamposModal.error-reading-course-tees',
            'Error reading the course tees:',
            error,
          );
          setSinFijadas(true);
          // Un texto de LECTURA: el de un fallo al guardar decía «No se pudo
          // guardar» o, con un 403, «No puedes cambiar esta barra» (/code-review)
          customToast.error(t('competitions:tees.notLoaded'), AVISO_ARRIBA);
        },
      },
    );
  const hayFijada = (clave) =>
    clave in fijadas ? fijadas[clave] !== null : sinFijadas;

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
        AVISO_ARRIBA,
      );
      setCambiosLocales((v) => ({ ...v, [clave]: color }));
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
            conEquipos,
          }),
        ),
        AVISO_ARRIBA,
      );
    } finally {
      setGuardando(null);
    }
  };

  return (
    <ModalShell
      isOpen
      // Con muchos campos no cabe en el móvil: se desplaza hasta «Cerrar»
      scrollableBackdrop
      boxClassName={CAJA_CENTRADA_SI_CABE}
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
        {/* Si falla cualquiera de las dos lecturas, se reintentan las dos */}
        {(fallo || sinFijadas) && !cargando && !leyendoFijadas && (
          <div
            data-testid="campos-sin-cargar"
            className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
          >
            <p>{t('competitions:tees.notLoaded')}</p>
            <button
              type="button"
              onClick={() => {
                recargar();
                releerFijadas();
              }}
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
              const fijada = fijadas[clave] ?? null;
              // La fijada que ya no está entre las opciones (el campo cambió
              // sus barras): se ve, marcada, y no se vuelve a mandar
              const yaNoDisponible =
                fijada !== null && !opciones.includes(fijada) ? fijada : null;
              const elegida = elegidas[clave] ?? fijada ?? '';
              const conSelector = opciones.length > 0 || yaNoDisponible;
              const id = `barra-${clave}`;
              return (
                <div key={genero} className="mt-2">
                  <label
                    htmlFor={conSelector ? id : undefined}
                    className="block text-sm text-gray-700"
                  >
                    {t(texto)}
                  </label>
                  {/* Sin barras para ese género se avisa; quitar la que hubiera
                      fijada se puede siempre (/code-review) */}
                  {opciones.length === 0 && (
                    <p className="text-xs text-amber-800">
                      {t('competitions:tees.courses.noTees')}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {conSelector && (
                      <>
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
                          {yaNoDisponible && (
                            <option value={yaNoDisponible}>
                              {t('competitions:tees.notAvailableHere', {
                                color: t(
                                  `golfCourses:form.teeColors.${yaNoDisponible}`,
                                ),
                              })}
                            </option>
                          )}
                          {opciones.map((color) => (
                            <option key={color} value={color}>
                              {t(`golfCourses:form.teeColors.${color}`)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          data-testid={`fijar-${clave}`}
                          disabled={
                            // Sin elegir, o lo elegido ya no está entre las
                            // opciones (tras «Reintentar»; CodeRabbit)
                            !opciones.includes(elegida) ||
                            // Lo ya fijado (también la que ya no está entre
                            // las opciones) no se vuelve a mandar
                            elegida === fijada ||
                            leyendoFijadas ||
                            guardando !== null
                          }
                          onClick={() => fijar(campo, genero, elegida)}
                          className="min-h-11 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                          {t('competitions:tees.courses.set')}
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      data-testid={`quitar-${clave}`}
                      // Mientras se lee lo fijado, nada: no se fija ni se
                      // quita creyendo que no había nada (/code-review)
                      disabled={
                        guardando !== null ||
                        leyendoFijadas ||
                        !hayFijada(clave)
                      }
                      onClick={() => fijar(campo, genero, null)}
                      className="min-h-11 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 disabled:opacity-50"
                    >
                      {t('competitions:tees.courses.remove')}
                    </button>
                  </div>
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
