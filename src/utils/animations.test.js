import { describe, it, expect } from 'vitest';
import {
  ENTRY_DURATION,
  ENTRY_STAGGER,
  VIEWPORT_REVEAL,
  fadeInUp,
  slideUp,
  staggerContainer,
  entryTransition,
  getEntryProps,
  getRevealProps,
} from './animations';

// Rules from FE #302
const MAX_DURATION = 0.3;
const MAX_STAGGER = 0.08;

describe('animations', () => {
  describe('entry rules', () => {
    it('keeps every entry animation at or below 300 ms', () => {
      expect(ENTRY_DURATION).toBeLessThanOrEqual(MAX_DURATION);
      expect(fadeInUp.animate.transition.duration).toBeLessThanOrEqual(MAX_DURATION);
      expect(slideUp.animate.transition.duration).toBeLessThanOrEqual(MAX_DURATION);
    });

    it('keeps the stagger between siblings at or below 80 ms', () => {
      expect(ENTRY_STAGGER).toBeLessThanOrEqual(MAX_STAGGER);
      expect(staggerContainer.animate.transition.staggerChildren).toBeLessThanOrEqual(MAX_STAGGER);
    });

    it('caps the accumulated delay of individually animated siblings', () => {
      expect(entryTransition(0).delay).toBe(0);
      expect(entryTransition(2).delay).toBeCloseTo(2 * ENTRY_STAGGER);
      expect(entryTransition(50).delay).toBeLessThanOrEqual(MAX_DURATION);
    });
  });

  describe('slideUp (above the fold)', () => {
    it('never animates opacity, so the content is painted on the first frame', () => {
      expect(slideUp.initial).not.toHaveProperty('opacity');
      expect(slideUp.animate).not.toHaveProperty('opacity');
    });

    it('only moves the element vertically', () => {
      expect(slideUp.initial.y).toBeGreaterThan(0);
      expect(slideUp.animate.y).toBe(0);
    });
  });

  describe('VIEWPORT_REVEAL', () => {
    it('reveals before the section is fully inside the viewport', () => {
      expect(VIEWPORT_REVEAL.once).toBe(true);
      expect(VIEWPORT_REVEAL.margin).toBe('0px 0px -10% 0px');
      expect(VIEWPORT_REVEAL.amount).toBeLessThanOrEqual(0.1);
    });
  });

  describe('getEntryProps', () => {
    it('animates from the hidden variant when motion is enabled', () => {
      expect(getEntryProps(true)).toEqual({ initial: 'initial', animate: 'animate' });
    });

    it('mounts directly in the final state when motion is disabled', () => {
      expect(getEntryProps(false)).toEqual({ initial: false, animate: 'animate' });
    });
  });

  describe('getRevealProps', () => {
    it('reveals on scroll when motion is enabled', () => {
      expect(getRevealProps(true)).toEqual({
        initial: 'initial',
        whileInView: 'animate',
        viewport: VIEWPORT_REVEAL,
      });
    });

    it('renders the section visible when scroll motion is disabled', () => {
      const props = getRevealProps(false);
      expect(props).toEqual({ initial: false, animate: 'animate' });
      expect(props).not.toHaveProperty('whileInView');
    });
  });
});
