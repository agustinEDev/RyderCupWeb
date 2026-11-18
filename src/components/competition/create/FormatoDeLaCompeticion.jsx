import { Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MAX_PLAYERS, MIN_PLAYERS } from '../../../domain/entities/Competition';

/**
 * El formato, a la vista: cuántos sois y si se juega con hándicap son las dos
 * preguntas que el organizador SÍ contesta (Agustín, 19 sep).
 */
const FormatoDeLaCompeticion = ({
  playMode,
  onElegirModo,
  numberOfPlayers,
  onChange,
  onBlurDelCupo,
  inscritos,
}) => {
  const { t } = useTranslation('competitions');
  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Settings className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-gray-900 font-bold text-base">
          {t('create.settingsTitle')}
        </h3>
      </div>

      <div className="space-y-4">
        {/* Play Mode */}
        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">
            {t('create.playMode')}
          </span>
          <div className="flex flex-wrap gap-2">
            {['HANDICAP', 'SCRATCH'].map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={playMode === mode}
                onClick={() => onElegirModo(mode)}
                className={`border-2 rounded-lg text-sm px-3 py-2 transition-colors ${
                  playMode === mode
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'
                }`}
              >
                {t(`create.${mode.toLowerCase()}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Number of Players */}
        <div>
          <label
            htmlFor="numberOfPlayers"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t('create.numberOfPlayers')}
          </label>
          <input
            id="numberOfPlayers"
            data-testid="campo-jugadores"
            type="number"
            name="numberOfPlayers"
            value={numberOfPlayers === undefined ? '' : numberOfPlayers}
            onChange={onChange}
            onBlur={onBlurDelCupo}
            min={Math.max(MIN_PLAYERS, inscritos)}
            max={MAX_PLAYERS}
            aria-describedby={inscritos > 0 ? 'cupo-minimo' : undefined}
            placeholder={t('create.numberOfPlayersPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {/* Por qué no baja de ahí (FE #662): sin decirlo, el número
          se rechazaba sin motivo */}
          {inscritos > 0 && (
            <p
              id="cupo-minimo"
              data-testid="cupo-minimo"
              className="mt-1 text-xs text-gray-500"
            >
              {t('create.capFloor', { count: inscritos })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormatoDeLaCompeticion;
