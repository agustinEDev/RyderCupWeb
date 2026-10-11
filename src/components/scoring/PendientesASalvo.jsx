import { useTranslation } from 'react-i18next';

// Los golpes que siguen en el móvil CON cobertura: lo caído es el servidor, así
// que el banner de sin conexión diría algo falso (FE #617). En las dos pantallas,
// la de nada pintado y la del partido en pantalla (FE #625)
const PendientesASalvo = ({ count }) => {
  const { t } = useTranslation('scoring');
  if (count <= 0) return null;
  return (
    <div className="max-w-4xl mx-auto px-4 pt-4">
      <p
        data-testid="pendientes-a-salvo"
        className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm"
      >
        {t('offline.pendientesASalvo')} {t('offline.pendingScores', { count })}
      </p>
    </div>
  );
};

export default PendientesASalvo;
