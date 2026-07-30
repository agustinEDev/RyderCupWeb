// Shared constants and pure helpers for CreateQuickMatchModal and its wizard steps
// (CourseStep, ParticipantsStep, ScorersStep, SummaryStep).

// Mirrors backend MatchFormat.players_per_team() * 2 (SINGLES 1v1, FOURBALL/FOURSOMES 2v2)
export const FORMAT_CAPACITY = { SINGLES: 2, FOURBALL: 4, FOURSOMES: 4 };
export const TEAM_FORMATS = ['FOURBALL', 'FOURSOMES'];
export const FORMAT_LABEL_KEY = {
  SINGLES: 'formatSingles',
  FOURBALL: 'formatFourball',
  FOURSOMES: 'formatFoursomes',
};
// Mirrors backend MAX_SCORERS (quick_match domain entity)
export const MAX_SCORERS = 4;
// Mirrors backend MAX_FREE_PLAY_PLAYERS (quick_match domain entity)
export const FREE_PLAY_CAPACITY = 4;
export const SCORING_FORMAT_LABEL_KEY = {
  MEDAL: 'formatMedal',
  STABLEFORD: 'formatStableford',
};

// Mirrors backend WHS allowance defaults (quick_match domain entity get_effective_allowance())
export const DEFAULT_ALLOWANCE_BY_MATCH_FORMAT = { SINGLES: 100, FOURBALL: 90, FOURSOMES: 50 };
export const DEFAULT_FREE_PLAY_ALLOWANCE = 95;
// Curated quick-pick values instead of the full 50-100 (step 5) WHS range:
// match play only ever really uses its three format defaults, and free play
// (stroke play) conventionally sits at 90/95/100.
export const MATCH_PLAY_ALLOWANCE_OPTIONS = [50, 90, 100];
export const FREE_PLAY_ALLOWANCE_OPTIONS = [90, 95, 100];

export const NO_TEE_KEY = '';
export const teeKey = (category, gender) => (category ? `${category}|${gender ?? ''}` : NO_TEE_KEY);
export const parseTeeKey = (key) => {
  if (!key) return { teeCategory: null, teeGender: null };
  const [category, gender] = key.split('|');
  return { teeCategory: category, teeGender: gender || null };
};

// Tee identifiers are free text (e.g. "Blue", "Green (Women)", "Championship"),
// but most golf courses name them after the actual marker color on the tee box.
// When the identifier's first word matches one of these, the button picks up
// that real color instead of the generic primary color.
export const TEE_COLOR_STYLES = {
  white: { dot: 'bg-white border border-gray-400', selected: 'border-gray-500 bg-gray-50 text-gray-700' },
  yellow: { dot: 'bg-yellow-400', selected: 'border-yellow-500 bg-yellow-50 text-yellow-700' },
  gold: { dot: 'bg-yellow-500', selected: 'border-yellow-600 bg-yellow-50 text-yellow-700' },
  blue: { dot: 'bg-blue-500', selected: 'border-blue-500 bg-blue-50 text-blue-700' },
  red: { dot: 'bg-red-500', selected: 'border-red-500 bg-red-50 text-red-700' },
  green: { dot: 'bg-green-500', selected: 'border-green-500 bg-green-50 text-green-700' },
  black: { dot: 'bg-black', selected: 'border-gray-800 bg-gray-100 text-gray-900' },
  orange: { dot: 'bg-orange-500', selected: 'border-orange-500 bg-orange-50 text-orange-700' },
  silver: { dot: 'bg-gray-300 border border-gray-400', selected: 'border-gray-400 bg-gray-50 text-gray-700' },
  purple: { dot: 'bg-purple-500', selected: 'border-purple-500 bg-purple-50 text-purple-700' },
  bronze: { dot: 'bg-amber-700', selected: 'border-amber-700 bg-amber-50 text-amber-800' },
};

export const resolveTeeColor = (identifier) => {
  const firstWord = identifier?.trim().split(/\s+/)[0]?.toLowerCase();
  return TEE_COLOR_STYLES[firstWord] ?? null;
};

export const initialGuestForm = { firstName: '', lastName: '', handicap: '' };
