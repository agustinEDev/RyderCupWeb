import { useTranslation } from 'react-i18next';
import { ValidationStatus } from '../../domain/value_objects/ValidationStatus';

const ValidationIcon = ({ status }) => {
  const { t } = useTranslation('scoring');

  if (status === ValidationStatus.MATCH)
    return (
      <span
        data-testid="validation-icon"
        className="text-green-600"
        title={t('validation.match')}
      >
        &#10003;
      </span>
    );
  if (status === ValidationStatus.MISMATCH)
    return (
      <span
        data-testid="validation-icon"
        className="text-red-600"
        title={t('validation.mismatch')}
      >
        &#10007;
      </span>
    );
  return (
    <span
      data-testid="validation-icon"
      className="text-gray-400"
      title={t('validation.pending')}
    >
      &#9711;
    </span>
  );
};

export default ValidationIcon;
