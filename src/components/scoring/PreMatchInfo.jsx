import { useTranslation } from 'react-i18next';

const PreMatchInfo = ({ markerAssignment, matchFormat, players = [] }) => {
  const { t } = useTranslation('scoring');

  if (!markerAssignment) return null;

  // En foursomes hay una bola por pareja y se marca a la pareja rival (#710):
  // «Tú marcas a Luna» hacía dudar de si había que marcar también a Óscar
  const enParejas = matchFormat === 'FOURSOMES';
  const equipoMarcado = players.find((p) => p.userId === markerAssignment.marksUserId)?.team;
  const parejaMarcada = equipoMarcado
    ? players.filter((p) => p.team === equipoMarcado).map((p) => p.userName).join(' / ')
    : '';
  const aQuien = enParejas && parejaMarcada ? parejaMarcada : markerAssignment.marksName;

  return (
    <div data-testid="pre-match-info" className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <h3 className="text-lg font-semibold text-gray-900">{t('preMatch.title')}</h3>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{t('preMatch.format')}:</span>
          <span className="text-sm font-medium">{matchFormat}</span>
        </div>

        {aQuien && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {t(enParejas ? 'preMatch.youMarkPair' : 'preMatch.youMark')}:
            </span>
            <span className="text-sm font-medium text-primary">{aQuien}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreMatchInfo;
