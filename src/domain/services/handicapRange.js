export const MIN_HANDICAP = -10;
export const MAX_HANDICAP = 54;

/**
 * WHS handicap range (-10.0 to 54.0), shared by every entry point that sets
 * a player's handicap: profile (UpdateManualHandicapUseCase), quick match
 * participant override (SetQuickMatchParticipantHandicapUseCase), and the
 * HandicapInputPanel keypad UI.
 */
export const isValidHandicap = (value) => value >= MIN_HANDICAP && value <= MAX_HANDICAP;
