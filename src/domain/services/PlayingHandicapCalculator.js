/**
 * Domain Service: PlayingHandicapCalculator
 *
 * Computes the WHS Playing Handicap (a.k.a. Course Handicap once allowance
 * is applied) for a quick match participant, mirroring the backend's
 * `PlayingHandicapCalculator` (shared.domain.services) formula:
 *
 *   Playing Handicap = (HI x (SR / 113) + (CR - Par)) x Allowance%
 *
 * A plus-handicap player's result stays negative, here and in the backend:
 * against the course they give strokes back, and in match play the difference
 * with the opponent counts it as negative, as in WHS Appendix C
 * (RyderCupAm#165, decided on 2 Oct 2026; until then the backend clipped it
 * at 0 for match play).
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
