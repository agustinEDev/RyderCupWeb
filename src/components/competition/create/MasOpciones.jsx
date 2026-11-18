import { useTranslation } from 'react-i18next';
import ResumenDeLasOpciones from './ResumenDeLasOpciones';

/**
 * Lo que no hay que decidir para crear: se pliega, pero se dice qué se acepta
 * si nadie lo toca (FE #637). Los nombres de los equipos, solo en una Ryder, y
 * el tope de hándicap.
 */
const MasOpciones = ({
  abierto,
  onAlternar,
  faltaAlgoPlegado,
  conEquipos,
  formData,
  onChange,
}) => {
  const { t } = useTranslation('competitions');
  return (
    <div className="border border-gray-200 rounded-xl">
      <button
        type="button"
        data-testid="mas-opciones"
        onClick={onAlternar}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <span className="font-medium text-gray-900">
          {t('create.moreOptions')}
        </span>
        <span className="text-gray-500">{abierto ? '−' : '+'}</span>
      </button>

      {!abierto && (
        <ResumenDeLasOpciones
          faltaAlgo={faltaAlgoPlegado}
          conEquipos={conEquipos}
          formData={formData}
        />
      )}

      {abierto && (
        <div className="space-y-4 border-t border-gray-200 p-4">
          {conEquipos && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="teamOneName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {t('create.teamOneName')}
                </label>
                <input
                  id="teamOneName"
                  data-testid="campo-equipo-1"
                  type="text"
                  name="teamOneName"
                  value={formData.teamOneName}
                  onChange={onChange}
                  placeholder={t('create.teamOneNamePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label
                  htmlFor="teamTwoName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {t('create.teamTwoName')}
                </label>
                <input
                  id="teamTwoName"
                  data-testid="campo-equipo-2"
                  type="text"
                  name="teamTwoName"
                  value={formData.teamTwoName}
                  onChange={onChange}
                  placeholder={t('create.teamTwoNamePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}
          {/* Max Playing Handicap */}
          <div>
            <label
              htmlFor="maxPlayingHandicap"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t('create.maxPlayingHandicap')}
            </label>
            <input
              id="maxPlayingHandicap"
              data-testid="campo-handicap"
              type="number"
              name="maxPlayingHandicap"
              value={
                formData.maxPlayingHandicap === undefined
                  ? ''
                  : formData.maxPlayingHandicap
              }
              onChange={onChange}
              min="1"
              max="54"
              placeholder={t('create.maxPlayingHandicapPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-gray-500">
              {t('create.maxPlayingHandicapHint')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasOpciones;
