import GolfCourseSearchBox from '../golf_course/GolfCourseSearchBox';
import FuenteRfeg from '../golf_course/FuenteRfeg';
import BarrasDeTuGenero from './BarrasDeTuGenero';
import {
  FORMAT_CAPACITY,
  FORMAT_LABEL_KEY,
  FREE_PLAY_ALLOWANCE_OPTIONS,
  MATCH_PLAY_ALLOWANCE_OPTIONS,
  SCORING_FORMAT_LABEL_KEY,
} from './createQuickMatchModalConstants';

// «¿A qué jugáis?»: los tres de match play y los dos de stroke play, en una
// sola pregunta (FE #1025). Conservan los `data-testid` de antes
const OPCIONES = [
  ...Object.keys(FORMAT_CAPACITY).map((formato) => ({ modo: 'MATCH_PLAY', formato, testId: `format-option-${formato}`, etiqueta: FORMAT_LABEL_KEY[formato] })),
  ...Object.keys(SCORING_FORMAT_LABEL_KEY).map((formato) => ({ modo: 'FREE_PLAY', formato, testId: `scoring-format-option-${formato}`, etiqueta: SCORING_FORMAT_LABEL_KEY[formato] })),
];

/**
 * Paso 1 del asistente (FE #1025, tabla aprobada el 3 nov 2026): el campo y
 * tu barra arriba, luego a qué jugáis, y lo que casi nunca se toca (nombre,
 * scratch, %) en «Más opciones», plegado. Si algo de ahí no es lo de por
 * defecto, se dice en su cabecera para que no quede escondido.
 */
const CourseStep = ({
  t,
  matchName,
  onMatchNameChange,
  mode,
  onModeChange,
  isFreePlay,
  scoringFormat,
  onScoringFormatChange,
  matchFormat,
  onMatchFormatChange,
  countryCode,
  selectedCourse,
  onCourseSelect,
  onRequestNewCourse,
  courseTees,
  courseFromRfeg = false,
  creatorTeeKey,
  onCreatorTeeKeyChange,
  generoDeQuienCrea = null,
  allowancePercentage,
  allowanceAMano = false,
  onAllowanceChange,
  playMode = 'HANDICAP',
  onPlayModeChange,
  isProcessing,
  teesLoading,
  onClose,
  onNext,
}) => {
  const elegida = (op) => op.modo === mode && (isFreePlay ? scoringFormat : matchFormat) === op.formato;
  const elige = (op) => {
    if (op.modo !== mode) onModeChange(op.modo);
    if (op.modo === 'FREE_PLAY') onScoringFormatChange(op.formato);
    else onMatchFormatChange(op.formato);
  };
  // Lo que no es lo de por defecto, a la vista aunque esté plegado
  const fueraDeLoNormal = [
    matchName.trim() || null,
    playMode === 'SCRATCH' ? t('create.course.playModeScratch') : null,
    playMode !== 'SCRATCH' && allowanceAMano ? `${allowancePercentage}%` : null,
  ].filter(Boolean);

  return (
  <div className="p-4 space-y-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {t('create.course.courseLabel')}
      </label>
      {/* En una partida rápida estás pisando el campo: la cercanía busca en
          cualquier país (allowOtherCountries) */}
      <GolfCourseSearchBox
        countryCode={countryCode}
        selectedCourse={selectedCourse}
        onCourseSelect={onCourseSelect}
        onRequestNewCourse={onRequestNewCourse}
        allowOtherCountries
      />
      {courseFromRfeg && <FuenteRfeg className="mt-1" />}
    </div>

    {courseTees.length > 0 && (
      <div>
        <p className="block text-sm font-medium text-gray-700 mb-1">{t('create.course.yourTeeLabel')}</p>
        <BarrasDeTuGenero
          t={t}
          courseTees={courseTees}
          genero={generoDeQuienCrea}
          value={creatorTeeKey}
          onChange={onCreatorTeeKeyChange}
        />
      </div>
    )}

    <div>
      <p className="block text-sm font-medium text-gray-700 mb-1">{t('create.course.queJugais')}</p>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label={t('create.course.queJugais')}>
        {OPCIONES.map((op) => (
          <button
            key={op.testId}
            type="button"
            onClick={() => elige(op)}
            aria-pressed={elegida(op)}
            data-testid={op.testId}
            className={`px-2 py-2 rounded-lg border text-sm transition-colors ${
              elegida(op)
                ? 'border-primary bg-primary/5 text-primary font-medium'
                : 'border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            {t(`create.course.corto.${op.formato}`)}
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs text-gray-500">
        {t(`create.course.${OPCIONES.find(elegida)?.etiqueta ?? FORMAT_LABEL_KEY.SINGLES}`)}
      </p>
    </div>

    <details className="rounded-lg border border-gray-200" data-testid="quick-match-mas-opciones">
      <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-gray-700">
        {t('create.course.masOpciones')}
        {fueraDeLoNormal.length > 0 && (
          <span className="font-normal text-gray-500"> · {fueraDeLoNormal.join(' · ')}</span>
        )}
      </summary>
      <div className="px-3 pb-3 space-y-4">
    <div>
      <label htmlFor="quick-match-name" className="block text-sm font-medium text-gray-700 mb-1">
        {t('create.course.nameLabel')}
      </label>
      <input
        id="quick-match-name"
        type="text"
        value={matchName}
        onChange={(e) => onMatchNameChange(e.target.value)}
        placeholder={t('create.course.namePlaceholder')}
        maxLength={100}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        data-testid="quick-match-name-input"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {t('create.course.playModeLabel')}
      </label>
      <div className="flex gap-2" role="group" aria-label={t('create.course.playModeLabel')}>
        {['HANDICAP', 'SCRATCH'].map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onPlayModeChange(mode)}
            aria-pressed={playMode === mode}
            data-testid={`quick-match-play-mode-option-${mode}`}
            className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              playMode === mode
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            {mode === 'SCRATCH'
              ? t('create.course.playModeScratch')
              : t('create.course.playModeHandicap')}
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs text-gray-500">
        {playMode === 'SCRATCH'
          ? t('create.course.playModeScratchHint')
          : t('create.course.playModeHandicapHint')}
      </p>
    </div>

    {/* El allowance es el porcentaje del hándicap que se aplica: en scratch no
        se aplica ninguno, así que el selector se deshabilita en vez de
        desaparecer, para que se vea que existe y por qué no está disponible. */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {t('create.course.allowanceLabel')}
      </label>
      <div className="flex gap-2" role="group" aria-label={t('create.course.allowanceLabel')}>
        {(isFreePlay ? FREE_PLAY_ALLOWANCE_OPTIONS : MATCH_PLAY_ALLOWANCE_OPTIONS).map((pct) => (
          <button
            key={pct}
            type="button"
            onClick={() => onAllowanceChange(pct)}
            disabled={playMode === 'SCRATCH'}
            // El mismo guard que el estilo: si no, el lector anuncia "100%,
            // pulsado" sobre un botón que se ve apagado y sin seleccionar
            aria-pressed={allowancePercentage === pct && playMode !== 'SCRATCH'}
            data-testid={`quick-match-allowance-option-${pct}`}
            className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              allowancePercentage === pct && playMode !== 'SCRATCH'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            {pct}%
          </button>
        ))}
      </div>
      {playMode === 'SCRATCH' && (
        <p className="mt-1 text-xs text-gray-500">{t('create.course.allowanceNotApplied')}</p>
      )}
    </div>

      </div>
    </details>

    <div className="flex justify-end gap-3 pt-2">
      <button
        type="button"
        onClick={onClose}
        disabled={isProcessing}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
      >
        {t('create.cancel')}
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={isProcessing || teesLoading}
        data-testid="quick-match-course-next"
        className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50"
      >
        {isProcessing ? t('create.course.creating') : t('create.course.next')}
      </button>
    </div>
  </div>
  );
};

export default CourseStep;
