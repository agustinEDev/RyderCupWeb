import { useTranslation } from 'react-i18next';

/**
 * ¿Juega el organizador? Solo al crear un Stableford o un Medal: si no, no
 * queda inscrito (RyderCupAm#552).
 */
const JuegaElOrganizador = ({ marcada, onCambio }) => {
  const { t } = useTranslation('competitions');
  return (
    <label className="flex min-h-11 items-center gap-2 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={marcada}
        onChange={(e) => onCambio(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
      />
      {t('create.organizerPlays')}
    </label>
  );
};

export default JuegaElOrganizador;
