export const MIN_HANDICAP = -10;
export const MAX_HANDICAP = 54;

/**
 * WHS handicap range (-10.0 to 54.0), shared by every entry point that sets
 * a player's handicap: profile (UpdateManualHandicapUseCase) and the
 * HandicapInputPanel keypad UI, which is also the quick match override.
 */
export const isValidHandicap = (value) => value >= MIN_HANDICAP && value <= MAX_HANDICAP;
