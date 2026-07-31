/**
 * Domain Service: PlayingHandicapCalculator
 *
 * Computes the WHS Playing Handicap (a.k.a. Course Handicap once allowance
 * is applied) for a quick match participant, mirroring the backend's
 * `PlayingHandicapCalculator` (competition.domain.services) formula:
 *
 *   Playing Handicap = (HI x (SR / 113) + (CR - Par)) x Allowance%
 *
 * Unlike the backend version (used for match-play strokes-given between two
 * players, where the result is clamped to >= 0), this one is used for
 * individual stroke-play/Stableford scoring against the course itself, so a
 * plus-handicap player's result is allowed to stay negative — they give
 * strokes back to the course (WHS Rule 8.2), handled downstream by
 * StablefordCalculator.allocateStrokes.
 */
const NEUTRAL_SLOPE = 113;

class PlayingHandicapCalculator {
  /**
   * Rounds to the nearest integer, ties away from zero (matches Python's
   * decimal.ROUND_HALF_UP, unlike Math.round which rounds -2.5 to -2).
   *
   * @param {number} value
   * @returns {number}
   */
  static roundHalfAwayFromZero(value) {
    return value >= 0 ? Math.floor(value + 0.5) : Math.ceil(value - 0.5);
  }

  /**
   * @param {number|null} handicapIndex
   * @param {{courseRating: number, slopeRating: number, par: number}|null} teeRating
   * @param {number} allowancePercentage - 50-100
   * @returns {number|null} Playing Handicap, or null if no handicap/tee rating is known
   *   (caller should fall back to treating the participant as scratch/raw handicap).
   */
  static calculate(handicapIndex, teeRating, allowancePercentage) {
    if (handicapIndex == null || teeRating == null) return null;

    const { courseRating, slopeRating, par } = teeRating;
    const slopeFactor = slopeRating / NEUTRAL_SLOPE;
    const differential = courseRating - par;
    const courseHandicap = handicapIndex * slopeFactor + differential;
    const playingHandicapRaw = courseHandicap * (allowancePercentage / 100);

    return PlayingHandicapCalculator.roundHalfAwayFromZero(playingHandicapRaw);
  }
}

export default PlayingHandicapCalculator;
