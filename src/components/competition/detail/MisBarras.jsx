import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { useBarrasDeLaInscripcion } from '../../../hooks/useBarrasDeLaInscripcion';
import BarrasDelJugadorModal from './BarrasDelJugadorModal';

/**
 * «Mis barras» en la ficha (barras por campo, F2): mi barra general y, por
 * campo, la que juego y de dónde sale. Se leen siempre (el jugador puede
 * verlas aunque ya no pueda cambiarlas); «Cambiar» solo si puedo. Un campo
 * sin barra para mí se avisa.
 *
 * @param {Object} props
 * @param {{id: string}} props.inscripcion - La mía, aprobada
 * @param {boolean} props.puedeCambiar
 * @param {(barras: Object) => void} [props.onCambio]
 */
const MisBarras = ({ inscripcion, puedeCambiar, onCambio }) => {
  const { t } = useTranslation(['competitions', 'golfCourses']);
  const { barras, recargar } = useBarrasDeLaInscripcion(inscripcion.id, true);
  const [abierto, setAbierto] = useState(false);
  if (!barras) return null;

  const color = (c) => t(`golfCourses:form.teeColors.${c}`);
  const sinBarra = barras.courses.filter((campo) => campo.source === 'NONE');
  const cambiar = puedeCambiar && (
    <button
      type="button"
      onClick={() => setAbierto(true)}
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
          data-testid={`elige-barra-${campo.golfCourseId}`}
          className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-sm font-medium text-amber-900"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span className="min-w-0 break-words">
            {t('competitions:tees.chooseOnCourse', {
              course: campo.golfCourseName,
            })}
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
                ? t('competitions:tees.usual', {
                    color: color(barras.defaultTee),
                  })
                : t('competitions:tees.usualNoColor')}
            {cambiar}
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
              <span className="text-gray-500">
                · {t(`competitions:tees.source.${campo.source}`)}
              </span>
              {cambiar}
            </dd>
          </div>
        ))}
      </dl>
      {abierto && (
        <BarrasDelJugadorModal
          inscripcion={inscripcion}
          puedeCambiar={puedeCambiar}
          titulo={t('competitions:tees.mine')}
          onClose={() => setAbierto(false)}
          onCambio={(nuevas) => {
            recargar();
            onCambio?.(nuevas);
          }}
        />
      )}
    </section>
  );
};

export default MisBarras;
