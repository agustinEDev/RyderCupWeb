import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { useBarrasDeLaInscripcion } from '../../../hooks/useBarrasDeLaInscripcion';
import { TeeSource } from '../../../domain/value_objects/TeeSource';
import BarrasDelJugadorModal from './BarrasDelJugadorModal';

/**
 * «Mis barras» en la ficha (barras por campo, F2): mi barra general y, por
 * campo, la que juego y de dónde sale. Se leen siempre (el jugador puede
 * verlas aunque ya no pueda cambiarlas); «Cambiar» solo si puedo. Un campo
 * sin barra para mí se avisa: si aún puedo, que la elija; si ya no (en
 * juego), a quién pedírsela (tabla del 21 nov 2026, C). Sin poder leerlas, se
 * dice y se reintenta.
 *
 * @param {Object} props
 * @param {{id: string}} props.inscripcion - La mía, aprobada
 * @param {boolean} props.puedeCambiar
 * @param {boolean} [props.cerrada] - Competición terminada o cancelada: ya no
 *   se invita a elegir nada (sin el aviso de campo sin barra)
 * @param {boolean} [props.conEquipos=true] - Una Ryder (por defecto, como
 *   los modales): sin barra y sin poder
 *   cambiarla, se pide al capitán o al organizador; si no, al organizador.
 *   También dice cómo se llama lo pendiente en los fallos («partido» o
 *   «partida»)
 * @param {number} [props.version] - La ficha la sube cuando cambia cualquier
 *   barra: se vuelven a leer
 * @param {(barras: Object) => void} [props.onCambio] - Al guardar en mis
 *   barras, con lo que quedó (la lista de la ficha se pone al día)
 */
const MisBarras = ({
  inscripcion,
  puedeCambiar,
  cerrada = false,
  conEquipos = true,
  version = 0,
  onCambio,
}) => {
  const { t } = useTranslation(['competitions', 'golfCourses']);
  const { barras, cargando, fallo, recargar } = useBarrasDeLaInscripcion(
    inscripcion.id,
    true,
    version,
  );
  const [abierto, setAbierto] = useState(false);
  // Abiertas, el modal ya relee sus barras tras cada cambio: «Mis barras» se
  // releen UNA vez, al cerrarlo; un guardado que acaba ya cerrado, al acabar
  const abiertoRef = useRef(false);

  if (!barras) {
    if (!fallo) return null;
    return (
      <section
        data-testid="mis-barras-sin-cargar"
        className="mx-4 mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
      >
        <h2 className="font-semibold">{t('competitions:tees.mine')}</h2>
        <p className="mt-1">{t('competitions:tees.notLoaded')}</p>
        <button
          type="button"
          disabled={cargando}
          onClick={() => recargar()}
          className="mt-2 min-h-11 font-semibold underline disabled:opacity-50"
        >
          {t('competitions:tees.retry')}
        </button>
      </section>
    );
  }

  const color = (c) => t(`golfCourses:form.teeColors.${c}`);
  // Cerrada la competición, no se invita a elegir: ya no se puede (pasada del
  // Kind, 21 nov)
  const sinBarra = cerrada
    ? []
    : barras.courses.filter((campo) => campo.source === TeeSource.NONE);
  // Un «Cambiar» por fila, cada uno con su nombre accesible
  const cambiar = (nombre) =>
    puedeCambiar && (
      <button
        type="button"
        aria-label={nombre}
        onClick={() => {
          abiertoRef.current = true;
          setAbierto(true);
        }}
        className="min-h-11 px-2 font-semibold text-primary underline"
      >
        {t('competitions:tees.change')}
      </button>
    );

  return (
    <section
      data-testid="mis-barras"
      aria-labelledby="mis-barras-titulo"
      className="mx-4 mb-4 rounded-lg border border-gray-200 bg-white p-4"
    >
      <h2 id="mis-barras-titulo" className="font-semibold text-gray-900">
        {t('competitions:tees.mine')}
      </h2>
      {sinBarra.map((campo) => (
        <p
          key={campo.golfCourseId}
          role="alert"
          data-testid={`${puedeCambiar ? 'elige' : 'pide'}-barra-${campo.golfCourseId}`}
          className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-sm font-medium text-amber-900"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span className="min-w-0 break-words">
            {t(
              puedeCambiar
                ? 'competitions:tees.chooseOnCourse'
                : conEquipos
                  ? 'competitions:tees.askCaptainOrOrganiser'
                  : 'competitions:tees.askOrganiser',
              { course: campo.golfCourseName },
            )}
          </span>
        </p>
      ))}
      <dl className="mt-2 space-y-1 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-x-2">
          <dt className="text-gray-600">{t('competitions:tees.general')}</dt>
          <dd className="flex items-center gap-1 font-medium text-gray-900">
            {barras.generalTee
              ? color(barras.generalTee)
              : barras.defaultTee
                ? t('competitions:tees.usualMine', {
                    color: color(barras.defaultTee),
                  })
                : t('competitions:tees.usualMineNoColor')}
            {cambiar(t('competitions:tees.changeGeneral'))}
          </dd>
        </div>
        {barras.courses.map((campo) => (
          <div
            key={campo.golfCourseId}
            data-testid={`mi-barra-${campo.golfCourseId}`}
            className="flex flex-wrap items-center justify-between gap-x-2"
          >
            <dt className="min-w-0 break-words text-gray-600">
              {campo.golfCourseName}
            </dt>
            <dd className="flex items-center gap-1 text-gray-900">
              <span className="font-medium">
                {campo.tee ? color(campo.tee) : t('competitions:tees.noTee')}
              </span>
              {/* Sin barra, el valor ya lo dice: el motivo («Sin barra») no
                  se repite (pasada del Kind, 21 nov) */}
              {campo.source !== TeeSource.NONE && (
                <span className="text-gray-500">
                  · {t(`competitions:tees.source.${campo.source}`)}
                </span>
              )}
              {cambiar(
                t('competitions:tees.changeOn', {
                  course: campo.golfCourseName,
                }),
              )}
            </dd>
          </div>
        ))}
      </dl>
      {abierto && (
        <BarrasDelJugadorModal
          inscripcion={inscripcion}
          puedeCambiar={puedeCambiar}
          cerrada={cerrada}
          conEquipos={conEquipos}
          propia
          titulo={t('competitions:tees.mine')}
          onClose={() => {
            abiertoRef.current = false;
            setAbierto(false);
            recargar();
          }}
          onCambio={(nuevas) => {
            if (!abiertoRef.current) recargar();
            onCambio?.(nuevas);
          }}
        />
      )}
    </section>
  );
};

export default MisBarras;
