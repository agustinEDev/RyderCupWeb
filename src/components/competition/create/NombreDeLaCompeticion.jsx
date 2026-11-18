import { useTranslation } from 'react-i18next';

/**
 * El nombre, con su aviso junto al campo (RyderCupAm#540). `ref` es el campo:
 * al fallar, el envío lo trae a la vista y le da el foco.
 */
const NombreDeLaCompeticion = ({
  ref,
  valor,
  onChange,
  error,
  tournamentType,
  conEquipos,
}) => {
  const { t } = useTranslation('competitions');
  return (
    <div>
      <label
        htmlFor="competitionName"
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {t('create.competitionName')}
      </label>
      <input
        ref={ref}
        id="competitionName"
        data-testid="campo-nombre"
        type="text"
        name="competitionName"
        value={valor}
        onChange={onChange}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? 'error-del-nombre' : undefined}
        // El ejemplo, del tipo elegido: «Ryder Cup de amigos» en un Medal no (pasada)
        placeholder={t(
          tournamentType && !conEquipos
            ? `create.competitionNamePlaceholderFor.${tournamentType}`
            : 'create.competitionNamePlaceholder',
        )}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${error ? 'border-red-400' : 'border-gray-300'}`}
      />
      {error && (
        <p
          id="error-del-nombre"
          data-testid="error-del-nombre"
          className="mt-1 text-sm text-red-700"
        >
          {t(`create.errors.${error}`)}
        </p>
      )}
    </div>
  );
};

export default NombreDeLaCompeticion;
