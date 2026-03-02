import { useTranslation } from 'react-i18next';

const GolfFigure = ({ score, par }) => {
  const { t } = useTranslation('scoring');

  if (score === null || score === undefined || par === null || par === undefined) {
    return <span data-testid="golf-figure" className="text-gray-400">-</span>;
  }

  const diff = score - par;

  // Eagle or better (-2 or less)
  if (diff <= -2) {
    return (
      <span data-testid="golf-figure" title={t('figures.eagle')} className="inline-flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 28 28">
          <circle cx="14" cy="14" r="13" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-yellow-500" />
          <circle cx="14" cy="14" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-yellow-500" />
          <text x="14" y="18" textAnchor="middle" className="text-xs font-bold fill-current text-yellow-700">{score}</text>
        </svg>
      </span>
    );
  }

  // Birdie (-1)
  if (diff === -1) {
    return (
      <span data-testid="golf-figure" title={t('figures.birdie')} className="inline-flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 28 28">
          <circle cx="14" cy="14" r="12" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-500" />
          <text x="14" y="18" textAnchor="middle" className="text-xs font-bold fill-current text-red-700">{score}</text>
        </svg>
      </span>
    );
  }

  // Par (0)
  if (diff === 0) {
    return (
      <span data-testid="golf-figure" title={t('figures.par')} className="inline-flex items-center justify-center w-7 h-7 text-xs font-bold text-gray-700">
        {score}
      </span>
    );
  }

  // Bogey (+1)
  if (diff === 1) {
    return (
      <span data-testid="golf-figure" title={t('figures.bogey')} className="inline-flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 28 28">
          <rect x="2" y="2" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-500" />
          <text x="14" y="18" textAnchor="middle" className="text-xs font-bold fill-current text-blue-700">{score}</text>
        </svg>
      </span>
    );
  }

  // Double bogey or worse (+2 or more)
  return (
    <span data-testid="golf-figure" title={t('figures.doubleBogey')} className="inline-flex items-center justify-center">
      <svg width="28" height="28" viewBox="0 0 28 28">
        <rect x="1" y="1" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-purple-500" />
        <rect x="4" y="4" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-purple-500" />
        <text x="14" y="18" textAnchor="middle" className="text-xs font-bold fill-current text-purple-700">{score}</text>
      </svg>
    </span>
  );
};

export default GolfFigure;
