import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ModalShell from '../../ui/ModalShell';
import { useBarrasDeLaInscripcion } from '../../../hooks/useBarrasDeLaInscripcion';
import { cargarBarras } from '../../../composition/cargarBarras';
import { BARRAS_GENERALES } from '../../../utils/barrasGenerales';
import { claveDelFalloDeLaBarra } from '../../../utils/falloDeLaBarra';
import customToast from '../../../utils/toast';
import { registraElFallo } from '../../../utils/registraElFallo';

const GENERAL = 'general';

// Lo elegido sin la clave que ya se guardó
const sinClave = (elegidas, clave) =>
  Object.fromEntries(Object.entries(elegidas).filter(([k]) => k !== clave));

/**
 * Las barras de un inscrito (barras por campo, F2 y F3): su general y, por
 * campo, la que juega y de dónde sale. Se leen al abrir (`GET .../tees`, una
 * sola petición) y, tras cada cambio, se vuelven a leer: se enseña lo que dice
 * el servidor. Quien no puede cambiarlas solo las ve. De él se sale siempre.
 *
 * @param {Object} props
 * @param {{id: string, userName?: string|null}} props.inscripcion
 * @param {boolean} props.puedeCambiar
 * @param {Function} props.onClose
 * @param {(barras: Object) => void} [props.onCambio] - Con lo que quedó
 * @param {string} [props.titulo] - En vez de «Barras de {nombre}» (las mías)
 */
const BarrasDelJugadorModal = ({
  inscripcion,
  puedeCambiar,
  onClose,
  onCambio,
  titulo: tituloPropio,
}) => {
  const { t } = useTranslation(['competitions', 'golfCourses']);
  const { barras, cargando, fallo, recargar } = useBarrasDeLaInscripcion(
    inscripcion.id,
    true,
  );
  // Lo elegido y aún sin guardar, por clave (`general` o el id del campo); y
  // qué se está guardando, para no mezclar dos guardados
  const [elegidas, setElegidas] = useState({});
  const [guardando, setGuardando] = useState(null);
  const color = (c) => t(`golfCourses:form.teeColors.${c}`);

  const guardar = async (clave, valor) => {
    setGuardando(clave);
    try {
      const casos = await cargarBarras();
      if (clave === GENERAL)
        await casos.changeEnrollmentTeeUseCase.execute(inscripcion.id, valor);
      else
        await casos.changeEnrollmentCourseTeeUseCase.execute(
          inscripcion.id,
          clave,
          valor,
        );
      customToast.success(t('competitions:tees.saved'));
      setElegidas((e) => sinClave(e, clave));
      const leida = await recargar();
      if (leida.estado === 'cargada') onCambio?.(leida.datos);
    } catch (error) {
      registraElFallo(
        'BarrasDelJugadorModal.error-saving-tee',
        'Error saving a tee:',
        error,
      );
      customToast.error(t(claveDelFalloDeLaBarra(error)));
    } finally {
      setGuardando(null);
    }
  };

  const titulo =
    tituloPropio ??
    (inscripcion.userName
      ? t('competitions:tees.playerTitle', { name: inscripcion.userName })
      : t('competitions:tees.playerTitleNoName'));

  return (
    <ModalShell
      isOpen
      closeOnBackdrop={false}
      onClose={onClose}
      labelledBy="barras-del-jugador-titulo"
      busy={guardando !== null}
    >
      <div className="space-y-4">
        <h2
          id="barras-del-jugador-titulo"
          className="text-lg font-bold text-gray-900 break-words"
        >
          {titulo}
        </h2>
        {cargando && barras === null && (
          <p role="status" className="text-sm text-gray-500">
            {t('competitions:tees.loading')}
          </p>
        )}
        {fallo && (
          <div
            data-testid="barras-sin-cargar"
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
        {barras && (
          <>
            <FilaDeBarra
              id="barra-general"
              etiqueta={t('competitions:tees.general')}
              actual={barras.generalTee ?? ''}
              textoActual={
                barras.generalTee
                  ? color(barras.generalTee)
                  : barras.defaultTee
                    ? t('competitions:tees.usual', {
                        color: color(barras.defaultTee),
                      })
                    : t('competitions:tees.usualNoColor')
              }
              vacia={
                barras.defaultTee
                  ? t('competitions:tees.usual', {
                      color: color(barras.defaultTee),
                    })
                  : t('competitions:tees.usualNoColor')
              }
              opciones={BARRAS_GENERALES}
              elegida={elegidas[GENERAL]}
              onElegir={(v) => setElegidas((e) => ({ ...e, [GENERAL]: v }))}
              onGuardar={(v) => guardar(GENERAL, v)}
              puedeCambiar={puedeCambiar}
              guardando={guardando}
              clave={GENERAL}
              t={t}
              color={color}
            />
            {barras.courses.map((campo) => (
              <FilaDeBarra
                key={campo.golfCourseId}
                id={`barra-${campo.golfCourseId}`}
                etiqueta={t('competitions:tees.onCourse', {
                  course: campo.golfCourseName,
                })}
                actual={campo.source === 'OWN' ? (campo.tee ?? '') : ''}
                textoActual={`${campo.tee ? color(campo.tee) : t('competitions:tees.noTee')} · ${t(`competitions:tees.source.${campo.source}`)}`}
                aviso={campo.source === 'NONE'}
                vacia={t('competitions:tees.noOwnOnCourse')}
                opciones={campo.options}
                sinOpciones={t('competitions:tees.noOptions')}
                elegida={elegidas[campo.golfCourseId]}
                onElegir={(v) =>
                  setElegidas((e) => ({ ...e, [campo.golfCourseId]: v }))
                }
                onGuardar={(v) => guardar(campo.golfCourseId, v)}
                puedeCambiar={puedeCambiar}
                guardando={guardando}
                clave={campo.golfCourseId}
                t={t}
                color={color}
              />
            ))}
          </>
        )}
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

// Una barra: la general o la de un campo. Lo que juega, y con permiso, el
// selector con «sin elegir» (`vacia`: la habitual, o sin barra propia en el
// campo) y Guardar si cambió algo
const FilaDeBarra = ({
  id,
  etiqueta,
  actual,
  textoActual,
  aviso = false,
  vacia,
  opciones,
  sinOpciones,
  elegida,
  onElegir,
  onGuardar,
  puedeCambiar,
  guardando,
  clave,
  t,
  color,
}) => {
  const valor = elegida ?? actual;
  return (
    <section
      data-testid={`fila-${id}`}
      className="rounded-lg border border-gray-200 p-3"
    >
      <p className="text-sm font-medium text-gray-900 break-words">
        {etiqueta}
      </p>
      <p
        className={`text-sm break-words ${aviso ? 'font-semibold text-amber-800' : 'text-gray-600'}`}
      >
        {textoActual}
      </p>
      {puedeCambiar &&
        (opciones.length === 0 ? (
          <p className="mt-1 text-xs text-amber-800">{sinOpciones}</p>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label htmlFor={id} className="sr-only">
              {etiqueta}
            </label>
            <select
              id={id}
              value={valor}
              onChange={(e) => onElegir(e.target.value)}
              className="min-h-11 min-w-0 flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{vacia}</option>
              {opciones.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {color(opcion)}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={valor === actual || guardando !== null}
              onClick={() => onGuardar(valor || null)}
              data-testid={`guardar-${clave}`}
              className="min-h-11 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {t('competitions:tees.save')}
            </button>
          </div>
        ))}
    </section>
  );
};

export default BarrasDelJugadorModal;
