import { Flag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FuenteRfeg from '../../golf_course/FuenteRfeg';
import CamposDeUnPais from './CamposDeUnPais';

/**
 * Los campos de golf del alta, un bloque por país elegido: el principal, el
 * adyacente y el tercero. Al editar no salen: los gestiona la ficha.
 */
const CamposDeLaCompeticion = ({
  formData,
  allCountries,
  adjacentCountries1,
  adjacentCountries2,
  onElegir,
  onPedir,
  onQuitar,
}) => {
  const { t } = useTranslation('competitions');

  // Si alguno de los elegidos es federado, se cita a la RFEG
  const hayCampoDeLaRfeg = formData.golfCourses.some(
    (gc) => gc.course?.isFromRfeg?.() === true,
  );

  // Los que ya están, para que el buscador no vuelva a ofrecerlos
  const idsDeLosCamposElegidos = formData.golfCourses
    .map((gc) => gc.course?.id)
    .filter(Boolean);

  const deUnPais = (codigo, pais) => (
    <CamposDeUnPais
      codigo={codigo}
      pais={pais}
      golfCourses={formData.golfCourses}
      idsYaElegidos={idsDeLosCamposElegidos}
      onElegir={onElegir}
      onPedir={onPedir}
      onQuitar={onQuitar}
    />
  );

  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
          <Flag className="w-4 h-4 text-green-700" />
        </div>
        <div>
          <h3 className="text-gray-900 font-bold text-base">
            {t('create.golfCourses')}
          </h3>
          <p className="text-sm text-gray-500">
            {t('create.golfCoursesSubtitle')}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Main Country Golf Courses */}
        {formData.country && deUnPais(formData.country.code, formData.country)}

        {/* Adjacent Country 1 Golf Courses */}
        {formData.adjacentCountry1 &&
          deUnPais(
            formData.adjacentCountry1,
            allCountries.find((c) => c.code === formData.adjacentCountry1) ||
              adjacentCountries1.find(
                (c) => c.code === formData.adjacentCountry1,
              ),
          )}

        {/* Adjacent Country 2 Golf Courses */}
        {formData.adjacentCountry2 &&
          deUnPais(
            formData.adjacentCountry2,
            allCountries.find((c) => c.code === formData.adjacentCountry2) ||
              adjacentCountries2.find(
                (c) => c.code === formData.adjacentCountry2,
              ),
          )}
      </div>
      {/* Solo si alguno de los elegidos es federado: los manuales no
      son de la RFEG */}
      {hayCampoDeLaRfeg && <FuenteRfeg className="mt-3" />}
    </div>
  );
};

export default CamposDeLaCompeticion;
