import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CountryFlag } from '../../ui/CountryFlag';
import { formatCountryName } from '../../../services/countries';
import GolfCourseSearchBox from '../../golf_course/GolfCourseSearchBox';
import { GolfCourseApprovalStatus } from '../../../domain/value_objects/GolfCourseApprovalStatus';

/**
 * Los campos elegidos de un país, con su buscador. Se quitan por su posición
 * en la lista de TODOS los campos, no en la de este país: los de los tres
 * países van mezclados en el orden en que se añadieron.
 */
const CamposDeUnPais = ({
  codigo,
  pais,
  golfCourses,
  idsYaElegidos,
  onElegir,
  onPedir,
  onQuitar,
}) => {
  const { t, i18n } = useTranslation('competitions');
  // Los de este país, cada uno con su posición en la lista de todos: buscarla
  // por id confundía dos campos sin id y la papelera quitaba el primero
  const delPais = golfCourses
    .map((gc, posicion) => ({ gc, posicion }))
    .filter(({ gc }) => gc.countryCode === codigo);

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <CountryFlag
          countryCode={codigo}
          style={{ width: '24px', height: 'auto' }}
        />
        <h4 className="text-base font-semibold text-gray-900">
          {formatCountryName(pais, i18n.language)}
        </h4>
        <span className="text-xs text-gray-500">
          (
          {t('create.coursesSelected', {
            count: delPais.length,
          })}
          )
        </span>
      </div>

      {/* List of selected courses */}
      {delPais.map(({ gc, posicion }, index) => {
        return (
          <div
            key={`${gc.course.id}-${index}`}
            className="mb-2 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between"
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {gc.course.name}
              </p>
              {gc.course.approvalStatus ===
                GolfCourseApprovalStatus.PENDING_APPROVAL && (
                <p className="text-xs text-yellow-700 mt-1 flex items-center gap-1">
                  <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full"></span>
                  {t('create.coursePendingApproval')}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onQuitar(posicion)}
              aria-label={t('detail.golfCourses.remove', {
                name: gc.course.name,
              })}
              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      })}

      {/* Add course button/search */}
      <div className="mt-3">
        <GolfCourseSearchBox
          countryCode={codigo}
          selectedCourse={null}
          idsYaElegidos={idsYaElegidos}
          onCourseSelect={(course) => onElegir(codigo, course)}
          onRequestNewCourse={() => onPedir(codigo)}
        />
      </div>
    </div>
  );
};

export default CamposDeUnPais;
