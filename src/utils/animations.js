/**
 * Shared entry-animation rules (FE #302).
 *
 * Entry animations must never leave content invisible for long enough to be
 * noticed, so every reveal in the app is built from these values:
 *
 * - Max duration of an entry animation: 300 ms
 * - Max stagger between siblings: 80 ms
 * - Above-the-fold content renders visible: it may animate transform, never opacity
 * - Scroll reveals start before the section is fully inside the viewport
 */

/** Duration of any entry animation, in seconds (max allowed: 0.3). */
export const ENTRY_DURATION = 0.25;

/** Delay between siblings of a staggered container, in seconds (max allowed: 0.08). */
export const ENTRY_STAGGER = 0.06;

/** Vertical travel of an entry animation, in pixels. */
export const ENTRY_OFFSET = 12;

/**
 * Viewport config for scroll reveals: fires slightly before the element is
 * fully visible (negative bottom margin + low `amount`) so the content is
 * already there when the user reaches it.
 */
export const VIEWPORT_REVEAL = {
  once: true,
  margin: '0px 0px -10% 0px',
  amount: 0.1,
};

/** Standard reveal for content below the fold. */
export const fadeInUp = {
  initial: { opacity: 0, y: ENTRY_OFFSET },
  animate: { opacity: 1, y: 0, transition: { duration: ENTRY_DURATION } },
};

/**
 * Reveal for above-the-fold content: transform only, so the element is painted
 * visible on the very first frame.
 */
export const slideUp = {
  initial: { y: ENTRY_OFFSET },
  animate: { y: 0, transition: { duration: ENTRY_DURATION } },
};

/** Container that staggers its motion children. */
export const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: ENTRY_STAGGER } },
};

/**
 * Transition for siblings that are animated individually (no variants container).
 * The delay is capped so a long list never pushes the last item past ~0.3 s.
 *
 * @param {number} index Position of the element among its siblings.
 * @returns {{duration: number, delay: number}} Framer Motion transition.
 */
export const entryTransition = (index = 0) => ({
  duration: ENTRY_DURATION,
  delay: Math.min(index, 4) * ENTRY_STAGGER,
});

/**
 * Props for an element that animates on mount.
 * When animations are off the element mounts directly in its final state
 * (`initial={false}`), never in the hidden variant.
 *
 * @param {boolean} shouldAnimate Whether entry animations are enabled.
 * @returns {object} Props to spread on a motion component.
 */
export const getEntryProps = (shouldAnimate) =>
  shouldAnimate ? { initial: 'initial', animate: 'animate' } : { initial: false, animate: 'animate' };

/**
 * Props for an element that reveals when scrolled into view.
 * When scroll animations are off the element is rendered visible from the start.
 *
 * @param {boolean} shouldAnimate Whether scroll reveals are enabled.
 * @returns {object} Props to spread on a motion component.
 */
export const getRevealProps = (shouldAnimate) =>
  shouldAnimate
    ? { initial: 'initial', whileInView: 'animate', viewport: VIEWPORT_REVEAL }
    : { initial: false, animate: 'animate' };
